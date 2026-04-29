#requires -Version 5.1
param(
    [string]$PrimaryContext = "default",
    [string]$FallbackContext = "podman",
    [switch]$UseDockerInfoProbe
)

function Test-DockerServer {
    if ($UseDockerInfoProbe) {
        docker info *> $null
        return ($LASTEXITCODE -eq 0)
    }

    $version = docker version --format '{{.Server.Version}}' 2>$null
    return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($version))
}

function Test-DockerContextExists([string]$Name) {
    docker context inspect $Name *> $null
    return ($LASTEXITCODE -eq 0)
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "docker CLI not found in PATH."
    exit 1
}

$serverUp = Test-DockerServer
if ($serverUp) {
    if (Test-DockerContextExists -Name $PrimaryContext) {
        docker context use $PrimaryContext | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Docker server available -> switched context to '$PrimaryContext'."
            exit 0
        }
    }
    Write-Warning "Docker server is available, but primary context '$PrimaryContext' does not exist or switch failed."
    exit 2
}

if (Test-DockerContextExists -Name $FallbackContext) {
    docker context use $FallbackContext | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Docker server unavailable -> switched context to fallback '$FallbackContext'."
        exit 0
    }
}

Write-Error "Docker unavailable and fallback context '$FallbackContext' is missing or switch failed."
exit 1
