import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from './ports/category.repository';
import { Category, categoryConflict, categoryName } from '../domain/category';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepository,
  ) {}

  async create(rawName: string): Promise<Category> {
    const name = categoryName(rawName);
    if (await this.repository.findByName(name)) throw categoryConflict();
    return this.repository.create(name);
  }

  findAll(): Promise<Category[]> {
    return this.repository.findAll();
  }
}
