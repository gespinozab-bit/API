import { InventoryError } from '../../common/domain/inventory.error';

export interface Category {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function categoryName(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new InventoryError(
      'invalid',
      'VALIDATION_ERROR',
      'El nombre de categoría es obligatorio y admite hasta 80 caracteres',
    );
  }
  return value.trim();
}

export function categoryNotFound(): InventoryError {
  return new InventoryError(
    'not-found',
    'CATEGORY_NOT_FOUND',
    'La categoría no existe',
  );
}

export function categoryConflict(): InventoryError {
  return new InventoryError(
    'conflict',
    'CATEGORY_NAME_CONFLICT',
    'Ya existe una categoría con ese nombre',
  );
}
