export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
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
  categoryName: string;
}
