# Bloque 2: PostgreSQL y restricciones de inventario

## Alcance y revisión inicial

Se conservaron todos los cambios del bloque 1. Se revisaron `prisma/schema.prisma`,
las cuatro migraciones existentes, `compose.yaml` y la configuración local antes
de realizar cambios. No se duplicaron modelos ni se editaron migraciones previas.

Los modelos ya estaban completos:

- Category: `id`, `name` único, `createdAt`, `updatedAt` y colección de productos.
- Product: `id`, `sku` único, `name`, `price`, `stock`, `categoryId` obligatorio,
  relación con Category, `createdAt` y `updatedAt`. Se conserva `description`
  opcional y el índice de categoría.

No fue necesario modificar el schema. El historial ya contenía el CHECK de
precio positivo, el CHECK de stock no negativo, el índice único de SKU y la
clave foránea de categoría. La cuarta migración ya había establecido
`categoryId NOT NULL`. Solo faltaba limitar stock a 1000.

## PostgreSQL y entorno

Docker Compose ya estaba configurado con `postgres:17-alpine`, volumen persistente,
política de reinicio y healthcheck. El servicio normal existente
`inventario-migraciones-postgres-1` estaba y continúa `healthy`, con puerto local
5433 dirigido al puerto 5432 del contenedor. No fue necesario recrearlo ni reiniciarlo.

Se conservó DATABASE_URL en `.env`, que está ignorado por Git, sin modificar ni
publicar sus credenciales. Se verificó que apunta a `localhost:5433/inventory_db`
y coincide con las variables de Compose. `.env.example` contiene solamente la
contraseña de muestra `change_this_local_password`; se sincronizó su puerto a
5433 y se añadieron instrucciones para reemplazar el valor únicamente en `.env`.
Los caracteres especiales en las credenciales de una URL deben codificarse.

## Migración nueva

`prisma/migrations/20260926025000_add_product_stock_upper_bound/migration.sql`

Migración SQL personalizada, versionada para ejecución mediante Prisma. Los
CHECK se mantienen en SQL; no hay cambios de modelos que requieran otra migración.

```sql
BEGIN;
ALTER TABLE "Product"
ADD CONSTRAINT "Product_stock_maximum" CHECK ("stock" <= 1000);
COMMIT;
```

Es aditiva y transaccional. PostgreSQL valida también las filas existentes: si
alguna supera 1000, falla sin corregir, eliminar ni truncar datos. Combinada con
`Product_stock_nonnegative`, impone el intervalo inclusivo de 0 a 1000.
Se aplica una sola vez mediante el historial de Prisma; no debe ejecutarse
manualmente de nuevo sobre una base donde ya está aplicada.

Antes de aplicarla se confirmó que las cuatro migraciones previas estaban
terminadas, sin rollback, y que no había productos fuera del intervalo.
Se usó `prisma migrate deploy` para aplicar únicamente el SQL pendiente,
sin base sombra, reinicios ni solicitudes de reset.

## Comandos y resultados

| Comando | Resultado |
| --- | --- |
| `docker compose ps` | PostgreSQL saludable antes y después |
| `npm.cmd run prisma:validate` | Schema válido; salida 0 |
| `npm.cmd run prisma:generate` | Prisma Client 6.19.3 generado; salida 0 |
| `npm.cmd exec -- prisma migrate deploy` | Nueva migración aplicada; salida 0 |
| `npm.cmd run prisma:status` | 5 migraciones; schema al día; salida 0 |
| `npm.cmd run build` | NestJS compila correctamente; salida 0 |
| `git diff --check` | Sin errores de espacios; salida 0 |

Se utilizó `npm.cmd` por la restricción de PowerShell sobre npm.ps1. El primer
acceso a Docker dentro del aislamiento falló por permisos; la ejecución autorizada
fuera de ese aislamiento permitió consultar el motor y PostgreSQL. No fue un
fallo del servicio de base de datos.

La inspección SQL se ejecutó mediante
`docker compose exec -T postgres psql -U inventory_user -d inventory_db -v ON_ERROR_STOP=1`,
con consultas de solo lectura sobre `_prisma_migrations`, `pg_constraint`,
`pg_indexes`, `information_schema.columns`, Product y Category.

## Conservación de datos y restricciones comprobadas

Se compararon conteos y huellas MD5 del contenido JSON completo de cada tabla,
ordenado por ID, antes y después de la migración:

| Tabla | Filas antes/después | Huella antes/después |
| --- | --- | --- |
| Product | 13 / 13 | `d248242c39b16c493341e677d62e91b8` |
| Category | 5 / 5 | `7c38bb94ef66ff71e09949adb8e1640c` |

Las huellas coinciden. No se ejecutaron seeds, borrados, actualizaciones de datos,
`prisma migrate reset`, recreaciones de base ni eliminación de volúmenes.

Estado final verificado en los catálogos PostgreSQL:

- `Product_price_positive`: CHECK `price > 0`, validado.
- `Product_stock_nonnegative`: CHECK `stock >= 0`, validado.
- `Product_stock_maximum`: CHECK `stock <= 1000`, validado.
- `Product_sku_key`: índice único sobre SKU.
- `Category_name_key`: índice único sobre nombre de categoría.
- `Product_categoryId_fkey`: FK a Category, validada, ON DELETE RESTRICT y
  ON UPDATE CASCADE; `categoryId` es NOT NULL.
- `sku`, `price` y `stock` también son NOT NULL.
- Cinco migraciones completadas en el historial.

## Archivos de este bloque

- Modificado: `.env.example`.
- Creado: `prisma/migrations/20260926025000_add_product_stock_upper_bound/migration.sql`.
- Creado: `docs/BLOQUE_02.md`.

El cliente Prisma y la salida compilada se regeneraron en directorios ignorados.
Los demás cambios visibles en Git pertenecen al bloque 1 y se conservaron.

## Avisos y pendientes

No quedan errores de validación, generación, aplicación de migraciones o compilación.
Prisma advierte que `package.json#prisma` está obsoleto de cara a Prisma 7;
la configuración sigue funcionando con Prisma 6.19.3 y no se migra en este bloque.

El script heredado `scripts/verify-fresh-database.ps1` y la prueba existente
`src/products/infrastructure/products.postgres.integration-spec.ts` esperan
exactamente cuatro migraciones. Deberán adaptar esa expectativa al historial
actual (preferiblemente sin un conteo fijo) en el bloque de verificaciones.
No se ejecutaron ni modificaron estas verificaciones en este bloque.

Los avisos de dependencias registrados en el bloque 1 siguen pendientes; no se
actualizaron paquetes aquí. Tampoco se cambia el contrato HTTP: la validación DTO
del máximo de stock y el rechazo de categorías no registradas siguen pendientes
del bloque de aplicación. La FK garantiza una categoría al persistir, pero el
repositorio existente todavía puede crearla mediante upsert.

No se implementaron endpoints, pruebas, Testcontainers ni GitHub Actions.
