<?php
// Salin file ini menjadi mayar-config.php di server hosting, lalu isi nilainya.
// Jangan upload file konfigurasi ini ke Git atau folder publik lain.

return [
    'api_key' => 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NGY1YjJiYi0xNTBhLTQwYjItODhkOS1mMzdlM2Y1MzY4YzUiLCJhY2NvdW50SWQiOiIwMTBkNzE3NC04ZDBjLTRmYjktYmVlYS0yYzBhOWY3MTYxMzYiLCJjcmVhdGVkQXQiOiIxNzg5NDg3MTY2NzAyIiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiZ2FtaW5neW9nYTE0QGdtYWlsLmNvbSIsIm5hbWUiOiJKb2tpYW4iLCJsaW5rIjoiam9raWluIiwiaXNTZWxmRG9tYWluIjpmYWxzZSwiaWF0IjoxNzg5NDg3MTY2fQ.IChMa0N9ASlcyGYnH_dxnAFAcq6UvhDo_6xDaaUPIFbkig_oINqMev2aNloeEP6ODO6eCr9WVruZYZB3KE3KtI9OQfTR-6FATW0X7e_mxFLKiQYzyLB0R2kC92ifCorv9V5vGecfK7Mgxhn7oVAdAPaq2srMyiVlRNYJ9afR4bQEk9eb_sbiqCofiz_viUj-zCaxQfQDjWhS5IGD7ZwQT1d7SVXFiWk-9RTqYDpVdsLkItxxphZwk7DeAYmiGlppeDD85QF0W0E8CiPm7_0S9Jm6Pi0pet0xVU2VSnUmzgeHHIrcJOUjigAYT8KFRbYRhkBnUPhWpPIArgrNC9oJ5g',
    'webhook_token' => '2a21fc5a7cb042cb1266666da628429db7fec42195f34cff71f7a37644b2d104f2e1dfe50094c7ae93707bacaa61b007b9648409c0613c780c988ed4fcf3ecea',
    'website_url' => 'https://jokiin.my.id',
    // Opsional: endpoint internal untuk memperbarui status order di Supabase.
    'webhook_forward_url' => '',
];