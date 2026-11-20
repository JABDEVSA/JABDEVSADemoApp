$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'api')
if (-not (Test-Path -LiteralPath 'lib/sqlite-jdbc-3.54.1.0.jar')) { & (Join-Path $PSScriptRoot 'setup-java.ps1') }
New-Item -ItemType Directory -Force -Path 'classes','data' | Out-Null
& javac -encoding UTF-8 -cp 'lib/*' -d classes src/Main.java
if ($LASTEXITCODE -ne 0) { throw 'Java compilation failed.' }
& java -cp 'classes;lib/*' Main
