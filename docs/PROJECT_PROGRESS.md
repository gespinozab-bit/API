# Progreso del proyecto Inventario Migraciones

## Tecnologías

TypeScript, NestJS, PostgreSQL, Prisma ORM, Docker Compose, Joi y Jest.

## Bloques

1. Infraestructura y proyecto base — **TERMINADO**
2. Modelo inicial Product, primera migración y seed — **TERMINADO**
3. Recorrido completo de creación HTTP — **TERMINADO**
4. Fase expandir: Category y relación opcional — **TERMINADO**

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

## Registro cronológico

- 2026-09-19: Inicio del Bloque 1 y creación de la estructura base.
- 2026-09-19: Validación completa de dependencias, Prisma, PostgreSQL, compilación, pruebas, API, endpoint de salud y exclusiones de Git. Bloque 1 terminado.
- 2026-09-19: Punto de control local del Bloque 1 creado antes de iniciar la integración del dominio.
- 2026-09-19: Migración `20260919205642_create_product_initial` revisada, aplicada y declarada inmutable; seed idempotente y restricciones PostgreSQL verificadas. Bloque 2 terminado.
- 2026-09-19: `POST /products` verificado de extremo a extremo con los códigos 201, 409 y 400; manejo uniforme de errores, 13 pruebas automatizadas y migración anterior intacta. Bloque 3 terminado.
- 2026-09-19: Etapa EXPANDIR completada con `Category` y `Product.categoryId` nullable; 6 productos preservados durante la migración, restricciones PostgreSQL verificadas y backfill pendiente. Bloque 4 terminado.
