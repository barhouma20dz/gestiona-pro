import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class SalesHistoryScreen extends StatefulWidget {
  final List<SaleInvoice> sales;
  final String storeName;

  const SalesHistoryScreen({
    super.key,
    required this.sales,
    required this.storeName,
  });

  @override
  State<SalesHistoryScreen> createState() => _SalesHistoryScreenState();
}

class _SalesHistoryScreenState extends State<SalesHistoryScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _selectedFilter = 'الكل';

  double get _todayTotalSales {
    return widget.sales.fold(0.0, (sum, inv) => sum + inv.total);
  }

  int get _todayInvoicesCount => widget.sales.length;

  double get _averageInvoiceValue =>
      _todayInvoicesCount > 0 ? _todayTotalSales / _todayInvoicesCount : 0.0;

  List<SaleInvoice> get _filteredSales {
    final query = _searchCtrl.text.trim().toLowerCase();
    return widget.sales.where((inv) {
      final matchesQuery = query.isEmpty ||
          inv.invoiceNumber.toLowerCase().contains(query) ||
          inv.customerName.toLowerCase().contains(query);

      final matchesFilter = _selectedFilter == 'الكل' ||
          (_selectedFilter == 'نقداً' && inv.paymentMethod == 'cash') ||
          (_selectedFilter == 'بطاقة' && inv.paymentMethod == 'card') ||
          (_selectedFilter == 'أجل' && inv.paymentMethod == 'credit');

      return matchesQuery && matchesFilter;
    }).toList();
  }

  void _showInvoiceDetails(SaleInvoice invoice) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Icon(Icons.receipt_long, size: 36, color: Colors.black87),
                const SizedBox(height: 6),
                Text(
                  widget.storeName,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                Text(
                  'تفاصيل الفاتورة #${invoice.invoiceNumber}',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(height: 10),
                const Text('--------------------------------------------', style: TextStyle(color: Colors.black26)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('التاريخ: ${invoice.date.year}/${invoice.date.month}/${invoice.date.day}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                    Text('${invoice.date.hour}:${invoice.date.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('العميل: ${invoice.customerName}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                    Text('البائع: ${invoice.cashierName}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                  ],
                ),
                const Text('--------------------------------------------', style: TextStyle(color: Colors.black26)),

                // Item list
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

                const Text('--------------------------------------------', style: TextStyle(color: Colors.black26)),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('المجموع الكلي:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black)),
                    Text(CurrencyHelper.format(invoice.total), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('إغلاق', style: TextStyle(color: Colors.black87)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                        ),
                        onPressed: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: Color(0xFF059669),
                              content: Text('✓ جاري إعادة طباعة الإيصال الحراري...'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 16),
                        label: const Text('إعادة طباعة'),
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
    final filtered = _filteredSales;

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
              child: const Icon(Icons.receipt_long, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 8),
            const Text('سجل الفواتير والمبيعات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          children: [
            // KPI Summary Row
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      title: 'مبيعات اليوم',
                      value: CurrencyHelper.format(_todayTotalSales),
                      icon: Icons.payments_outlined,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildKpiCard(
                      title: 'عدد الفواتير',
                      value: '$_todayInvoicesCount فاتورة',
                      icon: Icons.receipt_outlined,
                      color: AppColors.accentSky,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildKpiCard(
                      title: 'متوسط الفاتورة',
                      value: CurrencyHelper.format(_averageInvoiceValue),
                      icon: Icons.trending_up,
                      color: AppColors.accentAmber,
                    ),
                  ),
                ],
              ),
            ),

            // Search & Filter
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: 'ابحث برقم الفاتورة أو العميل...',
                        prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        suffixIcon: _searchCtrl.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 16),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() {});
                                },
                              )
                            : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Filter Chips
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: ['الكل', 'نقداً', 'بطاقة', 'أجل'].map((filter) {
                  final isSel = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: ChoiceChip(
                      label: Text(
                        filter,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                          color: isSel ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                      selected: isSel,
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.surface,
                      side: BorderSide(color: isSel ? AppColors.primary : AppColors.border),
                      onSelected: (val) {
                        setState(() {
                          _selectedFilter = filter;
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 8),

            // Invoices List
            Expanded(
              child: filtered.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_outlined, size: 52, color: AppColors.textMuted),
                          SizedBox(height: 12),
                          Text(
                            'لا توجد فواتير مسجلة حتى الآن',
                            style: TextStyle(fontFamily: 'Cairo', color: AppColors.textSecondary, fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                      itemCount: filtered.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final invoice = filtered[index];
                        final timeStr =
                            '${invoice.date.hour}:${invoice.date.minute.toString().padLeft(2, '0')}';

                        return InkWell(
                          onTap: () => _showInvoiceDetails(invoice),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.receipt_long, color: AppColors.primaryLight, size: 24),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            invoice.invoiceNumber,
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          Text(
                                            timeStr,
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontSize: 11,
                                              color: AppColors.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${invoice.customerName} • ${invoice.items.length} أصناف',
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontSize: 12,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                          Text(
                                            CurrencyHelper.format(invoice.total),
                                            style: const TextStyle(
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: AppColors.primaryLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_back_ios_new, size: 14, color: AppColors.textMuted),
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
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 10,
                    color: AppColors.textMuted,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.bold,
              fontSize: 12,
              color: AppColors.textPrimary,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
