<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

require_method('GET');

// Daftar pesanan lengkap (termasuk detail tugas) untuk admin. Mati bila ADMIN_TOKEN belum diisi.
// Memakai header X-Admin-Token, bukan Authorization, karena banyak hosting PHP/CGI membuang header Authorization.
$token = env('ADMIN_TOKEN');
if ($token === null || strlen($token) < 24 || str_starts_with($token, 'replace_')) {
    json_response(503, ['error' => 'Endpoint admin belum dikonfigurasi']);
}

try {
    if (!rate_limit_allow('admin:' . client_ip(), 30, 600)) json_response(429, ['error' => 'Terlalu banyak percobaan']);
    if (!hash_equals($token, (string) ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''))) json_response(401, ['error' => 'Token admin salah']);

    $filter = (string) ($_GET['status'] ?? 'paid');
    $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
    $where = ['paid' => 'WHERE payment_status = ?', 'pending' => 'WHERE payment_status = ?', 'canceled' => 'WHERE payment_status = ?', 'all' => ''];
    if (!isset($where[$filter])) json_response(422, ['error' => 'status harus paid, pending, canceled, atau all']);

    $stmt = db()->prepare('SELECT * FROM orders ' . $where[$filter] . ' ORDER BY COALESCE(paid_at, created_at) DESC LIMIT ' . $limit);
    $stmt->execute($filter === 'all' ? [] : [strtoupper($filter)]);

    $orders = array_map(static fn(array $o): array => [
        'order_id' => $o['order_id'],
        'payment_status' => $o['payment_status'],
        'amount' => (int) $o['amount'],
        'created_at' => $o['created_at'],
        'paid_at' => $o['paid_at'],
        'customer' => ['name' => $o['customer_name'], 'email' => $o['customer_email'], 'whatsapp' => $o['customer_whatsapp'], 'nim' => $o['customer_nim']],
        'task' => ['title' => $o['task_title'], 'deadline' => $o['task_deadline'], 'notes' => $o['task_notes'], 'drive_url' => $o['task_drive_url']],
        'items' => json_decode((string) $o['items_json'], true) ?: [],
        'promo' => $o['promo'],
    ], $stmt->fetchAll());

    json_response(200, ['orders' => $orders]);
} catch (Throwable $e) {
    error_log('admin-orders: ' . $e->getMessage());
    json_response(500, ['error' => 'Gagal memuat pesanan']);
}
