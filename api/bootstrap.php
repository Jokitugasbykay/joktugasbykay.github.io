<?php
declare(strict_types=1);

const APP_ROOT = __DIR__ . '/..';

function load_env_file(string $path): array {
    if (!is_file($path) || !is_readable($path)) return [];
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$key, $value] = array_pad(explode('=', $line, 2), 2, null);
        if ($value === null || !preg_match('/^[A-Z][A-Z0-9_]*$/', trim($key))) continue;
        $value = trim($value);
        if (strlen($value) >= 2 && in_array($value[0], ["'", '"'], true) && $value[0] === substr($value, -1)) $value = substr($value, 1, -1);
        $values[trim($key)] = $value;
    }
    return $values;
}

function env(string $key, ?string $default = null): ?string {
    static $values = null;
    $values ??= load_env_file(APP_ROOT . '/.env');
    $value = $_ENV[$key] ?? getenv($key) ?: ($values[$key] ?? $default);
    return is_string($value) ? $value : $default;
}

function json_response(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function require_method(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        json_response(405, ['error' => 'Method not allowed']);
    }
}

function request_json(int $maxBytes = 16384): array {
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if (!is_string($raw) || strlen($raw) > $maxBytes) json_response(413, ['error' => 'Request body too large']);
    try { $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { json_response(400, ['error' => 'Invalid JSON']); }
    if (!is_array($data)) json_response(400, ['error' => 'JSON object expected']);
    return $data;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (env('DB_DRIVER', 'sqlite') !== 'sqlite') throw new RuntimeException('DB_DRIVER must be sqlite for this deployment.');

    $relativePath = env('DB_PATH', 'storage/jokiin.sqlite');
    if ($relativePath === null || $relativePath === '' || str_contains($relativePath, "\0")) throw new RuntimeException('DB_PATH is empty or invalid.');
    $normalised = str_replace('\\', '/', $relativePath);
    if (str_starts_with($normalised, '/') || preg_match('/^[A-Za-z]:\//', $normalised) || str_contains($normalised, '../')) throw new RuntimeException('DB_PATH must be a relative path inside the application directory.');
    $databasePath = APP_ROOT . '/' . ltrim($normalised, '/');
    $storageDir = dirname($databasePath);

    if (!is_dir($storageDir)) {
        if (!mkdir($storageDir, 0755, true) && !is_dir($storageDir)) {
            throw new RuntimeException('SQLite storage directory could not be created: ' . $storageDir);
        }
        @chmod($storageDir, 0755);
    }
    if (!is_writable($storageDir)) {
        throw new RuntimeException('SQLite storage directory is not writable by PHP: ' . $storageDir . '. Grant write permission to the web-server user.');
    }
    if (file_exists($databasePath) && !is_writable($databasePath)) {
        throw new RuntimeException('SQLite database file is not writable by PHP: ' . $databasePath);
    }

    try {
        $pdo = new PDO('sqlite:' . $databasePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
        $pdo->exec('CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY, mayar_transaction_id TEXT, service_id TEXT, amount INTEGER NOT NULL, payment_status TEXT NOT NULL DEFAULT "PENDING", customer_name TEXT, customer_email TEXT, payment_link TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    } catch (PDOException $e) {
        throw new RuntimeException('SQLite connection failed for ' . $databasePath . ': ' . $e->getMessage(), 0, $e);
    }
    return $pdo;
}

function new_order_id(): string { return 'NUG-' . date('Ymd') . '-' . random_int(1000, 9999); }
function dot_get(array $data, string $path): mixed { foreach (explode('.', $path) as $segment) { if (!is_array($data) || !array_key_exists($segment, $data)) return null; $data = $data[$segment]; } return $data; }
