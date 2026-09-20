<?php
declare(strict_types=1);
require_once __DIR__ . '/mayar-config.php';
require_once __DIR__ . '/order-lib.php';

require_method('POST');

/** Validasi dan normalisasi isi checkout dari browser. Semua string dibersihkan dan dibatasi panjangnya. */
function parse_checkout_input(array $in): array
{
    $line = static function (mixed $v, int $max): string {
        $s = is_string($v) ? (preg_replace('/[\p{C}\s]+/u', ' ', $v) ?? '') : '';
        return str_clip(trim($s), $max);
    };
    $text = static function (mixed $v, int $max): string {
        $s = is_string($v) ? (preg_replace('/[^\P{C}\n]+/u', '', $v) ?? '') : '';
        return str_clip(trim($s), $max);
    };

    $customer = is_array($in['customer'] ?? null) ? $in['customer'] : [];
    $name = $line($customer['name'] ?? '', 100);
    $email = strtolower($line($customer['email'] ?? '', 120));
    $whatsapp = preg_replace('/\D+/', '', is_string($customer['whatsapp'] ?? null) ? $customer['whatsapp'] : '') ?? '';
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiException('Nama atau email tidak valid.');
    if (strlen($whatsapp) < 8 || strlen($whatsapp) > 16) throw new ApiException('Nomor WhatsApp tidak valid.');

    $task = is_array($in['task'] ?? null) ? $in['task'] : [];
    $title = $line($task['title'] ?? '', 200);
    $drive = $line($task['googleDriveUrl'] ?? '', 500);
    if ($title === '') throw new ApiException('Judul tugas wajib diisi.');
    // Hanya https: link ini nanti ditampilkan ke admin sebagai tautan yang bisa diklik.
    if ($drive !== '' && (!filter_var($drive, FILTER_VALIDATE_URL) || strtolower((string) parse_url($drive, PHP_URL_SCHEME)) !== 'https')) {
        throw new ApiException('Link Google Drive harus diawali https://');
    }

    $rawItems = $in['items'] ?? null;
    if (!is_array($rawItems) || !$rawItems || count($rawItems) > 20) throw new ApiException('Keranjang tidak valid.');
    $items = [];
    foreach ($rawItems as $row) {
        $slug = is_array($row) && is_string($row['productId'] ?? null) ? $row['productId'] : '';
        $quantity = is_array($row) && is_int($row['quantity'] ?? null) ? $row['quantity'] : 0;
        if (!preg_match('/^[a-z0-9-]{1,80}$/', $slug) || $quantity < 1 || $quantity > 100) throw new ApiException('Keranjang tidak valid.');
        $items[$slug] = ($items[$slug] ?? 0) + $quantity;
        if ($items[$slug] > 100) throw new ApiException('Keranjang tidak valid.');
    }

    $promo = strtoupper($line($in['promo'] ?? '', 40));
    if ($promo !== '' && $promo !== 'MAHASISWA10') throw new ApiException('Kode promo tidak valid.');

    $draftKey = is_string($in['draftKey'] ?? null) && preg_match('/^[A-Za-z0-9_-]{6,80}$/', $in['draftKey']) ? $in['draftKey'] : null;
    $claimed = is_numeric($in['amount'] ?? null) ? (float) $in['amount'] : null;

    return [
        'draftKey' => $draftKey, 'claimedTotal' => $claimed, 'items' => $items, 'promo' => $promo,
        'name' => $name, 'email' => $email, 'whatsapp' => $whatsapp, 'nim' => $line($customer['nim'] ?? '', 30),
        'title' => $title, 'deadline' => $line($task['deadline'] ?? '', 40), 'notes' => $text($task['notes'] ?? '', 3000), 'drive' => $drive,
    ];
}

function payment_response(array $order, int $status): never
{
    json_response($status, [
        'order_id' => $order['order_id'],
        'paymentUrl' => $order['payment_link'],
        'payment_status' => $order['payment_status'],
        'expires_at' => $order['expires_at'],
        'transaction_id' => $order['mayar_transaction_id'],
        'total' => (int) $order['amount'],
    ]);
}

/** Hapus baris pesanan yang gagal mendapat link pembayaran, supaya tidak ada pesanan yatim. */
function discard_unlinked_order(?string $orderId): void
{
    if ($orderId === null) return;
    try {
        db()->prepare('DELETE FROM orders WHERE order_id = ? AND payment_link IS NULL')->execute([$orderId]);
    } catch (Throwable) {
    }
}

$orderId = null;
try {
    if (!rate_limit_allow('create:' . client_ip(), 30, 600)) {
        json_response(429, ['error' => 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.']);
    }

    $in = parse_checkout_input(request_json());

    // Harga dihitung ulang di server dari katalog. Angka dari browser hanya dipakai untuk mendeteksi harga yang berubah.
    $pricing = compute_order($in['items'], $in['promo']);
    if ($in['claimedTotal'] !== null && abs($in['claimedTotal'] - $pricing['total']) > 1) {
        throw new ApiException('Harga layanan berubah. Muat ulang halaman untuk melihat harga terbaru.', 409, ['total' => $pricing['total']]);
    }
    $total = $pricing['total'];
    $pdo = db();

    // Kirim ulang dengan draftKey yang sama (klik ganda, koneksi putus) memakai lagi pesanan yang sudah ada.
    if ($in['draftKey'] !== null) {
        $existing = $pdo->prepare('SELECT * FROM orders WHERE idempotency_key = ? ORDER BY created_at DESC, rowid DESC LIMIT 1');
        $existing->execute([$in['draftKey']]);
        $row = $existing->fetch();
        if ($row && $row['payment_link'] && (int) $row['amount'] === $total
            && ($row['payment_status'] === 'PAID' || ($row['payment_status'] === 'PENDING' && strtotime((string) $row['expires_at']) > time() + 60))) {
            payment_response($row, 200);
        }
    }

    $orderId = new_order_id();
    $serviceIds = implode(',', array_keys($in['items']));
    $pdo->prepare(
        'INSERT INTO orders (order_id, idempotency_key, service_id, amount, payment_status, customer_name, customer_email, customer_nim, customer_whatsapp, task_title, task_deadline, task_notes, task_drive_url, items_json, promo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $orderId, $in['draftKey'], $serviceIds, $total, 'PENDING', $in['name'], $in['email'], $in['nim'], $in['whatsapp'],
        $in['title'], $in['deadline'], $in['notes'], $in['drive'],
        json_encode($pricing['lines'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), $in['promo'],
    ]);

    $appUrl = rtrim((string) env('APP_URL', 'https://jokiin.my.id'), '/');
    $expiresAt = (new DateTimeImmutable('+24 hours', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.000\Z');
    $summary = implode(', ', array_map(fn($l) => $l['name'] . ' x' . $l['quantity'], $pricing['lines']));
    $payload = [
        'name' => str_clip('JOKI.IN - ' . $pricing['lines'][0]['name'], 100),
        'amount' => $total,
        'email' => $in['email'],
        'mobile' => $in['whatsapp'],
        'description' => str_clip('Pesanan ' . $orderId . ': ' . $summary, 250),
        'expiredAt' => $expiresAt,
        'redirectUrl' => $appUrl . '/?payment=complete&order_id=' . $orderId,
    ];

    $res = mayar_request('POST', env('MAYAR_CREATE_PAYMENT_PATH', 'payments/create'), $payload);
    // Untuk payment request, Mayar bisa menolak redirectUrl dengan 400. Ulangi tanpa itu:
    // halaman sukses tetap memantau status sendiri lewat check-status.php.
    if ($res['status'] === 400 && stripos($res['raw'], 'redirectUrl') !== false) {
        unset($payload['redirectUrl']);
        $res = mayar_request('POST', env('MAYAR_CREATE_PAYMENT_PATH', 'payments/create'), $payload);
    }

    $data = is_array($res['body']['data'] ?? null) ? $res['body']['data'] : [];
    $link = $data['link'] ?? null;
    $transactionId = $data['transactionId'] ?? $data['transaction_id'] ?? null;
    $paymentId = $data['id'] ?? null;
    $envelopeOk = !isset($res['body']['statusCode']) || (int) $res['body']['statusCode'] < 400;

    if ($res['status'] < 200 || $res['status'] >= 300 || !$envelopeOk
        || !is_string($link) || !filter_var($link, FILTER_VALIDATE_URL)
        || !is_string($transactionId) || $transactionId === '') {
        error_log('create-mayar-payment: Mayar menolak/balasan tak lengkap: HTTP ' . $res['status'] . ' ' . $res['error'] . ' ' . str_clip($res['raw'], 500));
        throw new ApiException('Layanan pembayaran sedang sibuk, silakan coba lagi.', 503);
    }

    $pdo->prepare('UPDATE orders SET payment_link = ?, mayar_transaction_id = ?, mayar_payment_id = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
        ->execute([$link, $transactionId, is_string($paymentId) ? $paymentId : null, $expiresAt, $orderId]);

    payment_response([
        'order_id' => $orderId, 'payment_link' => $link, 'payment_status' => 'PENDING', 'expires_at' => $expiresAt,
        'mayar_transaction_id' => $transactionId, 'amount' => $total,
    ], 201);

} catch (ApiException $e) {
    discard_unlinked_order($orderId);
    json_response($e->status, ['error' => $e->getMessage()] + $e->extra);
} catch (Throwable $e) {
    discard_unlinked_order($orderId);
    error_log('create-mayar-payment: ' . $e->getMessage());
    json_response(503, ['error' => 'Layanan pembayaran sedang sibuk, silakan coba lagi.']);
}
