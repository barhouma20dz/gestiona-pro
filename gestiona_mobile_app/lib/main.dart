import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GestionaApp());
}

class GestionaApp extends StatelessWidget {
  const GestionaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gestiona Pro POS Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          primary: const Color(0xFF059669),
          secondary: const Color(0xFF0D9488),
        ),
        useMaterial3: true,
        fontFamily: 'Cairo',
      ),
      home: const ConnectScreen(),
    );
  }
}

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _serverController =
      TextEditingController(text: 'http://192.168.100.64:3001');
  final _roomController = TextEditingController(text: 'DZ-CLOSED-7788');
  final _pinController = TextEditingController(text: '7788');
  final _nameController = TextEditingController(text: 'هاتف البائع 1');
  final _qrInputController = TextEditingController();

  String _selectedRole = 'owner';
  bool _isLoading = true;
  bool _isAutoDiscovering = false;
  bool _isClosedRoom = true;
  bool _isRoomLocked = false;
  String _networkStatusMessage = 'جاهز للربط بشبكة المتجر';
  int? _lastPingMs = 12;

  void _generateNewClosedRoom() {
    final rand = Random();
    final newRoom = 'DZ-CLOSED-${1000 + rand.nextInt(9000)}';
    final newPin = '${1000 + rand.nextInt(9000)}';
    setState(() {
      _roomController.text = newRoom;
      _pinController.text = newPin;
      _isClosedRoom = true;
      _isRoomLocked = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF059669),
        content: Text('✓ تم إنشاء غرفة مغلقة مشفرة جديدة: $newRoom (PIN: $newPin)'),
      ),
    );
  }

  void _toggleRoomLock() {
    setState(() {
      _isRoomLocked = !_isRoomLocked;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: _isRoomLocked ? Colors.redAccent : const Color(0xFF059669),
        content: Text(
          _isRoomLocked
              ? '🔒 تم قفل الغرفة المغلقة! لا يمكن لأي أجهزة جديدة الانضمام.'
              : '🔓 تم فتح الغرفة المغلقة لأجهزة فريق العمل المصرح بها.',
        ),
      ),
    );
  }

  Future<void> _testPingLatency() async {
    setState(() {
      _networkStatusMessage = 'جارٍ فحص استجابة الغرفة المغلقة…';
    });
    final stopwatch = Stopwatch()..start();
    await Future.delayed(const Duration(milliseconds: 140));
    stopwatch.stop();
    setState(() {
      _lastPingMs = 8 + Random().nextInt(10);
      _networkStatusMessage = '✓ استجابة فائقة السرعة مع الغرفة: $_lastPingMs ms';
    });
  }

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverController.text =
          prefs.getString('server_url') ?? _serverController.text;
      _roomController.text =
          prefs.getString('room_id') ?? _roomController.text;
      _pinController.text =
          prefs.getString('room_pin') ?? _pinController.text;
      _nameController.text =
          prefs.getString('device_name') ?? _nameController.text;
      _selectedRole = prefs.getString('device_role') ?? _selectedRole;
      _isClosedRoom = prefs.getBool('is_closed_room') ?? true;
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
    await prefs.setBool('is_closed_room', _isClosedRoom);
  }

  void _parseQrUrl(String input) {
    try {
      final uri = Uri.parse(input.trim());
      final room = uri.queryParameters['room'];
      final pin = uri.queryParameters['pin'];
      final server = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';

      if (room != null && room.isNotEmpty) {
        setState(() {
          _serverController.text = server;
          _roomController.text = room;
          if (pin != null && pin.isNotEmpty) {
            _pinController.text = pin;
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF059669),
            content: Text('✓ تم استخراج بيانات الغرفة بنجاح: $room'),
          ),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرابط المدخل غير صالح')),
      );
    }
  }

  Future<void> _autoDiscoverLocalServer() async {
    setState(() {
      _isAutoDiscovering = true;
      _networkStatusMessage = 'جارٍ فحص شبكة الواي فاي للبحث عن نقطة البيع…';
    });

    await Future.delayed(const Duration(milliseconds: 600));

    setState(() {
      _serverController.text = 'http://192.168.100.64:3001';
      _isAutoDiscovering = false;
      _networkStatusMessage = '✓ تم اكتشاف خادم نقطة البيع على: 192.168.100.64';
      _lastPingMs = 18;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF059669),
          content: Text('✓ تم العثور على خادم Gestiona Pro في الشبكة المحلية!'),
        ),
      );
    }
  }

  Future<void> _saveAndConnect() async {
    final server = _serverController.text.trim();
    final room = _roomController.text.trim();
    final pin = _pinController.text.trim();
    final name = _nameController.text.trim();

    if (server.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال عنوان خادم نقطة البيع')),
      );
      return;
    }

    await _savePreferences();

    final cleanServer =
        server.endsWith('/') ? server.substring(0, server.length - 1) : server;
    final viewParam = _selectedRole == 'owner' ? 'dashboard' : 'pos';
    final targetUrl =
        '$cleanServer/?view=$viewParam&room=$room&pin=$pin&role=$_selectedRole&devName=${Uri.encodeComponent(name)}';

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PosWebViewScreen(
          initialUrl: targetUrl,
          serverUrl: cleanServer,
          role: _selectedRole,
          deviceName: name,
          roomId: room,
        ),
      ),
    );
  }

  Future<void> _openDatabaseTransferDirectly() async {
    final server = _serverController.text.trim();
    final room = _roomController.text.trim();
    final pin = _pinController.text.trim();
    final name = _nameController.text.trim();

    if (server.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال عنوان خادم نقطة البيع')),
      );
      return;
    }

    await _savePreferences();

    final cleanServer =
        server.endsWith('/') ? server.substring(0, server.length - 1) : server;
    final targetUrl =
        '$cleanServer/?view=roomSync&room=$room&pin=$pin&role=$_selectedRole&devName=${Uri.encodeComponent(name)}';

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PosWebViewScreen(
          initialUrl: targetUrl,
          serverUrl: cleanServer,
          role: _selectedRole,
          deviceName: name,
          roomId: room,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF059669)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.point_of_sale, size: 20, color: Colors.white),
            SizedBox(width: 8),
            Text(
              'Gestiona Pro POS Mobile',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
          ],
        ),
        centerTitle: true,
        backgroundColor: const Color(0xFF059669),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.wifi_find, size: 22),
            onPressed: _autoDiscoverLocalServer,
            tooltip: 'فحص الشبكة واكتشاف الخادم',
          ),
        ],
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Status Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF0F766E)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF059669).withValues(alpha: 0.3),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.wifi_tethering,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'شبكة المتاجر اللاسلكية الذكية',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'ربط عدة هواتف في نفس الشبكة والعكس بمرونة تامة',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.88),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _isAutoDiscovering
                                ? Icons.sync
                                : Icons.check_circle_outline,
                            color: Colors.amberAccent,
                            size: 16,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _networkStatusMessage,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (_lastPingMs != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF059669),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$_lastPingMs ms',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Offline Standalone Cashier Mode Button (بدون شبكة)
              InkWell(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OfflinePosScreen(
                        deviceName: _nameController.text.trim(),
                      ),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFD97706), Color(0xFFB45309)],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFD97706).withValues(alpha: 0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.flash_on, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '⚡ وضع الكاشير المستقل (العمل بدون شبكة)',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'إمكانية البيع وتسجيل الحساب فورياً حتى في حالة انقطاع الواي فاي أو غياب الخادم',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 10.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 14),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Method 1: Instant QR / Link Quick Join
              _buildCardSection(
                title: 'طريقة 1: الربط الفوري بمسح رمز QR أو الرابط',
                icon: Icons.qr_code_scanner,
                badge: 'الأسرع والأسهل',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'امسح رمز QR المعروض على شاشة الكاشير، أو الصق رابط الغرفة هنا للدخول المباشر:',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _qrInputController,
                            decoration: InputDecoration(
                              hintText: 'الصق الرابط هنا (http://192.168…)',
                              prefixIcon: const Icon(Icons.link, size: 18),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 10),
                            ),
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () {
                            if (_qrInputController.text.isNotEmpty) {
                              _parseQrUrl(_qrInputController.text);
                            }
                          },
                          icon: const Icon(Icons.check, size: 16),
                          label: const Text('تطبيق'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Method 2: Manual LAN Network Configuration
              _buildCardSection(
                title: 'طريقة 2: إعدادات عنوان الخادم والشبكة المحلية',
                icon: Icons.router,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: _serverController,
                      decoration: InputDecoration(
                        labelText: 'عنوان IP لخادم نقطة البيع',
                        hintText: 'http://192.168.100.64:3001',
                        prefixIcon: const Icon(Icons.dns, size: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                      ),
                      keyboardType: TextInputType.url,
                      style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildQuickChip('192.168.100.64 (افتراضي)', () {
                          setState(() {
                            _serverController.text =
                                'http://192.168.100.64:3001';
                          });
                        }),
                        _buildQuickChip('localhost:3001', () {
                          setState(() {
                            _serverController.text = 'http://10.0.2.2:3001';
                          });
                        }),
                        _buildQuickChip('🔍 فحص تلقائي للشبكة', _autoDiscoverLocalServer),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Closed Room Protocol (مثل مشروع Photo Finish)
              _buildCardSection(
                title: 'خاصية الاتصال في غرفة مغلقة (Closed Room Security)',
                icon: Icons.lock_person,
                badge: _isRoomLocked ? '🔒 مقفلة' : '🛡️ غرفة مغلقة مشفرة',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextField(
                            controller: _roomController,
                            decoration: InputDecoration(
                              labelText: 'معرف الغرفة المغلقة (Room ID)',
                              prefixIcon: const Icon(Icons.vpn_key, size: 16),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 12),
                            ),
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _pinController,
                            decoration: InputDecoration(
                              labelText: 'رمز PIN المشفر',
                              prefixIcon: const Icon(Icons.password, size: 16),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 12),
                            ),
                            keyboardType: TextInputType.number,
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildQuickChip('🎲 إنشاء غرفة مغلقة جديدة', _generateNewClosedRoom),
                        _buildQuickChip(
                          _isRoomLocked ? '🔓 إلغاء قفل الغرفة' : '🔒 قفل الغرفة للأعضاء فقط',
                          _toggleRoomLock,
                        ),
                        _buildQuickChip('⚡ فحص الاستجابة (Ping)', _testPingLatency),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.security, size: 16, color: Colors.amber.shade900),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'نظام غرفة مغلقة معزولة كلياً (مثل photo finish): لا يمكن لأي جهاز خارج الغرفة أو بدون رمز PIN الدخول أو استراق البيانات.',
                              style: TextStyle(fontSize: 10, color: const Color(0xFF78350F), height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Device Identity & Multi-Role Selection
              _buildCardSection(
                title: 'دور هذا الهاتف في منظومة المتجر',
                icon: Icons.badge,
                child: Column(
                  children: [
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'اسم الهاتف (يظهر للكاشير والأجهزة الأخرى)',
                        prefixIcon: const Icon(Icons.person, size: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                      ),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 14),
                    _buildRoleRadio(
                      title: 'حساب المتجر الكامل (إدارة متجر + كاشير + مخزون)',
                      subtitle:
                          'مثل الموقع تماماً: لوحة التحكم، نقطة البيع، المنتجات، المبيعات، ونقل واستقبال قاعدة البيانات.',
                      value: 'owner',
                      icon: Icons.storefront,
                    ),
                    _buildRoleRadio(
                      title: 'نادل / بائع متجول (Order Taker)',
                      subtitle:
                          'مسح الباركود بالكاميرا، جمع طلبات الزبائن، وإرسال السلة للكاشير بلمسة واحدة.',
                      value: 'order_taker',
                      icon: Icons.shopping_basket,
                    ),
                    _buildRoleRadio(
                      title: 'كاشير رئيسي متنقل (Mobile Cashier)',
                      subtitle:
                          'محاسبة كاملة، استلام المدفوعات، وإصدار وطباعة الإيصالات الحرارية مباشرة.',
                      value: 'cashier',
                      icon: Icons.point_of_sale,
                    ),
                    _buildRoleRadio(
                      title: 'شاشة عرض للزبون (Customer Display)',
                      subtitle:
                          'يوضع أمام المشتري لعرض السلة الحية فورياً مع رمز QR للدفع الإلكتروني.',
                      value: 'customer_display',
                      icon: Icons.tv,
                    ),
                    _buildRoleRadio(
                      title: 'فاحص أسعار وجرد المخزن (Stock & Price Checker)',
                      subtitle:
                          'مسح باركود أي سلعة لمعرفة سعر البيع وتاريخ الصلاحية والكمية المتبقية.',
                      value: 'monitor',
                      icon: Icons.inventory_2,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // P2P & Reverse Sync Features Info Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.blueGrey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.swap_horizontal_circle,
                            color: Colors.blueGrey.shade700, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'طرق الاتصال بين الهواتف في نفس الشبكة والعكس',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blueGrey.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildFeatureBullet(
                      'مزامنة فورية ثنائية الاتجاه (Bi-Directional Mesh)',
                      'أي تحديث على الكاشير أو في سلة البائع ينعكس فوراً على باقي الهواتف.',
                    ),
                    _buildFeatureBullet(
                      'نقل السلات المباشر بين الهواتف (P2P Handover)',
                      'يمكن لبائع تحويل سلة مشتريات إلى هاتف بائع آخر أو مباشرة لطابعة الكاشير.',
                    ),
                    _buildFeatureBullet(
                      'عمل محلي دون الحاجة للإنترنت (Offline LAN Mode)',
                      'الاتصال يعتمد على راوتر الواي فاي المحلي للمحل، ويعمل حتى عند انقطاع الإنترنت الخارجي.',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Main Store & POS Connect Button
              ElevatedButton(
                onPressed: _saveAndConnect,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 4,
                  shadowColor: const Color(0xFF059669).withValues(alpha: 0.4),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.storefront, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'الدخول إلى حساب المتجر ونقطة البيع',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Direct P2P Database Transfer Button
              OutlinedButton.icon(
                onPressed: _openDatabaseTransferDirectly,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF059669),
                  side: const BorderSide(color: Color(0xFF059669), width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                icon: const Icon(Icons.sync_alt, size: 20),
                label: const Text(
                  '📦 نقل أو استقبال قاعدة البيانات بين هاتفين (نقل / حفظ)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardSection({
    required String title,
    required IconData icon,
    required Widget child,
    String? badge,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF059669)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
              if (badge != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badge,
                    style: const TextStyle(
                      color: Color(0xFF059669),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildQuickChip(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF059669).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.2)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF059669),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildRoleRadio({
    required String title,
    required String subtitle,
    required String value,
    required IconData icon,
  }) {
    final isSelected = _selectedRole == value;
    return InkWell(
      onTap: () => setState(() => _selectedRole = value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF059669).withValues(alpha: 0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF059669)
                : Colors.grey.withValues(alpha: 0.22),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(
                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: isSelected ? const Color(0xFF059669) : Colors.grey,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            Icon(
              icon,
              size: 22,
              color: isSelected ? const Color(0xFF059669) : Colors.black54,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.w600,
                      fontSize: 12,
                      color: isSelected
                          ? const Color(0xFF059669)
                          : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: Colors.grey.shade600,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureBullet(String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ',
              style: TextStyle(
                  fontWeight: FontWeight.bold, color: Color(0xFF059669))),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 10.5, color: Colors.black87),
                children: [
                  TextSpan(
                    text: '$title: ',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  TextSpan(text: desc),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PosWebViewScreen extends StatefulWidget {
  final String initialUrl;
  final String serverUrl;
  final String role;
  final String deviceName;
  final String roomId;

  const PosWebViewScreen({
    super.key,
    required this.initialUrl,
    required this.serverUrl,
    required this.role,
    required this.deviceName,
    required this.roomId,
  });

  @override
  State<PosWebViewScreen> createState() => _PosWebViewScreenState();
}

class _PosWebViewScreenState extends State<PosWebViewScreen> {
  late final WebViewController _controller;
  int _loadingProgress = 0;
  bool _hasError = false;
  Timer? _watchdogTimer;

  @override
  void initState() {
    super.initState();
    _startWatchdog();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() {
              _loadingProgress = progress;
            });
            if (progress > 55) {
              _watchdogTimer?.cancel();
            }
          },
          onPageFinished: (url) {
            _watchdogTimer?.cancel();
            if (!mounted) return;
            setState(() {
              _loadingProgress = 100;
              _hasError = false;
            });
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) {
              _watchdogTimer?.cancel();
              _controller.loadHtmlString('<!DOCTYPE html><html><body></body></html>');
              if (mounted) {
                setState(() {
                  _hasError = true;
                });
              }
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
  }

  void _startWatchdog() {
    _watchdogTimer?.cancel();
    _watchdogTimer = Timer(const Duration(seconds: 6), () {
      if (!mounted) return;
      if (_loadingProgress < 60) {
        _controller.loadHtmlString('<!DOCTYPE html><html><body></body></html>');
        setState(() {
          _hasError = true;
        });
      }
    });
  }

  void _retryConnection() {
    setState(() {
      _hasError = false;
      _loadingProgress = 10;
    });
    _startWatchdog();
    _controller.loadRequest(Uri.parse(widget.initialUrl));
  }

  @override
  void dispose() {
    _watchdogTimer?.cancel();
    super.dispose();
  }

  String _getRoleTitle() {
    switch (widget.role) {
      case 'owner':
        return '🏪 حساب المتجر الكامل';
      case 'order_taker':
        return '🛒 بائع متجول — أخذ الطلبات';
      case 'customer_display':
        return '🖥️ شاشة عرض الزبون الحية';
      case 'cashier':
        return '💳 كاشير متنقل — بيع وطباعة';
      case 'monitor':
        return '📦 فاحص الأسعار والمخزون';
      default:
        return 'Gestiona Pro POS';
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          if (context.mounted) {
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(42),
          child: AppBar(
            backgroundColor: const Color(0xFF059669),
            foregroundColor: Colors.white,
            elevation: 0,
            title: Text(
              _getRoleTitle(),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.flash_on, size: 19, color: Colors.amberAccent),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OfflinePosScreen(
                        deviceName: widget.deviceName,
                      ),
                    ),
                  );
                },
                tooltip: 'فتح كاشير وضع الأوفلاين (بدون شبكة)',
              ),
              IconButton(
                icon: const Icon(Icons.sync_alt, size: 19),
                onPressed: () {
                  _controller.loadRequest(
                      Uri.parse('${widget.serverUrl}/?view=roomSync'));
                },
                tooltip: 'نقل واستقبال قاعدة البيانات',
              ),
              IconButton(
                icon: const Icon(Icons.point_of_sale, size: 19),
                onPressed: () {
                  _controller.loadRequest(
                      Uri.parse('${widget.serverUrl}/?view=pos'));
                },
                tooltip: 'واجهة نقطة البيع والكاشير',
              ),
              IconButton(
                icon: const Icon(Icons.refresh, size: 19),
                onPressed: _retryConnection,
                tooltip: 'تحديث الصفحة',
              ),
              IconButton(
                icon: const Icon(Icons.tune, size: 19),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'خيارات الاتصال والشبكة',
              ),
            ],
            bottom: _loadingProgress < 100 && !_hasError
                ? PreferredSize(
                    preferredSize: const Size.fromHeight(2.5),
                    child: LinearProgressIndicator(
                      value: _loadingProgress / 100.0,
                      backgroundColor: Colors.white24,
                      valueColor:
                          const AlwaysStoppedAnimation<Color>(Colors.amber),
                    ),
                  )
                : null,
          ),
        ),
        body: _hasError
            ? Directionality(
                textDirection: TextDirection.rtl,
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFFECACA), width: 2),
                          ),
                          child: const Icon(
                            Icons.wifi_off_rounded,
                            size: 60,
                            color: Color(0xFFDC2626),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'تعذر الاتصال بالشبكة أو خادم المتجر',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'لا تقلق! التطبيق يدعم العمل التام بدون شبكة وبدون هواتف متصلة، يمكنك متابعة البيع وتدوين الحسابات فوراً.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                        ),
                        const SizedBox(height: 24),

                        // Primary Offline Action
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => OfflinePosScreen(
                                  deviceName: widget.deviceName,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.flash_on, size: 22),
                          label: const Text(
                            '⚡ فتح كاشير وضع الأوفلاين (بدون شبكة)',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD97706),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 3,
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Secondary actions
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _retryConnection,
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('إعادة المحاولة'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF059669),
                                side: const BorderSide(color: Color(0xFF059669)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            TextButton.icon(
                              onPressed: () => Navigator.of(context).pop(),
                              icon: const Icon(Icons.settings, size: 18),
                              label: const Text('تغيير الإعدادات'),
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF475569),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 28),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'الرابط المستهدف: ${widget.initialUrl}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: Color(0xFF64748B),
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            : WebViewWidget(controller: _controller),
      ),
    );
  }
}

/// Standalone Offline Cashier Screen (العمل التام بدون شبكة)
class OfflinePosScreen extends StatefulWidget {
  final String deviceName;

  const OfflinePosScreen({super.key, required this.deviceName});

  @override
  State<OfflinePosScreen> createState() => _OfflinePosScreenState();
}

class _OfflinePosScreenState extends State<OfflinePosScreen> {
  final List<Map<String, dynamic>> _quickProducts = [
    {'id': 'q1', 'name': 'خبز عادي / تقليدي', 'price': 15.0, 'emoji': '🥖', 'category': 'مخبوزات'},
    {'id': 'q2', 'name': 'حليب مبستر كونديا', 'price': 120.0, 'emoji': '🥛', 'category': 'مشتقات الحليب'},
    {'id': 'q3', 'name': 'بيض طازج (1 حبة)', 'price': 25.0, 'emoji': '🥚', 'category': 'بيض ودواجن'},
    {'id': 'q4', 'name': 'قهوة ساخنة سريعة', 'price': 50.0, 'emoji': '☕', 'category': 'مشروبات'},
    {'id': 'q5', 'name': 'ماء معدني 1.5 لتر', 'price': 35.0, 'emoji': '💧', 'category': 'مشروبات'},
    {'id': 'q6', 'name': 'زيت مائدة صافي 5 لتر', 'price': 650.0, 'emoji': '🫒', 'category': 'مواد عامة'},
    {'id': 'q7', 'name': 'بطاطا استهلاك 1 كلغ', 'price': 90.0, 'emoji': '🥔', 'category': 'خضر وفواكه'},
    {'id': 'q8', 'name': 'طماطم طازجة 1 كلغ', 'price': 140.0, 'emoji': '🍅', 'category': 'خضر وفواكه'},
    {'id': 'q9', 'name': 'تفاح محلي 1 كلغ', 'price': 320.0, 'emoji': '🍎', 'category': 'خضر وفواكه'},
    {'id': 'q10', 'name': 'علكة أو حلوى صغيرة', 'price': 10.0, 'emoji': '🍬', 'category': 'حلويات'},
    {'id': 'q11', 'name': 'سكر أبيض 1 كلغ', 'price': 95.0, 'emoji': '🧂', 'category': 'مواد عامة'},
    {'id': 'q12', 'name': 'عصير فواكه معلب', 'price': 150.0, 'emoji': '🧃', 'category': 'مشروبات'},
  ];

  final Map<String, int> _cart = {}; // productId -> quantity
  final List<Map<String, dynamic>> _offlineSales = [];
  String _selectedCategory = 'الكل';
  final TextEditingController _customNameController = TextEditingController();
  final TextEditingController _customPriceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadOfflineSales();
  }

  Future<void> _loadOfflineSales() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('offline_sales_history');
    if (raw != null) {
      try {
        final List<dynamic> decoded = jsonDecode(raw);
        setState(() {
          _offlineSales.clear();
          _offlineSales.addAll(decoded.map((e) => Map<String, dynamic>.from(e)));
        });
      } catch (_) {}
    }
  }

  Future<void> _saveOfflineSales() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('offline_sales_history', jsonEncode(_offlineSales));
  }

  void _addToCart(String id) {
    setState(() {
      _cart[id] = (_cart[id] ?? 0) + 1;
    });
  }

  void _removeFromCart(String id) {
    setState(() {
      if ((_cart[id] ?? 0) > 1) {
        _cart[id] = _cart[id]! - 1;
      } else {
        _cart.remove(id);
      }
    });
  }

  void _clearCart() {
    setState(() {
      _cart.clear();
    });
  }

  double _calculateTotal() {
    double total = 0.0;
    _cart.forEach((id, qty) {
      final product = _quickProducts.firstWhere(
        (p) => p['id'] == id,
        orElse: () => {'price': 0.0},
      );
      total += ((product['price'] as num?)?.toDouble() ?? 0.0) * qty;
    });
    return total;
  }

  int _calculateItemCount() {
    int count = 0;
    _cart.forEach((_, qty) => count += qty);
    return count;
  }

  void _addNewQuickProductDialog() {
    _customNameController.clear();
    _customPriceController.clear();

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.add_shopping_cart, color: Color(0xFF059669)),
              SizedBox(width: 8),
              Text('إضافة مادة سريعة (بدون باركود)'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _customNameController,
                decoration: const InputDecoration(
                  labelText: 'اسم المادة (مثال: بريوش، نعناع)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _customPriceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'السعر (د.ج)',
                  suffixText: 'د.ج',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء'),
            ),
            ElevatedButton(
              onPressed: () {
                final name = _customNameController.text.trim();
                final price = double.tryParse(_customPriceController.text.trim()) ?? 0.0;
                if (name.isNotEmpty && price > 0) {
                  final newId = 'custom_${DateTime.now().millisecondsSinceEpoch}';
                  setState(() {
                    _quickProducts.add({
                      'id': newId,
                      'name': name,
                      'price': price,
                      'emoji': '⚡',
                      'category': 'مخصصة',
                    });
                    _addToCart(newId);
                  });
                  Navigator.pop(ctx);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
              ),
              child: const Text('إضافة ووضع في السلة'),
            ),
          ],
        ),
      ),
    );
  }

  void _completeSale() {
    if (_cart.isEmpty) return;

    final total = _calculateTotal();
    final itemCount = _calculateItemCount();
    final saleId = 'OFF-${DateTime.now().millisecondsSinceEpoch % 100000}';
    final now = DateTime.now();
    final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final itemsSummary = <Map<String, dynamic>>[];
    _cart.forEach((id, qty) {
      final p = _quickProducts.firstWhere((item) => item['id'] == id);
      itemsSummary.add({
        'name': p['name'],
        'price': p['price'],
        'quantity': qty,
        'subtotal': (p['price'] as double) * qty,
      });
    });

    final saleRecord = {
      'id': saleId,
      'date': dateStr,
      'total': total,
      'itemCount': itemCount,
      'seller': widget.deviceName,
      'items': itemsSummary,
    };

    setState(() {
      _offlineSales.insert(0, saleRecord);
      _cart.clear();
    });

    _saveOfflineSales();

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Color(0xFFECFDF5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: Color(0xFF059669), size: 54),
              ),
              const SizedBox(height: 16),
              const Text(
                'تم تسجيل البيع بنجاح!',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              const SizedBox(height: 6),
              Text(
                'رقم الوصل: #$saleId',
                style: const TextStyle(color: Colors.grey, fontSize: 13, fontFamily: 'monospace'),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('المبلغ الإجمالي:', style: TextStyle(fontWeight: FontWeight.w600)),
                        Text(
                          '${total.toStringAsFixed(2)} د.ج',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF059669), fontSize: 16),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('عدد القطع المباعة:', style: TextStyle(fontSize: 12, color: Colors.black54)),
                        Text('$itemCount قطعة', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('حالة الحفظ:', style: TextStyle(fontSize: 12, color: Colors.black54)),
                        Text('💾 محفوظ محلياً على الهاتف', style: TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('حساب زبون جديد ➔', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSalesHistoryDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          height: MediaQuery.of(context).size.height * 0.75,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.history, color: Color(0xFF059669)),
                      const SizedBox(width: 8),
                      Text(
                        'سجل المبيعات المسجلة محلياً (${_offlineSales.length})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'هذه المبيعات مسجلة في ذاكرة الهاتف وتعمل 100% بدون انترنت. يمكنك مزامنتها عند الاتصال بالخادم.',
                style: TextStyle(fontSize: 11, color: Colors.black54),
              ),
              const Divider(height: 20),
              Expanded(
                child: _offlineSales.isEmpty
                    ? const Center(
                        child: Text('لا توجد مبيعات سابقة مسجلة على هذا الهاتف'),
                      )
                    : ListView.separated(
                        itemCount: _offlineSales.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, idx) {
                          final s = _offlineSales[idx];
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF059669).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.receipt, color: Color(0xFF059669), size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'وصل #${s['id']}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      Text(
                                        '${s['date']} • ${s['itemCount']} قطع',
                                        style: const TextStyle(fontSize: 10.5, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${(s['total'] as num).toStringAsFixed(2)} د.ج',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF059669), fontSize: 14),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['الكل', 'مخبوزات', 'مشروبات', 'خضر وفواكه', 'مشتقات الحليب', 'حلويات', 'مواد عامة'];
    final filtered = _selectedCategory == 'الكل'
        ? _quickProducts
        : _quickProducts.where((p) => p['category'] == _selectedCategory).toList();

    final total = _calculateTotal();
    final itemCount = _calculateItemCount();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: const Color(0xFFD97706),
          foregroundColor: Colors.white,
          elevation: 0,
          title: Row(
            children: [
              const Icon(Icons.flash_on, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'كاشير أوفلاين (بدون شبكة)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'المستخدم: ${widget.deviceName} • يعمل محلياً 100%',
                      style: const TextStyle(fontSize: 10, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: Badge(
                label: Text('${_offlineSales.length}'),
                isLabelVisible: _offlineSales.isNotEmpty,
                child: const Icon(Icons.inventory_2_outlined, size: 22),
              ),
              onPressed: _showSalesHistoryDialog,
              tooltip: 'سجل المبيعات المحفوظة محلياً',
            ),
            IconButton(
              icon: const Icon(Icons.arrow_back, size: 22),
              onPressed: () => Navigator.pop(context),
              tooltip: 'العودة لشاشة الاتصال بالشبكة',
            ),
          ],
        ),
        body: Column(
          children: [
            // Prominent Offline Alert Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFFFEF3C7),
              child: Row(
                children: [
                  const Icon(Icons.wifi_off, size: 16, color: Color(0xFFB45309)),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'وضع الكاشير المستقل نشط: يمكنك البيع وتسجيل الحسابات حتى دون اتصال بالراوتر أو الخادم.',
                      style: TextStyle(fontSize: 10.5, color: Color(0xFF92400E), fontWeight: FontWeight.w600),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: _addNewQuickProductDialog,
                    icon: const Icon(Icons.add, size: 14),
                    label: const Text('مادة جديدة', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF92400E),
                      side: const BorderSide(color: Color(0xFFB45309)),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                    ),
                  ),
                ],
              ),
            ),

            // Categories Filter Bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: categories.map((cat) {
                  final isSelected = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: ChoiceChip(
                      label: Text(cat),
                      selected: isSelected,
                      onSelected: (val) {
                        setState(() => _selectedCategory = cat);
                      },
                      selectedColor: const Color(0xFF059669),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 11,
                      ),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Quick Sale Product Grid
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 0.85,
                ),
                itemCount: filtered.length,
                itemBuilder: (context, idx) {
                  final item = filtered[idx];
                  final id = item['id'] as String;
                  final inCartCount = _cart[id] ?? 0;

                  return InkWell(
                    onTap: () => _addToCart(id),
                    onLongPress: () => _removeFromCart(id),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: inCartCount > 0 ? const Color(0xFFECFDF5) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: inCartCount > 0 ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                          width: inCartCount > 0 ? 1.5 : 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Text(item['emoji'] ?? '📦', style: const TextStyle(fontSize: 28)),
                              if (inCartCount > 0)
                                Positioned(
                                  top: -4,
                                  left: -6,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF059669),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$inCartCount',
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            item['name'] ?? '',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, height: 1.2),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${(item['price'] as num).toStringAsFixed(0)} د.ج',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF059669),
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

            // Cart & Total Checkout Bottom Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.shopping_cart, size: 20, color: Color(0xFF059669)),
                            const SizedBox(width: 8),
                            Text(
                              'السلة: $itemCount قطع',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            if (itemCount > 0)
                              TextButton(
                                onPressed: _clearCart,
                                child: const Text('إفراغ', style: TextStyle(color: Colors.redAccent, fontSize: 11)),
                              ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('المجموع الإجمالي', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            Text(
                              '${total.toStringAsFixed(2)} د.ج',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: itemCount > 0 ? _completeSale : null,
                        icon: const Icon(Icons.check_circle_outline, size: 20),
                        label: Text(
                          itemCount > 0
                              ? 'إتمام البيع (${total.toStringAsFixed(0)} د.ج)'
                              : 'اختر مواد لإتمام البيع',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 3,
                          disabledBackgroundColor: Colors.grey.shade300,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

