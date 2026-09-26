import { Prisma, PrismaClient } from '@prisma/client';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../application/errors/product-sku-conflict.error';
import { PrismaProductRepository } from './prisma-product.repository';

describe('Products PostgreSQL integration', () => {
  let prisma: PrismaClient;
  let repository: PrismaProductRepository;
  const categoryName = 'B8 Integration Category';
  const skus = ['B8-INT-001', 'B8-INT-002'];

  beforeAll(async () => {
    if (process.env.ALLOW_TEST_DATABASE !== 'true') {
      throw new Error('Integration tests require ALLOW_TEST_DATABASE=true.');
    }
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
      throw new Error('Integration tests require DATABASE_URL.');
    }
    const parsedUrl = new URL(rawUrl);
    const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
    if (
      !databaseName.toLowerCase().includes('verification') ||
      parsedUrl.port === '5433' ||
      databaseName === 'inventory_db'
    ) {
      throw new Error(
        'Refusing to run integration tests outside verification DB.',
      );
    }

    prisma = new PrismaClient();
    repository = new PrismaProductRepository(
      prisma as unknown as PrismaService,
    );
    await prisma.$connect();
    await prisma.product.deleteMany({ where: { sku: { startsWith: 'B8-' } } });
    await prisma.category.deleteMany({
      where: { name: { startsWith: 'B8 ' } },
    });
    await prisma.category.create({ data: { name: categoryName } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.product.deleteMany({
        where: { sku: { startsWith: 'B8-' } },
      });
      await prisma.category.deleteMany({
        where: { name: { startsWith: 'B8 ' } },
      });
      await prisma.$disconnect();
    }
  });

  it('has the complete migration history and required relation', async () => {
    const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY migration_name
    `;
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; is_nullable: string }>
    >`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Product'
        AND column_name IN ('categoryId', 'categoryName')
    `;
    const migrationsPath = join(process.cwd(), 'prisma', 'migrations');
    const expected = readdirSync(migrationsPath)
      .filter((name) => existsSync(join(migrationsPath, name, 'migration.sql')))
      .sort();
    expect(applied.map((migration) => migration.migration_name)).toEqual(
      expected,
    );
    expect(columns).toEqual([{ column_name: 'categoryId', is_nullable: 'NO' }]);
  });

  it('creates products linked to an existing category', async () => {
    const first = await repository.create({
      sku: skus[0],
      name: 'Integration one',
      price: 11.25,
      stock: 2,
      categoryName,
    });
    const second = await repository.create({
      sku: skus[1],
      name: 'Integration two',
      price: 12.5,
      stock: 3,
      categoryName,
    });
    const stored = await prisma.product.findMany({
      where: { sku: { in: skus } },
      include: { category: true },
    });
    expect(first.categoryName).toBe(categoryName);
    expect(second.categoryName).toBe(categoryName);
    expect(stored).toHaveLength(2);
    expect(new Set(stored.map((product) => product.categoryId)).size).toBe(1);
    expect(
      stored.every((product) => product.category.name === categoryName),
    ).toBe(true);
  });

  it('preserves the category when duplicate product creation fails', async () => {
    await expect(
      repository.create({
        sku: skus[0],
        name: 'Duplicate integration product',
        price: 15,
        stock: 1,
        categoryName,
      }),
    ).rejects.toBeInstanceOf(ProductSkuConflictError);
    await expect(
      prisma.category.count({ where: { name: categoryName } }),
    ).resolves.toBe(1);
  });

  it('enforces PostgreSQL uniqueness, checks, NOT NULL, FK and RESTRICT', async () => {
    const existingCategory = await prisma.category.findUniqueOrThrow({
      where: { name: categoryName },
    });
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO "Category" ("name", "updatedAt") VALUES ($1, CURRENT_TIMESTAMP)',
        categoryName,
      ),
    ).rejects.toMatchObject({ code: 'P2010' });
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO "Product" ("sku", "name", "price", "stock", "updatedAt") VALUES ($1, $2, 10, 0, CURRENT_TIMESTAMP)',
        'B8-NO-CATEGORY',
        'No category',
      ),
    ).rejects.toMatchObject({ code: 'P2010' });
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO "Product" ("sku", "name", "price", "stock", "categoryId", "updatedAt") VALUES ($1, $2, 10, 0, 999999, CURRENT_TIMESTAMP)',
        'B8-BAD-FK',
        'Bad FK',
      ),
    ).rejects.toMatchObject({ code: 'P2010' });
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO "Product" ("sku", "name", "price", "stock", "categoryId", "updatedAt") VALUES ($1, $2, 0, 0, $3, CURRENT_TIMESTAMP)',
        'B8-BAD-PRICE',
        'Bad price',
        existingCategory.id,
      ),
    ).rejects.toMatchObject({ code: 'P2010' });
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO "Product" ("sku", "name", "price", "stock", "categoryId", "updatedAt") VALUES ($1, $2, 10, -1, $3, CURRENT_TIMESTAMP)',
        'B8-BAD-STOCK',
        'Bad stock',
        existingCategory.id,
      ),
    ).rejects.toMatchObject({ code: 'P2010' });
    await expect(
      prisma.category.delete({ where: { id: existingCategory.id } }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('leaves no duplicate categories or products without a category', async () => {
    const [withoutCategory, duplicateCategories] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Product" WHERE "categoryId" IS NULL
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM (SELECT "name" FROM "Category" GROUP BY "name" HAVING COUNT(*) > 1) duplicates
      `,
    ]);
    expect(Number(withoutCategory[0].count)).toBe(0);
    expect(Number(duplicateCategories[0].count)).toBe(0);
  });
});
