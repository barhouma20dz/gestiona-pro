import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

interface InvoiceItemInput {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceBody {
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  invoiceNo: string;
  invoiceDate?: string;
  items: InvoiceItemInput[];
  paidAmount?: number;
  notes?: string;
}

// GET /api/supplier-invoices — list all supplier invoices for the store
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const invoices = await db.supplierInvoice.findMany({
      where: { storeId: session.storeId },
      include: { items: true, supplier: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return handleRouteError(error, "GET /api/supplier-invoices");
  }
}

// POST /api/supplier-invoices — create an invoice + items, increment product stock
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as CreateInvoiceBody;

    if (
      !body ||
      ((!body.supplierId || typeof body.supplierId !== "string" || !body.supplierId.trim()) &&
       (!body.supplierName || typeof body.supplierName !== "string" || !body.supplierName.trim()))
    ) {
      return NextResponse.json(
        { error: "Either supplierId or supplierName is required" },
        { status: 400 }
      );
    }
    if (typeof body.invoiceNo !== "string" || !body.invoiceNo.trim()) {
      return NextResponse.json(
        { error: "invoiceNo is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Invoice must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate supplier: either use existing supplierId, or auto-create from invoice info
    let supplierId = body.supplierId?.trim();

    if (!supplierId) {
      // Auto-create a supplier from the invoice's supplier info
      const supplierName = body.supplierName?.trim() || "";
      const supplierPhone = body.supplierPhone?.trim() || "";
      const supplierEmail = body.supplierEmail?.trim() || "";
      const supplierAddress = body.supplierAddress?.trim() || "";

      if (!supplierName) {
        return NextResponse.json(
          { error: "supplierName is required when supplierId is not provided" },
          { status: 400 }
        );
      }

      // Check if a supplier with the same name already exists in this store
      let supplier = await db.supplier.findFirst({
        where: { storeId: session.storeId, name: supplierName },
        select: { id: true },
      });

      if (!supplier) {
        // Create a new supplier automatically
        supplier = await db.supplier.create({
          data: {
            name: supplierName,
            phone: supplierPhone,
            email: supplierEmail,
            address: supplierAddress,
            storeId: session.storeId,
          },
        });
      }

      supplierId = supplier.id;
    } else {
      // Validate existing supplier belongs to store
      const supplier = await db.supplier.findFirst({
        where: { id: supplierId, storeId: session.storeId },
        select: { id: true },
      });
      if (!supplier) {
        return NextResponse.json(
          { error: "Supplier not found in your store" },
          { status: 400 }
        );
      }
    }

    // Validate items
    const normalizedItems: {
      productId: string | null;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[] = [];
    for (const item of body.items) {
      const productName =
        typeof item.productName === "string" ? item.productName.trim() : "";
      if (!productName) {
        return NextResponse.json(
          { error: "Each invoice item must have a productName" },
          { status: 400 }
        );
      }
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (
        Number.isNaN(qty) ||
        !Number.isInteger(qty) ||
        qty <= 0
      ) {
        return NextResponse.json(
          { error: "Each item quantity must be a positive integer" },
          { status: 400 }
        );
      }
      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: "Each item unitPrice must be a number >= 0" },
          { status: 400 }
        );
      }
      // If productId provided, verify it belongs to the store
      if (item.productId) {
        const product = await db.product.findFirst({
          where: { id: item.productId, storeId: session.storeId },
          select: { id: true },
        });
        if (!product) {
          return NextResponse.json(
            { error: `Product '${item.productId}' not found in your store` },
            { status: 400 }
          );
        }
      }
      normalizedItems.push({
        productId: item.productId ?? null,
        productName,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
      });
    }

    const totalAmount = normalizedItems.reduce(
      (sum, i) => sum + i.total,
      0
    );
    const paidAmount = Number(body.paidAmount ?? 0);
    if (Number.isNaN(paidAmount) || paidAmount < 0) {
      return NextResponse.json(
        { error: "paidAmount must be a number >= 0" },
        { status: 400 }
      );
    }
    const status =
      paidAmount >= totalAmount
        ? "PAID"
        : paidAmount > 0
          ? "PARTIAL"
          : "UNPAID";

    // Enforce unique [storeId, invoiceNo]
    const dupInvoice = await db.supplierInvoice.findFirst({
      where: { storeId: session.storeId, invoiceNo: body.invoiceNo },
      select: { id: true },
    });
    if (dupInvoice) {
      return NextResponse.json(
        { error: `Invoice number '${body.invoiceNo}' already exists in your store` },
        { status: 409 }
      );
    }

    const invoiceDate = body.invoiceDate
      ? new Date(body.invoiceDate)
      : new Date();
    if (Number.isNaN(invoiceDate.getTime())) {
      return NextResponse.json(
        { error: "invoiceDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    // Atomically create invoice + items + bump product stock
    const created = await db.$transaction(async (tx) => {
      const itemsCreate: Prisma.SupplierInvoiceItemCreateWithoutInvoiceInput[] =
        normalizedItems.map((i) => {
          const item: Prisma.SupplierInvoiceItemCreateWithoutInvoiceInput = {
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          };
          if (i.productId) {
            item.product = { connect: { id: i.productId } };
          }
          return item;
        });

      const invoice = await tx.supplierInvoice.create({
        data: {
          invoiceNo: body.invoiceNo,
          invoiceDate,
          totalAmount,
          paidAmount,
          status,
          notes: body.notes ?? "",
          store: { connect: { id: session.storeId } },
          supplier: { connect: { id: supplierId } },
          items: { create: itemsCreate },
        },
        include: { items: true, supplier: true },
      });

      // Increment stock for each item that has a productId
      for (const item of normalizedItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return invoice;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/supplier-invoices");
  }
}
