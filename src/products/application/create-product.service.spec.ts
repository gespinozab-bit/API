import { Test } from '@nestjs/testing';
import { Product } from '../domain/product';
import { ProductSkuConflictError } from './errors/product-sku-conflict.error';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from './ports/product.repository';
import { CreateProductService } from './create-product.service';

describe('CreateProductService', () => {
  let service: CreateProductService;
  let repository: jest.Mocked<ProductRepository>;

  const input = {
    sku: 'TST-001',
    name: 'Producto de prueba',
    price: 10.5,
    stock: 2,
    categoryName: 'Pruebas',
  };

  const product: Product = {
    id: 1,
    ...input,
    description: null,
    price: '10.50',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    repository = {
      findBySku: jest.fn(),
      create: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        CreateProductService,
        { provide: PRODUCT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    service = module.get(CreateProductService);
  });

  it('creates a product through the repository port', async () => {
    repository.findBySku.mockResolvedValue(null);
    repository.create.mockResolvedValue(product);

    await expect(service.execute(input)).resolves.toBe(product);
    expect(repository.findBySku).toHaveBeenCalledWith('TST-001');
    expect(repository.create).toHaveBeenCalledWith(input);
  });

  it('rejects a duplicated SKU without creating a product', async () => {
    repository.findBySku.mockResolvedValue(product);

    await expect(service.execute(input)).rejects.toBeInstanceOf(
      ProductSkuConflictError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
