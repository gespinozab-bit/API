import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../application/errors/product-sku-conflict.error';
import { ProductRepository } from '../application/ports/product.repository';
import { CreateProductData, Product } from '../domain/product';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: { category: true },
    });
    return product ? this.toDomain(product) : null;
  }

  async create(data: CreateProductData): Promise<Product> {
    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const category = await transaction.category.upsert({
          where: { name: data.categoryName },
          update: {},
          create: { name: data.categoryName },
        });

        return transaction.product.create({
          data: {
            sku: data.sku,
            name: data.name,
            description: data.description,
            price: data.price,
            stock: data.stock,
            categoryId: category.id,
          },
          include: { category: true },
        });
      });
      return this.toDomain(product);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ProductSkuConflictError(data.sku);
      }
      throw error;
    }
  }

  private toDomain(product: ProductWithCategory): Product {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price.toFixed(2),
      stock: product.stock,
      categoryName: product.category.name,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
