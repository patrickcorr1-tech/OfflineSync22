<?php
// PC Info Collector for Phishing Simulation
// Receives data from PowerShell script

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database directory
$dbDir = __DIR__ . '/data';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (empty($data)) {
    $data = $_POST;
}

// Build record
$record = [
    'timestamp' => date('Y-m-d H:i:s'),
    'remote_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'computer_name' => $data['computerName'] ?? 'unknown',
    'username' => $data['username'] ?? 'unknown',
    'user_domain' => $data['userDomain'] ?? 'unknown',
    'local_ip' => $data['localIp'] ?? 'unknown',
    'os_version' => $data['osVersion'] ?? 'unknown',
    'campaign_id' => $data['campaignId'] ?? 'default'
];

// Save to JSON
$dbFile = $dbDir . '/collections.json';
$existing = file_exists($dbFile) ? json_decode(file_get_contents($dbFile), true) ?: [] : [];
$existing[] = $record;
file_put_contents($dbFile, json_encode($existing, JSON_PRETTY_PRINT));

// Save to CSV
$csvFile = $dbDir . '/collections.csv';
$isNew = !file_exists($csvFile);
$csv = fopen($csvFile, 'a');
if ($isNew) {
    fputcsv($csv, array_keys($record));
}
fputcsv($csv, $record);
fclose($csv);

echo json_encode(['status' => 'success', 'id' => count($existing)]);
