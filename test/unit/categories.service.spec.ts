import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from '../../src/categories/application/categories.service';
import type { CategoryRepository } from '../../src/categories/application/ports/category.repository';
import type { Category } from '../../src/categories/domain/category';
import { InventoryError } from '../../src/common/domain/inventory.error';

describe('Registro de categorías: reglas de negocio sin infraestructura', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const category: Category = {
    id: 7,
    name: 'Herramientas',
    createdAt: date,
    updatedAt: date,
  };

  function repository() {
    return {
      findById: vi.fn<CategoryRepository['findById']>(),
      findByName: vi
        .fn<CategoryRepository['findByName']>()
        .mockResolvedValue(null),
      findAll: vi.fn<CategoryRepository['findAll']>(),
      create: vi.fn<CategoryRepository['create']>().mockResolvedValue(category),
    };
  }

  let persistence: ReturnType<typeof repository>;
  let service: CategoriesService;

  beforeEach(() => {
    persistence = repository();
    service = new CategoriesService(persistence);
  });

  it('crea una categoría con nombre normalizado y devuelve el registro persistido', async () => {
    // Arrange
    const name = ' Herramientas ';

    // Act
    const result = await service.create(name);

    // Assert
    expect(result).toEqual(category);
    expect(persistence.findByName).toHaveBeenCalledWith('Herramientas');
    expect(persistence.create).toHaveBeenCalledExactlyOnceWith('Herramientas');
  });

  it('rechaza una categoría duplicada después de quitar espacios sin guardarla', async () => {
    // Arrange
    persistence.findByName.mockResolvedValue(category);

    // Act
    const result = service.create(' Herramientas ');

    // Assert
    await expect(result).rejects.toBeInstanceOf(InventoryError);
    await expect(result).rejects.toMatchObject({
      kind: 'conflict',
      code: 'CATEGORY_NAME_CONFLICT',
      message: 'Ya existe una categoría con ese nombre',
    });
    expect(persistence.findByName).toHaveBeenCalledWith('Herramientas');
    expect(persistence.create).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'vacío', name: '' },
    { label: 'con solo espacios', name: '   ' },
  ])(
    'rechaza un nombre $label antes de consultar o guardar',
    async ({ name }) => {
      // Arrange
      const request = name;

      // Act
      const result = service.create(request);

      // Assert
      await expect(result).rejects.toBeInstanceOf(InventoryError);
      await expect(result).rejects.toMatchObject({
        kind: 'invalid',
        code: 'VALIDATION_ERROR',
        message:
          'El nombre de categoría es obligatorio y admite hasta 80 caracteres',
      });
      expect(persistence.findByName).not.toHaveBeenCalled();
      expect(persistence.create).not.toHaveBeenCalled();
    },
  );
});
