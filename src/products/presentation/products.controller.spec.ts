import { Test } from '@nestjs/testing';
import { CreateProductService } from '../application/create-product.service';
import { Product } from '../domain/product';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  it('delegates product creation to the application service', async () => {
    const product: Product = {
      id: 1,
      sku: 'TST-001',
      name: 'Producto',
      description: null,
      price: '10.00',
      stock: 1,
      categoryName: 'Pruebas',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const execute = jest.fn().mockResolvedValue(product);
    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: CreateProductService, useValue: { execute } }],
    }).compile();
    const controller = module.get(ProductsController);
    const dto: CreateProductDto = {
      sku: 'TST-001',
      name: 'Producto',
      price: 10,
      stock: 1,
      categoryName: 'Pruebas',
    };

    await expect(controller.create(dto)).resolves.toBe(product);
    expect(execute).toHaveBeenCalledWith(dto);
  });
});
