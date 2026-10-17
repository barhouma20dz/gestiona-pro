import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";
import { formatDate, formatDateTime } from "../src/lib/format";

async function main() {
  console.log("=== VERIFYING PHASE 1: DATE FORMAT & SUPPLIER INVOICE PHOTO ===");

  // 1. Date format verification
  const d1 = new Date(2026, 9, 18); // Oct 18, 2026
  const formattedD1 = formatDate(d1);
  console.log(`[+] Date format test: ${formattedD1} (Expected: 2026/10/18)`);
  if (formattedD1 !== "2026/10/18") {
    throw new Error(`Date formatting failed! Got ${formattedD1}`);
  }

  const dt1 = formatDateTime(new Date(2026, 9, 18, 14, 30));
  console.log(`[+] DateTime format test: ${dt1} (Expected: 2026/10/18 14:30)`);
  if (!dt1.startsWith("2026/10/18")) {
    throw new Error(`DateTime formatting failed! Got ${dt1}`);
  }

  // 2. Fetch owner & store
  const user = await db.user.findFirst({ where: { role: "OWNER" }, include: { store: true } });
  if (!user || !user.storeId) {
    throw new Error("No owner with store found");
  }

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  });

  // 3. Find or create a supplier
  let supplier = await db.supplier.findFirst({ where: { storeId: user.storeId } });
  if (!supplier) {
    supplier = await db.supplier.create({
      data: {
        storeId: user.storeId,
        name: "مورد تجريبي لاختبار الفاتورة المصورة",
        phone: "0555112233",
      },
    });
  }
  console.log(`[+] Using Supplier: ${supplier.name} (${supplier.id})`);

  // 4. Test POST /api/supplier-invoices with manual total and attachmentUrl
  const testInvoiceNo = `INV-TEST-PHOTO-${Date.now()}`;
  const mockPhotoUrl = `/uploads/invoices/test-invoice-${Date.now()}.jpg`;
  const invoiceTotal = 45000;

  console.log(`[+] Creating quick photo invoice: No=${testInvoiceNo}, Total=${invoiceTotal}`);
  const postRes = await fetch("http://localhost:3001/api/supplier-invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      supplierId: supplier.id,
      invoiceNo: testInvoiceNo,
      invoiceDate: "2026-10-18",
      totalAmount: invoiceTotal,
      paidAmount: 15000,
      attachmentUrl: mockPhotoUrl,
      notes: "فاتورة مصورة بالاختبار الآلي",
    }),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Failed to create photo invoice! Status: ${postRes.status}, Error: ${err}`);
  }
  const createdInv = await postRes.json();
  console.log(`[PASS] Invoice created successfully! ID=${createdInv.id}, Attachment=${createdInv.attachmentUrl}`);

  // 5. Test Duplicate Invoice Prevention
  console.log(`[+] Testing duplicate invoice prevention for ${testInvoiceNo}...`);
  const dupRes = await fetch("http://localhost:3001/api/supplier-invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      supplierId: supplier.id,
      invoiceNo: testInvoiceNo,
      invoiceDate: "2026-10-18",
      totalAmount: invoiceTotal,
      paidAmount: 0,
    }),
  });

  if (dupRes.status === 409) {
    console.log(`[PASS] Duplicate invoice successfully rejected with 409 Conflict`);
  } else {
    throw new Error(`Duplicate invoice was NOT rejected! Status: ${dupRes.status}`);
  }

  // 6. Test Invalid Total Amount Validation (<= 0)
  console.log(`[+] Testing negative / zero total amount validation...`);
  const negRes = await fetch("http://localhost:3001/api/supplier-invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      supplierId: supplier.id,
      invoiceNo: `INV-NEG-${Date.now()}`,
      invoiceDate: "2026-10-18",
      totalAmount: -100,
      paidAmount: 0,
    }),
  });

  if (negRes.status === 400) {
    console.log(`[PASS] Invalid total amount successfully rejected with 400 Bad Request`);
  } else {
    throw new Error(`Invalid total amount was NOT rejected! Status: ${negRes.status}`);
  }

  // 7. Test PUT /api/supplier-invoices/:id (replace photo)
  const newPhotoUrl = `/uploads/invoices/replaced-${Date.now()}.png`;
  console.log(`[+] Updating invoice photo to: ${newPhotoUrl}...`);
  const putRes = await fetch(`http://localhost:3001/api/supplier-invoices/${createdInv.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      attachmentUrl: newPhotoUrl,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`Failed to update invoice photo! Status: ${putRes.status}`);
  }
  const updatedInv = await putRes.json();
  if (updatedInv.attachmentUrl !== newPhotoUrl) {
    throw new Error(`attachmentUrl was not updated! Got ${updatedInv.attachmentUrl}`);
  }
  console.log(`[PASS] Invoice photo replacement verified: ${updatedInv.attachmentUrl}`);

  // 8. Clean up test invoice
  console.log(`[+] Cleaning up test invoice ${createdInv.id}...`);
  await db.supplierInvoice.delete({ where: { id: createdInv.id } });
  console.log(`[PASS] Test invoice cleaned up safely.`);

  console.log("\n=== ALL PHASE 1 REQUIREMENTS VERIFIED SUCCESSFULLY ===");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
