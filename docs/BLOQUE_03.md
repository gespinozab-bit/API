# Bloque 3: endpoints de inventario

## Alcance y resultado

Se revisaron los módulos, controladores, DTO, puertos, adaptadores Prisma y
verificaciones anteriores. Se amplió el POST de productos existente, sin
duplicarlo. No se modificaron el schema, las migraciones ni la configuración
de PostgreSQL. Se conservaron los bloques 1 y 2.

| Endpoint | Comportamiento |
| --- | --- |
| `POST /categories` | Registra nombre único; responde 201, 400 o 409 |
| `GET /categories` | Lista categorías ordenadas por ID; responde 200 con arreglo |
| `POST /products` | Registra producto asociado a categoría existente; responde 201, 400, 404 o 409 |
| `GET /products` | Lista productos con categoryId y categoryName, ordenados por ID; responde 200 con arreglo |
| `GET /products/:id` | Consulta un producto; responde 200, 400 para ID inválido o 404 si no existe |

El POST de productos acepta exactamente uno de `categoryId` o `categoryName`.
Se conserva categoryName para clientes anteriores, pero **ya no se crean categorías
implícitamente**. Deben registrarse antes mediante POST /categories. Usar ambos
campos o no enviar ninguno responde 400. Los productos conservan los campos de
respuesta anteriores y agregan categoryId; price sigue siendo una cadena con
dos decimales. Las listas no tienen paginación en este bloque.

## Reglas y separación de responsabilidades

- Dominio: `product.rules.ts` y `category.ts` normalizan y validan datos sin
  depender de HTTP o Prisma. SKU obligatorio de 3–30 caracteres, sin espacios
  exteriores y en mayúsculas; nombre obligatorio de hasta 120 caracteres;
  precio positivo con hasta dos decimales y máximo 99999999.99, acorde a Decimal(10,2);
  stock entero entre 0 y 1000 inclusive. Nombre de categoría no vacío, hasta 80
  caracteres, sin espacios exteriores. La unicidad de categoría conserva la
  comparación exacta de PostgreSQL, sensible a mayúsculas.
- Aplicación: los servicios coordinan los puertos, comprueban duplicados,
  existencia de categoría y existencia de producto. Se usan errores de negocio
  sin códigos HTTP internos.
- Persistencia: los adaptadores Prisma consultan y escriben. El producto usa
  `connect`, nunca `upsert` de categoría. Las restricciones únicas y la FK
  protegen también las carreras; P2002 se traduce a conflicto, P2025/P2003
  durante la creación del producto a categoría inexistente.
- HTTP: DTO y ValidationPipe rechazan propiedades desconocidas y datos inválidos;
  los controladores delegan. Se mantienen cadenas numéricas compatibles, pero
  no se convierten booleanos ni cadenas vacías a números. El filtro global
  convierte errores de negocio a 400/404/409 y mantiene el formato uniforme.

Se corrigió además la salida de compilación: Prisma seed se incluía en la
compilación general y desplazaba main a `dist/src/main.js`. `tsconfig.build.json`
ahora limita la aplicación a src y produce `dist/main.js`, compatible con
`start:prod`. El seed conserva su ejecución independiente mediante ts-node.

## Archivos creados

- `src/categories/categories.module.ts`
- `src/categories/domain/category.ts`
- `src/categories/application/categories.service.ts`
- `src/categories/application/ports/category.repository.ts`
- `src/categories/infrastructure/prisma-category.repository.ts`
- `src/categories/presentation/categories.controller.ts`
- `src/categories/presentation/dto/create-category.dto.ts`
- `src/common/domain/inventory.error.ts`
- `src/products/domain/product.rules.ts`
- `src/products/application/query-products.service.ts`
- `docs/BLOQUE_03.md`

## Archivos modificados en este bloque

- `src/app.module.ts`
- `src/common/http-exception.filter.ts`
- `src/products/products.module.ts`
- `src/products/domain/product.ts`
- `src/products/application/create-product.service.ts`
- `src/products/application/ports/product.repository.ts`
- `src/products/infrastructure/prisma-product.repository.ts`
- `src/products/presentation/products.controller.ts`
- `src/products/presentation/dto/create-product.dto.ts`
- `tsconfig.build.json`
- `scripts/verify-fresh-database.ps1`
- `README.md`
- Verificaciones existentes adaptadas, sin agregar casos:
  `src/products/application/create-product.service.spec.ts`,
  `src/products/infrastructure/prisma-product.repository.spec.ts`,
  `src/products/infrastructure/products.postgres.integration-spec.ts`,
  `src/products/presentation/products.controller.spec.ts` y
  `src/products/presentation/products.e2e-spec.ts`.

## Verificaciones y comandos

| Comando o comprobación | Resultado |
| --- | --- |
| `npm.cmd run build` | Correcto, salida 0; main generado en dist/main.js |
| `npm.cmd run lint` | Correcto, salida 0 |
| `npm.cmd run test:unit` | 6 archivos, 20 pruebas existentes aprobadas |
| `npm.cmd run test:legacy -- --runInBand` | 7 suites, 31 pruebas existentes aprobadas |
| `npm.cmd exec -- prettier --write "src/**/*.ts"` | Formato aplicado |
| `$env:PORT='3083'; node dist/main.js` | Arranque correcto con PostgreSQL real; puerto limitado al proceso, sin cambiar .env |
| Solicitudes HTTP mediante fetch de Node | Las 20 solicitudes documentadas abajo respondieron con el estado esperado |
| Consulta Prisma de solo lectura | Los nombres de las 5 migraciones aplicadas coinciden con los directorios que contienen migration.sql |
| Análisis sintáctico PowerShell del script heredado | Sin errores |

El script heredado y la suite de integración comparan ahora los nombres del
historial aplicado con los archivos locales, excluyendo migraciones revertidas;
no esperan un conteo fijo de cuatro ni de cinco. No se ejecutó el script que
crea una base temporal, ni la suite que limpia datos B8 de la base de verificación.
Se comprobó su nueva comparación contra el historial de PostgreSQL normal,
solo mediante lecturas. Las suites existentes se adaptaron para preparar o
simular categorías previamente registradas, en lugar de esperar creación implícita.

## Datos conservados y pendientes

La comprobación dejó una categoría (`id=7`) y un producto (`id=52`) nuevos en
PostgreSQL normal. No se borraron al finalizar. Total posterior: 6 categorías y
14 productos. Los productos inválidos y la categoría inexistente no se guardaron.
La instancia de API usada en el puerto 3083 se detuvo al terminar; PostgreSQL
permanece activo. Para iniciar la API normalmente, usar `npm run start:prod`.

Excluyendo esos dos registros nuevos, los conteos y huellas coinciden con el
bloque 2: 13 productos, `d248242c39b16c493341e677d62e91b8`; 5 categorías,
`7c38bb94ef66ff71e09949adb8e1640c`. No se borraron ni actualizaron datos anteriores.

No quedan errores conocidos de compilación, lint o de los flujos HTTP comprobados.
Siguen pendientes los avisos de dependencias y de configuración Prisma descritos
en los bloques anteriores. La suite de integración PostgreSQL completa no se
ejecutó; la evidencia real de este bloque es el flujo HTTP y las consultas de
solo lectura. No se crearon pruebas nuevas, Testcontainers ni GitHub Actions.

## Evidencia HTTP real

Comprobacion contra PostgreSQL normal mediante la API compilada en `http://localhost:3083`. Las listas muestran extractos identificados; los demas cuerpos son completos. Los registros creados se conservaron.

### GET /health ? 200

Respuesta:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### POST /categories ? 201

Solicitud:
```json
{
  "name": "Bloque 3 MUHSZ0BY"
}
```

Respuesta:
```json
{
  "id": 7,
  "name": "Bloque 3 MUHSZ0BY",
  "createdAt": "2026-09-26T03:01:08.068Z",
  "updatedAt": "2026-09-26T03:01:08.068Z"
}
```

### POST /products ? 201

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "id": 52,
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "description": null,
  "price": "25.50",
  "stock": 1000,
  "categoryId": 7,
  "categoryName": "Bloque 3 MUHSZ0BY",
  "createdAt": "2026-09-26T03:01:08.121Z",
  "updatedAt": "2026-09-26T03:01:08.121Z"
}
```

### GET /products/52 ? 200

Respuesta:
```json
{
  "id": 52,
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "description": null,
  "price": "25.50",
  "stock": 1000,
  "categoryId": 7,
  "categoryName": "Bloque 3 MUHSZ0BY",
  "createdAt": "2026-09-26T03:01:08.121Z",
  "updatedAt": "2026-09-26T03:01:08.121Z"
}
```

### GET /categories ? 200

Extracto de la respuesta: conteo y registro creado en esta comprobacion.
```json
{
  "total": 6,
  "created": {
    "id": 7,
    "name": "Bloque 3 MUHSZ0BY",
    "createdAt": "2026-09-26T03:01:08.068Z",
    "updatedAt": "2026-09-26T03:01:08.068Z"
  }
}
```

### GET /products ? 200

Extracto de la respuesta: conteo y registro creado en esta comprobacion.
```json
{
  "total": 14,
  "created": {
    "id": 52,
    "sku": "B03-MUHSZ0BY",
    "name": "Producto bloque 3",
    "description": null,
    "price": "25.50",
    "stock": 1000,
    "categoryId": 7,
    "categoryName": "Bloque 3 MUHSZ0BY",
    "createdAt": "2026-09-26T03:01:08.121Z",
    "updatedAt": "2026-09-26T03:01:08.121Z"
  }
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "BAD-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1001,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "stock must not be greater than 1000"
  ],
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.207Z"
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 0,
  "stock": 1000,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "price must be a positive number"
  ],
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.212Z"
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "sku must be longer than or equal to 3 characters"
  ],
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.217Z"
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "   ",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "name should not be empty"
  ],
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.222Z"
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": true,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "stock must not be greater than 1000",
    "stock must not be less than 0",
    "stock must be an integer number"
  ],
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.226Z"
}
```

### POST /products ? 400

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 7,
  "categoryName": "Bloque 3 MUHSZ0BY"
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Indique exactamente uno: categoryId o categoryName",
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.230Z"
}
```

### POST /categories ? 400

Solicitud:
```json
{
  "name": "   "
}
```

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": [
    "name should not be empty"
  ],
  "path": "/categories",
  "timestamp": "2026-09-26T03:01:08.234Z"
}
```

### POST /products ? 404

Solicitud:
```json
{
  "sku": "MISS-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 2147483647
}
```

Respuesta:
```json
{
  "statusCode": 404,
  "code": "CATEGORY_NOT_FOUND",
  "message": "La categoría no existe",
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.242Z"
}
```

### GET /products/2147483647 ? 404

Respuesta:
```json
{
  "statusCode": 404,
  "code": "PRODUCT_NOT_FOUND",
  "message": "El producto no existe",
  "path": "/products/2147483647",
  "timestamp": "2026-09-26T03:01:08.247Z"
}
```

### GET /products/abc ? 400

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed (numeric string is expected)",
  "path": "/products/abc",
  "timestamp": "2026-09-26T03:01:08.249Z"
}
```

### GET /products/0 ? 400

Respuesta:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "El ID debe ser un entero positivo válido",
  "path": "/products/0",
  "timestamp": "2026-09-26T03:01:08.251Z"
}
```

### POST /categories ? 409

Solicitud:
```json
{
  "name": "Bloque 3 MUHSZ0BY"
}
```

Respuesta:
```json
{
  "statusCode": 409,
  "code": "CATEGORY_NAME_CONFLICT",
  "message": "Ya existe una categoría con ese nombre",
  "path": "/categories",
  "timestamp": "2026-09-26T03:01:08.256Z"
}
```

### POST /products ? 409

Solicitud:
```json
{
  "sku": "B03-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryId": 7
}
```

Respuesta:
```json
{
  "statusCode": 409,
  "code": "PRODUCT_SKU_CONFLICT",
  "message": "Ya existe un producto con el SKU B03-MUHSZ0BY",
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.262Z"
}
```

### POST /products ? 404

Solicitud:
```json
{
  "sku": "MISS-MUHSZ0BY",
  "name": "Producto bloque 3",
  "price": 25.5,
  "stock": 1000,
  "categoryName": "Missing MUHSZ0BY"
}
```

Respuesta:
```json
{
  "statusCode": 404,
  "code": "CATEGORY_NOT_FOUND",
  "message": "La categoría no existe",
  "path": "/products",
  "timestamp": "2026-09-26T03:01:08.269Z"
}
```
