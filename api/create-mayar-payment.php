<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_method('POST');

// Source of truth: never accept a client-supplied name or price.
const SERVICE_CATALOG = [
    'makalah' => ['name' => 'Jasa Makalah', 'amount' => 2000],
    'ppt' => ['name' => 'Desain PPT', 'amount' => 10000],
    'poster' => ['name' => 'Desain Poster', 'amount' => 80000],
    'editing' => ['name' => 'Jasa Editing', 'amount' => 60000],
    'skripsi' => ['name' => 'Bantuan Skripsi', 'amount' => 20000],
    'turnitin' => ['name' => 'Cek Turnitin', 'amount' => 10000],
    'artikel' => ['name' => 'Jasa Artikel', 'amount' => 8000],
    'jurnal' => ['name' => 'Bantuan Jurnal', 'amount' => 80000],
];

function mayar_post(string $path, array $payload): array
{
    $config = mayar_config();
    $curl = curl_init(rtrim($config['base_url'], '/') . '/' . ltrim($path, '/'));
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['api_key'], 'Content-Type: application/json', 'Accept: application/json'], CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR)]);
    $raw = curl_exec($curl); $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE); $error = curl_error($curl); curl_close($curl);
    if (!is_string($raw) || $status < 200 || $status >= 300) { error_log('Mayar create-payment failed: HTTP '.$status.' '.$error); throw new RuntimeException('Mayar payment-link request failed'); }
    try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException) { throw new RuntimeException('Mayar returned invalid JSON'); }
    if (!is_array($body) || (isset($body['statusCode']) && (int) $body['statusCode'] >= 400)) throw new RuntimeException('Mayar rejected the payment-link request');
    return $body;
}

try {
    $input = request_json();
    $serviceId = is_string($input['service_id'] ?? null) ? $input['service_id'] : '';
    $customerName = trim((string) ($input['customer_name'] ?? ''));
    $customerEmail = trim((string) ($input['customer_email'] ?? ''));
    if (!isset(SERVICE_CATALOG[$serviceId])) json_response(422, ['error' => 'Unknown service_id']);
    if ($customerName === '' || mb_strlen($customerName) > 100 || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) json_response(422, ['error' => 'Customer data is invalid']);

    $service = SERVICE_CATALOG[$serviceId]; $orderId = new_order_id();
    $insert = db()->prepare('INSERT INTO orders (order_id, service_id, amount, payment_status, customer_name, customer_email) VALUES (?, ?, ?, "PENDING", ?, ?)');
    $insert->execute([$orderId, $serviceId, $service['amount'], $customerName, $customerEmail]);

    $path = env('MAYAR_CREATE_PAYMENT_PATH');
    if ($path === null || $path === '') throw new RuntimeException('MAYAR_CREATE_PAYMENT_PATH is not verified/configured');
    $appUrl = rtrim((string) env('APP_URL'), '/');
    if (!filter_var($appUrl, FILTER_VALIDATE_URL)) throw new RuntimeException('APP_URL is invalid');

    // Confirm these request-field names against the current Mayar V2 endpoint before production.
    $result = mayar_post($path, [
        'referenceId' => $orderId,
        'name' => $service['name'],
        'amount' => $service['amount'],
        'customer' => ['name' => $customerName, 'email' => $customerEmail],
        'redirectUrl' => $appUrl . '/status-pesanan?order_id=' . rawurlencode($orderId),
    ]);
    $link = $result['data']['link'] ?? null;
    if (!is_string($link) || !filter_var($link, FILTER_VALIDATE_URL)) throw new RuntimeException('Mayar response has no valid data.link');
    db()->prepare('UPDATE orders SET payment_link = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')->execute([$link, $orderId]);
    json_response(201, ['order_id' => $orderId, 'paymentUrl' => $link]);
} catch (Throwable $e) {
    error_log('create-mayar-payment: ' . $e->getMessage());
    json_response(503, ['error' => 'Payment service is temporarily unavailable']);
}
