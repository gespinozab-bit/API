import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRepository } from '../../src/categories/application/ports/category.repository';
import type { Category } from '../../src/categories/domain/category';
import { InventoryError } from '../../src/common/domain/inventory.error';
import { CreateProductService } from '../../src/products/application/create-product.service';
import { ProductSkuConflictError } from '../../src/products/application/errors/product-sku-conflict.error';
import type { ProductRepository } from '../../src/products/application/ports/product.repository';
import type {
  CreateProductData,
  Product,
} from '../../src/products/domain/product';

describe('Registro de productos: reglas de negocio sin infraestructura', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const category: Category = {
    id: 7,
    name: 'Herramientas',
    createdAt: date,
    updatedAt: date,
  };
  const input: CreateProductData = {
    sku: 'FER-002',
    name: 'Taladro',
    price: 25.5,
    stock: 8,
    categoryId: 7,
  };
  const product: Product = {
    id: 42,
    sku: 'FER-002',
    name: 'Taladro',
    description: null,
    price: '25.50',
    stock: 8,
    categoryId: 7,
    categoryName: 'Herramientas',
    createdAt: date,
    updatedAt: date,
  };

  function repositories() {
    return {
      products: {
        findBySku: vi
          .fn<ProductRepository['findBySku']>()
          .mockResolvedValue(null),
        findById: vi.fn<ProductRepository['findById']>(),
        findAll: vi.fn<ProductRepository['findAll']>(),
        create: vi.fn<ProductRepository['create']>().mockResolvedValue(product),
      },
      categories: {
        findById: vi
          .fn<CategoryRepository['findById']>()
          .mockResolvedValue(category),
        findByName: vi
          .fn<CategoryRepository['findByName']>()
          .mockResolvedValue(category),
        findAll: vi.fn<CategoryRepository['findAll']>(),
        create: vi.fn<CategoryRepository['create']>(),
      },
    };
  }

  let persistence: ReturnType<typeof repositories>;
  let service: CreateProductService;

  beforeEach(() => {
    persistence = repositories();
    service = new CreateProductService(
      persistence.products,
      persistence.categories,
    );
  });

  it('crea el producto con categoría existente y normaliza SKU y nombre', async () => {
    // Arrange
    const request = { ...input, sku: ' fer-002 ', name: ' Taladro ' };

    // Act
    const result = await service.execute(request);

    // Assert
    expect(result).toEqual(product);
    expect(persistence.products.findBySku).toHaveBeenCalledWith('FER-002');
    expect(persistence.categories.findById).toHaveBeenCalledWith(7);
    expect(persistence.products.create).toHaveBeenCalledExactlyOnceWith(input);
    expect(persistence.categories.create).not.toHaveBeenCalled();
    expect(request.sku).toBe(' fer-002 ');
  });

  it('resuelve una categoría existente por nombre sin crear otra categoría', async () => {
    // Arrange
    const { categoryId: _categoryId, ...fields } = input;
    const request = { ...fields, categoryName: ' Herramientas ' };

    // Act
    const result = await service.execute(request);

    // Assert
    expect(result).toEqual(product);
    expect(persistence.categories.findByName).toHaveBeenCalledWith(
      'Herramientas',
    );
    expect(persistence.categories.findById).not.toHaveBeenCalled();
    expect(persistence.products.create).toHaveBeenCalledExactlyOnceWith({
      ...input,
      categoryName: 'Herramientas',
    });
    expect(persistence.categories.create).not.toHaveBeenCalled();
  });

  it.each([0, 1000])(
    'acepta stock %i en el límite inclusivo',
    async (stock) => {
      // Arrange
      const request = { ...input, stock };
      const stored = { ...product, stock };
      persistence.products.create.mockResolvedValue(stored);

      // Act
      const result = await service.execute(request);

      // Assert
      expect(result).toEqual(stored);
      expect(result.stock).toBe(stock);
      expect(persistence.products.create).toHaveBeenCalledExactlyOnceWith(
        request,
      );
    },
  );

  it.each([
    {
      label: 'stock -1',
      change: { stock: -1 },
      message: 'El stock debe ser un entero entre 0 y 1000',
    },
    {
      label: 'stock 1001',
      change: { stock: 1001 },
      message: 'El stock debe ser un entero entre 0 y 1000',
    },
    {
      label: 'precio 0',
      change: { price: 0 },
      message:
        'El precio debe ser mayor que 0, no superar 99999999.99 y tener hasta dos decimales',
    },
    {
      label: 'precio negativo',
      change: { price: -0.01 },
      message:
        'El precio debe ser mayor que 0, no superar 99999999.99 y tener hasta dos decimales',
    },
    {
      label: 'nombre vacío',
      change: { name: '' },
      message: 'El nombre es obligatorio y admite hasta 120 caracteres',
    },
    {
      label: 'nombre con solo espacios',
      change: { name: '   ' },
      message: 'El nombre es obligatorio y admite hasta 120 caracteres',
    },
    {
      label: 'SKU vacío',
      change: { sku: '' },
      message: 'El SKU es obligatorio y debe tener entre 3 y 30 caracteres',
    },
    {
      label: 'SKU con solo espacios',
      change: { sku: '   ' },
      message: 'El SKU es obligatorio y debe tener entre 3 y 30 caracteres',
    },
  ])(
    'rechaza $label antes de acceder a la persistencia',
    async ({ change, message }) => {
      // Arrange
      const request = { ...input, ...change };

      // Act
      const result = service.execute(request);

      // Assert
      await expect(result).rejects.toBeInstanceOf(InventoryError);
      await expect(result).rejects.toMatchObject({
        kind: 'invalid',
        code: 'VALIDATION_ERROR',
        message,
      });
      expect(persistence.products.findBySku).not.toHaveBeenCalled();
      expect(persistence.categories.findById).not.toHaveBeenCalled();
      expect(persistence.categories.findByName).not.toHaveBeenCalled();
      expect(persistence.products.create).not.toHaveBeenCalled();
      expect(persistence.categories.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'ID', request: { ...input, categoryId: 99 } },
    {
      label: 'nombre',
      request: {
        sku: input.sku,
        name: input.name,
        price: input.price,
        stock: input.stock,
        categoryName: 'Inexistente',
      },
    },
  ])(
    'rechaza categoría inexistente por $label sin guardar ni crear categorías',
    async ({ request }) => {
      // Arrange
      persistence.categories.findById.mockResolvedValue(null);
      persistence.categories.findByName.mockResolvedValue(null);

      // Act
      const result = service.execute(request);

      // Assert
      await expect(result).rejects.toBeInstanceOf(InventoryError);
      await expect(result).rejects.toMatchObject({
        kind: 'not-found',
        code: 'CATEGORY_NOT_FOUND',
        message: 'La categoría no existe',
      });
      if ('categoryId' in request) {
        expect(persistence.categories.findById).toHaveBeenCalledWith(99);
      } else {
        expect(persistence.categories.findByName).toHaveBeenCalledWith(
          'Inexistente',
        );
      }
      expect(persistence.products.create).not.toHaveBeenCalled();
      expect(persistence.categories.create).not.toHaveBeenCalled();
    },
  );

  it('rechaza un SKU duplicado después de normalizarlo sin guardar otro producto', async () => {
    // Arrange
    persistence.products.findBySku.mockResolvedValue(product);
    const request = { ...input, sku: ' fer-002 ' };

    // Act
    const result = service.execute(request);

    // Assert
    await expect(result).rejects.toBeInstanceOf(ProductSkuConflictError);
    await expect(result).rejects.toMatchObject({
      name: 'ProductSkuConflictError',
      message: 'Ya existe un producto con el SKU FER-002',
    });
    expect(persistence.products.findBySku).toHaveBeenCalledWith('FER-002');
    expect(persistence.products.create).not.toHaveBeenCalled();
    expect(persistence.categories.create).not.toHaveBeenCalled();
  });
});
