import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'pos_terminal_screen.dart';
import 'room_sync_screen.dart';
import 'sales_history_screen.dart';
import 'settings_screen.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;
  bool _isLoading = true;

  final TextEditingController _serverController =
      TextEditingController(text: 'http://192.168.100.64:3001');
  final TextEditingController _roomController =
      TextEditingController(text: 'DZ-CLOSED-7788');
  final TextEditingController _pinController =
      TextEditingController(text: '7788');
  final TextEditingController _nameController =
      TextEditingController(text: 'هاتف البائع 1');

  String _selectedRole = 'owner';
  String _storeName = 'مكتبة ومتجر النجاح Pro';
  String _cashierName = 'أحمد بن علي';

  final List<SaleInvoice> _salesHistory = [];

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverController.text = prefs.getString('server_url') ?? _serverController.text;
      _roomController.text = prefs.getString('room_id') ?? _roomController.text;
      _pinController.text = prefs.getString('room_pin') ?? _pinController.text;
      _nameController.text = prefs.getString('device_name') ?? _nameController.text;
      _selectedRole = prefs.getString('device_role') ?? _selectedRole;
      _storeName = prefs.getString('store_name') ?? _storeName;
      _cashierName = prefs.getString('cashier_name') ?? _cashierName;

      final rawSales = prefs.getString('offline_sales_history');
      if (rawSales != null) {
        try {
          final List<dynamic> decoded = jsonDecode(rawSales);
          _salesHistory.clear();
          _salesHistory.addAll(decoded.map((e) => SaleInvoice.fromMap(Map<String, dynamic>.from(e))));
        } catch (_) {}
      }

      // If no sales history, add a couple of demo entries so the user immediately sees the rich dashboard
      if (_salesHistory.isEmpty) {
        _salesHistory.addAll([
          SaleInvoice(
            id: 'inv_demo_1',
            invoiceNumber: 'INV-2026-1042',
            date: DateTime.now().subtract(const Duration(minutes: 45)),
            customerName: 'زبون نقدي',
            items: [
              CartItem(
                product: ProductItem(id: 'p1', name: 'خبز عادي طازج', price: 15.0, category: 'مخبوزات', emoji: '🥖'),
                quantity: 4,
              ),
              CartItem(
                product: ProductItem(id: 'p2', name: 'حليب مبستر كونديا 1 لتر', price: 125.0, category: 'مشتقات الحليب', emoji: '🥛'),
                quantity: 2,
              ),
            ],
            subtotal: 310.0,
            total: 310.0,
            paidAmount: 500.0,
            changeAmount: 190.0,
            paymentMethod: 'cash',
            cashierName: _cashierName,
          ),
          SaleInvoice(
            id: 'inv_demo_2',
            invoiceNumber: 'INV-2026-1041',
            date: DateTime.now().subtract(const Duration(hours: 2)),
            customerName: 'مصطفى كمال',
            items: [
              CartItem(
                product: ProductItem(id: 'p6', name: 'زيت مائدة صافي 5 لتر', price: 650.0, category: 'مواد عامة', emoji: '🫒'),
                quantity: 1,
              ),
              CartItem(
                product: ProductItem(id: 'p7', name: 'سكر أبيض نقي 1 كلغ', price: 95.0, category: 'مواد عامة', emoji: '🧂'),
                quantity: 2,
              ),
            ],
            subtotal: 840.0,
            total: 840.0,
            paidAmount: 840.0,
            changeAmount: 0.0,
            paymentMethod: 'cash',
            cashierName: _cashierName,
          ),
        ]);
      }

      _isLoading = false;
    });
  }

  Future<void> _savePreferences() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', _serverController.text.trim());
    await prefs.setString('room_id', _roomController.text.trim());
    await prefs.setString('room_pin', _pinController.text.trim());
    await prefs.setString('device_name', _nameController.text.trim());
    await prefs.setString('device_role', _selectedRole);
    await prefs.setString('store_name', _storeName);
    await prefs.setString('cashier_name', _cashierName);
    await prefs.setString(
      'offline_sales_history',
      jsonEncode(_salesHistory.map((e) => e.toMap()).toList()),
    );
  }

  void _onSaleCompleted(SaleInvoice invoice) {
    setState(() {
      _salesHistory.insert(0, invoice);
    });
    _savePreferences();
  }

  void _onSaveStoreProfile(String storeName, String cashierName) {
    setState(() {
      _storeName = storeName;
      _cashierName = cashierName;
    });
    _savePreferences();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final screens = [
      PosTerminalScreen(
        cashierName: _cashierName,
        storeName: _storeName,
        onSaleCompleted: _onSaleCompleted,
      ),
      RoomSyncScreen(
        serverController: _serverController,
        roomController: _roomController,
        pinController: _pinController,
        nameController: _nameController,
        selectedRole: _selectedRole,
        onRoleChanged: (role) => setState(() => _selectedRole = role),
        onSavePreferences: _savePreferences,
      ),
      SalesHistoryScreen(
        sales: _salesHistory,
        storeName: _storeName,
      ),
      SettingsScreen(
        storeName: _storeName,
        cashierName: _cashierName,
        serverUrl: _serverController.text,
        onSaveStoreProfile: _onSaveStoreProfile,
      ),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.borderSubtle)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.point_of_sale_outlined),
              activeIcon: Icon(Icons.point_of_sale),
              label: 'نقطة البيع',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.hub_outlined),
              activeIcon: Icon(Icons.hub),
              label: 'المزامنة',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long),
              label: 'الفواتير',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_outlined),
              activeIcon: Icon(Icons.settings),
              label: 'الإعدادات',
            ),
          ],
        ),
      ),
    );
  }
}
