export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  categoryId: number;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductData {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: number;
  categoryName?: string;
}
