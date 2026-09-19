import { Injectable } from '@nestjs/common';
import { Prisma, Product as PrismaProduct } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../application/errors/product-sku-conflict.error';
import { ProductRepository } from '../application/ports/product.repository';
import { CreateProductData, Product } from '../domain/product';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { sku } });
    return product ? this.toDomain(product) : null;
  }

  async create(data: CreateProductData): Promise<Product> {
    try {
      const product = await this.prisma.product.create({ data });
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

  private toDomain(product: PrismaProduct): Product {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price.toFixed(2),
      stock: product.stock,
      categoryName: product.categoryName,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
