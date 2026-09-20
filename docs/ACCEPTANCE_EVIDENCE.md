# Evidencia de aceptación — Bloque 8

Verificación ejecutada el 20 de septiembre de 2026 (America/Guatemala).

## Entorno

| Componente | Versión |
| --- | --- |
| Sistema operativo | Microsoft Windows NT 10.0.26100.0, x64 |
| Node.js | 22.17.1 |
| npm | 10.9.2 |
| Prisma / Prisma Client | 6.19.3 |
| TypeScript | 5.9.3 |
| PostgreSQL temporal | 17.11 |

## Matriz de aceptación

| Criterio | Implementación | Prueba o comando | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| TypeScript | NestJS | `npm run build` | Compilación con código 0 | Cumple |
| Validación | DTO + `ValidationPipe` | pruebas DTO y e2e | Transformación y respuestas 400 verificadas | Cumple |
| Controlador | `ProductsController` | prueba unitaria | Delegación y resultado verificados | Cumple |
| Servicio | `CreateProductService` | prueba unitaria | Puerto simulado y conflicto de SKU | Cumple |
| Persistencia | `PrismaProductRepository` | pruebas unitaria e integración | Categoría y producto persistidos en transacción | Cumple |
| Errores | filtro global | pruebas de filtro y e2e | 400/404/409/500 uniformes | Cumple |
| Clave | `Product.id` | reconstrucción e integración PostgreSQL | PK presente | Cumple |
| Relación | `Product.categoryId` | integración PostgreSQL | FK obligatoria y válida | Cumple |
| Restricciones | unique/check/not null/FK/restrict | integración PostgreSQL | Rechazos reales comprobados | Cumple |
| Migraciones | cuatro migraciones versionadas | `prisma migrate deploy` | Aplicadas en orden desde base vacía | Cumple |
| Datos conservados | expandir → migrar datos → contraer | evidencias de bloques 4–7 | Sin pérdida y cero relaciones nulas | Cumple |
| Seed | upsert | dos ejecuciones | 4 productos y 3 categorías en ambas | Cumple |
| Base vacía | script aislado | `npm run verify:fresh-db` | `VERIFICATION_OK migrations=4 counts=4,3 invariants=0,0,0` | Cumple |
| Desarrollo/despliegue | README | revisión documental | Flujos diferenciados | Cumple |
| Secretos | `.gitignore` y ejemplos ficticios | `git ls-files`, `git check-ignore` | Ningún archivo local o generado rastreado | Cumple |

## Resultados reproducibles

Se ejecutaron `prisma validate`, `prisma migrate status`, `npm run build`, `npm run lint`, `npm run format:check`, `npm test -- --runInBand`, `npm run test:integration`, `npm run test:cov` y `npm run verify:fresh-db`. Las pruebas normales aprobaron 7 suites y 31 pruebas; la suite PostgreSQL aprobó 5 pruebas. Total: 36 aprobadas y 0 fallidas.

Cobertura real de las suites unitarias/e2e:

| Métrica | Cobertura |
| --- | ---: |
| Statements | 44.27% (89/201) |
| Branches | 60.00% (15/25) |
| Functions | 51.42% (18/35) |
| Lines | 43.25% (77/178) |

La cobertura incluye todos los archivos TypeScript bajo `src`, también módulos de ensamblaje y la suite PostgreSQL, que por protección se ejecuta separadamente y no durante `test:cov`. Los componentes críticos solicitados sí tienen pruebas específicas.

## Evidencia HTTP

Las solicitudes reales se hicieron contra la API conectada exclusivamente a `inventory_verification` en el puerto temporal 3001.

| Caso | Resultado |
| --- | --- |
| `GET /health` | 200 |
| Producto válido con SKU y categoría espaciados | 201; `B8-HTTP-003` y `Calidad` normalizados |
| SKU duplicado | 409 `PRODUCT_SKU_CONFLICT` |
| Precio cero o negativo | 400 `VALIDATION_ERROR` |
| Stock negativo o decimal | 400 `VALIDATION_ERROR` |
| Campo obligatorio ausente | 400 `VALIDATION_ERROR` |
| Propiedad desconocida | 400 `VALIDATION_ERROR` |
| Ruta inexistente | 404 `HTTP_ERROR` uniforme |

La respuesta 201 contiene `categoryName` leído de la relación incluida por el repositorio.

## Base de datos y reconstrucción

La base temporal comenzó sin tablas. `prisma migrate deploy` aplicó las cuatro migraciones históricas. El seed ejecutado dos veces conservó 4 productos, 3 categorías y cero relaciones nulas, SKU duplicados o categorías duplicadas. Las pruebas reales confirmaron `NOT NULL`, unicidad de SKU y nombre de categoría, checks de precio y stock, FK válida, `ON DELETE RESTRICT`, reutilización de categoría y rollback transaccional sin categoría huérfana.

La protección de integración exige `ALLOW_TEST_DATABASE=true`, un nombre de base que contenga `verification`, y rechaza explícitamente la base o el puerto principal antes de modificar datos. Tras las pruebas se eliminó solamente el contenedor y la red temporales. La instancia principal permaneció saludable: `/health` respondió 200 y se conservaron los conteos previamente verificados de 13 productos, 5 categorías y 0 relaciones nulas.

## Arquitectura y seguridad

Se confirmó el recorrido `HTTP → ValidationPipe → DTO → controlador → servicio → puerto → adaptador Prisma → PostgreSQL → filtro HTTP`. El controlador no consulta ni usa Prisma; el servicio no conoce Prisma, Express ni HTTP; el adaptador implementa el puerto y concentra la persistencia. Las pruebas del filtro comprueban que un error 500 no expone stack, SQL, contraseña ni cadena de conexión.

Git rastrea 41 archivos. `.env`, `.env.verify`, `node_modules`, `dist`, cobertura y temporales no están rastreados; ambos archivos de entorno locales están ignorados. Los tres archivos que contienen patrones de conexión o contraseña son ejemplos ficticios o la automatización aislada y no contienen credenciales reales.

## Limitaciones observadas

- Prisma avisa que la configuración `package.json#prisma` quedará obsoleta en Prisma 7; funciona con la versión 6.19.3 actual.
- La cobertura global es moderada porque contabiliza ensamblaje y la suite de integración protegida que se ejecuta por separado; no se añadieron pruebas vacías para inflarla.
- El script heredado `start:prod` apunta a `dist/main`, mientras la salida actual está en `dist/src/main.js`. La salud principal se verificó ejecutando el artefacto correcto directamente. No se alteró ese script por quedar fuera de los archivos productivos permitidos en este bloque.

## Correcciones realizadas

- La revisión inicial encontró cobertura insuficiente de validación, filtro y restricciones PostgreSQL; se agregaron pruebas significativas sin cambiar el comportamiento productivo.
- Prettier detectó únicamente el ajuste de línea de la validación `DATABASE_URL` en `app.module.ts`; se aplicó ese cambio de formato, sin modificación funcional ni arquitectónica.
