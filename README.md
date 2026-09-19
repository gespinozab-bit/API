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
