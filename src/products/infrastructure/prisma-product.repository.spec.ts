import { Prisma, Product as PrismaProduct } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../application/errors/product-sku-conflict.error';
import { PrismaProductRepository } from './prisma-product.repository';

describe('PrismaProductRepository', () => {
  const data = {
    sku: 'TST-DUAL-001',
    name: 'Producto dual',
    price: 15.5,
    stock: 2,
    categoryName: 'Categoría compartida',
  };

  const storedProduct: PrismaProduct = {
    id: 50,
    ...data,
    description: null,
    price: new Prisma.Decimal('15.50'),
    categoryId: 7,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('upserts the category and creates the product in one transaction', async () => {
    const categoryUpsert = jest.fn().mockResolvedValue({ id: 7 });
    const productCreate = jest.fn().mockResolvedValue(storedProduct);
    const transaction = jest.fn(async (operation) =>
      operation({
        category: { upsert: categoryUpsert },
        product: { create: productCreate },
      }),
    );
    const repository = new PrismaProductRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(repository.create(data)).resolves.toMatchObject({
      sku: data.sku,
      price: '15.50',
      categoryName: data.categoryName,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(categoryUpsert).toHaveBeenCalledWith({
      where: { name: data.categoryName },
      update: {},
      create: { name: data.categoryName },
    });
    expect(productCreate).toHaveBeenCalledWith({
      data: { ...data, categoryName: data.categoryName, categoryId: 7 },
    });
  });

  it('translates a unique SKU failure and lets the transaction roll back', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.19.3' },
    );
    const transaction = jest.fn().mockRejectedValue(prismaError);
    const repository = new PrismaProductRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(repository.create(data)).rejects.toBeInstanceOf(
      ProductSkuConflictError,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
