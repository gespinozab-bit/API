# Bloque 6: integración continua con GitHub Actions

## Archivos y alcance

Se crearon `.github/workflows/ci.yml` y `docs/BLOQUE_06.md`. Se conservaron los
archivos, dependencias, suites y funcionalidades de los bloques anteriores.
No se hizo commit ni push, ni se ejecutó el workflow en GitHub.

## Workflow

Nombre: **Inventory CI**. Se activa en `push` y `pull_request`, sin filtros de
ramas o rutas. Tiene permiso `contents: read` y no conserva credenciales de
checkout. Hay dos jobs independientes, sin dependencia `needs` entre ellos:

| Job | Runner | Node | Tiempo máximo del job | Suite y límite del paso |
| --- | --- | --- | --- | --- |
| `unit-tests` | ubuntu-latest | 22 LTS | 10 minutos | `npm run test:unit`, 3 minutos |
| `integration-tests` | ubuntu-latest | 22 LTS | 15 minutos | `npm run test:integration`, 10 minutos |

En ambos jobs los pasos son:

1. Obtener el repositorio mediante `actions/checkout@v6`.
2. Configurar Node 22 con `actions/setup-node@v6`, `cache: npm` y
   `cache-dependency-path: package-lock.json`.
3. Ejecutar `npm ci` para instalar las versiones fijadas por el lockfile.
4. Ejecutar `npm run prisma:generate` para asegurar que el cliente exista en el
   checkout limpio. Generar el cliente no crea una base ni aplica migraciones.
5. Ejecutar únicamente la suite correspondiente una vez.

Node 22 conserva la línea LTS del entorno local y es compatible con las
dependencias actuales. El workflow permite que setup-node resuelva una revisión
22.x disponible; las comprobaciones locales se realizaron con Node 22.17.1.
La caché acelera descargas npm, pero no sustituye `npm ci` ni almacena node_modules.

Los scripts test:unit y test:integration ya usan `vitest run`. No se utilizan
watch, continue-on-error, tolerancia de comandos fallidos o pasos condicionales
que omitan pruebas. Un fallo de instalación, generación, prueba o un timeout
hace fallar el job.

## PostgreSQL exclusivamente mediante Testcontainers

No existe una sección `services`, ni DATABASE_URL fija, secretos, contraseñas
reales, base externa o Docker Compose dentro del workflow. El job de integración
utiliza Docker disponible en el runner Ubuntu hospedado para iniciar el contenedor
de Testcontainers desde la suite del bloque 5.

La suite genera las credenciales y el puerto dinámicamente, aplica las cinco
migraciones mediante `prisma migrate deploy`, crea Prisma después de configurar
la conexión, limpia datos entre casos y desconecta/elimina el contenedor al
finalizar. No usa `.env` ni la base de desarrollo del puerto 5433 como conexión.
La suite unitaria no necesita PostgreSQL ni inicia contenedores.

Para ejecutar integración localmente, Docker Desktop debe estar activo. En GitHub
se utiliza el motor Docker del runner, sin instalar Docker Desktop.

## Validación del YAML

Se analizó el archivo con el paquete `yaml` ya instalado, usando YAML 1.2,
`parseDocument` y detección de claves duplicadas: **sin errores**.
Además, mediante `node:assert/strict` se verificaron:

- eventos push y pull_request;
- exactamente los jobs unit-tests e integration-tests;
- ubuntu-latest, Node 22, checkout, caché npm y package-lock.json en ambos;
- orden de comandos npm ci, prisma:generate y la suite correspondiente;
- límites de tiempo de jobs y pasos de pruebas;
- ausencia de services, needs, secrets, DATABASE_URL, watch y continue-on-error;
- coincidencia de dependencies/devDependencies entre package.json y package-lock.json;
- que ambos scripts de pruebas utilizan vitest run.

`npm.cmd exec -- prettier --check .github/workflows/ci.yml` también pasó.
Esta validación comprueba sintaxis y requisitos locales; no equivale a una
ejecución remota de GitHub Actions. No se lanzó una ejecución remota porque no se
hizo push.

## Suites locales ejecutadas

En PowerShell se usó npm.cmd, equivalente a npm, por la restricción de npm.ps1.

| Comando | Resultado | Archivos | Duración | Salida |
| --- | --- | --- | --- | --- |
| `npm.cmd run test:unit` | 39/39 aprobadas | 8 | 5.04 s | 0 |
| `npm.cmd run test:integration` | 5/5 aprobadas | 1 | 15.37 s | 0 |

La integración usó esta URI enmascarada, distinta de la base local:

```text
postgres://inventory_test:***@localhost:32773/inventory_test_5a94dc17c41c46e0a70ecfc0127dad48
```

Aplicó las migraciones existentes:

1. `20260919205642_create_product_initial`
2. `20260919232628_expand_add_category_relation`
3. `20260920054829_backfill_product_categories`
4. `20260920060800_contract_product_category_relation`
5. `20260926025000_add_product_stock_upper_bound`

La salida confirmó `TEMPORARY_POSTGRES_REMOVED` para el contenedor
`3b77946513b3d8e9aad9eed08f9383e7714de04a8280120177a98edb2f32ed29`.
No se utilizó ni modificó la base local. No quedan fallos de las verificaciones
de este bloque. Los avisos de dependencias documentados antes no se abordaron.

## Referencias

- [Configuración oficial de Node y caché npm](https://github.com/actions/setup-node).
- [Guía oficial de compilación y pruebas Node en GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).
- [Calendario LTS de Node](https://github.com/nodejs/Release).
