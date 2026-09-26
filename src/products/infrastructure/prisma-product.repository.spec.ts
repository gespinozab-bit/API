import { Prisma } from '@prisma/client';
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

  const storedProduct = {
    id: 50,
    sku: data.sku,
    name: data.name,
    description: null,
    price: new Prisma.Decimal('15.50'),
    stock: data.stock,
    categoryId: 7,
    category: {
      id: 7,
      name: data.categoryName,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('connects an existing category when creating the product', async () => {
    const productCreate = jest.fn().mockResolvedValue(storedProduct);
    const repository = new PrismaProductRepository({
      product: { create: productCreate },
    } as unknown as PrismaService);

    await expect(repository.create(data)).resolves.toMatchObject({
      sku: data.sku,
      price: '15.50',
      categoryName: data.categoryName,
    });
    expect(productCreate).toHaveBeenCalledTimes(1);
    expect(productCreate).toHaveBeenCalledWith({
      data: {
        sku: data.sku,
        name: data.name,
        description: undefined,
        price: data.price,
        stock: data.stock,
        category: { connect: { name: data.categoryName } },
      },
      include: { category: true },
    });
  });

  it('translates a unique SKU failure', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.19.3' },
    );
    const productCreate = jest.fn().mockRejectedValue(prismaError);
    const repository = new PrismaProductRepository({
      product: { create: productCreate },
    } as unknown as PrismaService);

    await expect(repository.create(data)).rejects.toBeInstanceOf(
      ProductSkuConflictError,
    );
    expect(productCreate).toHaveBeenCalledTimes(1);
  });
});
