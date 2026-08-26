#!/usr/bin/env pwsh
#
# Build the Wissal Univers image and push it to Docker Hub (Windows / PowerShell).
#
#   .\scripts\docker-push.ps1              # tag = short git sha (+ :latest)
#   .\scripts\docker-push.ps1 -Tag v1.2.0  # tag = v1.2.0 (+ :latest)
#
# Credentials are read from .env.local (DOCKERHUB_USERNAME / DOCKERHUB_TOKEN,
# and optional DOCKERHUB_IMAGE). Override with -EnvFile.
[CmdletBinding()]
param(
    [string]$Tag,
    [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

# Load KEY=VALUE lines from the env file into process env vars.
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        $trimmed = $line.Trim()
        if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
        $idx = $trimmed.IndexOf("=")
        if ($idx -lt 1) { continue }
        $key = $trimmed.Substring(0, $idx).Trim()
        $val = $trimmed.Substring($idx + 1).Trim().Trim('"')
        Set-Item -Path "Env:$key" -Value $val
    }
}

$Username = $env:DOCKERHUB_USERNAME
$Token = $env:DOCKERHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($Username)) { throw "Set DOCKERHUB_USERNAME in $EnvFile" }
if ([string]::IsNullOrWhiteSpace($Token)) { throw "Set DOCKERHUB_TOKEN in $EnvFile" }

$Image = if ($env:DOCKERHUB_IMAGE) { $env:DOCKERHUB_IMAGE } else { "$Username/wisscreen" }

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = (git rev-parse --short HEAD 2>$null)
    if ([string]::IsNullOrWhiteSpace($Tag)) { $Tag = "latest" }
}

Write-Host "==> Building ${Image}:${Tag} (and :latest)"
docker build -t "${Image}:${Tag}" -t "${Image}:latest" .
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

Write-Host "==> Logging in to Docker Hub as $Username"
$Token | docker login -u $Username --password-stdin
if ($LASTEXITCODE -ne 0) { throw "docker login failed" }

Write-Host "==> Pushing"
docker push "${Image}:${Tag}"; if ($LASTEXITCODE -ne 0) { throw "docker push failed" }
docker push "${Image}:latest"; if ($LASTEXITCODE -ne 0) { throw "docker push failed" }

docker logout | Out-Null
Write-Host "==> Done: pushed ${Image}:${Tag} and ${Image}:latest"
