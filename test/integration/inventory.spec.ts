import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaCategoryRepository } from '../../src/categories/infrastructure/prisma-category.repository';
import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../../src/products/application/errors/product-sku-conflict.error';
import { PrismaProductRepository } from '../../src/products/infrastructure/prisma-product.repository';
import { TemporaryPostgres } from './temporary-postgres';

describe('Inventario con repositorios Prisma y PostgreSQL temporal reales', () => {
  const database = new TemporaryPostgres();
  let prisma: PrismaService;
  let categories: PrismaCategoryRepository;
  let products: PrismaProductRepository;
  const input = { sku: 'INT-001', name: 'Taladro', price: 25.5, stock: 8 };

  beforeAll(async () => {
    prisma = await database.start();
    categories = new PrismaCategoryRepository(prisma);
    products = new PrismaProductRepository(prisma);
  });

  beforeEach(async () => {
    database.assertIsolated();
    // FK order: delete children before parents. Never reset migrations.
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('aplica todas las migraciones versionadas a la base temporal', async () => {
    // Arrange
    const path = join(process.cwd(), 'prisma/migrations');
    const expected = readdirSync(path)
      .filter((name) => existsSync(join(path, name, 'migration.sql')))
      .sort();

    // Act
    const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name
    `;

    // Assert
    expect(expected.length).toBeGreaterThan(0);
    expect(applied.map((row) => row.migration_name)).toEqual(expected);
  });

  it('crea una categoría y un producto relacionados mediante los repositorios reales', async () => {
    // Arrange
    const name = 'Herramientas';

    // Act
    const category = await categories.create(name);
    const product = await products.create({
      ...input,
      categoryId: category.id,
    });

    // Assert
    expect(category).toEqual({
      id: expect.any(Number),
      name,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(product).toEqual({
      ...input,
      id: expect.any(Number),
      description: null,
      price: '25.50',
      categoryId: category.id,
      categoryName: name,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    await expect(categories.findById(category.id)).resolves.toEqual(category);
    await expect(prisma.product.count()).resolves.toBe(1);
  });

  it('recupera desde PostgreSQL el producto guardado por ID y SKU', async () => {
    // Arrange
    const category = await categories.create('Herramientas');
    const created = await products.create({
      ...input,
      categoryId: category.id,
    });

    // Act
    const byId = await products.findById(created.id);
    const bySku = await products.findBySku(input.sku);

    // Assert
    expect(byId).toEqual(created);
    expect(bySku).toEqual(created);
    await expect(products.findAll()).resolves.toEqual([created]);
  });

  it('rechaza el SKU duplicado por la restricción única real sin otro producto', async () => {
    // Arrange
    const category = await categories.create('Herramientas');
    const data = { ...input, categoryId: category.id };
    const original = await products.create(data);

    // Act: call the adapter directly, bypassing the business duplicate check.
    const duplicate = products.create(data);

    // Assert
    await expect(duplicate).rejects.toBeInstanceOf(ProductSkuConflictError);
    await expect(duplicate).rejects.toMatchObject({
      message: 'Ya existe un producto con el SKU INT-001',
    });
    await expect(products.findAll()).resolves.toEqual([original]);
    // Verify PostgreSQL's exact unique-violation SQLSTATE as well.
    await expect(prisma.$executeRaw`
      INSERT INTO "Product" (sku, name, price, stock, "categoryId", "updatedAt")
      VALUES (${input.sku}, ${input.name}, ${input.price}, ${input.stock}, ${category.id}, CURRENT_TIMESTAMP)
    `).rejects.toMatchObject({
      code: 'P2010',
      meta: {
        code: '23505',
        message: 'Key (sku)=(INT-001) already exists.',
      },
    });
  });

  it('rechaza stock 1001 mediante el CHECK real sin persistir el producto', async () => {
    // Arrange
    const category = await categories.create('Herramientas');

    // Act: no DTO or business validation intercepts this write.
    const invalid = products.create({
      ...input,
      stock: 1001,
      categoryId: category.id,
    });

    // Assert
    await expect(invalid).rejects.toThrow('Product_stock_maximum');
    await expect(prisma.product.count()).resolves.toBe(0);
    // The database itself must report CHECK violation (23514), not HTTP validation.
    await expect(prisma.$executeRaw`
      INSERT INTO "Product" (sku, name, price, stock, "categoryId", "updatedAt")
      VALUES (${input.sku}, ${input.name}, ${input.price}, ${1001}, ${category.id}, CURRENT_TIMESTAMP)
    `).rejects.toMatchObject({
      code: 'P2010',
      meta: {
        code: '23514',
        message: expect.stringContaining('Product_stock_maximum'),
      },
    });
    await expect(categories.findById(category.id)).resolves.toEqual(category);
  });
});
