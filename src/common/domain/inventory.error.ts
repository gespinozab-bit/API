export class InventoryError extends Error {
  constructor(
    readonly kind: 'invalid' | 'not-found' | 'conflict',
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}
