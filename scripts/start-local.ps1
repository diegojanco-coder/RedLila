# Inicia la base local y los dos servidores de RedLila en ventanas ocultas.
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $projectRoot 'runtime'
$mysqlDir = Join-Path $runtime 'mysql-8.4.11-winx64'
$mysqlExe = Join-Path $mysqlDir 'bin/mysqld.exe'
$mysqlIni = Join-Path $runtime 'mysql.ini'
$backend = Join-Path $projectRoot 'backend'
$frontend = Join-Path $projectRoot 'frontend'
$nodeExe = (Get-Command node -ErrorAction Stop).Source

function Test-LocalPort([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $client.Connect('127.0.0.1', $port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-LocalPort([int]$port, [string]$name) {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-LocalPort $port) { Write-Host "${name}: listo en el puerto $port"; return }
    Start-Sleep -Milliseconds 500
  }
  throw "$name no respondió en el puerto $port. Consulta los registros en runtime/."
}

function Wait-RedLilaApi {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/salud' -TimeoutSec 5
      if ($health.estado -eq 'ok') { Write-Host 'API y MySQL: listos'; return }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw 'La API no responde con MySQL disponible. Consulta runtime/api-stderr.log.'
}

function Wait-RedLilaFrontend {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 5
      if ($response.StatusCode -eq 200 -and $response.Content.Contains('RedLila')) {
        Write-Host 'Frontend RedLila: listo en el puerto 5173'
        return
      }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw 'El frontend RedLila no responde. Consulta runtime/web-stderr.log.'
}

if (-not (Test-Path -LiteralPath $mysqlExe)) { throw 'Falta runtime/mysql-8.4.11-winx64/bin/mysqld.exe.' }
if (-not (Test-Path -LiteralPath $mysqlIni)) { throw 'Falta runtime/mysql.ini.' }
if (-not (Test-Path -LiteralPath (Join-Path $backend '.env'))) { throw 'Falta backend/.env.' }

if (-not (Test-LocalPort 3306)) {
  $mysqlProcess = Start-Process -FilePath $mysqlExe `
    -ArgumentList @("--defaults-file=`"$mysqlIni`"", '--console') `
    -WorkingDirectory $mysqlDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'mysql-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'mysql-stderr.log')
  $mysqlProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'mysql.pid')
}
Wait-LocalPort 3306 'MySQL'

if (-not (Test-LocalPort 3001)) {
  $apiProcess = Start-Process -FilePath $nodeExe -ArgumentList 'src/app.js' `
    -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'api-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'api-stderr.log')
  $apiProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'api.pid')
}
Wait-RedLilaApi

if (-not (Test-LocalPort 5173)) {
  $vite = Join-Path $frontend 'node_modules/vite/bin/vite.js'
  $webProcess = Start-Process -FilePath $nodeExe `
    -ArgumentList @("`"$vite`"", '--host', '0.0.0.0') `
    -WorkingDirectory $frontend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'web-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'web-stderr.log')
  $webProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'web.pid')
}
Wait-RedLilaFrontend
Write-Host 'RedLila disponible en http://localhost:5173/'
Write-Host 'Para un celular en la misma red, abre http://IP-DE-ESTA-PC:5173/'
