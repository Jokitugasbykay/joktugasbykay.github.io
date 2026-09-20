<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_once __DIR__ . '/order-lib.php';

require_method('GET');

// ID baru: ord_ + 32 heksadesimal. Bentuk lama (UUID/kode) tetap diterima agar pesanan lama bisa dicek.
$orderId = (string) ($_GET['order_id'] ?? '');
if (!preg_match('/^[A-Za-z0-9_-]{6,80}$/', $orderId)) json_response(422, ['error' => 'Invalid order_id']);

try {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) json_response(404, ['error' => 'Order not found']);

    // Halaman sukses memantau tiap beberapa detik. Sekali per 8 detik per pesanan kita tanya Mayar langsung,
    // sehingga status tetap benar walau webhook terlambat atau tidak pernah datang.
    if ($order['payment_status'] === 'PENDING' && $order['mayar_transaction_id']) {
        $lastChecked = $order['last_checked_at'] ? (int) strtotime($order['last_checked_at'] . ' UTC') : 0;
        if (time() - $lastChecked >= 8) {
            $pdo->prepare('UPDATE orders SET last_checked_at = ? WHERE order_id = ?')->execute([gmdate('Y-m-d H:i:s'), $orderId]);
            $status = reconcile_order($order);
            if ($status !== null) $order['payment_status'] = $status;
        }
    }

    $pending = $order['payment_status'] === 'PENDING';
    json_response(200, [
        'order_id' => $order['order_id'],
        'payment_status' => $order['payment_status'],
        'amount' => (int) $order['amount'],
        'payment_url' => $pending ? $order['payment_link'] : null,
        'expires_at' => $order['expires_at'],
    ]);
} catch (Throwable $e) {
    error_log('check-status: ' . $e->getMessage());
    json_response(500, ['error' => 'Unable to check order status']);
}
