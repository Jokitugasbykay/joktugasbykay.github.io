<?php
// Salin file ini menjadi mayar-config.php di server hosting, lalu isi nilainya.
// Jangan upload file konfigurasi ini ke Git atau folder publik lain.

return [
    'api_key' => 'ISI_API_KEY_MAYAR_DI_SINI',
    'webhook_token' => 'ISI_WEBHOOK_TOKEN_MAYAR_DI_SINI',
    'website_url' => 'https://jokiin.my.id',
    // Opsional: endpoint internal untuk memperbarui status order di Supabase.
    'webhook_forward_url' => '',
];
