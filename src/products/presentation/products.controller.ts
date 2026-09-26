import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { QueryProductsService } from '../application/query-products.service';
import { CreateProductService } from '../application/create-product.service';
import { Product } from '../domain/product';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductService: CreateProductService,
    private readonly queryProductsService: QueryProductsService,
  ) {}

  @Get()
  findAll(): Promise<Product[]> {
    return this.queryProductsService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.queryProductsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.createProductService.execute(dto);
  }
}
