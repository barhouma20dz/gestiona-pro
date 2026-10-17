const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stores = await prisma.store.findMany({
    select: { id: true, name: true, _count: { select: { products: true } } }
  });
  console.log(JSON.stringify(stores, null, 2));

  const sampleProducts = await prisma.product.findMany({
    take: 10,
    select: { id: true, name: true, storeId: true, isNoBarcode: true }
  });
  console.log('Sample products:', JSON.stringify(sampleProducts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
