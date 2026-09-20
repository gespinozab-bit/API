import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// supertest publishes a CommonJS callable export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { HttpExceptionFilter } from '../../common/http-exception.filter';
import { CreateProductService } from '../application/create-product.service';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../application/ports/product.repository';
import { Product } from '../domain/product';
import { ProductsController } from './products.controller';

describe('POST /products (e2e)', () => {
  let app: INestApplication;
  const products = new Map<string, Product>();
  let nextId = 1;

  const repository: ProductRepository = {
    findBySku: async (sku) => products.get(sku) ?? null,
    create: async (data) => {
      if (data.sku === 'ERROR-500') {
        throw new Error('sensitive internal detail');
      }
      const now = new Date('2026-01-01T00:00:00.000Z');
      const product: Product = {
        id: nextId++,
        ...data,
        description: data.description ?? null,
        price: data.price.toFixed(2),
        createdAt: now,
        updatedAt: now,
      };
      products.set(product.sku, product);
      return product;
    },
  };

  const validBody = {
    sku: ' e2e-001 ',
    name: ' Producto E2E ',
    description: ' Descripción ',
    price: '25.50',
    stock: '3',
    categoryName: ' Pruebas ',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        CreateProductService,
        { provide: PRODUCT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns 201 and transforms strings, SKU and numeric values', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send(validBody)
      .expect(201);

    expect(response.body).toMatchObject({
      sku: 'E2E-001',
      name: 'Producto E2E',
      description: 'Descripción',
      price: '25.50',
      stock: 3,
      categoryName: 'Pruebas',
    });
  });

  it('returns 409 for a duplicated SKU', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send(validBody)
      .expect(409);
    expect(response.body.code).toBe('PRODUCT_SKU_CONFLICT');
  });

  it.each([0, -1])('returns 400 for invalid price %s', async (price) => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: `PRICE-${price}`, price })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative stock', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: 'STOCK-NEG', stock: -1 })
      .expect(400);
  });

  it('returns 400 for a price with more than two decimals', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: 'PRICE-DEC', price: 10.123 })
      .expect(400);
  });

  it('returns 400 for decimal stock', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: 'STOCK-DEC', stock: 1.5 })
      .expect(400);
  });

  it('returns 400 when a required field is absent', async () => {
    const withoutCategory: Partial<typeof validBody> = { ...validBody };
    delete withoutCategory.categoryName;
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...withoutCategory, sku: 'MISSING-001' })
      .expect(400);
  });

  it('returns 400 for an unknown property', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: 'EXTRA-001', unexpected: true })
      .expect(400);
  });

  it('returns a sanitized 500 response for unexpected errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({ ...validBody, sku: 'ERROR-500' })
      .expect(500);
    expect(response.body).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno',
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'sensitive internal detail',
    );
  });

  it('returns a uniform 404 response for an unknown route', async () => {
    const response = await request(app.getHttpServer())
      .get('/missing-route')
      .expect(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'HTTP_ERROR',
      path: '/missing-route',
    });
    expect(response.body.timestamp).toBeDefined();
  });
});
