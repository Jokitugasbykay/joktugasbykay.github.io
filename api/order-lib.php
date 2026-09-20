<?php
declare(strict_types=1);

// Pustaka pesanan (include-only): harga dari katalog, panggilan API Mayar, dan rekonsiliasi status.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__ . '/mayar-config.php';

// Jumlah minimum per layanan. Cermin dari PRICE_RULES di index.html.
const MIN_QUANTITY = ['makalah' => 10];

/** Permintaan HTTP JSON via cURL. Tidak pernah melempar galat jaringan; cek 'status' (0 = gagal terhubung). */
function http_json(string $method, string $url, array $headers, ?array $payload = null, int $timeout = 15): array
{
    $curl = curl_init($url);
    $headers = array_merge(['Accept: application/json'], $headers);
    $options = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($payload !== null) {
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        $headers[] = 'Content-Type: application/json';
    }
    $options[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($curl, $options);

    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_error($curl);

    $body = null;
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true, 32);
        if (is_array($decoded)) $body = $decoded;
    }
    return ['status' => $status, 'body' => $body, 'raw' => is_string($raw) ? $raw : '', 'error' => $error];
}

function mayar_request(string $method, string $path, ?array $payload = null): array
{
    $config = mayar_config();
    return http_json($method, $config['base_url'] . '/' . ltrim($path, '/'), ['Authorization: Bearer ' . $config['api_key']], $payload);
}

/** Harga resmi dari tabel services di Supabase (sumber yang sama dengan yang dibaca frontend). */
function catalog_lookup(array $slugs): array
{
    $base = rtrim((string) env('SUPABASE_URL'), '/');
    $key = env('SUPABASE_ANON_KEY');
    if ($base === '' || $key === null) throw new RuntimeException('SUPABASE_URL / SUPABASE_ANON_KEY belum diisi');

    // Kunci publishable baru (sb_...) bukan JWT: cukup dikirim lewat header apikey.
    $headers = ['apikey: ' . $key];
    if (str_starts_with($key, 'eyJ')) $headers[] = 'Authorization: Bearer ' . $key;

    $url = $base . '/rest/v1/services?select=slug,name,price&status=eq.active&slug=in.(' . implode(',', $slugs) . ')';
    $res = http_json('GET', $url, $headers, null, 10);
    if ($res['status'] !== 200 || !is_array($res['body'])) {
        error_log('catalog_lookup failed: HTTP ' . $res['status'] . ' ' . $res['error'] . ' ' . str_clip($res['raw'], 300));
        throw new ApiException('Daftar harga belum dapat dimuat. Coba lagi sebentar.', 503);
    }

    $catalog = [];
    foreach ($res['body'] as $row) {
        if (!is_array($row) || !is_string($row['slug'] ?? null)) continue;
        $price = (int) round((float) ($row['price'] ?? 0));
        if ($price > 0) $catalog[$row['slug']] = ['name' => (string) ($row['name'] ?? $row['slug']), 'price' => $price];
    }
    return $catalog;
}

/**
 * Menghitung total di server. $items: slug => jumlah (sudah digabung dan divalidasi).
 * Browser boleh mengirim perkiraan total, tapi angka resmi hanya dari sini.
 */
function compute_order(array $items, string $promo): array
{
    $catalog = catalog_lookup(array_keys($items));
    $subtotal = 0;
    $lines = [];
    foreach ($items as $slug => $quantity) {
        if (!isset($catalog[$slug])) {
            throw new ApiException('Salah satu layanan tidak tersedia lagi. Muat ulang halaman lalu coba lagi.', 409);
        }
        $minimum = MIN_QUANTITY[$slug] ?? 1;
        if ($quantity < $minimum) throw new ApiException('Jumlah minimum untuk ' . $catalog[$slug]['name'] . ' adalah ' . $minimum . '.', 422);
        $lines[] = ['slug' => $slug, 'name' => $catalog[$slug]['name'], 'price' => $catalog[$slug]['price'], 'quantity' => $quantity];
        $subtotal += $catalog[$slug]['price'] * $quantity;
    }

    $rate = $promo === 'MAHASISWA10' ? min(0.5, max(0.0, (float) env('PROMO_MAHASISWA10_RATE', '0.1'))) : 0.0;
    $discount = (int) round($subtotal * $rate);
    $fee = max(0, (int) env('SERVICE_FEE', '0'));
    $total = $subtotal - $discount + $fee;
    if ($total < 1000) throw new ApiException('Total pembayaran minimal Rp1.000.', 422);

    return ['lines' => $lines, 'subtotal' => $subtotal, 'discount' => $discount, 'fee' => $fee, 'total' => $total];
}

/** Detail transaksi dari Mayar (GET /transactions/{id}). null = gagal terhubung/galat server (boleh dicoba lagi). */
function mayar_fetch_transaction(string $transactionId): ?array
{
    $template = env('MAYAR_TRANSACTION_DETAIL_PATH_TEMPLATE', 'transactions/{transaction_id}');
    $res = mayar_request('GET', str_replace('{transaction_id}', rawurlencode($transactionId), $template));
    if ($res['status'] === 404) return ['status' => 'not_found', 'amount' => null];
    if ($res['status'] < 200 || $res['status'] >= 300 || !is_array($res['body'])) {
        error_log('mayar_fetch_transaction failed: HTTP ' . $res['status'] . ' ' . $res['error'] . ' ' . str_clip($res['raw'], 300));
        return null;
    }
    $status = dot_get($res['body'], 'data.status');
    $amount = dot_get($res['body'], 'data.amount');
    return [
        'status' => is_string($status) ? strtolower($status) : '',
        'amount' => is_numeric($amount) ? (int) round((float) $amount) : null,
    ];
}

/**
 * Menyamakan status pesanan dengan Mayar. Satu-satunya tempat pesanan boleh menjadi PAID:
 * status "paid" dari API Mayar (bukan dari isi webhook) DAN nominal minimal sama dengan pesanan.
 * Mengembalikan status terbaru, atau null jika Mayar tidak dapat dihubungi.
 */
function reconcile_order(array $order): ?string
{
    if ($order['payment_status'] === 'PAID') return 'PAID';
    $transactionId = $order['mayar_transaction_id'] ?? null;
    if (!is_string($transactionId) || $transactionId === '') return (string) $order['payment_status'];

    $transaction = mayar_fetch_transaction($transactionId);
    if ($transaction === null) return null;

    $pdo = db();
    if ($transaction['status'] === 'paid') {
        if ($transaction['amount'] === null || $transaction['amount'] < (int) $order['amount']) {
            error_log('reconcile_order: nominal tidak cocok untuk ' . $order['order_id'] . ' (dibayar ' . var_export($transaction['amount'], true) . ', pesanan ' . $order['amount'] . ')');
            return (string) $order['payment_status'];
        }
        // Tanpa transaksi eksplisit: satu UPDATE atomik, aman dipanggil berulang (webhook dan polling).
        $pdo->prepare('UPDATE orders SET payment_status = ?, paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND payment_status <> ?')
            ->execute(['PAID', $order['order_id'], 'PAID']);
        return 'PAID';
    }
    if (in_array($transaction['status'], ['expired', 'canceled', 'cancelled', 'failed'], true)) {
        $pdo->prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND payment_status = ?')
            ->execute(['CANCELED', $order['order_id'], 'PENDING']);
        return 'CANCELED';
    }
    return (string) $order['payment_status'];
}

/** Cari pesanan lewat ID transaksi/permintaan pembayaran Mayar (yang kita simpan saat membuat link). */
function find_order_by_mayar_ids(array $ids): ?array
{
    $ids = array_values(array_unique(array_filter($ids, fn($v) => is_string($v) && preg_match('/^[A-Za-z0-9_-]{8,80}$/', $v))));
    if (!$ids) return null;
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare("SELECT * FROM orders WHERE mayar_transaction_id IN ($marks) OR mayar_payment_id IN ($marks) LIMIT 1");
    $stmt->execute(array_merge($ids, $ids));
    return $stmt->fetch() ?: null;
}
