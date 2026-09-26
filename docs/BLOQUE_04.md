# Bloque 4: pruebas unitarias de negocio con Vitest

## Resultado

**39 pruebas aprobadas en 8 archivos**, sin fallos ni casos omitidos, mediante
`npm.cmd run test:unit` (equivalente Windows de `npm run test:unit`). El script
ejecuta `vitest run --config vitest.config.mts`, sin modo watch.

Se agregaron **19 casos**: 15 de productos y 4 de categorías. Se conservaron las
20 pruebas unitarias anteriores y todos los cambios de los bloques 1–3.
No se cambiaron reglas de negocio, endpoints, dependencias o configuración.

## Archivos creados

- `test/unit/create-product.service.spec.ts`: 15 casos de registro de productos.
- `test/unit/categories.service.spec.ts`: 4 casos de registro de categorías.
- `docs/BLOQUE_04.md`: casos, aislamiento y evidencia de ejecución.

No se modificaron archivos existentes en este bloque. Los demás cambios visibles
en Git corresponden a los bloques anteriores.

## Diseño de las pruebas

Los archivos importan explícitamente `describe`, `it`, `expect`, `beforeEach` y
`vi` de Vitest. Cada caso tiene nombre descriptivo y secciones **Arrange–Act–Assert**.
Las variantes parametrizadas cuentan como ejecuciones independientes.

Se instancian directamente `CreateProductService` y `CategoriesService`; sus
reglas y errores de dominio son reales. Solo los métodos de los puertos de
repositorio se sustituyen por `vi.fn`, tipados con sus interfaces. Los mocks se
recrean antes de cada caso. Los datos y las fechas son deterministas y viven
exclusivamente en memoria.

Las expectativas verifican el registro completo devuelto, los argumentos
normalizados enviados a persistencia, el número de escrituras y los errores por
clase, código, tipo y mensaje concreto. Los rechazos comprueban que no se guarde
un producto o categoría; los datos inválidos se rechazan antes de consultar
los repositorios. La lógica de negocio no se simula.

## Casos de productos: 15

| Caso | Expectativa |
| --- | --- |
| Creación exitosa | Devuelve producto completo; normaliza SKU/nombre, consulta categoría 7 y guarda una sola vez |
| Categoría por nombre compatible | Resuelve Herramientas, guarda categoryId 7 y no crea categorías |
| Stock 0 | Aceptado y enviado sin alteración al repositorio |
| Stock 1000 | Aceptado y enviado sin alteración al repositorio |
| Stock -1 | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Stock 1001 | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Precio 0 | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Precio -0.01 | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Nombre vacío | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Nombre con solo espacios | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| SKU vacío | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| SKU con solo espacios | InventoryError, invalid, VALIDATION_ERROR; sin lecturas ni escrituras |
| Categoría inexistente por ID | InventoryError, not-found, CATEGORY_NOT_FOUND; sin escrituras |
| Categoría inexistente por nombre | InventoryError, not-found, CATEGORY_NOT_FOUND; sin escrituras |
| SKU duplicado normalizado | ProductSkuConflictError para FER-001; sin escrituras |

## Casos de categorías: 4

| Caso | Expectativa |
| --- | --- |
| Creación exitosa | Normaliza el nombre, comprueba disponibilidad y devuelve el registro completo guardado una sola vez |
| Nombre duplicado con espacios exteriores | InventoryError, conflict, CATEGORY_NAME_CONFLICT; no guarda |
| Nombre vacío | InventoryError, invalid, VALIDATION_ERROR; no consulta ni guarda |
| Nombre con solo espacios | InventoryError, invalid, VALIDATION_ERROR; no consulta ni guarda |

## Evidencia sin PostgreSQL

La suite no requiere PostgreSQL, Docker ni servicios externos. Las nuevas pruebas
no importan Prisma, adaptadores de infraestructura, módulos de arranque ni clientes
de red. Las pruebas heredadas del adaptador y de salud se conservaron: algunas
cargan clases de Prisma para representar datos/errores o tokens de inyección,
pero utilizan dobles de persistencia y no abren conexiones ni crean PrismaClient.
La configuración unitaria excluye integración y e2e.

Para demostrar independencia de la base, se realizaron estas operaciones **fuera
de las pruebas**, desde la terminal:

1. `docker compose ps --all postgres`: el servicio normal estaba healthy.
2. `docker compose stop postgres`: detención sin eliminar contenedor ni volumen.
3. `docker inspect --format '{{.State.Running}}' inventario-migraciones-postgres-1`:
   devolvió `false`.
4. Se asignó temporalmente DATABASE_URL a
   `postgresql://unit:unit@127.0.0.1:1/unavailable`, solo en el proceso de ejecución,
   sin leer ni modificar las credenciales del archivo `.env`.
5. `npm.cmd run test:unit`: **39/39 aprobadas**, salida **0**, duración **3.10 s**.
6. Se volvió a inspeccionar el contenedor: continuaba detenido (`false`).
7. Mediante `finally`, se restauró la variable del proceso y se ejecutó
   `docker compose start postgres` para devolver el servicio a su estado inicial.
8. `docker compose ps postgres`: servicio nuevamente **healthy** en puerto 5433.

Extracto de la salida real:

```text
POSTGRES_RUNNING_BEFORE_TESTS=false
RUN v3.2.6
test/unit/categories.service.spec.ts (4 tests)
test/unit/create-product.service.spec.ts (15 tests)
Test Files  8 passed (8)
Tests       39 passed (39)
Duration    3.10s
POSTGRES_RUNNING_AFTER_TESTS=false
UNIT_TEST_EXIT_CODE=0
```

No se utilizó PostgreSQL durante la suite, ni se ejecutaron consultas, seeds o
migraciones. Docker se utilizó únicamente para la demostración externa de
detención y restauración; no forma parte del comando test:unit ni del código de
las pruebas. No se alteraron datos existentes.

## Comprobaciones adicionales

- `npm.cmd exec -- prettier --write test/unit/create-product.service.spec.ts test/unit/categories.service.spec.ts`: correcto.
- `npm.cmd exec -- tsc --noEmit --target ES2023 --module commonjs --experimentalDecorators --emitDecoratorMetadata --esModuleInterop --skipLibCheck --strict test/unit/create-product.service.spec.ts test/unit/categories.service.spec.ts`: sin errores de tipos.
- `git diff --check`: sin errores de espacios.

No quedan errores de este bloque. Los avisos de dependencias y Prisma previamente
documentados no se abordaron aquí. No se configuraron Testcontainers ni GitHub
Actions, ni se avanzó al bloque siguiente.
