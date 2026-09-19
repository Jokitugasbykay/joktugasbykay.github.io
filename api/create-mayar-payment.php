<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_method('POST');

function mayar_debug_log(string $label, string $contents): void {
    $path = APP_ROOT . '/storage/mayar_debug.log';
    $line = '[' . gmdate('c') . '] ' . $label . ': ' . $contents . PHP_EOL;
    if (@file_put_contents($path, $line, FILE_APPEND | LOCK_EX) === false) error_log('Cannot write Mayar debug log: ' . $path);
}

function mayar_post(string $path, array $payload): array {
    $config = mayar_config();
    $jsonPayload = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    mayar_debug_log('MAYAR REQUEST ' . $path, $jsonPayload);
    $curl = curl_init(rtrim($config['base_url'], '/') . '/' . ltrim($path, '/'));
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['api_key'], 'Content-Type: application/json', 'Accept: application/json'], CURLOPT_POSTFIELDS => $jsonPayload]);
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    mayar_debug_log('MAYAR RESPONSE HTTP ' . $status, is_string($raw) ? $raw : '[no response]');
    if (!is_string($raw)) throw new RuntimeException('Mayar API Error: cURL error: ' . $curlError);
    try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { throw new RuntimeException('Mayar API Error: HTTP ' . $status . ' returned non-JSON response: ' . $raw); }
    if ($status < 200 || $status >= 300 || !is_array($body) || (isset($body['statusCode']) && (int) $body['statusCode'] >= 400)) {
        $detail = is_array($body) ? ($body['messages'] ?? $body['message'] ?? $body['error'] ?? $raw) : $raw;
        if (is_array($detail)) $detail = json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        throw new RuntimeException('Mayar API Error: HTTP ' . $status . ' - ' . $detail);
    }
    return $body;
}

try {
    $input = request_json();
    $orderCode = is_string($input['orderCode'] ?? null) ? trim($input['orderCode']) : '';
    $amount = is_numeric($input['amount'] ?? null) ? (int) $input['amount'] : 0;
    $customerName = trim((string) ($input['customer']['name'] ?? 'Guest'));
    $customerEmail = trim((string) ($input['customer']['email'] ?? 'guest@jokiin.my.id'));
    $description = trim((string) ($input['description'] ?? 'Pembayaran Pesanan JOKI.IN'));
    if ($orderCode === '' || $amount < 1000) json_response(422, ['error' => 'Data order tidak valid atau jumlah terlalu kecil (Min. Rp1.000)']);

    db()->prepare('INSERT INTO orders (order_id, amount, payment_status, customer_name, customer_email) VALUES (?, ?, "PENDING", ?, ?)')->execute([$orderCode, $amount, $customerName, $customerEmail]);
    $path = env('MAYAR_CREATE_PAYMENT_PATH', 'payment/create');
    $appUrl = rtrim((string) env('APP_URL', 'https://jokiin.my.id'), '/');
    $result = mayar_post($path, ['name' => $description, 'amount' => $amount, 'referenceId' => $orderCode, 'customer' => ['name' => $customerName, 'email' => $customerEmail], 'redirectUrl' => $appUrl . '/']);
    $link = $result['data']['link'] ?? null;
    if (!is_string($link) || !filter_var($link, FILTER_VALIDATE_URL)) throw new RuntimeException('Mayar API Error: response has no valid data.link');
    db()->prepare('UPDATE orders SET payment_link = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')->execute([$link, $orderCode]);
    json_response(201, ['order_id' => $orderCode, 'paymentUrl' => $link]);
} catch (Throwable $e) {
    error_log('create-mayar-payment: ' . $e->getMessage());
    // DEBUG ONLY: disable this detailed response after the hosting/API issue is resolved.
    json_response(503, ['error' => $e->getMessage()]);
}
