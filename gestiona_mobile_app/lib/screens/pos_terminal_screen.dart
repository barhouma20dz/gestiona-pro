import 'dart:math';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class PosTerminalScreen extends StatefulWidget {
  final String cashierName;
  final String storeName;
  final Function(SaleInvoice) onSaleCompleted;

  const PosTerminalScreen({
    super.key,
    required this.cashierName,
    required this.storeName,
    required this.onSaleCompleted,
  });

  @override
  State<PosTerminalScreen> createState() => _PosTerminalScreenState();
}

class _PosTerminalScreenState extends State<PosTerminalScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'الكل';
  final Map<String, int> _cartQuantities = {};

  final List<ProductItem> _products = [
    ProductItem(id: 'p1', name: 'خبز عادي طازج', price: 15.0, category: 'مخبوزات', emoji: '🥖', stockQuantity: 120),
    ProductItem(id: 'p2', name: 'حليب مبستر كونديا 1 لتر', price: 125.0, category: 'مشتقات الحليب', emoji: '🥛', stockQuantity: 45),
    ProductItem(id: 'p3', name: 'بيض مائدة طازج (حبة)', price: 25.0, category: 'بيض ودواجن', emoji: '🥚', stockQuantity: 180),
    ProductItem(id: 'p4', name: 'قهوة ساخنة سريعة', price: 60.0, category: 'مشروبات', emoji: '☕', stockQuantity: 90),
    ProductItem(id: 'p5', name: 'ماء معدني لالة خديجة 1.5 لتر', price: 40.0, category: 'مشروبات', emoji: '💧', stockQuantity: 85),
    ProductItem(id: 'p6', name: 'زيت مائدة صافي 5 لتر', price: 650.0, category: 'مواد عامة', emoji: '🫒', stockQuantity: 30),
    ProductItem(id: 'p7', name: 'سكر أبيض نقي 1 كلغ', price: 95.0, category: 'مواد عامة', emoji: '🧂', stockQuantity: 60),
    ProductItem(id: 'p8', name: 'بطاطا استهلاك محلي 1 كلغ', price: 85.0, category: 'خضر وفواكه', emoji: '🥔', stockQuantity: 150),
    ProductItem(id: 'p9', name: 'طماطم طازجة 1 كلغ', price: 130.0, category: 'خضر وفواكه', emoji: '🍅', stockQuantity: 70),
    ProductItem(id: 'p10', name: 'تفاح أحمر محلي 1 كلغ', price: 320.0, category: 'خضر وفواكه', emoji: '🍎', stockQuantity: 40),
    ProductItem(id: 'p11', name: 'ياغورت فواكه دانون', price: 35.0, category: 'مشتقات الحليب', emoji: '🫐', stockQuantity: 95),
    ProductItem(id: 'p12', name: 'جبن مثلثات لافاش كيري (8 قطع)', price: 190.0, category: 'مشتقات الحليب', emoji: '🧀', stockQuantity: 50),
    ProductItem(id: 'p13', name: 'عصير برتقال رامي 1.25 لتر', price: 160.0, category: 'مشروبات', emoji: '🧃', stockQuantity: 65),
    ProductItem(id: 'p14', name: 'شوكولاتة ميراندا محشوة', price: 70.0, category: 'حلويات', emoji: '🍫', stockQuantity: 110),
    ProductItem(id: 'p15', name: 'صابون غسيل أواني إيزيس 1 لتر', price: 210.0, category: 'منظفات', emoji: '🧼', stockQuantity: 40),
    ProductItem(id: 'p16', name: 'علكة بالنعناع منتوس', price: 20.0, category: 'حلويات', emoji: '🍬', stockQuantity: 200),
  ];

  final List<String> _categories = [
    'الكل',
    'مواد عامة',
    'مشروبات',
    'مشتقات الحليب',
    'مخبوزات',
    'خضر وفواكه',
    'حلويات',
    'منظفات',
    'بيض ودواجن',
  ];

  List<ProductItem> get _filteredProducts {
    final query = _searchController.text.trim().toLowerCase();
    return _products.where((p) {
      final matchesCategory =
          _selectedCategory == 'الكل' || p.category == _selectedCategory;
      final matchesQuery = query.isEmpty ||
          p.name.toLowerCase().contains(query) ||
          p.category.toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList();
  }

  int get _totalCartItemsCount {
    return _cartQuantities.values.fold(0, (sum, qty) => sum + qty);
  }

  double get _totalCartAmount {
    double total = 0.0;
    for (var entry in _cartQuantities.entries) {
      final product = _products.firstWhere((p) => p.id == entry.key);
      total += product.price * entry.value;
    }
    return total;
  }

  void _addToCart(ProductItem product) {
    setState(() {
      _cartQuantities[product.id] = (_cartQuantities[product.id] ?? 0) + 1;
    });
  }

  void _removeFromCart(String productId) {
    setState(() {
      final current = _cartQuantities[productId] ?? 0;
      if (current > 1) {
        _cartQuantities[productId] = current - 1;
      } else {
        _cartQuantities.remove(productId);
      }
    });
  }

  void _deleteFromCart(String productId) {
    setState(() {
      _cartQuantities.remove(productId);
    });
  }

  void _clearCart() {
    setState(() {
      _cartQuantities.clear();
    });
  }

  void _showAddCustomItemDialog() {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.add_shopping_cart, color: AppColors.primary),
              SizedBox(width: 8),
              Text(
                'إضافة منتج يدوي سريع',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                textAlign: TextAlign.right,
                decoration: const InputDecoration(
                  labelText: 'اسم المنتج أو الخدمة',
                  hintText: 'مثال: سلعة بدون باركود',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: priceCtrl,
                textAlign: TextAlign.right,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'السعر بالدينار الجزائري (د.ج)',
                  hintText: '0.00',
                  prefixText: 'د.ج ',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () {
                final name = nameCtrl.text.trim();
                final price = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
                if (name.isNotEmpty && price > 0) {
                  final newProd = ProductItem(
                    id: 'custom_${DateTime.now().millisecondsSinceEpoch}',
                    name: name,
                    price: price,
                    category: 'يدوي',
                    emoji: '🏷️',
                    stockQuantity: 99,
                  );
                  setState(() {
                    _products.insert(0, newProd);
                    _addToCart(newProd);
                  });
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: AppColors.primaryDark,
                      content: Text('✓ تمت إضافة $name إلى السلة'),
                    ),
                  );
                }
              },
              child: const Text('إضافة للسلة'),
            ),
          ],
        );
      },
    );
  }

  void _showCartBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final cartItems = _cartQuantities.entries.map((e) {
              final prod = _products.firstWhere((p) => p.id == e.key);
              return CartItem(product: prod, quantity: e.value);
            }).toList();

            final subtotal = cartItems.fold(0.0, (sum, i) => sum + i.total);
            double discount = 0.0;
            String paymentMethod = 'cash';
            String selectedCustomer = 'زبون نقدي عام';

            final paidController = TextEditingController(
              text: subtotal.toStringAsFixed(0),
            );

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black45,
                    blurRadius: 20,
                    offset: Offset(0, -5),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Header Handle
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 8),
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),

                  // Sheet Title
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 22),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'سلة المبيعات ($_totalCartItemsCount عناصر)',
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        TextButton.icon(
                          onPressed: () {
                            _clearCart();
                            Navigator.pop(ctx);
                          },
                          icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.accentRose, size: 18),
                          label: const Text(
                            'تفريغ السلة',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              color: AppColors.accentRose,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Divider(color: AppColors.borderSubtle, height: 1),

                  // Cart Item List
                  Expanded(
                    child: cartItems.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.remove_shopping_cart_outlined, size: 56, color: AppColors.textMuted),
                                SizedBox(height: 12),
                                Text(
                                  'السلة فارغة حالياً',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 15,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            itemCount: cartItems.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = cartItems[index];
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppColors.borderSubtle),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 42,
                                      height: 42,
                                      decoration: BoxDecoration(
                                        color: AppColors.surfaceElevated,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(item.product.emoji, style: const TextStyle(fontSize: 22)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item.product.name,
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: AppColors.textPrimary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            CurrencyHelper.format(item.product.price),
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              color: AppColors.primaryLight,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Stepper
                                    Container(
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: AppColors.border),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.remove, size: 16, color: AppColors.textSecondary),
                                            onPressed: () {
                                              _removeFromCart(item.product.id);
                                              setSheetState(() {});
                                              setState(() {});
                                            },
                                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                            padding: EdgeInsets.zero,
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 6),
                                            child: Text(
                                              '${item.quantity}',
                                              style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.add, size: 16, color: AppColors.primary),
                                            onPressed: () {
                                              _addToCart(item.product);
                                              setSheetState(() {});
                                              setState(() {});
                                            },
                                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                            padding: EdgeInsets.zero,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    IconButton(
                                      icon: const Icon(Icons.close, size: 18, color: AppColors.accentRose),
                                      onPressed: () {
                                        _deleteFromCart(item.product.id);
                                        setSheetState(() {});
                                        setState(() {});
                                      },
                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                      padding: EdgeInsets.zero,
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),

                  // Checkout Details & Confirm
                  if (cartItems.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: const BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                        border: Border(top: BorderSide(color: AppColors.border)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Total summary row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'المجموع النهائي:',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              Text(
                                CurrencyHelper.format(subtotal),
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Action Button: Complete Sale
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: () {
                                final paid = double.tryParse(paidController.text.trim()) ?? subtotal;
                                final change = max(0.0, paid - subtotal);
                                final randId = '${1000 + Random().nextInt(9000)}';
                                final invoiceNumber = 'INV-${DateTime.now().year}-$randId';

                                final invoice = SaleInvoice(
                                  id: 'inv_${DateTime.now().millisecondsSinceEpoch}',
                                  invoiceNumber: invoiceNumber,
                                  date: DateTime.now(),
                                  customerName: selectedCustomer,
                                  items: List.from(cartItems),
                                  subtotal: subtotal,
                                  discount: discount,
                                  total: subtotal - discount,
                                  paidAmount: paid,
                                  changeAmount: change,
                                  paymentMethod: paymentMethod,
                                  cashierName: widget.cashierName,
                                );

                                widget.onSaleCompleted(invoice);
                                _clearCart();
                                Navigator.pop(ctx);

                                _showThermalReceiptModal(invoice);
                              },
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.print_outlined, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'تأكيد البيع وطباعة الإيصال الحراري',
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showThermalReceiptModal(SaleInvoice invoice) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Thermal Receipt Header
                const Icon(Icons.receipt_long, size: 38, color: Colors.black87),
                const SizedBox(height: 6),
                Text(
                  widget.storeName,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const Text(
                  'نقطة البيع الذكية — Gestiona Pro POS',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(height: 10),
                const Text('------------------------------------------------', style: TextStyle(color: Colors.black38)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('رقم الفاتورة: ${invoice.invoiceNumber}', style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.bold)),
                    Text('${invoice.date.hour}:${invoice.date.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('البائع: ${invoice.cashierName}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                    Text('العميل: ${invoice.customerName}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  ],
                ),
                const Text('------------------------------------------------', style: TextStyle(color: Colors.black38)),

                // Table of items
                ...invoice.items.map((it) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${it.product.name} × ${it.quantity}',
                            style: const TextStyle(fontSize: 12, color: Colors.black, fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          CurrencyHelper.format(it.total),
                          style: const TextStyle(fontSize: 12, color: Colors.black, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  );
                }),

                const Text('------------------------------------------------', style: TextStyle(color: Colors.black38)),

                // Summary
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('المجموع الإجمالي:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black)),
                    Text(CurrencyHelper.format(invoice.total), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
                  ],
                ),
                if (invoice.paidAmount > invoice.total) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('المبلغ المدفوع:', style: TextStyle(fontSize: 11, color: Colors.black87)),
                      Text(CurrencyHelper.format(invoice.paidAmount), style: const TextStyle(fontSize: 11, color: Colors.black87)),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('الباقي المسترجع:', style: TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.bold)),
                      Text(CurrencyHelper.format(invoice.changeAmount), style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],

                const SizedBox(height: 12),
                const Text(
                  'شكراً لزيارتكم ونسعد بخدمتكم دائماً!',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Colors.black54),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // Dialog Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black87,
                          side: const BorderSide(color: Colors.black26),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close, size: 16),
                        label: const Text('إغلاق', style: TextStyle(fontFamily: 'Cairo')),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: Color(0xFF059669),
                              content: Text('✓ تم إرسال أمر الطباعة إلى الطابعة الحرارية'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 16),
                        label: const Text('طباعة', style: TextStyle(fontFamily: 'Cairo')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredProducts;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.point_of_sale_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 8),
            const Text('نقطة البيع السريعة POS', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box_outlined, color: AppColors.primaryLight),
            tooltip: 'إضافة منتج يدوي',
            onPressed: _showAddCustomItemDialog,
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppColors.textPrimary),
            tooltip: 'مسح باركود',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: AppColors.primaryDark,
                  content: Text('📷 الماسح الضوئي نشط للتعرف على باركود المنتجات'),
                ),
              );
            },
          ),
        ],
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          children: [
            // Search Bar & Filter
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'ابحث باسم المنتج أو الباركود...',
                  prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                ),
              ),
            ),

            // Category Chips Carousel
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _categories.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategory == cat;
                  return ChoiceChip(
                    label: Text(
                      cat,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surface,
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.border,
                    ),
                    onSelected: (val) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                    },
                  );
                },
              ),
            ),

            const SizedBox(height: 8),

            // Product Grid
            Expanded(
              child: filtered.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inventory_2_outlined, size: 52, color: AppColors.textMuted),
                          SizedBox(height: 12),
                          Text(
                            'لا توجد منتجات مطابقة للبحث',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.78,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final product = filtered[index];
                        final inCartQty = _cartQuantities[product.id] ?? 0;

                        return InkWell(
                          onTap: () => _addToCart(product),
                          borderRadius: BorderRadius.circular(18),
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: inCartQty > 0 ? AppColors.primary : AppColors.borderSubtle,
                                width: inCartQty > 0 ? 1.5 : 1,
                              ),
                            ),
                            child: Stack(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Emoji & Category
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            width: 48,
                                            height: 48,
                                            decoration: BoxDecoration(
                                              color: AppColors.surfaceLight,
                                              borderRadius: BorderRadius.circular(14),
                                            ),
                                            alignment: Alignment.center,
                                            child: Text(product.emoji, style: const TextStyle(fontSize: 26)),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: AppColors.surfaceLight,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              product.category,
                                              style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                fontSize: 10,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Spacer(),
                                      // Product Name
                                      Text(
                                        product.name,
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: AppColors.textPrimary,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 6),
                                      // Price & Add Button
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            CurrencyHelper.format(product.price),
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primaryLight,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: BoxDecoration(
                                              color: inCartQty > 0
                                                  ? AppColors.primary
                                                  : AppColors.surfaceLight,
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              Icons.add,
                                              size: 16,
                                              color: inCartQty > 0 ? Colors.white : AppColors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                // In-Cart Badge Indicator
                                if (inCartQty > 0)
                                  Positioned(
                                    top: 8,
                                    left: 8,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(10),
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(alpha: 0.4),
                                            blurRadius: 6,
                                          ),
                                        ],
                                      ),
                                      child: Text(
                                        '×$inCartQty',
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      // Floating Cart Bottom Bar
      bottomSheet: _totalCartItemsCount > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                border: const Border(top: BorderSide(color: AppColors.border)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Directionality(
                textDirection: TextDirection.rtl,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shopping_cart, color: AppColors.primary, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            '$_totalCartItemsCount',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'المجموع:',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                          Text(
                            CurrencyHelper.format(_totalCartAmount),
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _showCartBottomSheet,
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('إتمام الدفع', style: TextStyle(fontWeight: FontWeight.bold)),
                          SizedBox(width: 6),
                          Icon(Icons.arrow_forward_ios, size: 14),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
