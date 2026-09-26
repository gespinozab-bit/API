import { Inject, Injectable } from '@nestjs/common';
import { InventoryError } from '../../common/domain/inventory.error';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from './ports/product.repository';
import { Product } from '../domain/product';

@Injectable()
export class QueryProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repository: ProductRepository,
  ) {}

  findAll(): Promise<Product[]> {
    return this.repository.findAll();
  }

  async findById(id: number): Promise<Product> {
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      throw new InventoryError(
        'invalid',
        'VALIDATION_ERROR',
        'El ID debe ser un entero positivo válido',
      );
    }
    const product = await this.repository.findById(id);
    if (!product)
      throw new InventoryError(
        'not-found',
        'PRODUCT_NOT_FOUND',
        'El producto no existe',
      );
    return product;
  }
}
