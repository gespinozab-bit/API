# Bloque 5: integración con PostgreSQL temporal y Testcontainers

## Resultado

- `npm.cmd run test:integration`: **5 pruebas aprobadas**, 1 archivo, salida 0,
  11.95 segundos en la ejecución final.
- `npm.cmd run test:unit`: **39 pruebas aprobadas**, 8 archivos, salida 0.
- PostgreSQL temporal eliminado al finalizar, después de desconectar Prisma.
- No se utilizó ni modificó la base de desarrollo `localhost:5433/inventory_db`.
- No se agregaron migraciones ni GitHub Actions.

## Requisitos y comandos

**Docker Desktop debe estar activo**, con motor de contenedores Linux accesible.
La primera ejecución puede descargar `postgres:17-alpine` y la imagen auxiliar
Ryuk de Testcontainers; requiere acceso al registro de imágenes.

Se usa Node 22.17.1 y `@testcontainers/postgresql` 11.14.0. Se eligió la línea 11
porque Testcontainers 12.1.0 requiere Node >=22.22 y no es compatible con el Node
instalado. El módulo PostgreSQL incluye la dependencia principal Testcontainers.

```bash
npm install
npm run prisma:generate
npm run test:integration
npm run test:unit
```

La generación de cliente es una preparación de dependencias; no aplica migraciones
ni conecta a una base. Las pruebas no requieren preparar una base manualmente,
levantar Docker Compose, configurar ALLOW_TEST_DATABASE o copiar `.env`.
En este entorno PowerShell se utiliza `npm.cmd` para evitar la restricción sobre
npm.ps1. El comando de integración usa `vitest run`, nunca watch.

Instalación efectuada:

```powershell
npm.cmd install --save-dev @testcontainers/postgresql@^11.14.0 --cache "$env:TEMP\inventario-npm-cache"
```

## Ciclo de vida y aislamiento

1. `vitest.integration.config.mts` selecciona únicamente `test/integration/**/*.spec.ts`.
   Deshabilita la carga de archivos de entorno de Vite con `envDir: false` y
   ejecuta archivos secuencialmente. Los hooks tienen hasta 300 segundos para
   arranque, migraciones y limpieza; cada prueba dispone de 30 segundos.
2. El setup reemplaza cualquier DATABASE_URL heredada por una conexión centinela
   inservible. No inicia AppModule ni ConfigModule.
3. `beforeAll` crea un PostgreSQL nuevo con Testcontainers, sin reutilizar
   contenedores de otras ejecuciones. Base y contraseña son aleatorias; el puerto
   del host lo asigna Docker dinámicamente, nunca se fija a 5433.
4. Se obtiene `getConnectionUri()`. Se comprueba que el puerto no sea 5433,
   coincida con el puerto publicado del contenedor y que la base sea la recién
   creada. Esa URL sustituye DATABASE_URL en el proceso de pruebas.
5. Se copian solamente schema.prisma y el historial de migraciones a una carpeta
   temporal propia. Se ejecuta el CLI local de Prisma con `migrate deploy
   --schema <schema-temporal>`, usando esa carpeta como cwd y pasando explícitamente
   la URL del contenedor. El CLI no recibe el `.env` del proyecto.
6. Solo después se construye PrismaService, subclase real de PrismaClient,
   con `datasources.db.url` explícita y se conecta. La conexión no depende de
   credenciales del `.env` ni de una DATABASE_URL externa.
7. Se instancian los adaptadores reales `PrismaCategoryRepository` y
   `PrismaProductRepository` con ese cliente. No hay mocks ni consultas simuladas.
8. Antes de cada prueba se verifica que DATABASE_URL continúe siendo la URI del
   contenedor propio. Se borran productos y después categorías, respetando la FK.
   No se borran migraciones ni se usa migrate reset.
9. `afterAll` desconecta Prisma, detiene y elimina el contenedor y sus volúmenes
   temporales, restaura la variable del proceso y elimina la carpeta temporal.
   La limpieza también se intenta si falla la preparación. Los bloques finally
   permiten intentar eliminar el contenedor aunque falle la desconexión.

Un contenedor sirve a los cinco casos de este archivo. Cada nueva ejecución crea
otro contenedor y otra base. La eliminación de la carpeta temporal comprueba su
ubicación antes de borrar; solo se elimina el directorio creado por el helper.

## Casos comprobados

| Caso | Evidencia |
| --- | --- |
| Historial completo | Nombres de `_prisma_migrations` coinciden con todos los archivos migration.sql del proyecto |
| Creación de categoría y producto | Adaptadores reales; categoría recuperada con todos sus campos y producto relacionado persistido |
| Recuperación del producto | Consultas reales por ID, SKU y listado devuelven el registro guardado |
| SKU duplicado | El adaptador traduce el error único real a ProductSkuConflictError; SQL parametrizado confirma SQLSTATE 23505 |
| Stock 1001 | El adaptador recibe el fallo de Product_stock_maximum; SQL parametrizado confirma SQLSTATE 23514; no queda producto guardado |

Los intentos inválidos llaman directamente al repositorio y a PostgreSQL, sin
DTO ni validación del servicio de negocio que pueda interceptarlos. Las consultas
SQL adicionales comprueban la causa exacta del rechazo, no solamente una excepción
genérica. Se usa Arrange–Act–Assert y cada caso prepara sus propios registros.

## URI enmascarada y migraciones aplicadas

URI de la ejecución final:

```text
postgres://inventory_test:***@localhost:32771/inventory_test_9f625d22811f4dcdbc8a6ef9ea9e1a2c
```

El puerto y el nombre cambian en cada ejecución. La contraseña nunca se imprime.
Contenedor de esa ejecución:
`a72e9cb560f059d0cf45c6f17fb927f69a9bf4f74a2acc9fc3be71bdbb36ac90`.

Prisma aplicó correctamente, desde una base vacía:

1. `20260919205642_create_product_initial`
2. `20260919232628_expand_add_category_relation`
3. `20260920054829_backfill_product_categories`
4. `20260920060800_contract_product_category_relation`
5. `20260926025000_add_product_stock_upper_bound`

La prueba compara nombres dinámicamente, sin fijar un conteo de cinco.

## Evidencia de cierre y protección de la base local

La salida registró `TEMPORARY_POSTGRES_REMOVED` con el ID anterior.
`docker ps -a --filter label=inventory.integration=block-05` no devolvió
contenedores tras finalizar. La primera ejecución, que falló por una expectativa
de mensaje demasiado específica, también eliminó su contenedor.

Se inspeccionó únicamente el estado Docker del servicio local antes y después:
continuó healthy en el puerto 5433, sin detenerlo ni recrearlo. No se ejecutó
ninguna consulta, migración o limpieza contra la base local, ni se usaron sus
credenciales. Todas las operaciones de Prisma de integración utilizaron el
puerto dinámico y la base aleatoria documentados arriba. No se modificó `.env`.

## Conservación de verificaciones anteriores

La suite de PostgreSQL externo existente en src se conserva, separada del nuevo
comando, con `npm run test:integration:legacy` y su propia configuración. Mantiene
sus restricciones de base de verificación y rechazo del puerto 5433. El script
`verify-fresh-database.ps1` llama ahora ese comando heredado, conservando su flujo.
No se ejecutaron esas verificaciones heredadas en este bloque.

## Archivos creados o modificados

Creado:

- `test/integration/setup.ts`
- `test/integration/temporary-postgres.ts`
- `test/integration/inventory.spec.ts`
- `vitest.integration.legacy.config.mts`
- `docs/BLOQUE_05.md`

Modificado:

- `package.json` y `package-lock.json`: dependencia y comando heredado separado.
- `vitest.integration.config.mts`: suite temporal aislada y tiempos de espera.
- `scripts/verify-fresh-database.ps1`: conserva su suite externa mediante el comando heredado.
- `README.md`: instrucciones actuales de integración.

## Verificaciones y pendientes

La comprobación TypeScript de los tres archivos de integración pasó con
`tsc --noEmit`, modo strict y decoradores habilitados. Se aplicó Prettier.
`git diff --check` no encontró errores de espacios.
`npm.cmd run build` también terminó correctamente, con salida 0.

En el primer intento, Prisma devolvió el detalle de violación única
`Key (sku)=(INT-001) already exists.` en lugar del nombre del índice esperado.
Se ajustó la expectativa conservando la verificación del SQLSTATE 23505 y se
repitió toda la suite en un contenedor nuevo: cinco casos aprobados.

La auditoría npm reporta 11 avisos: 6 moderados y 5 altos, ninguno crítico.
Incluye los avisos anteriores y avisos transitivos de la línea compatible de
Testcontainers. La actualización mayor sugerida requiere también actualizar
Node; no se actualizó el entorno global ni se aplicó audit fix --force.
No quedan fallos de las suites solicitadas. No se configuró GitHub Actions.

Referencias: [PostgreSQL con Testcontainers](https://testcontainers.com/modules/postgresql/)
y [ciclo de vida y eliminación de contenedores](https://node.testcontainers.org/features/containers/).
