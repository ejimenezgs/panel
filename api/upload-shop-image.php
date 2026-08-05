<?php
declare(strict_types=1);

const FIREBASE_PROJECT_ID = 'casaglick-439b2';
const MAX_UPLOAD_BYTES = 8388608; // 8 MB
const MAX_IMAGE_PIXELS = 30000000;
const MAX_OUTPUT_EDGE = 3000;
const WEBP_QUALITY = 86;
const SHOP_ASSET_PUBLIC_BASE = 'https://assets.casaglick.com/shop';
const SHOP_ASSET_PHYSICAL_BASE = '/home/gyu5la0fbzjq/public_html/assets/shop';
const WEBSITE_ASSET_PUBLIC_BASE = 'https://assets.casaglick.com/casaglick';
const WEBSITE_ASSET_PHYSICAL_BASE = '/home/gyu5la0fbzjq/public_html/assets/casaglick';
const SUPER_ADMIN_UID = 'nJIkImK4cDdiXghn8wYecqyw1M03';
const ADMIN_EMAILS = [
    'hello@oaxsun.tech',
    'e.jimenez@gruposegel.com',
    'contacto@gruposegel.com',
];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function base64UrlDecode(string $value): string|false {
    $padding = strlen($value) % 4;
    if ($padding) $value .= str_repeat('=', 4 - $padding);
    return base64_decode(strtr($value, '-_', '+/'), true);
}

function fetchUrl(string $url): string|false {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'CasaGlickPanel/1.0',
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ($body !== false && $status >= 200 && $status < 300) ? $body : false;
    }
    $context = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
    return @file_get_contents($url, false, $context);
}

function firebaseCertificates(): array {
    $cacheFile = sys_get_temp_dir() . '/casaglick-firebase-certs.json';
    if (is_file($cacheFile) && filemtime($cacheFile) > time() - 3600) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }
    $body = fetchUrl('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    $certs = $body ? json_decode($body, true) : null;
    if (!is_array($certs)) throw new RuntimeException('No fue posible validar la sesión con Firebase.');
    @file_put_contents($cacheFile, json_encode($certs), LOCK_EX);
    return $certs;
}

function verifyFirebaseIdToken(string $token): array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) throw new RuntimeException('Token inválido.');
    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $headerRaw = base64UrlDecode($encodedHeader);
    $payloadRaw = base64UrlDecode($encodedPayload);
    $signature = base64UrlDecode($encodedSignature);
    $header = $headerRaw ? json_decode($headerRaw, true) : null;
    $payload = $payloadRaw ? json_decode($payloadRaw, true) : null;
    if (!is_array($header) || !is_array($payload) || $signature === false) throw new RuntimeException('Token inválido.');
    if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) throw new RuntimeException('Token no autorizado.');
    $certs = firebaseCertificates();
    $certificate = $certs[$header['kid']] ?? null;
    if (!$certificate || openssl_verify($encodedHeader . '.' . $encodedPayload, $signature, $certificate, OPENSSL_ALGO_SHA256) !== 1) {
        throw new RuntimeException('La firma de la sesión no es válida.');
    }
    $now = time();
    if (($payload['aud'] ?? '') !== FIREBASE_PROJECT_ID) throw new RuntimeException('Proyecto Firebase incorrecto.');
    if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID) throw new RuntimeException('Emisor Firebase incorrecto.');
    if (!isset($payload['sub']) || !is_string($payload['sub']) || $payload['sub'] === '') throw new RuntimeException('Usuario Firebase inválido.');
    if ((int)($payload['exp'] ?? 0) <= $now || (int)($payload['iat'] ?? PHP_INT_MAX) > $now + 60) throw new RuntimeException('La sesión expiró.');
    return $payload;
}

function bearerToken(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) throw new RuntimeException('Falta la sesión administrativa.');
    return trim($matches[1]);
}

function safeSection(string $value): string {
    $value = strtolower(trim($value));
    if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/', $value)) throw new RuntimeException('La sección no es válida.');
    return $value;
}

function createImageResource(string $path, string $mime) {
    return match ($mime) {
        'image/jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($path) : false,
        'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($path) : false,
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default => false,
    };
}

function writeWebp(string $source, string $mime, string $destination, int $width, int $height): bool {
    if (!function_exists('imagewebp')) return false;
    $image = createImageResource($source, $mime);
    if (!$image) return false;
    $scale = min(1, MAX_OUTPUT_EDGE / max($width, $height));
    $outWidth = max(1, (int) round($width * $scale));
    $outHeight = max(1, (int) round($height * $scale));
    $output = imagecreatetruecolor($outWidth, $outHeight);
    imagealphablending($output, false);
    imagesavealpha($output, true);
    $transparent = imagecolorallocatealpha($output, 0, 0, 0, 127);
    imagefilledrectangle($output, 0, 0, $outWidth, $outHeight, $transparent);
    imagecopyresampled($output, $image, 0, 0, 0, 0, $outWidth, $outHeight, $width, $height);
    $written = imagewebp($output, $destination, WEBP_QUALITY);
    imagedestroy($output);
    imagedestroy($image);
    return $written;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'Método no permitido.']);

try {
    $claims = verifyFirebaseIdToken(bearerToken());
    $email = strtolower((string)($claims['email'] ?? ''));
    $uid = (string)($claims['sub'] ?? '');
    if ($uid !== SUPER_ADMIN_UID && !in_array($email, ADMIN_EMAILS, true)) {
        respond(403, ['ok' => false, 'error' => 'Tu usuario no tiene permiso para subir imágenes.']);
    }

    $section = safeSection((string)($_POST['section'] ?? ''));
    $scope = (string) ($_POST['scope'] ?? 'shop-content');
    if (!in_array($scope, ['shop-content', 'website-content'], true)) {
        throw new RuntimeException('El destino de la imagen no es válido.');
    }
    $file = $_FILES['image'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('No se recibió una imagen válida.');
    if ((int)$file['size'] <= 0 || (int)$file['size'] > MAX_UPLOAD_BYTES) throw new RuntimeException('La imagen debe pesar máximo 8 MB.');
    if (!is_uploaded_file((string)$file['tmp_name'])) throw new RuntimeException('La carga del archivo no es válida.');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file((string)$file['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) throw new RuntimeException('Sólo se permiten imágenes JPG, PNG o WebP.');
    $size = @getimagesize((string)$file['tmp_name']);
    if (!$size || (int)$size[0] < 1 || (int)$size[1] < 1) throw new RuntimeException('El archivo no contiene una imagen válida.');
    $width = (int)$size[0];
    $height = (int)$size[1];
    if ($width * $height > MAX_IMAGE_PIXELS) throw new RuntimeException('La imagen tiene dimensiones demasiado grandes.');

    // Both sites use the shared persistent assets root, outside every deploy repository.
    // The scope selects the isolated casaglick or shop subtree.
    if ($scope === 'shop-content') {
        $uploadRoot = SHOP_ASSET_PHYSICAL_BASE;
        $publicBase = SHOP_ASSET_PUBLIC_BASE;
    } else {
        $uploadRoot = WEBSITE_ASSET_PHYSICAL_BASE;
        $publicBase = WEBSITE_ASSET_PUBLIC_BASE;
    }

    $targetDir = rtrim($uploadRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $section;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
        throw new RuntimeException('No fue posible crear la carpeta de imágenes del sitio seleccionado.');
    }
    if (!is_writable($targetDir)) {
        throw new RuntimeException('La carpeta de imágenes no tiene permisos de escritura.');
    }

    $protection = rtrim($uploadRoot, '/') . '/.htaccess';
    if (!is_file($protection)) {
        @file_put_contents($protection, "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py|sh|html?|svg)$\">\n  Require all denied\n</FilesMatch>\n");
    }

    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(8));
    $extension = $allowed[$mime];
    $filename = $id . '.' . $extension;
    $destination = $targetDir . '/' . $filename;

    if (writeWebp((string)$file['tmp_name'], $mime, $targetDir . '/' . $id . '.webp', $width, $height)) {
        $filename = $id . '.webp';
        $destination = $targetDir . '/' . $filename;
    } elseif (!move_uploaded_file((string)$file['tmp_name'], $destination)) {
        throw new RuntimeException('No fue posible guardar la imagen en la carpeta universal.');
    }
    @chmod($destination, 0644);

    respond(201, [
        'ok' => true,
        'url' => rtrim($publicBase, '/') . '/' . rawurlencode($section) . '/' . rawurlencode($filename),
        'section' => $section,
        'filename' => $filename,
    ]);
} catch (Throwable $error) {
    error_log('Casa Glick upload error: ' . $error->getMessage());
    respond(400, ['ok' => false, 'error' => $error->getMessage()]);
}
