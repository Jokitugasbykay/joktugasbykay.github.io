<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$orderId = (string) ($_GET['order_id'] ?? '');
if (!preg_match('/^ord_[a-f0-9]{32}$/', $orderId)) json_response(422, ['error' => 'Invalid order_id']);
try {
    $stmt = db()->prepare('SELECT order_id, payment_status FROM orders WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]); $order = $stmt->fetch();
    if (!$order) json_response(404, ['error' => 'Order not found']);
    json_response(200, ['order_id' => $order['order_id'], 'payment_status' => $order['payment_status']]);
} catch (Throwable $e) { error_log('check-status: '.$e->getMessage()); json_response(500, ['error' => 'Unable to check order status']); }
