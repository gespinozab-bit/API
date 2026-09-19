# Progreso del proyecto Inventario Migraciones

## Tecnologías

TypeScript, NestJS, PostgreSQL, Prisma ORM, Docker Compose, Joi y Jest.

## Bloques

1. Infraestructura y proyecto base — **TERMINADO**
2. Entidades y funcionalidades de dominio — **NO INICIADO**

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

## Registro cronológico

- 2026-09-19: Inicio del Bloque 1 y creación de la estructura base.
- 2026-09-19: Validación completa de dependencias, Prisma, PostgreSQL, compilación, pruebas, API, endpoint de salud y exclusiones de Git. Bloque 1 terminado.
