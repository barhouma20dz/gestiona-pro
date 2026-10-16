const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultItems = [
    { name: 'خبز عادي / باغيت', price: 15.0, costPrice: 12.0, stock: 500, category: 'مخبوزات', barcode: 'NB-BREAD-01', isNoBarcode: true },
    { name: 'حليب مبستر كونديا', price: 120.0, costPrice: 105.0, stock: 250, category: 'مشتقات الحليب', barcode: 'NB-MILK-02', isNoBarcode: true },
    { name: 'قهوة ساخنة سريعة', price: 50.0, costPrice: 20.0, stock: 999, category: 'مشروبات', barcode: 'NB-COFFEE-03', isNoBarcode: true },
    { name: 'ماء معدني 1.5 لتر', price: 35.0, costPrice: 25.0, stock: 400, category: 'مشروبات', barcode: 'NB-WATER-04', isNoBarcode: true },
    { name: 'زيت مائدة 5 لتر', price: 650.0, costPrice: 600.0, stock: 80, category: 'مواد عامة', barcode: 'NB-OIL-05', isNoBarcode: true },
    { name: 'بطاطا استهلاك 1 كلغ', price: 90.0, costPrice: 70.0, stock: 300, category: 'خضر وفواكه', barcode: 'NB-POTATO-06', isNoBarcode: true },
    { name: 'تفاح محلي 1 كلغ', price: 320.0, costPrice: 250.0, stock: 150, category: 'خضر وفواكه', barcode: 'NB-APPLE-07', isNoBarcode: true },
    { name: 'علكة أو حلوى صغيرة', price: 10.0, costPrice: 5.0, stock: 1000, category: 'حلويات', barcode: 'NB-CANDY-08', isNoBarcode: true },
  ];

  const store = await prisma.store.findFirst();
  if (!store) {
    console.log('No store found');
    return;
  }

  for (const item of defaultItems) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: item.barcode },
          { name: item.name }
        ]
      }
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          ...item,
          storeId: store.id
        }
      });
      console.log(`Added: ${item.name}`);
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: { isNoBarcode: true }
      });
      console.log(`Updated to isNoBarcode: ${item.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
