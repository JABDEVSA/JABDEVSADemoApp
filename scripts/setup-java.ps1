$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$lib = Join-Path $root 'api/lib'
New-Item -ItemType Directory -Force -Path $lib | Out-Null
$artifacts = @(
  'org/xerial/sqlite-jdbc/3.54.1.0/sqlite-jdbc-3.54.1.0.jar',
  'com/google/code/gson/gson/2.15.0/gson-2.15.0.jar',
  'org/slf4j/slf4j-api/2.0.17/slf4j-api-2.0.17.jar',
  'org/slf4j/slf4j-nop/2.0.17/slf4j-nop-2.0.17.jar'
)
foreach ($artifact in $artifacts) {
  $target = Join-Path $lib (Split-Path -Leaf $artifact)
  if (-not (Test-Path -LiteralPath $target)) {
    $url = 'https://repo.maven.apache.org/maven2/' + $artifact
    Invoke-WebRequest -Uri $url -OutFile $target
  }
  $url = 'https://repo.maven.apache.org/maven2/' + $artifact
  $expected = ((Invoke-WebRequest -Uri ($url + '.sha1')).Content).Trim().ToUpperInvariant()
  $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA1).Hash
  if ($actual -ne $expected) { throw "Dependency checksum mismatch: $artifact" }
}
Write-Output 'Java dependencies available.'
