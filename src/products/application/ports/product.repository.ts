import { CreateProductData, Product } from '../../domain/product';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  findBySku(sku: string): Promise<Product | null>;
  create(data: CreateProductData): Promise<Product>;
}
