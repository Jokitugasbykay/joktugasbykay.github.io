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
// Hosting bersama sering menyimpan file konfigurasi lama di OPcache.
// Invalidasi ini memastikan API key baru langsung digunakan setelah disimpan.
clearstatcache(true, $configPath);
if (function_exists('opcache_invalidate')) @opcache_invalidate($configPath, true);
$config = require $configPath;
$apiKey = trim((string) ($config['api_key'] ?? ''), " \t\r\n\"'");
if ($apiKey === '' || str_starts_with($apiKey, 'ISI_')) {
    reply(503, ['error' => 'API key Mayar belum dikonfigurasi.']);
}
if (!function_exists('curl_init')) {
    reply(500, ['error' => 'Fitur PHP cURL belum aktif di hosting. Aktifkan extension curl pada PHP Selector.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) reply(400, ['error' => 'Data pembayaran tidak valid.']);

$orderCode = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($input['orderCode'] ?? ''));
$amount = (int) ($input['amount'] ?? 0);
$customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
$name = trim((string) ($customer['name'] ?? 'Pelanggan joki.in'));
$email = filter_var((string) ($customer['email'] ?? ''), FILTER_VALIDATE_EMAIL) ?: '';
$mobile = preg_replace('/\D+/', '', (string) ($customer['whatsapp'] ?? ''));
// Form checkout sering menyimpan nomor sebagai 62xxxxxxxxxx; Mayar menerima format lokal 08xxxxxxxxxx.
if (str_starts_with($mobile, '62')) $mobile = '0' . substr($mobile, 2);

if ($orderCode === '' || $amount < 1000 || $name === '' || $mobile === '') {
    reply(422, ['error' => 'Data pesanan belum lengkap untuk pembayaran Mayar.']);
}

$websiteUrl = rtrim((string) ($config['website_url'] ?? ''), '/');
$paymentMethodMap = [
    'mayar_qris' => 'qris',
    'mayar_bni' => 'va/bni',
    'mayar_bri' => 'va/bri',
    'mayar_mandiri' => 'va/mandiri',
    'mayar_cimb' => 'va/cimb',
    'mayar_permata' => 'va/permata',
    'mayar_bjb' => 'va/bjb',
    'mayar_bsi' => 'va/bsi',
    'mayar_dana' => 'ewallet/dana',
    'mayar_gopay' => 'ewallet/gopay',
    'mayar_linkaja' => 'ewallet/linkaja',
    'mayar_shopeepay' => 'ewallet/shopeepay',
    'mayar_jenius' => 'ewallet/jenius',
    'mayar_alfamart' => 'outlet/alfamart',
];
$selectedMethod = (string) ($input['paymentMethod'] ?? '');
$payload = [
    'name' => substr($name, 0, 100),
    'email' => $email,
    'mobile' => $mobile,
    'amount' => $amount,
    'description' => substr((string) ($input['description'] ?? "Pembayaran pesanan {$orderCode}"), 0, 255),
    'redirectUrl' => $websiteUrl . '/?payment=mayar&order=' . rawurlencode($orderCode),
    // Format ISO-8601 wajib pada Mayar API V2; tautan berlaku 24 jam.
    'expiredAt' => gmdate('Y-m-d\\TH:i:s.000\\Z', time() + 86400),
    'extraData' => ['orderCode' => $orderCode],
];
if (isset($paymentMethodMap[$selectedMethod])) {
    $payload['paymentMethod'] = $paymentMethodMap[$selectedMethod];
}

$curl = curl_init('https://api.mayar.id/hl/v2/payments/create');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
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
    $failedResult = json_decode((string) $raw, true);
    $reason = is_array($failedResult) ? (string) ($failedResult['messages'] ?? $failedResult['message'] ?? '') : '';
    if ($reason !== '') reply(502, ['error' => 'Mayar: ' . $reason]);
    if ($raw === false && $curlError !== '') reply(502, ['error' => 'Hosting tidak dapat terhubung ke Mayar: ' . $curlError]);
    reply(502, ['error' => 'Mayar menolak permintaan pembayaran (HTTP ' . $status . ').']);
}

$result = json_decode($raw, true);
$paymentUrl = $result['data']['link'] ?? $result['data']['paymentUrl'] ?? $result['data']['payment_url'] ?? $result['link'] ?? null;
if (!is_string($paymentUrl) || !filter_var($paymentUrl, FILTER_VALIDATE_URL)) {
    error_log('Mayar response without payment link: ' . $raw);
    reply(502, ['error' => 'Respons Mayar tidak memuat tautan pembayaran.']);
}

reply(200, ['paymentUrl' => $paymentUrl]);
