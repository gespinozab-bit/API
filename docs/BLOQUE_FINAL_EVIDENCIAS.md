# Evidencias finales del proyecto

Fecha de verificación: 26 de septiembre de 2026, zona America/Guatemala.

## Estado entregado

La API de inventario está publicada en [gespinozab-bit/API](https://github.com/gespinozab-bit/API), rama `main`, con el workflow de CI activo. La rama local coincide con `origin/main` y el árbol de trabajo quedó limpio.

La implementación vigente separa controladores HTTP, servicios de aplicación,
reglas de dominio, puertos de repositorio y adaptadores Prisma. Expone:

- `POST /categories` y `GET /categories`.
- `POST /products`, `GET /products` y `GET /products/:id`.
- `GET /health`.

Las reglas verificadas son SKU obligatorio y único, nombre obligatorio, precio
mayor que cero, stock entero de 0 a 1000 y categoría existente. PostgreSQL
refuerza unicidad, checks, NOT NULL y la clave foránea con RESTRICT.

## Verificaciones locales

| Comando | Resultado |
| --- | --- |
| `npm.cmd run prisma:validate` | Correcto; schema válido |
| `npm.cmd run prisma:status` | Correcto; 5 migraciones aplicadas y schema al día |
| `npm.cmd run build` | Correcto, salida 0 |
| `npm.cmd run lint` | Correcto, salida 0 |
| `npm.cmd run format:check` | Correcto, todos los archivos con formato válido |
| `npm.cmd run test:unit` | 39 pruebas aprobadas en 8 archivos, salida 0 |
| `npm.cmd run test:integration` | 5 pruebas aprobadas en 1 archivo, salida 0 |

La suite unitaria usa Vitest sin PostgreSQL, PrismaClient ni Docker. La suite de
integración inicia PostgreSQL 17 con Testcontainers, asigna una URI y un puerto
dinámicos, aplica las cinco migraciones, usa los repositorios Prisma reales,
limpia respetando la FK y elimina el contenedor al terminar. En la ejecución
final utilizó la URI enmascarada:

```text
postgres://inventory_test:***@localhost:32777/inventory_test_2ffc321e4ce344feba51653bcea02efc
```

Contenedor eliminado: `d03e4264b5f831be698a52838de4c414ae566347ff5d614802e0bc7e90036710`.

Migraciones aplicadas:

1. `20260919205642_create_product_initial`
2. `20260919232628_expand_add_category_relation`
3. `20260920054829_backfill_product_categories`
4. `20260920060800_contract_product_category_relation`
5. `20260926025000_add_product_stock_upper_bound`

## Base local y secretos

La base local `localhost:5433/inventory_db` estaba saludable antes y después.
Las consultas finales fueron solo de lectura: 14 productos, 6 categorías, cero
productos sin categoría y cinco migraciones aplicadas. No se ejecutaron
migraciones, seeds, borrados ni resets contra esa base durante la integración.

Los archivos `.env` y `.env.verify` no están rastreados. `.gitignore` también
excluye `.npmrc`, `.netrc`, credenciales, secretos, certificados, respaldos,
logs y artefactos de compilación. Solo `.env.example` y `.env.verify.example`,
sin secretos reales, se publican como plantillas.

## CI remoto

El workflow `.github/workflows/ci.yml` tiene dos jobs independientes:
`unit-tests` e `integration-tests`. Ambos usan `ubuntu-latest`, Node 22 LTS,
`npm ci`, caché de npm y ejecución única sin watch. No declara un servicio
PostgreSQL; integración usa Testcontainers en el runner.

La última ejecución confirmada después del push fue [Inventory CI #36262840486](https://github.com/gespinozab-bit/API/actions/runs/36262840486):

- [Integration tests](https://github.com/gespinozab-bit/API/actions/runs/36262840486/job/108461809571): `completed / success`.
- [Unit tests](https://github.com/gespinozab-bit/API/actions/runs/36262840486/job/108461809761): `completed / success`.

GitHub CLI no está instalado en el entorno local; el estado se comprobó con la
API pública de GitHub, sin usar tokens nuevos.

## Historial y límites

El commit funcional principal es `ab11bc1 feat: add Vitest Testcontainers and GitHub Actions`; las actualizaciones documentales posteriores son `60ffaf1` y `942a3c3`. No quedan fallos conocidos de compilación, pruebas, migraciones, seguridad de archivos o CI. Los avisos de auditoría npm y la advertencia de `package.json#prisma` para Prisma 7 siguen siendo mantenimiento futuro y no bloquean la entrega actual.

La evidencia histórica anterior se conserva en [ACCEPTANCE_EVIDENCE.md](ACCEPTANCE_EVIDENCE.md) y [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md); este documento refleja el estado final actual después de los bloques 1–7.
