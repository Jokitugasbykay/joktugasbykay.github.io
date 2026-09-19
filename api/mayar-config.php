<?php
declare(strict_types=1);

// Include-only. Direct HTTP access is denied here and again in .htaccess.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__ . '/bootstrap.php';

function mayar_config(): array
{
    $environment = env('MAYAR_ENV', 'sandbox');
    if (!in_array($environment, ['sandbox', 'production'], true)) throw new RuntimeException('Invalid MAYAR_ENV');
    $key = env('MAYAR_API_KEY');
    if ($key === null || $key === '' || str_starts_with($key, 'replace_')) throw new RuntimeException('MAYAR_API_KEY is not configured');
    return ['api_key' => $key, 'base_url' => $environment === 'production' ? 'https://api.mayar.id/hl/v2' : 'https://api.mayar.io/hl/v2'];
}
