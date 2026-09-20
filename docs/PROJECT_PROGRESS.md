# Progreso del proyecto Inventario Migraciones

## Tecnologías

TypeScript, NestJS, PostgreSQL, Prisma ORM, Docker Compose, Joi y Jest.

## Bloques

1. Infraestructura y proyecto base — **TERMINADO**
2. Modelo inicial Product, primera migración y seed — **TERMINADO**
3. Recorrido completo de creación HTTP — **TERMINADO**
4. Fase expandir: Category y relación opcional — **TERMINADO**
5. Migración de datos y escritura dual — **TERMINADO**
6. Fase contraer del esquema — **TERMINADO**
7. Reconstrucción desde una base vacía — **TERMINADO**
8. Verificación integral y criterios de aceptación — **TERMINADO**

## Estado del Bloque 1

**TERMINADO**

Todas las comprobaciones obligatorias del bloque finalizaron correctamente.

## Comprobaciones realizadas

- Instalación de dependencias: exitosa; se generó `package-lock.json`.
- Cliente Prisma: generado con Prisma 6.19.3.
- Esquema Prisma: válido y sin modelos de dominio.
- PostgreSQL: iniciado con Docker Compose usando volumen persistente.
- Healthcheck del contenedor: `healthy`.
- Compilación: `npm run build` finalizó con código 0.
- Pruebas automatizadas: 1 suite y 2 pruebas aprobadas.
- API: inició correctamente en el puerto 3000.
- Solicitud real: `GET http://localhost:3000/health` respondió HTTP 200 con `{"status":"ok","database":"connected"}`.
- Git: repositorio inicializado; `.env`, `node_modules`, `dist` y `coverage` están ignorados.
- Nota local: se utilizó el puerto host 5433 porque el 5432 ya estaba ocupado; PostgreSQL conserva el puerto 5432 dentro del contenedor.

## Regla de migraciones

Las migraciones que hayan sido creadas o aplicadas no se modifican. Cualquier cambio posterior se implementará mediante una migración nueva.

## Estado del Bloque 2

**TERMINADO**

- Se agregó el modelo inicial `Product` con `categoryName` como texto.
- Se creó la migración `20260919205642_create_product_initial` mediante `--create-only`.
- El SQL fue revisado antes de aplicarse: tabla, tipos, nulabilidad, clave primaria, unicidad de SKU, índice de categoría y restricciones `CHECK`.
- Se agregaron antes de la primera aplicación los constraints `Product_price_positive` y `Product_stock_nonnegative`.
- La migración fue aplicada exitosamente y queda cerrada e inmutable.
- `prisma migrate status` confirmó una migración y un esquema actualizado.
- El cliente Prisma 6.19.3 fue generado correctamente.
- El seed se ejecutó dos veces; ambas dejaron exactamente 4 productos con los SKU `ELE-001`, `FER-001`, `FER-002` y `PLM-001`.
- PostgreSQL rechazó SKU duplicado, precio cero, stock negativo y `categoryName` nulo. Las transacciones de prueba fueron revertidas y el conteo final permaneció en 4.
- La compilación, las pruebas automatizadas, el endpoint `/health` y las exclusiones de Git fueron verificados nuevamente.

## Estado del Bloque 3

**TERMINADO**

- Se creó `POST /products` con DTO, controlador, caso de uso, puerto de persistencia y repositorio Prisma.
- Se configuraron globalmente transformación, lista blanca y rechazo de propiedades desconocidas.
- Se agregó manejo uniforme de `VALIDATION_ERROR`, `PRODUCT_SKU_CONFLICT` e `INTERNAL_ERROR`.
- Se crearon pruebas unitarias del servicio y controlador, además de pruebas e2e HTTP con repositorio simulado.
- La verificación manual utilizó el SKU `FER-003`: creación HTTP 201, duplicado HTTP 409 e entrada inválida HTTP 400.
- `GET /health` continuó respondiendo HTTP 200.
- El seed se ejecutó antes de la comprobación manual y conservó los cuatro productos mínimos.
- No se modificó `schema.prisma`, el seed ni ningún archivo dentro de `prisma/migrations`.

### Archivos del Bloque 3

- Creados: filtro HTTP global y estructura `src/products` para dominio, aplicación, puerto, infraestructura, presentación y pruebas.
- Modificados: `src/main.ts`, `src/app.module.ts`, `package.json`, `package-lock.json`, `README.md` y este registro de progreso.

## Estado del Bloque 4 — EXPANDIR

**TERMINADO**

- Se agregó `Category` y la relación opcional `Product.categoryId`, conservando `categoryName` obligatorio y activo.
- Se creó la migración `20260919232628_expand_add_category_relation` mediante `--create-only`.
- El SQL fue revisado antes de aplicarse: no contiene `DROP TABLE`, `DROP COLUMN`, `UPDATE` ni `DELETE`.
- La migración crea `Category`, agrega `categoryId` nullable, crea los índices y agrega la FK con `ON DELETE RESTRICT` y `ON UPDATE CASCADE`.
- La migración fue aplicada y queda cerrada e inmutable.
- Antes de migrar existían 6 productos: IDs `1, 2, 3, 4, 17, 22`; SKU `FER-001, FER-002, ELE-001, PLM-001, FER-003, BLK4-PRE`.
- Después de migrar permanecían los mismos 6 productos con idénticos ID, SKU, precio, stock y `categoryName`; todos tenían `categoryId = null`.
- La tabla `Category` quedó creada y vacía; no se realizó backfill.
- PostgreSQL rechazó un nombre de categoría duplicado, un `categoryId` inexistente y la eliminación de una categoría referenciada. Todas las pruebas fueron revertidas y no dejaron datos temporales.
- El seed existente conservó los productos externos y no creó categorías ni asignó relaciones.
- La prueba posterior creó `BLK4-POST` mediante HTTP 201 y confirmó `categoryId = null`; `/health` respondió HTTP 200.
- Compilación exitosa y 13 pruebas automatizadas aprobadas.
- Las etapas **Migrar datos** y **Contraer** permanecen pendientes.

### Archivos del Bloque 4

- Creado: `prisma/migrations/20260919232628_expand_add_category_relation/migration.sql`.
- Modificados: `prisma/schema.prisma`, `README.md` y este registro de progreso.
- Protegidos sin cambios: migración del Bloque 2, seed, DTO, controlador, servicio, repositorio, filtros y pruebas existentes.

## Estado del Bloque 5 — MIGRAR DATOS

**TERMINADO**

- Inventario previo: 8 productos, 0 categorías y 8 relaciones nulas; no existían nombres vacíos, nombres compuestos sólo por espacios ni relaciones discordantes.
- Se creó la migración `20260920054829_backfill_product_categories` como migración vacía mediante Prisma y se agregó únicamente el SQL versionado de backfill.
- El SQL fue revisado antes de aplicarse: crea categorías distintas con `ON CONFLICT DO NOTHING`, relaciona productos y aborta si queda algún `categoryId` nulo.
- La migración no elimina tablas, columnas, productos ni `categoryName`, no cambia nulabilidad y queda cerrada e inmutable.
- Comparación posterior: permanecieron los mismos 8 productos con idénticos ID, SKU, nombre, precio, stock y `categoryName`.
- Se crearon 3 categorías: `Electricidad`, `Herramientas` y `Plomería`; quedaron 0 relaciones nulas, 0 inválidas, 0 discordantes y 0 nombres duplicados.
- El repositorio Prisma ahora ejecuta el upsert de categoría y la creación del producto en una única transacción, conservando escritura dual de `categoryName` y `categoryId`.
- El seed fue actualizado para crear o reutilizar categorías y mantener ambos campos. Dos ejecuciones consecutivas conservaron 8 productos, 3 categorías y 4 productos externos.
- Verificación HTTP: `JAR-001` creó la categoría `Jardinería`; `BLK5-HERR` reutilizó `Herramientas`; un duplicado devolvió HTTP 409 y no dejó `Categoria Huerfana B5`; una entrada inválida devolvió HTTP 400; `/health` devolvió HTTP 200.
- Una prueba directa del repositorio provocó un `ProductSkuConflictError` después del upsert de `Atomic Rollback B5`; la transacción revirtió y PostgreSQL confirmó 0 categorías con ese nombre.
- Compilación exitosa y 15 pruebas automatizadas aprobadas.
- La fase **Contraer** permanece pendiente; `categoryId` continúa nullable y `categoryName` continúa activo.

### Archivos del Bloque 5

- Creado: `prisma/migrations/20260920054829_backfill_product_categories/migration.sql` y prueba unitaria del repositorio Prisma.
- Modificados: repositorio Prisma de productos, seed, `README.md` y este registro.
- Protegidos sin cambios: migraciones anteriores, `schema.prisma`, DTO, controlador, servicio, puerto y filtro HTTP.

## Estado del Bloque 6 — CONTRAER

**TERMINADO**

- Verificación previa: 11 productos, 4 categorías, 0 relaciones nulas, 0 huérfanas, 0 discordantes, 0 nombres vacíos y 0 categorías duplicadas.
- Se creó la migración `20260920060800_contract_product_category_relation`. Prisma no pudo confirmar interactivamente la advertencia destructiva en este entorno; el SQL estructural fue generado con `prisma migrate diff`, incorporado a una nueva migración y aplicado con `prisma migrate deploy`.
- El SQL fue revisado antes de aplicarse y se ejecuta en una transacción: valida relaciones nulas y huérfanas, elimina el índice heredado, elimina únicamente `Product.categoryName` y establece `Product.categoryId NOT NULL`.
- La eliminación de `categoryName` es intencional y segura porque sus valores estaban representados por `Category.name` antes de contraer.
- Comparación posterior: permanecieron los mismos 11 productos y 4 categorías con idénticos ID, SKU, nombre, precio, stock, `categoryId` y nombre relacionado.
- PostgreSQL confirmó que `categoryName` ya no existe, `categoryId` es `NOT NULL`, la FK conserva `ON DELETE RESTRICT / ON UPDATE CASCADE` y el índice `Product_categoryId_idx` permanece activo.
- El repositorio dejó de escribir `Product.categoryName`; incluye `category` y mapea `Category.name` como `categoryName` en la respuesta pública.
- El seed dejó de escribir la columna eliminada. Dos ejecuciones conservaron 11 productos, 4 categorías y 7 productos externos.
- PostgreSQL rechazó un producto sin `categoryId` y la eliminación de una categoría utilizada.
- Verificación HTTP: `PIN-001` creó `Pinturas`; `BLK6-HERR` reutilizó `Herramientas`; duplicados devolvieron HTTP 409 sin categorías huérfanas; una entrada inválida devolvió HTTP 400; `/health` devolvió HTTP 200.
- Compilación exitosa y 15 pruebas automatizadas aprobadas.
- La estrategia **Expandir → Migrar datos → Contraer** está completada.

### Archivos del Bloque 6

- Creado: `prisma/migrations/20260920060800_contract_product_category_relation/migration.sql`.
- Modificados: `prisma/schema.prisma`, repositorio Prisma y su prueba, seed, `README.md` y este registro.
- Protegidos sin cambios: migraciones anteriores, DTO, controlador, servicio, puerto y filtro HTTP.

## Estado del Bloque 7 — RECONSTRUCCIÓN

**TERMINADO**

- Se verificó el Bloque 6 con árbol limpio, cuatro migraciones aplicadas, compilación exitosa, 15 pruebas aprobadas, PostgreSQL principal saludable y `/health` HTTP 200.
- Entorno aislado: proyecto `inventory-history-verification`, contenedor `inventory-history-verification-postgres`, PostgreSQL en puerto host 5434, base `inventory_verification`, usuario diferente y sin volumen declarado.
- La base temporal inició con 0 tablas; no existían `Product`, `Category` ni `_prisma_migrations`.
- `prisma migrate deploy` aplicó en orden las cuatro migraciones: `20260919205642_create_product_initial`, `20260919232628_expand_add_category_relation`, `20260920054829_backfill_product_categories` y `20260920060800_contract_product_category_relation`.
- El esquema reconstruido contiene `Product`, `Category` y `_prisma_migrations`; `categoryId` es `NOT NULL`, `categoryName` no existe, y se conservaron PK, unicidad, checks, FK, índice, `ON DELETE RESTRICT` y `ON UPDATE CASCADE`.
- Primera ejecución del seed: 4 productos, 3 categorías, 0 relaciones nulas, 0 SKU duplicados y 0 categorías duplicadas.
- Segunda ejecución del seed: los mismos 4 productos y 3 categorías, sin duplicados ni relaciones nulas.
- PostgreSQL temporal rechazó SKU duplicado, categoría duplicada, producto sin categoría, FK inexistente, precio cero, stock negativo y eliminación de categoría utilizada. Las transacciones fueron revertidas.
- API temporal en puerto 3001: `/health` HTTP 200, creación `VERIFY-HTTP-001` HTTP 201 con precio `42.75` y categoría relacionada, repetición HTTP 409 y entrada inválida HTTP 400.
- La automatización ejecutó además compilación y 15 pruebas con resultado exitoso.
- La limpieza eliminó únicamente el contenedor y red del proyecto temporal, sin `down -v` y sin tocar el volumen principal.
- Después de limpiar, la base principal continuó saludable con 13 productos, 5 categorías y 0 relaciones nulas; `/health` principal respondió HTTP 200.
- Ninguna migración, esquema, seed, controlador, servicio, repositorio, DTO, filtro o prueba funcional fue modificada.

### Archivos del Bloque 7

- Creados: `compose.verify.yaml`, `.env.verify.example` y `scripts/verify-fresh-database.ps1`.
- Modificados: `.gitignore`, `package.json`, `README.md` y este registro.
- Local ignorado: `.env.verify`.

## Estado del Bloque 8 — VERIFICACIÓN INTEGRAL

**TERMINADO**

- La arquitectura conserva la separación DTO, controlador, servicio, puerto y adaptador Prisma; el filtro uniforme no expone detalles internos.
- Se ampliaron las pruebas de validación, filtro y HTTP, y se agregó integración real protegida contra PostgreSQL temporal.
- Resultado: 31 pruebas unitarias/e2e y 5 de integración aprobadas; 36 aprobadas, 0 fallidas.
- Cobertura: statements 44.27%, branches 60.00%, functions 51.42% y lines 43.25%.
- Compilación, ESLint sin corrección automática, Prettier en modo check y validación Prisma finalizaron correctamente.
- La reconstrucción temporal aplicó las 4 migraciones desde una base vacía; dos seeds conservaron 4 productos, 3 categorías y cero invariantes incumplidas.
- Se verificaron restricciones reales, rollback transaccional y la matriz HTTP 200/201/400/404/409.
- El entorno temporal fue eliminado; la base principal permaneció saludable con 13 productos, 5 categorías y 0 relaciones nulas, y `/health` respondió 200.
- `.env`, `.env.verify` y artefactos generados continúan ignorados. No se modificaron migraciones, esquema ni seed.
- Evidencia completa: [ACCEPTANCE_EVIDENCE.md](ACCEPTANCE_EVIDENCE.md).

## Registro cronológico

- 2026-09-19: Inicio del Bloque 1 y creación de la estructura base.
- 2026-09-19: Validación completa de dependencias, Prisma, PostgreSQL, compilación, pruebas, API, endpoint de salud y exclusiones de Git. Bloque 1 terminado.
- 2026-09-19: Punto de control local del Bloque 1 creado antes de iniciar la integración del dominio.
- 2026-09-19: Migración `20260919205642_create_product_initial` revisada, aplicada y declarada inmutable; seed idempotente y restricciones PostgreSQL verificadas. Bloque 2 terminado.
- 2026-09-19: `POST /products` verificado de extremo a extremo con los códigos 201, 409 y 400; manejo uniforme de errores, 13 pruebas automatizadas y migración anterior intacta. Bloque 3 terminado.
- 2026-09-19: Etapa EXPANDIR completada con `Category` y `Product.categoryId` nullable; 6 productos preservados durante la migración, restricciones PostgreSQL verificadas y backfill pendiente. Bloque 4 terminado.
- 2026-09-20: Etapa MIGRAR DATOS completada con backfill versionado, cero relaciones nulas, escritura dual transaccional, seed idempotente y compatibilidad HTTP preservada. Bloque 5 terminado.
- 2026-09-20: Etapa CONTRAER completada con `categoryId NOT NULL`, retiro seguro de `Product.categoryName`, persistencia basada sólo en la relación y contrato HTTP preservado. Estrategia completa y Bloque 6 terminado.
- 2026-09-20: Historial completo reconstruido con `migrate deploy` sobre PostgreSQL temporal vacío; seed idempotente, restricciones y API temporal verificadas, limpieza segura y base principal intacta. Bloque 7 terminado.
- 2026-09-20: Verificación integral completada con 36 pruebas aprobadas, cobertura registrada, restricciones PostgreSQL y respuestas HTTP comprobadas, reconstrucción aislada repetida y matriz de aceptación documentada. Bloque 8 terminado.
