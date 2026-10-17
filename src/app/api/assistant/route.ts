import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { formatDate } from "@/lib/format";

interface AssistantRequest {
  query: string;
}

export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as AssistantRequest;
    const query = (body.query || "").trim();

    if (!query) {
      return NextResponse.json(
        { error: "Query string is required" },
        { status: 400 }
      );
    }

    // 1. Gather all live store facts & figures from the database
    const store = await db.store.findUnique({
      where: { id: session.storeId },
      select: { name: true, currency: true },
    });
    const currency = store?.currency || "دج";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const inSevenDays = new Date(now);
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    // Queries executed concurrently for performance
    const [
      todaySales,
      allProducts,
      todayExpenses,
      batches,
      supplierInvoices,
      customersWithCredit,
      activeSession,
      recentTopSaleItems,
    ] = await Promise.all([
      // Sales today with items
      db.sale.findMany({
        where: {
          storeId: session.storeId,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        include: { items: true },
      }),
      // All products
      db.product.findMany({
        where: { storeId: session.storeId },
        select: {
          id: true,
          name: true,
          barcode: true,
          price: true,
          costPrice: true,
          stock: true,
          minStock: true,
          category: true,
        },
      }),
      // Expenses today
      db.expense.findMany({
        where: {
          storeId: session.storeId,
          expenseDate: { gte: startOfToday, lte: endOfToday },
        },
      }),
      // Batches
      db.productBatch.findMany({
        where: {
          storeId: session.storeId,
          status: "ACTIVE",
          quantity: { gt: 0 },
        },
        include: {
          product: { select: { name: true, price: true, costPrice: true } },
        },
      }),
      // Unpaid supplier invoices
      db.supplierInvoice.findMany({
        where: {
          storeId: session.storeId,
          status: { in: ["UNPAID", "PARTIAL"] },
        },
        include: {
          supplier: { select: { name: true, phone: true } },
        },
      }),
      // Customers with debt
      db.customer.findMany({
        where: { storeId: session.storeId },
        include: {
          sales: {
            where: { paymentMethod: "CREDIT" },
            select: { total: true },
          },
          payments: {
            select: { amount: true },
          },
        },
      }),
      // Active cash session
      db.cashSession.findFirst({
        where: { storeId: session.storeId, status: "OPEN" },
        include: {
          user: { select: { name: true, email: true } },
          transactions: true,
          expenses: true,
        },
      }),
      // Top items sold in last 7 days
      db.saleItem.findMany({
        where: {
          sale: {
            storeId: session.storeId,
            createdAt: { gte: sevenDaysAgo },
          },
        },
        select: {
          productName: true,
          quantity: true,
          total: true,
        },
      }),
    ]);

    // Financial calculations
    const todaySalesCount = todaySales.length;
    const todayNetSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayDiscounts = todaySales.reduce((sum, s) => sum + s.discount, 0);

    // Cost of goods sold for today
    const productCostMap = new Map<string, number>();
    allProducts.forEach((p) => {
      productCostMap.set(p.name, p.costPrice > 0 ? p.costPrice : p.price * 0.75);
    });

    let todayCogs = 0;
    todaySales.forEach((s) => {
      s.items.forEach((item) => {
        const cost = productCostMap.get(item.productName) ?? item.unitPrice * 0.75;
        todayCogs += cost * item.quantity;
      });
    });

    const todayGrossProfit = Math.max(0, todayNetSales - todayCogs);
    const todayOperatingExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayNetOperatingProfit = todayGrossProfit - todayOperatingExpenses;

    // Inventory status
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + p.price * p.stock, 0);
    const outOfStockProducts = allProducts.filter((p) => p.stock <= 0);
    const lowStockProducts = allProducts.filter(
      (p) => p.stock > 0 && p.stock <= (p.minStock ?? 5)
    );

    // Batches status
    const expiredBatches = batches.filter((b) => new Date(b.expiryDate) < now);
    const nearExpiryBatches = batches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp >= now && exp <= inSevenDays;
    });
    const atRiskValue = [...expiredBatches, ...nearExpiryBatches].reduce((sum, b) => {
      const unitVal = b.costPrice > 0 ? b.costPrice : (b.product?.costPrice || b.product?.price || 0);
      return sum + unitVal * b.quantity;
    }, 0);

    // Supplier debt calculations
    const totalSupplierDebt = supplierInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0
    );
    const overdueSupplierInvoices = supplierInvoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now
    );

    // Customer receivables calculations
    const customerDebtList = customersWithCredit
      .map((c) => {
        const creditSales = c.sales.reduce((sum, s) => sum + s.total, 0);
        const payments = c.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = Math.max(0, creditSales - payments);
        return { name: c.name, phone: c.phone, balance };
      })
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const totalCustomerDebt = customerDebtList.reduce((sum, c) => sum + c.balance, 0);

    // Cash drawer balance
    let expectedDrawerCash = 0;
    if (activeSession) {
      let cashIn = activeSession.openingCash;
      // Cash sales during session
      const sessionCashSales = todaySales
        .filter((s) => s.paymentMethod === "Cash" && s.createdAt >= activeSession.openedAt)
        .reduce((sum, s) => sum + s.total, 0);
      cashIn += sessionCashSales;

      // Transactions
      activeSession.transactions.forEach((tx) => {
        if (tx.type === "DEPOSIT") cashIn += tx.amount;
        if (tx.type === "WITHDRAWAL") cashIn -= tx.amount;
      });

      // Session cash expenses
      const cashExpenses = activeSession.expenses
        .filter((e) => e.paymentMethod === "Cash")
        .reduce((sum, e) => sum + e.amount, 0);
      cashIn -= cashExpenses;

      expectedDrawerCash = cashIn;
    }

    // Top selling items aggregation
    const topItemMap = new Map<string, { qty: number; rev: number }>();
    recentTopSaleItems.forEach((it) => {
      const ex = topItemMap.get(it.productName) ?? { qty: 0, rev: 0 };
      ex.qty += it.quantity;
      ex.rev += it.total;
      topItemMap.set(it.productName, ex);
    });
    const topSellingList = Array.from(topItemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Format money helper
    const fmt = (val: number) => `${val.toLocaleString("ar-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

    // 2. Classify intent and synthesize grounded factual answer
    const q = query.toLowerCase();

    let answer = "";
    const suggestedQuestions: string[] = [];

    const isAskingSales = /مبيع|دخل|إيراد|بيع|ربح|أرباح|مالي|أداء|اليوم|كم بعنا|شحال بعنا/.test(q);
    const isAskingStock = /مخزون|سلع|منتج|ناقص|نفد|متوفر|كميات|ستوك/.test(q);
    const isAskingExpiry = /صلاحية|منتهي|دفعات|تاريخ|تالف|فسد/.test(q);
    const isAskingSuppliers = /مورد|فواتير|فاتورة|شراء|تزويد|ديون الموردين/.test(q);
    const isAskingCustomers = /زبون|زبائن|عميل|عملاء|كريدي|آجل|ديون الزبائن|تسديد/.test(q);
    const isAskingDrawer = /صندوق|درج|وردية|كاشير|نقود|كاش/.test(q);
    const isAskingSummary = /ملخص|تقرير|نظرة|شامل|كيف الحال|وضع المتجر|الوضع العام/.test(q);

    if (isAskingSales || isAskingSummary) {
      answer += `### 📊 التقرير والأداء المالي لليوم (${formatDate(now)}):\n\n`;
      answer += `- **إجمالي المبيعات الصافية**: **${fmt(todayNetSales)}** (من واقع **${todaySalesCount}** عملية بيع).\n`;
      answer += `- **تكلفة البضاعة المباعة (COGS)**: ${fmt(todayCogs)}.\n`;
      answer += `- **إجمالي الربح الإجمالي (Gross Profit)**: **${fmt(todayGrossProfit)}** (${todayNetSales > 0 ? ((todayGrossProfit / todayNetSales) * 100).toFixed(1) : 0}%).\n`;
      answer += `- **المصاريف التشغيلية اليوم**: ${fmt(todayOperatingExpenses)} (${todayExpenses.length} بنود مصروفات).\n`;
      answer += `- **صافي الربح التشغيلي**: **${fmt(todayNetOperatingProfit)}** (${todayNetSales > 0 ? ((todayNetOperatingProfit / todayNetSales) * 100).toFixed(1) : 0}%).\n\n`;

      if (todayDiscounts > 0) {
        answer += `> 💡 تم منح تخفيضات إجمالية اليوم بقيمة **${fmt(todayDiscounts)}**.\n\n`;
      }
    }

    if (isAskingStock || isAskingSummary) {
      answer += `### 📦 حالة المخزون والمنتجات:\n\n`;
      answer += `- **إجمالي القيمة التقديرية للمخزون الحالي**: **${fmt(totalInventoryValue)}** عبر **${allProducts.length}** منتج.\n`;
      answer += `- **منتجات نفدت بالكامل (0 قطع)**: **${outOfStockProducts.length}** منتج.\n`;
      if (outOfStockProducts.length > 0) {
        answer += `  - قائمة النافد: ${outOfStockProducts.slice(0, 5).map((p) => `\`${p.name}\``).join("، ")}${outOfStockProducts.length > 5 ? ` و${outOfStockProducts.length - 5} منتجات أخرى` : ""}.\n`;
      }
      answer += `- **منتجات قاربت على النفاد (أقل من الحد الأدنى)**: **${lowStockProducts.length}** منتج.\n`;
      if (lowStockProducts.length > 0) {
        answer += `  - أبرزها: ${lowStockProducts.slice(0, 5).map((p) => `\`${p.name}\` (متبقي ${p.stock} / حده ${p.minStock})`).join("، ")}.\n\n`;
      }
    }

    if (isAskingExpiry || isAskingSummary) {
      answer += `### ⏳ صلاحية المنتجات والدفعات:\n\n`;
      answer += `- **دفعات منتهية الصلاحية تماماً**: **${expiredBatches.length}** دفعة.\n`;
      answer += `- **دفعات توشك على الانتهاء (خلال 7 أيام)**: **${nearExpiryBatches.length}** دفعة.\n`;
      answer += `- **قيمة المخزون المعرض للتلف والانتهاء**: **${fmt(atRiskValue)}**.\n`;
      if (nearExpiryBatches.length > 0) {
        answer += `  - دفعات قريبة الانتهاء: ${nearExpiryBatches.slice(0, 3).map((b) => `\`${b.product?.name}\` (رقم ${b.batchNumber}، تنتهي: ${formatDate(b.expiryDate)})`).join("، ")}.\n`;
      }
      answer += "\n";
    }

    if (isAskingSuppliers || isAskingSummary) {
      answer += `### 🚚 فواتير الموردين والمستحقات:\n\n`;
      answer += `- **إجمالي فواتير الموردين غير المسددة**: **${supplierInvoices.length}** فاتورة.\n`;
      answer += `- **إجمالي المبلغ المستحق للموردين**: **${fmt(totalSupplierDebt)}**.\n`;
      answer += `- **فواتير تجاوزت موعد الاستحقاق (Overdue)**: **${overdueSupplierInvoices.length}** فاتورة.\n`;
      if (overdueSupplierInvoices.length > 0) {
        answer += `  - أبرز المتأخرات: ${overdueSupplierInvoices.slice(0, 3).map((inv) => `فاتورة \`${inv.invoiceNo}\` للمورد \`${inv.supplier?.name}\` بمبلغ ${fmt(inv.totalAmount - inv.paidAmount)}`).join("، ")}.\n`;
      }
      answer += "\n";
    }

    if (isAskingCustomers || isAskingSummary) {
      answer += `### 👥 ديون الزبائن والبيع بالآجل:\n\n`;
      answer += `- **عدد الزبائن المدينين**: **${customerDebtList.length}** زبون.\n`;
      answer += `- **إجمالي ديون الزبائن المعلقة**: **${fmt(totalCustomerDebt)}**.\n`;
      if (customerDebtList.length > 0) {
        answer += `  - كبار المدينين: ${customerDebtList.slice(0, 3).map((c) => `\`${c.name}\` (${fmt(c.balance)})`).join("، ")}.\n`;
      }
      answer += "\n";
    }

    if (isAskingDrawer || isAskingSummary) {
      answer += `### 💼 صندوق الكاشير والوردية الحالية:\n\n`;
      if (activeSession) {
        answer += `- **حالة الوردية**: 🟢 **مفتوحة** (المسؤول: **${activeSession.user?.name || "المسؤول"}**).\n`;
        answer += `- **تاريخ ووقت الفتح**: ${new Date(activeSession.openedAt).toLocaleTimeString("ar-DZ")}.\n`;
        answer += `- **رصيد الصندوق الافتتاحي**: ${fmt(activeSession.openingCash)}.\n`;
        answer += `- **المبلغ المتوقع وجوده في الصندوق حالياً**: **${fmt(expectedDrawerCash)}**.\n\n`;
      } else {
        answer += `- **حالة الوردية**: ⚪ **مغلقة حالياً** (لا توجد جلسة صندوق نشطة الآن).\n\n`;
      }
    }

    // If query was generic or didn't hit specific keywords
    if (!answer) {
      answer += `أهلاً بك! إليك ملخص حي وفوري لمتجر **${store?.name || "Gestiona Pro"}** استناداً لقاعدة البيانات:\n\n`;
      answer += `- 💰 **مبيعات اليوم**: ${fmt(todayNetSales)} (${todaySalesCount} فواتير).\n`;
      answer += `- 📈 **صافي ربح اليوم**: ${fmt(todayNetOperatingProfit)}.\n`;
      answer += `- ⚠️ **تنبيهات المخزون**: ${outOfStockProducts.length} نافد، ${lowStockProducts.length} قارب على النفاد.\n`;
      answer += `- ⏳ **دفعات توشك على الانتهاء**: ${nearExpiryBatches.length} دفعات.\n`;
      answer += `- 🚚 **مستحقات الموردين المعلقة**: ${fmt(totalSupplierDebt)}.\n`;
      answer += `- 👥 **ديون الزبائن المعلقة**: ${fmt(totalCustomerDebt)}.\n`;
      answer += activeSession
        ? `- 💼 **الصندوق النشط**: ${fmt(expectedDrawerCash)} بعهدة ${activeSession.user?.name || "المسؤول"}.\n`
        : `- 💼 **الصندوق**: لا توجد وردية مفتوحة حالياً.\n`;
    }

    // Add smart actionable tip
    if (outOfStockProducts.length > 0 || nearExpiryBatches.length > 0 || overdueSupplierInvoices.length > 0) {
      answer += `\n> 🎯 **توصية تشغيلية سريعة**:\n`;
      if (outOfStockProducts.length > 0) {
        answer += `> - يتوجب عمل طلبية شراء عاجلة لتغطية المنتجات النافدة (\`${outOfStockProducts[0]?.name}\`).\n`;
      }
      if (nearExpiryBatches.length > 0) {
        answer += `> - يُنصح بتطبيق عرض ترويجي على الدفعات القريبة من الانتهاء لتفادي خسارة **${fmt(atRiskValue)}**.\n`;
      }
      if (overdueSupplierInvoices.length > 0) {
        answer += `> - هناك فواتير موردين متأخرة يفضل جدولتها للحفاظ على تسهيلات التوريد.\n`;
      }
    }

    // Dynamic suggested questions
    suggestedQuestions.push(
      "ما هي المنتجات الأكثر مبيعاً هذا الأسبوع؟",
      "كم هي أرباحنا ومصاريفنا اليوم؟",
      "من هم الزبائن الذين لديهم ديون معلقة؟",
      "ما هي فواتير الموردين المتأخرة؟",
      "ما هي المنتجات التي أوشكت على النفاد؟"
    );

    return NextResponse.json({
      answer,
      metrics: {
        todayNetSales,
        todayGrossProfit,
        todayOperatingExpenses,
        todayNetOperatingProfit,
        totalInventoryValue,
        outOfStockCount: outOfStockProducts.length,
        lowStockCount: lowStockProducts.length,
        nearExpiryBatchesCount: nearExpiryBatches.length,
        totalSupplierDebt,
        totalCustomerDebt,
        isShiftOpen: !!activeSession,
        expectedDrawerCash,
      },
      topSelling: topSellingList,
      suggestedQuestions,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/assistant");
  }
}
