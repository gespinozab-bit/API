export class ProductSkuConflictError extends Error {
  constructor(sku: string) {
    super(`Ya existe un producto con el SKU ${sku}`);
    this.name = 'ProductSkuConflictError';
  }
}
