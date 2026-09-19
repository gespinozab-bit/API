import { Body, Controller, Post } from '@nestjs/common';
import { CreateProductService } from '../application/create-product.service';
import { Product } from '../domain/product';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly createProductService: CreateProductService) {}

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.createProductService.execute(dto);
  }
}
