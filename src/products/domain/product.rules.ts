import { InventoryError } from '../../common/domain/inventory.error';
import { categoryName } from '../../categories/domain/category';
import { CreateProductData } from './product';

export function validateProduct(input: CreateProductData): CreateProductData {
  const invalid = (message: string): never => {
    throw new InventoryError('invalid', 'VALIDATION_ERROR', message);
  };
  const sku =
    typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (sku.length < 3 || sku.length > 30)
    invalid('El SKU es obligatorio y debe tener entre 3 y 30 caracteres');
  if (!name || name.length > 120)
    invalid('El nombre es obligatorio y admite hasta 120 caracteres');
  if (
    typeof input.price !== 'number' ||
    !Number.isFinite(input.price) ||
    input.price <= 0 ||
    input.price > 99999999.99 ||
    Math.abs(input.price * 100 - Math.round(input.price * 100)) > 0.000001
  ) {
    invalid(
      'El precio debe ser mayor que 0, no superar 99999999.99 y tener hasta dos decimales',
    );
  }
  if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 1000)
    invalid('El stock debe ser un entero entre 0 y 1000');
  if ((input.categoryId !== undefined) === (input.categoryName !== undefined))
    invalid('Indique exactamente uno: categoryId o categoryName');
  if (
    input.categoryId !== undefined &&
    (!Number.isInteger(input.categoryId) ||
      input.categoryId < 1 ||
      input.categoryId > 2147483647)
  )
    invalid('categoryId debe ser un entero positivo válido');
  if (
    input.description != null &&
    (typeof input.description !== 'string' ||
      input.description.trim().length > 500)
  )
    invalid('La descripción admite hasta 500 caracteres');
  return {
    ...input,
    sku,
    name,
    ...(input.description != null
      ? { description: input.description.trim() }
      : {}),
    ...(input.categoryName !== undefined
      ? { categoryName: categoryName(input.categoryName) }
      : {}),
  };
}
