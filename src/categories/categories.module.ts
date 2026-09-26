import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { CATEGORY_REPOSITORY } from './application/ports/category.repository';
import { CategoriesService } from './application/categories.service';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoriesModule {}
