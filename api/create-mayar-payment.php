<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
// Pastikan file bootstrap.php atau helper yang memuat fungsi request_json(), db(), env(), dll sudah di-include di mayar-config.php atau di sini
// require_once __DIR__ . '/bootstrap.php'; 

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
    // 1. Tangkap Payload dari Frontend JS JOKIIN
    $input = request_json();
    
    $orderCode = is_string($input['orderCode'] ?? null) ? $input['orderCode'] : '';
    $amount = is_numeric($input['amount'] ?? null) ? (int) $input['amount'] : 0;
    
    // Ekstrak data customer dari object
    $customerName = trim((string) ($input['customer']['name'] ?? 'Guest'));
    $customerEmail = trim((string) ($input['customer']['email'] ?? 'guest@jokiin.my.id'));
    $description = trim((string) ($input['description'] ?? 'Pembayaran Pesanan JOKI.IN'));

    // Validasi dasar
    if ($orderCode === '' || $amount < 1000) {
        json_response(422, ['error' => 'Data order tidak valid atau jumlah terlalu kecil (Min. Rp1.000)']);
    }

    // 2. Catat ke Database SQLite Lokal (Untuk validasi Webhook nanti)
    $insert = db()->prepare('INSERT INTO orders (order_id, amount, payment_status, customer_name, customer_email) VALUES (?, ?, "PENDING", ?, ?)');
    $insert->execute([$orderCode, $amount, $customerName, $customerEmail]);

    // 3. Konfigurasi Request Mayar
    // Endpoint pembuatan payment link Mayar (Pastikan di .env terisi, contoh: payment/create)
    $path = env('MAYAR_CREATE_PAYMENT_PATH', 'payment/create'); 
    $appUrl = rtrim((string) env('APP_URL', 'https://jokiin.my.id'), '/');

    // 4. Tembak API Mayar
    $result = mayar_post($path, [
        'name' => $description,
        'amount' => $amount,
        'referenceId' => $orderCode,
        'customer' => [
            'name' => $customerName,
            'email' => $customerEmail
        ],
        // Arahkan kembali ke beranda JOKIIN, frontend akan menangani sisanya
        'redirectUrl' => $appUrl . '/',
    ]);

    $link = $result['data']['link'] ?? null;
    
    if (!is_string($link) || !filter_var($link, FILTER_VALIDATE_URL)) {
        throw new RuntimeException('Mayar response has no valid data.link');
    }

    // 5. Update Database dengan Link Pembayaran
    db()->prepare('UPDATE orders SET payment_link = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')->execute([$link, $orderCode]);
    
    // 6. Kembalikan Response ke Javascript
    json_response(201, ['order_id' => $orderCode, 'paymentUrl' => $link]);

} catch (Throwable $e) {
    error_log('create-mayar-payment: ' . $e->getMessage());
    json_response(503, ['error' => 'Layanan pembayaran sedang sibuk, silakan coba lagi.']);
}
