import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

interface ReceiveItemInput {
  itemId: string;
  receivedQty: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface ReceiveBody {
  items: ReceiveItemInput[];
  createInvoice?: boolean;
  invoiceNo?: string;
  notes?: string;
}

// POST /api/purchase-orders/:id/receive — record goods receipt, increment stock, log StockMovement, optional batches & invoice
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = (await request.json()) as ReceiveBody;

    const order = await db.purchaseOrder.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (order.status === "RECEIVED") {
      return NextResponse.json({ error: "Purchase order is already fully received" }, { status: 400 });
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot receive items for a cancelled purchase order" }, { status: 400 });
    }

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No received items provided" }, { status: 400 });
    }

    // Execute receiving atomically
    const result = await db.$transaction(async (tx) => {
      let totalReceivedCost = 0;
      const invoiceItemsToCreate: Prisma.SupplierInvoiceItemCreateWithoutInvoiceInput[] = [];

      for (const recItem of body.items) {
        const orderItem = order.items.find((i) => i.id === recItem.itemId);
        if (!orderItem) continue;

        const qty = parseFloat(String(recItem.receivedQty));
        if (isNaN(qty) || qty <= 0) continue;

        // 1. Update purchase order item receivedQty
        const newReceivedQty = orderItem.receivedQty + qty;
        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: { receivedQty: newReceivedQty },
        });

        const lineCost = qty * orderItem.unitCost;
        totalReceivedCost += lineCost;

        invoiceItemsToCreate.push({
          productName: orderItem.productName,
          quantity: qty,
          unitPrice: orderItem.unitCost,
          total: lineCost,
          ...(orderItem.productId ? { product: { connect: { id: orderItem.productId } } } : {}),
        });

        // 2. If item is linked to a product, increment stock & record StockMovement
        if (orderItem.productId) {
          const product = await tx.product.findUnique({
            where: { id: orderItem.productId },
            select: { stock: true, costPrice: true },
          });

          if (product) {
            const beforeQty = product.stock;
            const afterQty = beforeQty + qty;

            await tx.product.update({
              where: { id: orderItem.productId },
              data: {
                stock: afterQty,
                ...(orderItem.unitCost > 0 ? { costPrice: orderItem.unitCost } : {}),
              },
            });

            await tx.stockMovement.create({
              data: {
                storeId: session.storeId,
                productId: orderItem.productId,
                type: "PURCHASE",
                quantity: qty,
                beforeQty,
                afterQty,
                unitCost: orderItem.unitCost,
                reason: `استلام طلبية شراء رقم: ${order.orderNo}`,
                referenceId: order.orderNo,
                userId: session.userId,
              },
            });

            // 3. If expiry date provided, register a ProductBatch
            if (recItem.expiryDate) {
              const expDate = new Date(recItem.expiryDate);
              if (!isNaN(expDate.getTime())) {
                const bNum = recItem.batchNumber?.trim() || `LOT-${order.orderNo}`;
                await tx.productBatch.create({
                  data: {
                    storeId: session.storeId,
                    productId: orderItem.productId,
                    batchNumber: bNum,
                    expiryDate: expDate,
                    quantity: qty,
                    costPrice: orderItem.unitCost,
                    receivedDate: new Date(),
                    status: "ACTIVE",
                  },
                });
              }
            }
          }
        }
      }

      // 4. Check if order is fully received
      const updatedOrderItems = await tx.purchaseOrderItem.findMany({
        where: { orderId: order.id },
      });
      const allFullyReceived = updatedOrderItems.every((i) => i.receivedQty >= i.orderedQty);
      const newStatus = allFullyReceived ? "RECEIVED" : "PARTIAL";

      // 5. Optionally create linked SupplierInvoice
      let linkedInvoiceId = order.invoiceId;
      if (body.createInvoice && invoiceItemsToCreate.length > 0 && !order.invoiceId) {
        const invNo = body.invoiceNo?.trim() || `INV-${order.orderNo}`;
        const invoice = await tx.supplierInvoice.create({
          data: {
            storeId: session.storeId,
            supplierId: order.supplierId,
            invoiceNo: invNo,
            invoiceDate: new Date(),
            totalAmount: totalReceivedCost,
            paidAmount: 0,
            status: "UNPAID",
            notes: `فاتورة استلام تلقائية لطلبية الشراء: ${order.orderNo}`,
            items: {
              create: invoiceItemsToCreate,
            },
          },
        });
        linkedInvoiceId = invoice.id;
      }

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          ...(linkedInvoiceId ? { invoiceId: linkedInvoiceId } : {}),
        },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
          invoice: true,
        },
      });

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "POST /api/purchase-orders/:id/receive");
  }
}
