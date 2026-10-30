param(
  [string]$DiagramsDir = (Join-Path $PSScriptRoot '..\docs\diagrams'),
  [string]$DrawioPath = ''
)

$ErrorActionPreference = 'Stop'
$directory = (Resolve-Path -LiteralPath $DiagramsDir).Path
if (-not $DrawioPath) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\draw.io\draw.io.exe",
    "$env:ProgramFiles\draw.io\draw.io.exe",
    "${env:ProgramFiles(x86)}\draw.io\draw.io.exe"
  )
  $DrawioPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $DrawioPath -or -not (Test-Path -LiteralPath $DrawioPath)) {
  throw 'draw.io Desktop belum tersedia. Install draw.io Desktop atau isi parameter -DrawioPath.'
}
$sources = @(Get-ChildItem -LiteralPath $directory -Filter '*.drawio' -File | Sort-Object Name)
if ($sources.Count -eq 0) { throw "Tidak ada file .drawio di $directory" }

foreach ($source in $sources) {
  $xml = [xml](Get-Content -LiteralPath $source.FullName -Raw)
  if (-not $xml.mxfile.diagram.mxGraphModel.root) { throw "Format draw.io tidak valid: $($source.Name)" }
  $output = Join-Path $directory ($source.BaseName + '.png')
  $startedAt = [DateTime]::UtcNow
  & $DrawioPath --export --format png --scale 2 --border 16 --output $output $source.FullName 2>&1 | Write-Output
  if ($LASTEXITCODE -ne 0) { throw "Render gagal untuk $($source.Name), exit code $LASTEXITCODE" }
  if (-not (Test-Path -LiteralPath $output)) { throw "PNG belum dihasilkan: $output" }
  $png = Get-Item -LiteralPath $output
  if ($png.Length -lt 100 -or $png.LastWriteTimeUtc -lt $startedAt.AddSeconds(-2)) {
    throw "Hasil PNG kosong atau masih versi lama: $output"
  }
  Write-Output "OK: $($source.Name) -> $($png.Name)"
}
Write-Output "Selesai: $($sources.Count) diagram draw.io dirender ke PNG."
