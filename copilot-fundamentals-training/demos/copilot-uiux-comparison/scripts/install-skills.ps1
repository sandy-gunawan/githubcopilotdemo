$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$packages = Get-Content -LiteralPath (Join-Path $root "skill-sources.json") -Raw | ConvertFrom-Json

Get-Command gh -ErrorAction Stop | Out-Null
foreach ($package in $packages) {
    $workspace = Join-Path $root ("workspaces\" + $package.Case + "\B")
    if (-not (Test-Path -LiteralPath (Join-Path $workspace "input\brief.md"))) {
        throw "Workspace belum disiapkan. Jalankan python scripts\prepare_workspaces.py dahulu."
    }
    $destination = Join-Path $workspace ".github\skills"
    $folder = Join-Path $destination $package.Name
    $file = Join-Path $folder "SKILL.md"
    if (Test-Path -LiteralPath $folder) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Folder $folder sudah ada tanpa SKILL.md. Setup tidak menimpanya."
        }
        $content = Get-Content -LiteralPath $file -Raw
        if (-not $content.Contains("github-pinned: " + $package.Revision) -or
            -not $content.Contains("github-repo: https://github.com/" + $package.Repository)) {
            throw "Skill yang ada punya sumber/versi berbeda. Review dulu: $folder"
        }
        Write-Host "[SUDAH ADA] Sumber upstream $($package.Name) di $($package.Case)\B."
    } else {
        & gh skills install $package.Repository $package.Source --pin $package.Revision --dir $destination --allow-hidden-dirs
        if ($LASTEXITCODE -ne 0) { throw "Download $($package.Name) gagal." }
    }
    if ($package.License -and -not (Test-Path -LiteralPath (Join-Path $folder "LICENSE"))) {
        Invoke-WebRequest -Uri $package.License -OutFile (Join-Path $folder "LICENSE")
    }
}
& python (Join-Path $PSScriptRoot "prepare_workspaces.py")
if ($LASTEXITCODE -ne 0) { throw "Penyiapan salinan upstream dan workflow C gagal; review file yang berbeda." }
Write-Host "Selesai. B memakai upstream; C memakai salinan upstream yang sama dan workflow lokal."
Write-Host "Tidak ada skill dipasang ke A atau folder global. Hasil output tidak diubah."
Write-Host "Review SKILL.md, script, data, dan lisensi sebelum dipakai."
Write-Host "Penemuan/pemanggilan skill oleh Copilot dan skill personal/plugin tetap perlu dicek di VS Code."
