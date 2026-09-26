import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriesService } from '../application/categories.service';
import { Category } from '../domain/category';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.service.create(dto.name);
  }

  @Get()
  findAll(): Promise<Category[]> {
    return this.service.findAll();
  }
}
