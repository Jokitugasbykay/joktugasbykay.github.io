<?php
declare(strict_types=1);

// Include-only. Akses langsung lewat HTTP ditolak di sini dan di .htaccess.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__ . '/bootstrap.php';

function mayar_config(): array
{
    $environment = env('MAYAR_ENV', 'production');
    if (!in_array($environment, ['sandbox', 'production'], true)) throw new RuntimeException('Invalid MAYAR_ENV');

    $key = env('MAYAR_API_KEY');
    if ($key === null || str_starts_with($key, 'replace_')) throw new RuntimeException('MAYAR_API_KEY is not configured');

    // Base URL V2 sesuai dokumentasi Mayar. MAYAR_BASE_URL hanya untuk pengujian/override.
    $base = env('MAYAR_BASE_URL') ?? ($environment === 'production' ? 'https://api.mayar.id/hl/v2' : 'https://api.mayar.io/hl/v2');
    if (!preg_match('#^https?://#i', $base)) throw new RuntimeException('Invalid MAYAR_BASE_URL');

    return ['api_key' => $key, 'base_url' => rtrim($base, '/')];
}
