<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_method('POST');

function webhook_signature_is_valid(string $raw): bool
{
    $header = env('MAYAR_WEBHOOK_SIGNATURE_HEADER');
    $algorithm = strtolower((string) env('MAYAR_WEBHOOK_SIGNATURE_ALGORITHM'));
    $secret = env('MAYAR_WEBHOOK_SECRET');
    if ($header === null || $header === '' || $algorithm !== 'hmac-sha256' || $secret === null || $secret === '' || str_starts_with($secret, 'replace_')) return false;
    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $header));
    $provided = trim((string) ($_SERVER[$serverKey] ?? ''));
    if (str_starts_with($provided, 'sha256=')) $provided = substr($provided, 7);
    return $provided !== '' && hash_equals(hash_hmac('sha256', $raw, $secret), $provided);
}

function mayar_transaction_is_paid(string $transactionId): bool
{
    $template = env('MAYAR_TRANSACTION_DETAIL_PATH_TEMPLATE');
    $statusPath = env('MAYAR_TRANSACTION_STATUS_PATH');
    $expected = env('MAYAR_TRANSACTION_PAID_STATUS');
    // Without a documented endpoint and response path this cannot safely confirm payment.
    if (!$template || !$statusPath || !$expected) return false;
    $config = mayar_config();
    $path = str_replace('{transaction_id}', rawurlencode($transactionId), $template);
    $curl = curl_init(rtrim($config['base_url'], '/') . '/' . ltrim($path, '/'));
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$config['api_key'], 'Accept: application/json']]);
    $raw = curl_exec($curl); $http = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
    if (!is_string($raw) || $http < 200 || $http >= 300) return false;
    try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException) { return false; }
    return is_array($body) && hash_equals(strtolower($expected), strtolower((string) dot_get($body, $statusPath)));
}

$raw = file_get_contents('php://input', false, null, 0, 65537);
if (!is_string($raw) || strlen($raw) > 65536 || !webhook_signature_is_valid($raw)) json_response(401, ['error' => 'Invalid webhook signature']);
try { $payload = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException) { json_response(400, ['error' => 'Invalid JSON']); }
if (!is_array($payload)) json_response(400, ['error' => 'Invalid payload']);

$txPath = (string) env('MAYAR_WEBHOOK_TRANSACTION_ID_PATH'); $orderPath = (string) env('MAYAR_WEBHOOK_ORDER_ID_PATH');
$eventPath = (string) env('MAYAR_WEBHOOK_EVENT_PATH'); $statusPath = (string) env('MAYAR_WEBHOOK_STATUS_PATH');
if (!$txPath || !$orderPath || !$eventPath || !$statusPath) json_response(503, ['error' => 'Webhook field mapping is not configured']);
$transactionId = (string) dot_get($payload, $txPath); $orderId = (string) dot_get($payload, $orderPath);
$event = strtolower((string) dot_get($payload, $eventPath)); $status = strtolower((string) dot_get($payload, $statusPath));
if ($transactionId === '' || !preg_match('/^[A-Za-z0-9_-]{6,80}$/', $orderId)) json_response(422, ['error' => 'Webhook identifiers are invalid']);
$paidEvent = in_array($event, ['payment.received', 'success', 'paid'], true) || $status === 'paid';
$canceledEvent = in_array($event, ['canceled', 'cancelled', 'failed', 'expired'], true) || in_array($status, ['canceled', 'cancelled', 'failed', 'expired'], true);
if (!$paidEvent && !$canceledEvent) json_response(200, ['received' => true, 'ignored' => true]);

try {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    $existing = $pdo->prepare('SELECT payment_status FROM orders WHERE mayar_transaction_id = ? LIMIT 1'); $existing->execute([$transactionId]); $bound = $existing->fetch();
    // Strict idempotency: replay of a completed paid transaction is acknowledged only.
    if ($bound && $bound['payment_status'] === 'PAID') { $pdo->commit(); json_response(200, ['received' => true, 'duplicate' => true]); }
    $orderStmt = $pdo->prepare('SELECT order_id, payment_status, mayar_transaction_id FROM orders WHERE order_id = ? LIMIT 1'); $orderStmt->execute([$orderId]); $order = $orderStmt->fetch();
    if (!$order || ($order['mayar_transaction_id'] !== null && $order['mayar_transaction_id'] !== $transactionId)) { $pdo->rollBack(); json_response(422, ['error' => 'Order/transaction binding rejected']); }
    if ($paidEvent && !mayar_transaction_is_paid($transactionId)) { $pdo->rollBack(); json_response(503, ['error' => 'Transaction could not be independently verified']); }
    $next = $paidEvent ? 'PAID' : 'CANCELED';
    $update = $pdo->prepare('UPDATE orders SET mayar_transaction_id = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP, paid_at = CASE WHEN ? = "PAID" THEN CURRENT_TIMESTAMP ELSE paid_at END WHERE order_id = ? AND payment_status != "PAID"');
    $update->execute([$transactionId, $next, $next, $orderId]);
    $delivery = $pdo->prepare('INSERT INTO webhook_deliveries (transaction_id, status, completed_at) VALUES (?, "completed", CURRENT_TIMESTAMP) ON CONFLICT(transaction_id) DO UPDATE SET status="completed", attempt_count=attempt_count+1, updated_at=CURRENT_TIMESTAMP, completed_at=CURRENT_TIMESTAMP');
    $delivery->execute([$transactionId]); $pdo->commit(); json_response(200, ['received' => true]);
} catch (Throwable $e) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); error_log('mayar-webhook: '.$e->getMessage()); json_response(500, ['error' => 'Webhook processing failed']); }
