<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function webhookReply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') webhookReply(405, ['error' => 'Method not allowed']);

$configPath = __DIR__ . '/mayar-config.php';
if (!is_file($configPath)) webhookReply(503, ['error' => 'Webhook belum dikonfigurasi']);
$config = require $configPath;
$expectedToken = (string) ($config['webhook_token'] ?? '');
$receivedToken = $_SERVER['HTTP_X_CALLBACK_TOKEN'] ?? $_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? '';
// Dashboard Mayar dapat menguji URL tanpa header token. Token pada query URL
// memungkinkan URL tetap terverifikasi (mis. ?token=rahasia-webhook).
if ($receivedToken === '') $receivedToken = (string) ($_GET['token'] ?? '');
if ($expectedToken === '' || !hash_equals($expectedToken, (string) $receivedToken)) {
    webhookReply(401, ['error' => 'Webhook token tidak valid']);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) webhookReply(400, ['error' => 'Payload tidak valid']);

// Teruskan ke backend internal jika endpoint pembaruan order telah disiapkan.
$forwardUrl = (string) ($config['webhook_forward_url'] ?? '');
if ($forwardUrl !== '') {
    $curl = curl_init($forwardUrl);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $raw,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-Mayar-Webhook: 1'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    curl_exec($curl);
    $forwardStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($forwardStatus < 200 || $forwardStatus >= 300) webhookReply(502, ['error' => 'Backend status pesanan belum dapat diperbarui']);
}

webhookReply(200, ['received' => true]);
