import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    sku: 'FER-001',
    name: 'Martillo de acero',
    description: 'Martillo resistente para trabajos generales.',
    price: new Prisma.Decimal('85.50'),
    stock: 20,
    categoryName: 'Herramientas',
  },
  {
    sku: 'FER-002',
    name: 'Destornillador Phillips',
    description: 'Destornillador de punta Phillips.',
    price: new Prisma.Decimal('25.00'),
    stock: 35,
    categoryName: 'Herramientas',
  },
  {
    sku: 'ELE-001',
    name: 'Bombilla LED 12W',
    description: 'Bombilla LED de bajo consumo.',
    price: new Prisma.Decimal('18.75'),
    stock: 50,
    categoryName: 'Electricidad',
  },
  {
    sku: 'PLM-001',
    name: 'Tubo PVC 1/2 pulgada',
    description: 'Tubo PVC para instalaciones hidráulicas.',
    price: new Prisma.Decimal('32.00'),
    stock: 40,
    categoryName: 'Plomería',
  },
];

async function main(): Promise<void> {
  for (const product of products) {
    await prisma.$transaction(async (transaction) => {
      const { categoryName, ...productData } = product;
      const category = await transaction.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });

      await transaction.product.upsert({
        where: { sku: product.sku },
        update: { ...productData, categoryId: category.id },
        create: { ...productData, categoryId: category.id },
      });
    });
  }

  console.log(`Seed completado: ${products.length} productos procesados.`);
}

main()
  .catch((error: unknown) => {
    console.error('No fue posible completar el seed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
