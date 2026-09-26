import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { CreateProductService } from './application/create-product.service';
import { PRODUCT_REPOSITORY } from './application/ports/product.repository';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';
import { ProductsController } from './presentation/products.controller';
import { CategoriesModule } from '../categories/categories.module';
import { QueryProductsService } from './application/query-products.service';

@Module({
  imports: [PrismaModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [
    CreateProductService,
    QueryProductsService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
})
export class ProductsModule {}
