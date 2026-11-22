# Read-only workstation preflight. Does not install, modify, connect, or execute project code.
$ErrorActionPreference = "SilentlyContinue"
Write-Output "SG-DOM-001 Windows preflight (read-only)"
Write-Output ("OS: " + (Get-CimInstance Win32_OperatingSystem).Caption)
Write-Output ("Architecture: " + $env:PROCESSOR_ARCHITECTURE)
foreach ($name in @("git", "node", "npm", "codex", "code")) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { Write-Output ($name + ": available at " + $cmd.Source) }
  else { Write-Output ($name + ": not found on PATH") }
}
Write-Output "No environment variables, credentials, files, services, firewall rules, or network endpoints were inspected."
