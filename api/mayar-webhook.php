<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_once __DIR__ . '/order-lib.php';

require_method('POST');

/**
 * Pemeriksaan tambahan yang opsional. Dokumentasi webhook Mayar tidak menyebut tanda tangan HMAC, jadi
 * keamanan utama BUKAN di sini: isi webhook hanya dipakai untuk menemukan pesanan, sedangkan status
 * "dibayar" selalu dikonfirmasi ulang ke API Mayar (lihat reconcile_order).
 *  - MAYAR_WEBHOOK_TOKEN: pasang di URL webhook sebagai ?token=... (dibandingkan aman waktu).
 *  - MAYAR_WEBHOOK_SIGNATURE_HEADER + MAYAR_WEBHOOK_SECRET: hanya bila Mayar memang mengirim HMAC-SHA256.
 */
function webhook_is_authorized(string $raw): bool
{
    $token = env('MAYAR_WEBHOOK_TOKEN');
    if ($token !== null && !hash_equals($token, (string) ($_GET['token'] ?? ''))) return false;

    $header = env('MAYAR_WEBHOOK_SIGNATURE_HEADER');
    $secret = env('MAYAR_WEBHOOK_SECRET');
    if ($header !== null && $secret !== null && !str_starts_with($secret, 'replace_')) {
        $provided = trim((string) ($_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $header))] ?? ''));
        if (str_starts_with($provided, 'sha256=')) $provided = substr($provided, 7);
        if ($provided === '' || !hash_equals(hash_hmac('sha256', $raw, $secret), $provided)) return false;
    }
    return true;
}

try {
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    if (!is_string($raw) || strlen($raw) > 65536) json_response(413, ['error' => 'Payload too large']);
    if (!webhook_is_authorized($raw)) json_response(401, ['error' => 'Unauthorized webhook']);

    try {
        $payload = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_response(400, ['error' => 'Invalid JSON']);
    }
    if (!is_array($payload)) json_response(400, ['error' => 'Invalid payload']);

    // Lokasi ID di payload berbeda antar jenis event; coba semua kandidat yang lazim.
    $candidates = [];
    foreach (['data.transactionId', 'data.transaction_id', 'data.id', 'transactionId', 'id'] as $path) {
        $value = dot_get($payload, $path);
        if (is_string($value)) $candidates[] = $value;
    }

    $order = find_order_by_mayar_ids($candidates);
    // Bukan pesanan kita (mis. tombol "Test URL Hook"): balas 200 agar Mayar tidak mengulang, tanpa memanggil API.
    if ($order === null) json_response(200, ['received' => true, 'matched' => false]);

    $status = reconcile_order($order);
    // Mayar tidak dapat dihubungi: balas 503 supaya Mayar mengirim ulang webhook-nya nanti.
    if ($status === null) json_response(503, ['error' => 'Verification unavailable, retry later']);

    json_response(200, ['received' => true, 'matched' => true, 'payment_status' => $status]);
} catch (Throwable $e) {
    error_log('mayar-webhook: ' . $e->getMessage());
    json_response(500, ['error' => 'Webhook processing failed']);
}
