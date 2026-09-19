# Inventario Migraciones

Infraestructura inicial de una API de inventario con NestJS, PostgreSQL y Prisma.

## Requisitos

- Node.js 22 o posterior
- npm
- Docker con Docker Compose

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` como `.env` y ajusta exclusivamente los valores locales. `.env` está ignorado por Git.

## Iniciar PostgreSQL

```bash
docker compose up -d
docker compose ps
```

## Iniciar la API

Genera el cliente Prisma e inicia la aplicación:

```bash
npm run prisma:generate
npm run start:dev
```

## Verificar salud

Con PostgreSQL y la API activos:

```bash
curl http://localhost:3000/health
```

La respuesta esperada es:

```json
{"status":"ok","database":"connected"}
```

## Modelo inicial Product

La primera versión del dominio almacena `sku`, nombre, descripción opcional, precio, existencias y `categoryName` como texto. PostgreSQL exige SKU único, precio positivo, stock no negativo y los campos obligatorios definidos en el esquema.

## Migraciones de desarrollo

Crea una migración sin aplicarla para poder revisar primero su SQL:

```bash
npx prisma migrate dev --name nombre_de_la_migracion --create-only
```

Después de revisar el archivo generado, aplica las migraciones pendientes:

```bash
npm run prisma:migrate
```

Comprueba su estado con:

```bash
npm run prisma:status
```

Una migración aplicada es inmutable: no debe editarse, eliminarse ni renombrarse. Este proyecto no utiliza `prisma db push`.

## Datos iniciales

Ejecuta el seed reproducible e idempotente con:

```bash
npm run prisma:seed
```

## Crear un producto

`POST /products` valida y transforma la entrada antes de persistirla. `categoryName` continúa siendo texto porque la relación con `Category` se incorporará mediante migraciones posteriores.

```http
POST /products
Content-Type: application/json

{
  "sku": "FER-003",
  "name": "Taladro eléctrico",
  "description": "Taladro de 500 W",
  "price": 450.75,
  "stock": 8,
  "categoryName": "Herramientas"
}
```

Una creación correcta responde `201 Created`:

```json
{
  "id": 17,
  "sku": "FER-003",
  "name": "Taladro eléctrico",
  "description": "Taladro de 500 W",
  "price": "450.75",
  "stock": 8,
  "categoryName": "Herramientas",
  "createdAt": "2026-09-19T23:17:49.133Z",
  "updatedAt": "2026-09-19T23:17:49.133Z"
}
```

Los errores utilizan una estructura uniforme. Por ejemplo, un SKU repetido responde `409` con `PRODUCT_SKU_CONFLICT`, y los datos inválidos responden `400` con `VALIDATION_ERROR`:

```json
{
  "statusCode": 409,
  "code": "PRODUCT_SKU_CONFLICT",
  "message": "Ya existe un producto con el SKU FER-003",
  "path": "/products",
  "timestamp": "2026-09-19T23:17:49.221Z"
}
```

## Recorrido de la solicitud

```mermaid
flowchart TD
    A["POST /products"] --> B["ValidationPipe y DTO"]
    B --> C["ProductsController"]
    C --> D["CreateProductService"]
    D --> E["ProductRepository"]
    E --> F["PrismaProductRepository"]
    F --> G["PostgreSQL"]
```

- El DTO transforma y valida la entrada.
- El controlador delega la operación sin consultar la base de datos.
- El servicio coordina el caso de uso y comprueba el SKU mediante el puerto.
- El puerto desacopla la aplicación de Prisma.
- El repositorio Prisma persiste, convierte el resultado y traduce errores conocidos.
- El filtro global convierte errores de validación, aplicación e inesperados en respuestas HTTP seguras.

## Pruebas

Ejecuta todas las pruebas unitarias y e2e con:

```bash
npm test -- --runInBand
```

Compila el proyecto con:

```bash
npm run build
```

## Fase expandir: Category

La migración `20260919232628_expand_add_category_relation` implementa únicamente la fase **expandir** de la estrategia `Expandir → Migrar datos → Contraer`.

```mermaid
erDiagram
    CATEGORY o|--o{ PRODUCT : "relación opcional"

    CATEGORY {
        int id PK
        string name UK
    }

    PRODUCT {
        int id PK
        string sku UK
        string categoryName
        int categoryId FK "nullable"
    }
```

Durante esta fase coexisten:

```text
categoryName: campo anterior, obligatorio y todavía activo
categoryId: nueva relación opcional
```

`Category` incorpora un nombre único y una relación opcional con productos. La migración conserva los datos porque crea una tabla nueva y agrega una columna nullable; no elimina columnas, no modifica productos y no obliga a los registros existentes a tener una categoría relacionada.

El backfill todavía no se ha realizado: `Category` permanece vacía y los productos existentes conservan `categoryId = null`. Los valores de `categoryName` se migrarán en una fase posterior antes de hacer obligatoria la relación o retirar el campo anterior.
