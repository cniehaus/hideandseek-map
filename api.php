<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$action  = $_GET['action'] ?? '';
$cacheDir = __DIR__ . '/cache';

if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

function cacheGet(string $key): ?string
{
    global $cacheDir;
    $file = $cacheDir . '/' . md5($key) . '.json';
    if (file_exists($file) && time() - filemtime($file) < 86400) {
        return file_get_contents($file) ?: null;
    }
    return null;
}

function cacheSet(string $key, string $value): void
{
    global $cacheDir;
    file_put_contents($cacheDir . '/' . md5($key) . '.json', $value);
}

function httpGet(string $url): string
{
    $ctx = stream_context_create([
        'http' => [
            'user_agent'      => 'JetlagHideSeekMaps/1.0 (https://github.com/user/jetlag-maps)',
            'timeout'         => 30,
            'follow_location' => 1,
        ],
        'ssl' => ['verify_peer' => true],
    ]);
    $result = @file_get_contents($url, false, $ctx);
    if ($result === false) {
        throw new RuntimeException("HTTP GET failed: $url");
    }
    return $result;
}

function httpPost(string $url, string $body): string
{
    $ctx = stream_context_create([
        'http' => [
            'method'         => 'POST',
            'header'         => implode("\r\n", [
                'Content-Type: application/x-www-form-urlencoded',
                'User-Agent: JetlagHideSeekMaps/1.0',
            ]) . "\r\n",
            'content'        => $body,
            'timeout'        => 90,
            'ignore_errors'  => true,
        ],
        'ssl' => ['verify_peer' => true],
    ]);
    $result = @file_get_contents($url, false, $ctx);
    if ($result === false) {
        throw new RuntimeException("Overpass nicht erreichbar (Netzwerkfehler)");
    }
    // Check HTTP status code
    $status = 200;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) {
            $status = (int) $m[1];
        }
    }
    if ($status === 429) {
        throw new RuntimeException("Overpass: Zu viele Anfragen – bitte kurz warten und erneut versuchen");
    }
    if ($status >= 400) {
        $msg = substr(strip_tags($result), 0, 200);
        throw new RuntimeException("Overpass HTTP $status: " . trim($msg));
    }
    return $result;
}

try {
    match ($action) {
        'geocode'  => doGeocode(),
        'overpass' => doOverpass(),
        default    => throw new InvalidArgumentException("Unknown action: " . htmlspecialchars($action)),
    };
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function doGeocode(): void
{
    $city = trim($_GET['city'] ?? '');
    if ($city === '') {
        throw new InvalidArgumentException('Parameter "city" is required');
    }

    $cacheKey = "geocode_v1_$city";
    if ($cached = cacheGet($cacheKey)) {
        echo $cached;
        return;
    }

    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q'              => $city,
        'format'         => 'json',
        'limit'          => 5,
        'addressdetails' => 1,
    ]);

    $data = httpGet($url);
    cacheSet($cacheKey, $data);
    echo $data;
}

function doOverpass(): void
{
    $query = $_POST['query'] ?? '';
    if ($query === '') {
        throw new InvalidArgumentException('POST parameter "query" is required');
    }

    $cacheKey = "overpass_v1_$query";
    if ($cached = cacheGet($cacheKey)) {
        echo $cached;
        return;
    }

    $data = httpPost(
        'https://overpass-api.de/api/interpreter',
        http_build_query(['data' => $query])
    );

    if (json_decode($data) === null) {
        $msg = substr(strip_tags($data), 0, 200);
        throw new RuntimeException("Overpass-Fehler: " . trim($msg));
    }

    cacheSet($cacheKey, $data);
    echo $data;
}
