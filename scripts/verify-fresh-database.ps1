[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectName = 'inventory-history-verification'
$containerName = 'inventory-history-verification-postgres'
$composeFile = 'compose.verify.yaml'
$envFile = '.env.verify'

function Read-VerificationEnvironment {
    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "$envFile no existe. Créelo a partir de .env.verify.example."
    }

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $envFile) {
        if ($line -match '^\s*([^#][^=]*)=(.*)$') {
            $values[$matches[1].Trim()] = $matches[2].Trim()
        }
    }

    foreach ($name in 'VERIFY_DB_USER', 'VERIFY_DB_PASSWORD', 'VERIFY_DB_NAME', 'VERIFY_DB_PORT') {
        if (-not $values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($values[$name])) {
            throw "Falta la variable requerida $name en $envFile."
        }
    }

    return $values
}

function Invoke-ProjectCompose([string[]]$Arguments) {
    & docker compose --env-file $envFile -f $composeFile -p $projectName @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose falló durante la verificación."
    }
}

function Invoke-VerificationSql([string]$Sql, [hashtable]$Environment) {
    $result = $Sql | docker exec -i $containerName psql `
        -U $Environment['VERIFY_DB_USER'] `
        -d $Environment['VERIFY_DB_NAME'] `
        -tA
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló una comprobación SQL en la base temporal.'
    }
    return ($result | Out-String).Trim()
}

try {
    foreach ($command in 'docker', 'node', 'npm', 'npx') {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "No se encontró el requisito $command."
        }
    }
    if (-not (Test-Path -LiteralPath $composeFile)) {
        throw "No existe $composeFile."
    }

    $verificationEnvironment = Read-VerificationEnvironment
    if ($verificationEnvironment['VERIFY_DB_PORT'] -eq '5433') {
        throw 'El puerto temporal no puede coincidir con el puerto principal 5433.'
    }

    $existingContainer = docker ps -a --filter "name=^/$containerName$" --format '{{.Names}}'
    if ($LASTEXITCODE -ne 0) {
        throw 'No fue posible inspeccionar los contenedores existentes.'
    }
    if ($existingContainer) {
        throw "El contenedor temporal $containerName ya existe; la prueba exige una base nueva."
    }

    Invoke-ProjectCompose @('up', '-d')

    $healthy = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $health = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' $containerName
        if ($health -eq 'healthy') {
            $healthy = $true
            break
        }
        Start-Sleep -Seconds 3
    }
    if (-not $healthy) {
        throw 'PostgreSQL temporal no alcanzó el estado healthy.'
    }

    $initialTables = Invoke-VerificationSql `
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ''public'';' `
        $verificationEnvironment
    if ($initialTables -ne '0') {
        throw "La base temporal no estaba vacía: $initialTables tablas encontradas."
    }

    $encodedPassword = [uri]::EscapeDataString($verificationEnvironment['VERIFY_DB_PASSWORD'])
    $env:DATABASE_URL = "postgresql://$($verificationEnvironment['VERIFY_DB_USER']):$encodedPassword@localhost:$($verificationEnvironment['VERIFY_DB_PORT'])/$($verificationEnvironment['VERIFY_DB_NAME'])?schema=public"

    & npx.cmd prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'prisma migrate deploy falló.' }
    & npx.cmd prisma migrate status
    if ($LASTEXITCODE -ne 0) { throw 'prisma migrate status falló.' }

    $migrationCount = Invoke-VerificationSql 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;' $verificationEnvironment
    if ($migrationCount -ne '4') {
        throw "Se esperaban 4 migraciones aplicadas y se encontraron $migrationCount."
    }

    & npm.cmd run prisma:seed
    if ($LASTEXITCODE -ne 0) { throw 'La primera ejecución del seed falló.' }
    $firstCounts = Invoke-VerificationSql 'SELECT (SELECT COUNT(*) FROM "Product") || '','' || (SELECT COUNT(*) FROM "Category");' $verificationEnvironment

    & npm.cmd run prisma:seed
    if ($LASTEXITCODE -ne 0) { throw 'La segunda ejecución del seed falló.' }
    $secondCounts = Invoke-VerificationSql 'SELECT (SELECT COUNT(*) FROM "Product") || '','' || (SELECT COUNT(*) FROM "Category");' $verificationEnvironment
    if ($firstCounts -ne $secondCounts) {
        throw "El seed no fue idempotente: $firstCounts frente a $secondCounts."
    }

    $invariants = Invoke-VerificationSql @'
SELECT
  (SELECT COUNT(*) FROM "Product" WHERE "categoryId" IS NULL) || ',' ||
  (SELECT COUNT(*) FROM (SELECT "sku" FROM "Product" GROUP BY "sku" HAVING COUNT(*) > 1) duplicated_sku) || ',' ||
  (SELECT COUNT(*) FROM (SELECT "name" FROM "Category" GROUP BY "name" HAVING COUNT(*) > 1) duplicated_category);
'@ $verificationEnvironment
    if ($invariants -ne '0,0,0') {
        throw "Fallaron invariantes de datos: $invariants."
    }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'La compilación falló.' }
    & npm.cmd test -- --runInBand
    if ($LASTEXITCODE -ne 0) { throw 'Las pruebas automatizadas fallaron.' }
    $env:ALLOW_TEST_DATABASE = 'true'
    & npm.cmd run test:integration
    if ($LASTEXITCODE -ne 0) { throw 'Las pruebas de integración PostgreSQL fallaron.' }

    Write-Output "VERIFICATION_OK migrations=$migrationCount counts=$secondCounts invariants=$invariants"
    Write-Output "El entorno temporal permanece activo para las pruebas HTTP y debe limpiarse sólo con el proyecto $projectName."
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
