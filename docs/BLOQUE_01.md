# Bloque 1: estructura, pruebas y contrato de inventario

## Alcance

Se revisa NestJS, se configura Vitest y se define el contrato objetivo. No se
agregan pruebas ni endpoints en este bloque. Se conservan las pruebas Jest,
Prisma, PostgreSQL, scripts y migraciones existentes sin configurar ni ejecutar
infraestructura adicional. No se agrega Testcontainers ni GitHub Actions.

## Estructura revisada

- `src/main.ts`: arranque Nest, ValidationPipe global y filtro de errores.
- `src/app.module.ts`: módulos de configuración, Prisma, salud y productos.
- `src/products`: controlador, DTO, servicio de aplicación, puerto de repositorio
  y adaptador Prisma; las dependencias están registradas en ProductsModule.
- `src/infrastructure/prisma`: proveedor global exportado y ciclo de conexión.
- `src/health`: controlador y servicio de salud registrados en HealthModule.

El arranque completo requiere DATABASE_URL y una base accesible porque
PrismaService conecta en onModuleInit. La compilación y las pruebas unitarias no
demuestran conectividad con PostgreSQL. No se levanta la base en este bloque.

## Flujos definidos para implementar posteriormente

Los siguientes contratos son el objetivo; no representan endpoints nuevos ya
implementados. Recorrido: controlador → validación DTO → servicio de aplicación
→ puerto de repositorio → adaptador de persistencia.

### Registrar categorías

1. Recibir `POST /categories` con `{ "name": "Herramientas" }`.
2. Quitar espacios exteriores y validar nombre no vacío, máximo 80 caracteres.
3. Comprobar que el nombre no esté registrado, acorde al modelo existente.
4. Guardar y responder `201` con `id` y `name`.
5. Responder `400` ante datos inválidos o `409` ante nombre duplicado.

### Registrar productos

1. Recibir `POST /products` con `sku`, `name`, `price`, `stock`, `categoryId` y
   `description` opcional. Ejemplo objetivo:
   `{ "sku": "FER-003", "name": "Taladro", "price": 450.75, "stock": 8, "categoryId": 1 }`.
2. Normalizar SKU quitando espacios exteriores y convirtiéndolo a mayúsculas;
   quitar espacios exteriores del nombre y validar las reglas de la tabla.
3. Verificar SKU disponible y categoría existente mediante los repositorios.
4. Persistir el producto relacionado con esa categoría; no crear categorías
   implícitamente. La unicidad también debe protegerse frente a concurrencia.
5. Responder `201` con el producto y su categoría; `400` ante datos inválidos,
   `409` ante SKU duplicado y `404` si la categoría no existe.

El contrato vigente recibe `categoryName`. La transición a `categoryId` deberá
resolverse explícitamente en un bloque posterior para conservar compatibilidad.

### Consultar productos

1. `GET /products`: consultar el repositorio e incluir la categoría de cada
   producto; responder `200` con un arreglo, vacío si no hay productos.
2. `GET /products/:id`: validar un identificador entero positivo y consultar el
   producto con su categoría; responder `200`, `400` si el ID es inválido o
   `404` si no existe.
3. Exponer `id`, `sku`, `name`, `description`, `price`, `stock`, categoría y
   fechas. Conservar precio como cadena decimal de dos posiciones en la salida,
   coherente con la representación existente. Las consultas no modifican datos.

## Reglas de negocio y estado actual

| Regla | Contrato objetivo | Estado encontrado |
| --- | --- | --- |
| SKU obligatorio y único | No vacío, normalizado, sin duplicados | DTO de 3–30 caracteres, comprobación en servicio y `@unique` en Prisma |
| Nombre obligatorio | No vacío después de quitar espacios | DTO existente, máximo 120 caracteres |
| Precio mayor que 0 | Número positivo, máximo dos decimales | Validado en DTO |
| Existencia entre 0 y 1000 | Entero, límites inclusivos | Solo se valida mínimo 0; falta máximo 1000 |
| Categoría existente | Categoría registrada antes del producto | Relación obligatoria, pero actualmente `upsert` crea la categoría si falta |

Quedan pendientes de implementación el registro independiente de categorías,
las consultas HTTP, el límite máximo de existencia y el rechazo de categorías
no registradas. Esta documentación no afirma que esas reglas ya se apliquen.

## Vitest

- `npm run test:unit`: archivos `src/**/*.spec.ts` y `test/unit/**/*.spec.ts`;
  excluye integración y e2e.
- `npm run test:integration`: archivos `src/**/*.integration-spec.ts` y
  `test/integration/**/*.spec.ts`; ejecución entre archivos secuencial.
- `npm test` y `npm run test:watch`: Vitest unitario.
- `npm run test:legacy -- --runInBand`: suites Jest unitarias y e2e conservadas.
- `npm run test:cov`: cobertura heredada con Jest.

El entorno es Node. SWC conserva los decoradores y sus metadatos necesarios para
la inyección de Nest y la validación de DTO. El setup carga reflect-metadata y
expone `jest` como alias de `vi` únicamente para los mocks existentes; no es una
compatibilidad general con toda la API de Jest. Las pruebas futuras deben usar
imports de Vitest. Referencia: [migración oficial desde Jest](https://vitest.dev/guide/migration.html).

No se crean casos de prueba. La suite de integración existente exige
ALLOW_TEST_DATABASE y DATABASE_URL de verificación; no se modifica ni ejecuta
esa configuración en este bloque.

Vitest queda en la línea 3.2.6 y Vite en 6.4.3, compatible con Node 22.17.1
del entorno. El intento de instalar Vitest 4.1.11 falló en npm 10.9.2 con
`Cannot read properties of null (reading 'edgesOut')`. La versión 3.2.6 elimina
el aviso crítico encontrado en 3.2.4, pero quedan 7 avisos de auditoría:
2 moderados y 5 altos. Incluyen Vitest/mocker y dependencias de Nest/Prisma.
No se ejecutó `npm audit fix --force` ni se cambiaron dependencias de producción.

## Verificación local

Ejecutar `npm install`, `npm run build` y `npm run test:unit`. En PowerShell con
restricciones sobre npm.ps1, usar `npm.cmd`. Si la caché habitual no admite
escrituras, pasar `--cache "$env:TEMP\inventario-npm-cache"` a npm install.

### Resultado de este bloque

- `npm.cmd install --save-dev vitest@^3.2.4 @swc/core --cache "$env:TEMP\inventario-npm-cache"`: instalación inicial correcta.
- `npm.cmd install --save-dev vitest@^3.2.6 vite@^6.4.3 --cache "$env:TEMP\inventario-npm-cache"`: actualización final correcta.
- `npm.cmd run build`: correcto, código de salida 0.
- `npm.cmd run test:unit`: 6 archivos y 20 pruebas existentes aprobados.
- `npm.cmd exec -- vitest list --config vitest.integration.config.mts --filesOnly`:
  selecciona únicamente `src/products/infrastructure/products.postgres.integration-spec.ts`.
- `npm.cmd exec -- prettier --write vitest.config.mts vitest.integration.config.mts test/vitest.setup.ts`: formato aplicado.
- `npm.cmd audit --json --cache "$env:TEMP\inventario-npm-cache"`: identificó los avisos de dependencias; el resumen final de instalación reporta los conteos indicados arriba.

Se usaron además `rg`, `Get-Content`, `Get-ChildItem`, `git status`, `git diff`,
`node --version`, `npm.cmd --version` y `npm.cmd view` para inspección.
Los intentos iniciales con npm.ps1 y la caché habitual fallaron por permisos.
Vitest requirió ejecución fuera del aislamiento para que esbuild leyera los
directorios necesarios; tras autorizarlo, las verificaciones pasaron.
El script de verificación heredado ahora llama `test:legacy` para mantener sus
pruebas Jest/e2e y la opción `--runInBand`; no se ejecutó ese script.
