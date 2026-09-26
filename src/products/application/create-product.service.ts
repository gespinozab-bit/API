import { Inject, Injectable } from '@nestjs/common';
import { CreateProductData, Product } from '../domain/product';
import { ProductSkuConflictError } from './errors/product-sku-conflict.error';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../categories/application/ports/category.repository';
import { categoryNotFound } from '../../categories/domain/category';
import { validateProduct } from '../domain/product.rules';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from './ports/product.repository';

@Injectable()
export class CreateProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(data: CreateProductData): Promise<Product> {
    data = validateProduct(data);
    const existingProduct = await this.productRepository.findBySku(data.sku);
    if (existingProduct) {
      throw new ProductSkuConflictError(data.sku);
    }

    const category =
      data.categoryId !== undefined
        ? await this.categoryRepository.findById(data.categoryId)
        : await this.categoryRepository.findByName(data.categoryName!);
    if (!category) throw categoryNotFound();
    return this.productRepository.create({ ...data, categoryId: category.id });
  }
}
