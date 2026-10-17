import 'dart:convert';

class ProductItem {
  final String id;
  final String name;
  final double price;
  final double costPrice;
  final String category;
  final String emoji;
  final String barcode;
  final int stockQuantity;
  final String unit;

  ProductItem({
    required this.id,
    required this.name,
    required this.price,
    this.costPrice = 0.0,
    required this.category,
    required this.emoji,
    this.barcode = '',
    this.stockQuantity = 50,
    this.unit = 'قطعة',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'costPrice': costPrice,
      'category': category,
      'emoji': emoji,
      'barcode': barcode,
      'stockQuantity': stockQuantity,
      'unit': unit,
    };
  }

  factory ProductItem.fromMap(Map<String, dynamic> map) {
    return ProductItem(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      costPrice: (map['costPrice'] as num?)?.toDouble() ?? 0.0,
      category: map['category'] ?? 'عام',
      emoji: map['emoji'] ?? '📦',
      barcode: map['barcode'] ?? '',
      stockQuantity: (map['stockQuantity'] as num?)?.toInt() ?? 50,
      unit: map['unit'] ?? 'قطعة',
    );
  }
}

class CartItem {
  final ProductItem product;
  int quantity;

  CartItem({
    required this.product,
    this.quantity = 1,
  });

  double get total => product.price * quantity;

  Map<String, dynamic> toMap() {
    return {
      'product': product.toMap(),
      'quantity': quantity,
      'total': total,
    };
  }

  factory CartItem.fromMap(Map<String, dynamic> map) {
    return CartItem(
      product: ProductItem.fromMap(Map<String, dynamic>.from(map['product'] ?? {})),
      quantity: (map['quantity'] as num?)?.toInt() ?? 1,
    );
  }
}

class SaleInvoice {
  final String id;
  final String invoiceNumber;
  final DateTime date;
  final String customerName;
  final List<CartItem> items;
  final double subtotal;
  final double discount;
  final double total;
  final double paidAmount;
  final double changeAmount;
  final String paymentMethod; // 'cash', 'card', 'credit'
  final String status; // 'completed', 'refunded'
  final String cashierName;

  SaleInvoice({
    required this.id,
    required this.invoiceNumber,
    required this.date,
    required this.customerName,
    required this.items,
    required this.subtotal,
    this.discount = 0.0,
    required this.total,
    required this.paidAmount,
    this.changeAmount = 0.0,
    this.paymentMethod = 'cash',
    this.status = 'completed',
    required this.cashierName,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'invoiceNumber': invoiceNumber,
      'date': date.toIso8601String(),
      'customerName': customerName,
      'items': items.map((e) => e.toMap()).toList(),
      'subtotal': subtotal,
      'discount': discount,
      'total': total,
      'paidAmount': paidAmount,
      'changeAmount': changeAmount,
      'paymentMethod': paymentMethod,
      'status': status,
      'cashierName': cashierName,
    };
  }

  factory SaleInvoice.fromMap(Map<String, dynamic> map) {
    return SaleInvoice(
      id: map['id'] ?? '',
      invoiceNumber: map['invoiceNumber'] ?? '',
      date: DateTime.tryParse(map['date'] ?? '') ?? DateTime.now(),
      customerName: map['customerName'] ?? 'زبون عام',
      items: (map['items'] as List<dynamic>? ?? [])
          .map((e) => CartItem.fromMap(Map<String, dynamic>.from(e)))
          .toList(),
      subtotal: (map['subtotal'] as num?)?.toDouble() ?? 0.0,
      discount: (map['discount'] as num?)?.toDouble() ?? 0.0,
      total: (map['total'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (map['paidAmount'] as num?)?.toDouble() ?? 0.0,
      changeAmount: (map['changeAmount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: map['paymentMethod'] ?? 'cash',
      status: map['status'] ?? 'completed',
      cashierName: map['cashierName'] ?? 'البائع',
    );
  }

  String toJson() => jsonEncode(toMap());
  factory SaleInvoice.fromJson(String source) =>
      SaleInvoice.fromMap(jsonDecode(source));
}

class CurrencyHelper {
  static String format(num amount) {
    final fixed = amount.toStringAsFixed(amount.truncateToDouble() == amount ? 0 : 2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
    final formatted = parts.length > 1 ? '$intPart.${parts[1]}' : intPart;
    return '$formatted د.ج';
  }
}
