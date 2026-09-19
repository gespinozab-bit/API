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
