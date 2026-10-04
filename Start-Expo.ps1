param([switch]$Web)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $bundledNode = Join-Path $env:LOCALAPPDATA 'hermes\node'
    if (Test-Path -LiteralPath (Join-Path $bundledNode 'node.exe')) {
        $env:Path = "$bundledNode;$env:Path"
    } else {
        throw 'Node.js was not found. Run this script in the Codex terminal.'
    }
}
$wifiAddress = node -p "(require('os').networkInterfaces()['Wi-Fi'] || []).find(a => a.family === 'IPv4')?.address || ''"
if ($LASTEXITCODE -ne 0) { throw 'Node.js could not run. Please check its installation.' }
if ($wifiAddress) { $env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiAddress.Trim() }
$env:EXPO_NO_TELEMETRY = '1'
if ($Web) {
    npm.cmd run web -- --port 8082
} else {
    npm.cmd start -- --go --lan
}
exit $LASTEXITCODE
