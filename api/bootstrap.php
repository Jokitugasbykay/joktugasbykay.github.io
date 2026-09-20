<?php
declare(strict_types=1);

// File pustaka (include-only). Akses langsung lewat HTTP ditolak di sini dan di .htaccess.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

const APP_ROOT = __DIR__ . '/..';
const SCHEMA_VERSION = 2;

/** Galat yang aman ditampilkan ke pengguna (pesan + kode HTTP). */
class ApiException extends RuntimeException
{
    public function __construct(string $message, public int $status = 422, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function load_env_file(string $path): array
{
    if (!is_file($path) || !is_readable($path)) return [];
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;
        [$key, $value] = $parts;
        $key = trim($key);
        $value = trim($value);
        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $key)) continue;
        if (strlen($value) >= 2 && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) {
            $value = substr($value, 1, -1);
        }
        $values[$key] = $value;
    }
    return $values;
}

/** Variabel lingkungan server didahulukan, lalu .env. Nilai kosong dianggap tidak diisi. */
function env(string $key, ?string $default = null): ?string
{
    static $file = null;
    $file ??= load_env_file(APP_ROOT . '/.env');
    $value = $_ENV[$key] ?? getenv($key);
    if (!is_string($value) || $value === '') $value = $file[$key] ?? null;
    return is_string($value) && $value !== '' ? $value : $default;
}

function json_response(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        json_response(405, ['error' => 'Method not allowed']);
    }
}

function request_json(int $maxBytes = 32768): array
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if (!is_string($raw) || strlen($raw) > $maxBytes) json_response(413, ['error' => 'Request body too large']);
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_response(400, ['error' => 'Invalid JSON']);
    }
    if (!is_array($data)) json_response(400, ['error' => 'JSON object expected']);
    return $data;
}

/** Potong string ke $max karakter (aman untuk UTF-8; tetap jalan tanpa ekstensi mbstring). */
function str_clip(string $value, int $max): string
{
    if (function_exists('mb_substr')) return mb_substr($value, 0, $max, 'UTF-8');
    if (preg_match('/^.{0,' . $max . '}/us', $value, $m)) return $m[0];
    return substr($value, 0, $max);
}

/** IP klien. Di belakang Cloudflare, REMOTE_ADDR adalah IP Cloudflare, jadi header CF dipakai bila ada. */
function client_ip(): string
{
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown';
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (env('DB_DRIVER', 'sqlite') !== 'sqlite') throw new RuntimeException('Only SQLite is supported.');

    $relative = env('DB_PATH', 'storage/jokiin.sqlite');
    if ($relative === null || str_contains($relative, "\0")) throw new RuntimeException('Invalid DB_PATH');
    $relative = str_replace('\\', '/', $relative);
    // Path absolut (mis. di luar public_html) dipakai apa adanya; path relatif dihitung dari folder proyek.
    $path = str_starts_with($relative, '/') || preg_match('#^[A-Za-z]:/#', $relative) ? $relative : APP_ROOT . '/' . $relative;
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create database directory');

    $connection = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $connection->exec('PRAGMA busy_timeout = 5000');
    ensure_schema($connection);
    return $pdo = $connection;
}

/** Membuat/memperbarui skema dari database/schema.sql. Jalur cepat: satu PRAGMA bila sudah mutakhir. */
function ensure_schema(PDO $pdo): void
{
    if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() >= SCHEMA_VERSION) return;

    $schema = @file_get_contents(APP_ROOT . '/database/schema.sql');
    if (!is_string($schema) || $schema === '') throw new RuntimeException('database/schema.sql tidak terbaca');

    $pdo->exec('BEGIN IMMEDIATE');
    try {
        if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() < SCHEMA_VERSION) {
            $hasOrders = (bool) $pdo->query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'orders'")->fetchColumn();
            if ($hasOrders) {
                // Database lama: tambahkan kolom yang belum ada sebelum indeks pada schema.sql dibuat.
                $existing = array_column($pdo->query('PRAGMA table_info(orders)')->fetchAll(), 'name');
                $additions = [
                    'service_id' => "TEXT NOT NULL DEFAULT 'custom'",
                    'idempotency_key' => 'TEXT', 'mayar_payment_id' => 'TEXT',
                    'customer_nim' => 'TEXT', 'customer_whatsapp' => 'TEXT',
                    'task_title' => 'TEXT', 'task_deadline' => 'TEXT', 'task_notes' => 'TEXT', 'task_drive_url' => 'TEXT',
                    'items_json' => 'TEXT', 'promo' => 'TEXT',
                    'expires_at' => 'TEXT', 'last_checked_at' => 'TEXT', 'paid_at' => 'TEXT',
                ];
                foreach ($additions as $column => $definition) {
                    if (!in_array($column, $existing, true)) $pdo->exec("ALTER TABLE orders ADD COLUMN $column $definition");
                }
            }
            $pdo->exec($schema);
            $pdo->exec('PRAGMA user_version = ' . SCHEMA_VERSION);
        }
        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->exec('ROLLBACK');
        throw $e;
    }
}

/** true = boleh lanjut; false = batas terlampaui. Jendela geser sederhana berbasis SQLite. */
function rate_limit_allow(string $bucket, int $max, int $windowSeconds): bool
{
    $pdo = db();
    $now = time();
    if (random_int(1, 20) === 1) $pdo->prepare('DELETE FROM rate_limits WHERE ts < ?')->execute([$now - 7200]);
    $count = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE bucket = ? AND ts > ?');
    $count->execute([$bucket, $now - $windowSeconds]);
    if ((int) $count->fetchColumn() >= $max) return false;
    $pdo->prepare('INSERT INTO rate_limits (bucket, ts) VALUES (?, ?)')->execute([$bucket, $now]);
    return true;
}

/** ID pesanan acak 128-bit yang tidak bisa ditebak: ord_ + 32 heksadesimal. */
function new_order_id(): string
{
    return 'ord_' . bin2hex(random_bytes(16));
}

function dot_get(array $data, string $path): mixed
{
    if ($path === '') return null;
    foreach (explode('.', $path) as $segment) {
        if (!is_array($data) || !array_key_exists($segment, $data)) return null;
        $data = $data[$segment];
    }
    return $data;
}
