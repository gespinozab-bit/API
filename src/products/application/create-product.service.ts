import { Inject, Injectable } from '@nestjs/common';
import { CreateProductData, Product } from '../domain/product';
import { ProductSkuConflictError } from './errors/product-sku-conflict.error';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from './ports/product.repository';

@Injectable()
export class CreateProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(data: CreateProductData): Promise<Product> {
    const existingProduct = await this.productRepository.findBySku(data.sku);
    if (existingProduct) {
      throw new ProductSkuConflictError(data.sku);
    }

    return this.productRepository.create(data);
  }
}
