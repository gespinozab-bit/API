import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProductSkuConflictError } from '../application/errors/product-sku-conflict.error';
import { ProductRepository } from '../application/ports/product.repository';
import { CreateProductData, Product } from '../domain/product';
import { categoryNotFound } from '../../categories/domain/category';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      include: { category: true },
      orderBy: { id: 'asc' },
    });
    return products.map((product) => this.toDomain(product));
  }

  async findById(id: number): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    return product ? this.toDomain(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: { category: true },
    });
    return product ? this.toDomain(product) : null;
  }

  async create(data: CreateProductData): Promise<Product> {
    try {
      const product = await this.prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          category: {
            connect:
              data.categoryId !== undefined
                ? { id: data.categoryId }
                : { name: data.categoryName },
          },
        },
        include: { category: true },
      });
      return this.toDomain(product);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2025', 'P2003'].includes(error.code)
      ) {
        throw categoryNotFound();
      }
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
      categoryId: product.categoryId,
      categoryName: product.category.name,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
