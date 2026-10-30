$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root ".github\skills"
$revision = "0fe6545b950671641b2b14b44eb56678fea6c6b4"
$skills = @(
    "meeting-minutes",
    "incident-postmortem",
    "documentation-writer",
    "draw-io-diagram-generator",
    "architecture-blueprint-generator",
    "create-architectural-decision-record",
    "md-to-docx"
)

$pending = @()
foreach ($skill in $skills) {
    $folder = Join-Path $destination $skill
    if (-not (Test-Path -LiteralPath $folder)) {
        $pending += $skill
        continue
    }
    $file = Join-Path $folder "SKILL.md"
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Folder $skill sudah ada, tetapi SKILL.md tidak ditemukan. Periksa dulu; setup tidak menimpanya."
    }
    $content = Get-Content -LiteralPath $file -Raw
    if (-not $content.Contains("github-pinned: $revision") -or
        -not $content.Contains("github-repo: https://github.com/github/awesome-copilot")) {
        throw "Skill $skill sudah ada dengan sumber atau versi yang berbeda. Review dulu; setup tidak menimpanya."
    }
    Write-Host "[SUDAH ADA] $skill pada versi workshop."
}
if ($pending.Count -eq 0) {
    Write-Host "Semua $($skills.Count) skill Awesome Copilot sudah ada. Tidak ada yang diunduh ulang."
    return
}

Get-Command gh -ErrorAction Stop | Out-Null
$versionOutput = & gh --version
if ($LASTEXITCODE -ne 0) { throw "Tidak dapat membaca versi GitHub CLI." }
$versionMatch = [regex]::Match(($versionOutput -join " "), "version (\d+\.\d+\.\d+)")
if (-not $versionMatch.Success -or [version]$versionMatch.Groups[1].Value -lt [version]"2.90.0") {
    throw "Diperlukan GitHub CLI 2.90.0 atau lebih baru."
}

Write-Host "Download $($pending.Count) skill yang belum ada, pada commit $revision."
Write-Host "Tidak memasang skill global dan tidak mengeksekusi script skill."
foreach ($skill in $pending) {
    & gh skills install github/awesome-copilot "skills/$skill" --pin $revision --dir $destination
    if ($LASTEXITCODE -ne 0) {
        throw "Instalasi $skill gagal. Periksa jaringan, autentikasi, dan folder yang sudah terpasang."
    }
}
Write-Host "Download selesai. Review SKILL.md, script, dan lisensi sebelum digunakan."
Write-Host "Buka folder starter sebagai workspace dan periksa Skills di Open Customizations."
