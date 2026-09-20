import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  const validInput = {
    sku: ' sku-001 ',
    name: ' Producto ',
    description: ' Descripción ',
    price: '10.50',
    stock: '2',
    categoryName: ' Categoría ',
  };

  async function errorsFor(input: Record<string, unknown>) {
    const dto = plainToInstance(CreateProductDto, input);
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  }

  it('trims text, uppercases SKU and transforms numeric values', async () => {
    const dto = plainToInstance(CreateProductDto, validInput);
    await expect(errorsFor(validInput)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      sku: 'SKU-001',
      name: 'Producto',
      description: 'Descripción',
      price: 10.5,
      stock: 2,
      categoryName: 'Categoría',
    });
  });

  it.each([
    ['zero price', { price: 0 }],
    ['negative price', { price: -1 }],
    ['price with three decimals', { price: 1.234 }],
    ['negative stock', { stock: -1 }],
    ['decimal stock', { stock: 1.5 }],
    ['missing SKU', { sku: undefined }],
    ['missing name', { name: undefined }],
    ['missing category', { categoryName: undefined }],
    ['unknown property', { unexpected: true }],
  ])('rejects %s', async (_caseName, change) => {
    const errors = await errorsFor({ ...validInput, ...change });
    expect(errors.length).toBeGreaterThan(0);
  });
});
