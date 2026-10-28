import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * م-0: a valid session bound to a store is MANDATORY. The old version fell
 * back to "first active store" for anonymous callers, which let anyone
 * export the entire tenant database (products, customers, sales).
 */
async function getSessionStore(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const cookieToken =
    req.cookies.get("gestiona_token")?.value || req.cookies.get("token")?.value;
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : cookieToken;

  const session = token ? await verifyToken(token) : null;
  if (!session?.storeId) return null;

  return db.store.findUnique({ where: { id: session.storeId } });
}

/**
 * GET /api/db-transfer
 * Exports the complete store database snapshot for P2P transfer or local backup.
 */
export async function GET(req: NextRequest) {
  try {
    const store = await getSessionStore(req);
    if (!store) {
      return NextResponse.json(
        { success: false, error: "مصادقة مطلوبة — سجّل الدخول لتصدير البيانات" },
        { status: 401 }
      );
    }

    const [products, customers, suppliers, sales] = await Promise.all([
      db.product.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      }),
      db.customer.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      }),
      db.supplier.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      }),
      db.sale.findMany({
        where: { storeId: store.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 500, // Export recent 500 transactions for efficiency
      }),
    ]);

    const snapshot = {
      app: "Gestiona Pro POS",
      version: "2.0",
      exportedAt: new Date().toISOString(),
      storeId: store.id,
      store: {
        name: store.name,
        addressLine1: store.addressLine1,
        addressLine2: store.addressLine2,
        phone: store.phone,
        currency: store.currency,
        taxRate: store.taxRate,
        receiptConfig: store.receiptConfig,
        loyaltyEnabled: store.loyaltyEnabled,
        loyaltyEarnRate: store.loyaltyEarnRate,
        loyaltyPointValue: store.loyaltyPointValue,
      },
      counts: {
        products: products.length,
        customers: customers.length,
        suppliers: suppliers.length,
        sales: sales.length,
      },
      products,
      customers,
      suppliers,
      sales,
    };

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error("Database export error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/db-transfer
 * Receives and imports a database snapshot into the local database (P2P Receive & Save).
 */
export async function POST(req: NextRequest) {
  try {
    const store = await getSessionStore(req);
    if (!store) {
      return NextResponse.json(
        { success: false, error: "مصادقة مطلوبة — سجّل الدخول لاستيراد البيانات" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const snapshot = body?.snapshot || body;

    if (!snapshot || !Array.isArray(snapshot.products)) {
      return NextResponse.json(
        { success: false, error: "حزمة البيانات غير صالحة أو لا تحتوي على منتجات" },
        { status: 400 }
      );
    }

    let importedProducts = 0;
    let importedCustomers = 0;
    let importedSuppliers = 0;
    let importedSales = 0;

    // 1. Update store settings if provided
    if (snapshot.store) {
      await db.store.update({
        where: { id: store.id },
        data: {
          currency: snapshot.store.currency ?? store.currency,
          taxRate: snapshot.store.taxRate ?? store.taxRate,
          receiptConfig: snapshot.store.receiptConfig ?? store.receiptConfig,
          loyaltyEnabled: snapshot.store.loyaltyEnabled ?? store.loyaltyEnabled,
          loyaltyEarnRate: snapshot.store.loyaltyEarnRate ?? store.loyaltyEarnRate,
          loyaltyPointValue: snapshot.store.loyaltyPointValue ?? store.loyaltyPointValue,
        },
      });
    }

    // 2. Import / Upsert Products (Match by barcode or name)
    for (const p of snapshot.products) {
      try {
        const barcode = p.barcode?.trim();
        if (barcode) {
          const existing = await db.product.findFirst({
            where: { storeId: store.id, barcode },
          });

          if (existing) {
            await db.product.update({
              where: { id: existing.id },
              data: {
                name: p.name ?? existing.name,
                price: Number(p.price) || existing.price,
                costPrice: Number(p.costPrice) || existing.costPrice,
                stock: Number(p.stock) ?? existing.stock,
                category: p.category ?? existing.category,
                unitType: p.unitType ?? existing.unitType,
                expiryDate: p.expiryDate ? new Date(p.expiryDate) : existing.expiryDate,
                imageUrl: p.imageUrl ?? existing.imageUrl,
              },
            });
          } else {
            await db.product.create({
              data: {
                storeId: store.id,
                name: p.name,
                barcode: p.barcode,
                price: Number(p.price) || 0,
                costPrice: Number(p.costPrice) || 0,
                stock: Number(p.stock) || 0,
                category: p.category || "General",
                unitType: p.unitType || "unit",
                expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
                imageUrl: p.imageUrl || null,
              },
            });
          }
          importedProducts++;
        }
      } catch (err) {
        console.warn("Product import skipped:", p.name, err);
      }
    }

    // 3. Import / Upsert Customers
    if (Array.isArray(snapshot.customers)) {
      for (const c of snapshot.customers) {
        try {
          const phone = c.phone?.trim();
          if (phone) {
            const existing = await db.customer.findFirst({
              where: { storeId: store.id, phone },
            });
            if (existing) {
              await db.customer.update({
                where: { id: existing.id },
                data: {
                  name: c.name ?? existing.name,
                  address: c.address ?? existing.address,
                  loyaltyPoints: c.loyaltyPoints ?? existing.loyaltyPoints,
                },
              });
            } else {
              await db.customer.create({
                data: {
                  storeId: store.id,
                  name: c.name || "عميل",
                  phone: c.phone,
                  address: c.address || null,
                  loyaltyPoints: Number(c.loyaltyPoints) || 0,
                },
              });
            }
            importedCustomers++;
          }
        } catch {
          // ignore individual duplicate customer
        }
      }
    }

    // 4. Import / Upsert Suppliers
    if (Array.isArray(snapshot.suppliers)) {
      for (const s of snapshot.suppliers) {
        try {
          const name = s.name?.trim();
          if (name) {
            const existing = await db.supplier.findFirst({
              where: { storeId: store.id, name },
            });
            if (!existing) {
              await db.supplier.create({
                data: {
                  storeId: store.id,
                  name: s.name,
                  phone: s.phone || "",
                  address: s.address || "",
                  email: s.email || "",
                },
              });
            }
            importedSuppliers++;
          }
        } catch {
          // ignore
        }
      }
    }

    // 5. Import recent Sales
    if (Array.isArray(snapshot.sales)) {
      for (const sale of snapshot.sales) {
        try {
          const existing = await db.sale.findFirst({
            where: { storeId: store.id, receiptNo: sale.receiptNo },
          });
          if (!existing && Array.isArray(sale.items) && sale.items.length > 0) {
            await db.sale.create({
              data: {
                storeId: store.id,
                receiptNo: sale.receiptNo,
                total: Number(sale.total) || 0,
                subtotal: Number(sale.subtotal) || 0,
                discount: Number(sale.discount) || 0,
                taxAmount: Number(sale.taxAmount ?? sale.tax) || 0,
                paymentMethod: sale.paymentMethod || "Cash",
                itemCount: Number(sale.itemCount) || sale.items.length,
                createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
                items: {
                  create: sale.items.map((i: any) => ({
                    productId: i.productId,
                    productName: i.productName,
                    unitPrice: Number(i.unitPrice) || 0,
                    quantity: Number(i.quantity) || 1,
                    total: Number(i.total) || 0,
                  })),
                },
              },
            });
            importedSales++;
          }
        } catch {
          // ignore sale insertion collision
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم استقبال وحفظ قاعدة البيانات بنجاح: ${importedProducts} منتج، ${importedCustomers} عميل، ${importedSuppliers} مورد، ${importedSales} مبيعات.`,
      stats: {
        importedProducts,
        importedCustomers,
        importedSuppliers,
        importedSales,
      },
    });
  } catch (error) {
    console.error("Database import error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
