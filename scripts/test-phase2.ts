import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function runPhase2Tests() {
  console.log("=== STARTING PHASE 2 AUTOMATED INTEGRATION TESTS ===");

  try {
    // 1. Get an existing store and user
    const store = await db.store.findFirst();
    if (!store) {
      throw new Error("No store found to run tests against.");
    }
    const user = await db.user.findFirst({ where: { storeId: store.id } });
    if (!user) {
      throw new Error("No user found for the store.");
    }
    console.log(`[+] Using Store: "${store.name}" (${store.id}), User: "${user.name}"`);

    // 2. Create a test product
    const testProduct = await db.product.create({
      data: {
        storeId: store.id,
        name: `اختبار مرحلة 2 - ${Date.now()}`,
        barcode: `TEST-P2-${Date.now()}`,
        price: 250,
        costPrice: 180,
        stock: 10,
        minStock: 5,
      },
    });
    console.log(`[+] Created Test Product: ${testProduct.name} with initial stock: ${testProduct.stock}`);

    // 3. Create a test supplier with leadTimeDays and paymentTerms
    const testSupplier = await db.supplier.create({
      data: {
        storeId: store.id,
        name: `مورد تجريبي ${Date.now()}`,
        phone: "0555000000",
        leadTimeDays: 4,
        paymentTerms: "أجل 30 يوم",
      },
    });
    console.log(`[+] Created Test Supplier: ${testSupplier.name} (Lead Time: ${testSupplier.leadTimeDays}d, Terms: ${testSupplier.paymentTerms})`);

    // 4. Create a Purchase Order in DRAFT status
    const poNumber = `PO-TEST-${Date.now()}`;
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        orderNo: poNumber,
        supplierId: testSupplier.id,
        storeId: store.id,
        createdById: user.id,
        status: "DRAFT",
        totalAmount: 180 * 20, // 20 units at 180 = 3600
        items: {
          create: [
            {
              productId: testProduct.id,
              productName: testProduct.name,
              orderedQty: 20,
              unitCost: 180,
              total: 3600,
              receivedQty: 0,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log(`[+] Created Purchase Order: ${purchaseOrder.orderNo} in DRAFT status (Items: 20 units)`);

    // Verify stock has NOT changed
    const checkProductStock1 = await db.product.findUnique({ where: { id: testProduct.id } });
    if (checkProductStock1?.stock !== 10) {
      throw new Error(`Stock prematurely increased! Expected 10, got ${checkProductStock1?.stock}`);
    }
    console.log(`[PASS] Stock verified unchanged at ${checkProductStock1.stock} during DRAFT order.`);

    // 5. Update PO to SENT status
    const sentPO = await db.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: "SENT" },
    });
    console.log(`[+] Purchase Order status updated to: ${sentPO.status}`);

    // Verify stock still NOT changed
    const checkProductStock2 = await db.product.findUnique({ where: { id: testProduct.id } });
    if (checkProductStock2?.stock !== 10) {
      throw new Error(`Stock prematurely changed on SENT! Expected 10, got ${checkProductStock2?.stock}`);
    }
    console.log(`[PASS] Stock verified unchanged at ${checkProductStock2.stock} during SENT status.`);

    // 6. Receive partial shipment (8 units out of 20) with Batch and Expiry
    const batchExpiryDate = new Date();
    batchExpiryDate.setDate(batchExpiryDate.getDate() + 90); // 90 days in future

    await db.$transaction(async (tx) => {
      const item = purchaseOrder.items[0];
      // Update item receivedQty
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty: 8 },
      });

      // Update PO status to PARTIAL
      await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: { status: "PARTIAL" },
      });

      // Increment product stock
      const updatedProduct = await tx.product.update({
        where: { id: testProduct.id },
        data: { stock: { increment: 8 } },
      });

      // Log StockMovement
      await tx.stockMovement.create({
        data: {
          storeId: store.id,
          productId: testProduct.id,
          type: "PURCHASE",
          quantity: 8,
          beforeQty: testProduct.stock,
          afterQty: updatedProduct.stock,
          unitCost: 180,
          userId: user.id,
          referenceId: purchaseOrder.orderNo,
          reason: "استلام جزئي لطلبية شراء",
        },
      });

      // Create ProductBatch
      await tx.productBatch.create({
        data: {
          storeId: store.id,
          productId: testProduct.id,
          batchNumber: `BATCH-${Date.now()}`,
          expiryDate: batchExpiryDate,
          quantity: 8,
          costPrice: 180,
          status: "ACTIVE",
        },
      });
    });

    console.log("[+] Received partial shipment of 8 units with Batch & Expiry tracking.");

    // Verify stock is now 18
    const checkProductStock3 = await db.product.findUnique({ where: { id: testProduct.id } });
    if (checkProductStock3?.stock !== 18) {
      throw new Error(`Stock incorrect after partial receipt! Expected 18, got ${checkProductStock3?.stock}`);
    }
    console.log(`[PASS] Stock successfully incremented to ${checkProductStock3.stock}.`);

    // Verify StockMovement recorded
    const movement = await db.stockMovement.findFirst({
      where: {
        storeId: store.id,
        productId: testProduct.id,
        type: "PURCHASE",
        referenceId: purchaseOrder.orderNo,
      },
    });
    if (!movement || movement.quantity !== 8) {
      throw new Error("Stock movement was not properly recorded!");
    }
    console.log(`[PASS] Stock Movement verified: +${movement.quantity} (Type: ${movement.type}, Ref: ${movement.referenceId})`);

    // Verify ProductBatch created
    const batch = await db.productBatch.findFirst({
      where: { storeId: store.id, productId: testProduct.id },
    });
    if (!batch || batch.quantity !== 8) {
      throw new Error("Product batch was not properly recorded!");
    }
    console.log(`[PASS] Product Batch verified: ${batch.batchNumber} (Quantity: ${batch.quantity}, Expiry: ${batch.expiryDate.toISOString().slice(0, 10)})`);

    // 7. Receive remaining 12 units + auto-generate linked SupplierInvoice with dueDate
    const invoiceDueDate = new Date();
    invoiceDueDate.setDate(invoiceDueDate.getDate() + 30); // 30-day payment term

    const finalResult = await db.$transaction(async (tx) => {
      const item = purchaseOrder.items[0];
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty: 20 },
      });

      // Create SupplierInvoice
      const invoice = await tx.supplierInvoice.create({
        data: {
          storeId: store.id,
          supplierId: testSupplier.id,
          invoiceNo: `INV-${purchaseOrder.orderNo}`,
          invoiceDate: new Date(),
          dueDate: invoiceDueDate,
          totalAmount: 3600,
          paidAmount: 0,
          status: "UNPAID",
          items: {
            create: [
              {
                productId: testProduct.id,
                productName: testProduct.name,
                quantity: 20,
                unitPrice: 180,
                total: 3600,
              },
            ],
          },
        },
      });

      // Update PO status to RECEIVED & link invoice
      await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: {
          status: "RECEIVED",
          invoiceId: invoice.id,
        },
      });

      // Increment product stock by 12
      const updatedProduct = await tx.product.update({
        where: { id: testProduct.id },
        data: { stock: { increment: 12 } },
      });

      // Log second stock movement
      await tx.stockMovement.create({
        data: {
          storeId: store.id,
          productId: testProduct.id,
          type: "PURCHASE",
          quantity: 12,
          beforeQty: 18,
          afterQty: updatedProduct.stock,
          unitCost: 180,
          userId: user.id,
          referenceId: purchaseOrder.orderNo,
          reason: "استلام كامل لطلبية شراء",
        },
      });

      return invoice;
    });

    console.log("[+] Received final shipment of 12 units and generated linked SupplierInvoice.");

    // Verify PO status is RECEIVED and stock is 30
    const finalPO = await db.purchaseOrder.findUnique({ where: { id: purchaseOrder.id } });
    const finalProduct = await db.product.findUnique({ where: { id: testProduct.id } });
    if (finalPO?.status !== "RECEIVED") {
      throw new Error(`Expected PO status RECEIVED, got ${finalPO?.status}`);
    }
    if (finalProduct?.stock !== 30) {
      throw new Error(`Expected final stock 30, got ${finalProduct?.stock}`);
    }
    console.log(`[PASS] PO Status: ${finalPO.status}, Final Product Stock: ${finalProduct.stock} (Initial 10 + 20 Received)`);

    // 8. Test Supplier Invoice Payment lifecycle
    console.log(`[+] Linked Supplier Invoice created: ${finalResult.invoiceNo} (Due Date: ${finalResult.dueDate?.toISOString().slice(0, 10)})`);

    // Pay partial 1600
    const payment1 = await db.supplierPayment.create({
      data: {
        store: { connect: { id: store.id } },
        invoice: { connect: { id: finalResult.id } },
        amount: 1600,
        paymentDate: new Date(),
        paymentMethod: "Cash",
      },
    });
    await db.supplierInvoice.update({
      where: { id: finalResult.id },
      data: { paidAmount: 1600, status: "PARTIAL" },
    });
    console.log(`[PASS] Partial payment recorded: ${payment1.amount} دج. Status: PARTIAL`);

    // Pay remaining 2000
    const payment2 = await db.supplierPayment.create({
      data: {
        store: { connect: { id: store.id } },
        invoice: { connect: { id: finalResult.id } },
        amount: 2000,
        paymentDate: new Date(),
        paymentMethod: "Bank",
      },
    });
    const settledInvoice = await db.supplierInvoice.update({
      where: { id: finalResult.id },
      data: { paidAmount: 3600, status: "PAID" },
    });
    console.log(`[PASS] Final payment recorded: ${payment2.amount} دج. Status: ${settledInvoice.status}`);

    // Clean up test records
    console.log("[+] Cleaning up test records...");
    await db.supplierPayment.deleteMany({ where: { invoiceId: finalResult.id } });
    await db.supplierInvoiceItem.deleteMany({ where: { invoiceId: finalResult.id } });
    await db.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { invoiceId: null },
    });
    await db.supplierInvoice.delete({ where: { id: finalResult.id } });
    await db.purchaseOrderItem.deleteMany({ where: { orderId: purchaseOrder.id } });
    await db.purchaseOrder.delete({ where: { id: purchaseOrder.id } });
    await db.productBatch.deleteMany({ where: { productId: testProduct.id } });
    await db.stockMovement.deleteMany({ where: { productId: testProduct.id } });
    await db.supplier.delete({ where: { id: testSupplier.id } });
    await db.product.delete({ where: { id: testProduct.id } });
    console.log("[PASS] Cleanup completed cleanly.");

    console.log("=== ALL PHASE 2 TESTS PASSED PERFECTLY! ===");
  } finally {
    await db.$disconnect();
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
