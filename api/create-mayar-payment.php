<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';

require_method('POST');

function mayar_post(string $path, array $payload): array
{
    $config = mayar_config();
    $curl = curl_init(rtrim($config['base_url'], '/') . '/' . ltrim($path, '/'));
    curl_setopt_array($curl, [
        CURLOPT_POST => true, 
        CURLOPT_RETURNTRANSFER => true, 
        CURLOPT_CONNECTTIMEOUT => 8, 
        CURLOPT_TIMEOUT => 20, 
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['api_key'], 
            'Content-Type: application/json', 
            'Accept: application/json'
        ], 
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR)
    ]);
    
    $raw = curl_exec($curl); 
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE); 
    $error = curl_error($curl); 
    curl_close($curl);
    
    if (!is_string($raw) || $status < 200 || $status >= 300) { 
        error_log('Mayar create-payment failed: HTTP '.$status.' '.$error. ' Response: '.$raw); 
        throw new RuntimeException('Mayar payment-link request failed'); 
    }
    
    try { 
        $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); 
    } catch (JsonException) { 
        throw new RuntimeException('Mayar returned invalid JSON'); 
    }
    
    if (!is_array($body) || (isset($body['statusCode']) && (int) $body['statusCode'] >= 400)) {
        throw new RuntimeException('Mayar rejected the payment-link request');
    }
    
    return $body;
}

try {
    // The browser may send a draft, but the server owns the final amount.
    $input = request_json();
    $orderCode = is_string($input['orderCode'] ?? null) && preg_match('/^[A-Za-z0-9_-]{6,80}$/', $input['orderCode']) ? $input['orderCode'] : new_order_id();
    $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
    $customerName = trim((string) ($customer['name'] ?? ''));
    $customerEmail = strtolower(trim((string) ($customer['email'] ?? '')));
    $description = trim((string) ($input['description'] ?? 'Pesanan JOKI.IN'));
    $serviceId = trim((string) ($input['service_id'] ?? $input['serviceId'] ?? 'custom'));
    $amount = is_numeric($input['amount'] ?? null) ? (int) $input['amount'] : 0;

    // Validasi dasar
    if ($amount < 1000 || $customerName === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        json_response(422, ['error' => 'Data pelanggan atau jumlah pembayaran tidak valid.']);
    }

    // Insert before the external request. This gives the webhook a binding target.
    $insert = db()->prepare('INSERT OR IGNORE INTO orders (order_id, service_id, amount, payment_status, customer_name, customer_email) VALUES (?, ?, ?, "PENDING", ?, ?)');
    $insert->execute([$orderCode, $serviceId, $amount, $customerName, $customerEmail]);

    // 3. Konfigurasi Request Mayar
    // Endpoint pembuatan payment link Mayar (Pastikan di .env terisi, contoh: payment/create)
    $path = env('MAYAR_CREATE_PAYMENT_PATH', 'payments/create');
    $appUrl = rtrim((string) env('APP_URL', 'https://jokiin.my.id'), '/');
    $expiredAt = (new DateTimeImmutable('+24 hours'))->format(DateTimeInterface::ATOM);

    // 4. Tembak API Mayar
    $result = mayar_post($path, [
        'name' => $customerName,
        'email' => $customerEmail,
        'amount' => $amount,
        'referenceId' => $orderCode,
        'description' => $description,
        'expiredAt' => $expiredAt,
        'redirectUrl' => $appUrl . '/?payment=complete&order_id=' . rawurlencode($orderCode),
    ]);

    $link = $result['data']['link'] ?? $result['data']['paymentUrl'] ?? $result['link'] ?? null;
    
    if (!is_string($link) || !filter_var($link, FILTER_VALIDATE_URL)) {
        throw new RuntimeException('Mayar response has no valid data.link');
    }

    // 5. Update Database dengan Link Pembayaran
    db()->prepare('UPDATE orders SET payment_link = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')->execute([$link, $orderCode]);
    
    // 6. Kembalikan Response ke Javascript
    json_response(201, ['order_id' => $orderCode, 'paymentUrl' => $link, 'payment_status' => 'PENDING', 'expires_at' => $expiredAt]);

} catch (Throwable $e) {
    error_log('create-mayar-payment: ' . $e->getMessage());
    json_response(503, ['error' => 'Layanan pembayaran sedang sibuk, silakan coba lagi.']);
}
