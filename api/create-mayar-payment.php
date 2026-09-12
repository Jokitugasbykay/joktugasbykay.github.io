<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(405, ['error' => 'Metode tidak diizinkan.']);
}

$configPath = __DIR__ . '/mayar-config.php';
if (!is_file($configPath)) {
    reply(503, ['error' => 'Pembayaran Mayar belum dikonfigurasi di server.']);
}
$config = require $configPath;
if (empty($config['api_key']) || str_starts_with((string) $config['api_key'], 'ISI_')) {
    reply(503, ['error' => 'API key Mayar belum dikonfigurasi.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) reply(400, ['error' => 'Data pembayaran tidak valid.']);

$orderCode = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($input['orderCode'] ?? ''));
$amount = (int) ($input['amount'] ?? 0);
$customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
$name = trim((string) ($customer['name'] ?? 'Pelanggan joki.in'));
$email = filter_var((string) ($customer['email'] ?? ''), FILTER_VALIDATE_EMAIL) ?: '';
$mobile = preg_replace('/\D+/', '', (string) ($customer['whatsapp'] ?? ''));

if ($orderCode === '' || $amount < 1000 || $name === '' || $mobile === '') {
    reply(422, ['error' => 'Data pesanan belum lengkap untuk pembayaran Mayar.']);
}

$websiteUrl = rtrim((string) ($config['website_url'] ?? ''), '/');
$payload = [
    'name' => substr($name, 0, 100),
    'email' => $email,
    'mobile' => $mobile,
    'amount' => $amount,
    'description' => substr((string) ($input['description'] ?? "Pembayaran pesanan {$orderCode}"), 0, 255),
    'redirectUrl' => $websiteUrl . '/?payment=mayar&order=' . rawurlencode($orderCode),
    'externalId' => $orderCode,
];

$curl = curl_init('https://api.mayar.id/hl/v1/payment/create');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $config['api_key'],
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
]);
$raw = curl_exec($curl);
$status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
curl_close($curl);

if ($raw === false || $status < 200 || $status >= 300) {
    error_log('Mayar create-payment failed: HTTP ' . $status . ' ' . $curlError);
    reply(502, ['error' => 'Mayar belum dapat membuat tautan pembayaran.']);
}

$result = json_decode($raw, true);
$paymentUrl = $result['data']['link'] ?? $result['data']['paymentUrl'] ?? $result['data']['payment_url'] ?? $result['link'] ?? null;
if (!is_string($paymentUrl) || !filter_var($paymentUrl, FILTER_VALIDATE_URL)) {
    error_log('Mayar response without payment link: ' . $raw);
    reply(502, ['error' => 'Respons Mayar tidak memuat tautan pembayaran.']);
}

reply(200, ['paymentUrl' => $paymentUrl]);
