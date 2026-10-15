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
      title: 'Gestiona Pro POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          primary: const Color(0xFF059669),
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
  final _serverController = TextEditingController(text: 'http://192.168.100.64:3001');
  final _roomController = TextEditingController(text: 'DZ-STORE-1');
  final _pinController = TextEditingController(text: '7788');
  final _nameController = TextEditingController(text: 'هاتف البائع 1');
  String _selectedRole = 'order_taker'; // order_taker, cashier, customer_display, monitor
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverController.text = prefs.getString('server_url') ?? _serverController.text;
      _roomController.text = prefs.getString('room_id') ?? _roomController.text;
      _pinController.text = prefs.getString('room_pin') ?? _pinController.text;
      _nameController.text = prefs.getString('device_name') ?? _nameController.text;
      _selectedRole = prefs.getString('device_role') ?? _selectedRole;
      _isLoading = false;
    });
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

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', server);
    await prefs.setString('room_id', room);
    await prefs.setString('room_pin', pin);
    await prefs.setString('device_name', name);
    await prefs.setString('device_role', _selectedRole);

    // Build URL with parameters
    final cleanServer = server.endsWith('/') ? server.substring(0, server.length - 1) : server;
    final targetUrl = '$cleanServer/?room=$room&pin=$pin&role=$_selectedRole&devName=${Uri.encodeComponent(name)}';

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PosWebViewScreen(
          initialUrl: targetUrl,
          serverUrl: cleanServer,
          role: _selectedRole,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Color(0xFF059669))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Gestiona Pro — نقطة البيع المتنقلة',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
        backgroundColor: const Color(0xFF059669),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Badge
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF0D9488)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF059669).withOpacity(0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Icon(Icons.wifi_tethering, color: Colors.white, size: 40),
                    const SizedBox(height: 8),
                    const Text(
                      'ربط الهاتف بغرفة المبيعات',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'اتصال لاسلكي محلي أو عن بعد لإرسال الطلبات ومسح الباركود',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Form fields
              _buildCardSection(
                title: 'عنوان الخادم أو الواي فاي (IP)',
                icon: Icons.router,
                child: Column(
                  children: [
                    TextField(
                      controller: _serverController,
                      decoration: InputDecoration(
                        hintText: 'http://192.168.1.x:3001',
                        prefixIcon: const Icon(Icons.link),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      keyboardType: TextInputType.url,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildQuickChip('خادم محلي (192.168.100.64)', () {
                          setState(() {
                            _serverController.text = 'http://192.168.100.64:3001';
                          });
                        }),
                        const SizedBox(width: 8),
                        _buildQuickChip('localhost:3001', () {
                          setState(() {
                            _serverController.text = 'http://10.0.2.2:3001';
                          });
                        }),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Room ID & PIN
              _buildCardSection(
                title: 'بيانات الغرفة والحماية',
                icon: Icons.meeting_room,
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: TextField(
                        controller: _roomController,
                        decoration: InputDecoration(
                          labelText: 'معرف الغرفة',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: _pinController,
                        decoration: InputDecoration(
                          labelText: 'رمز PIN',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Device Identity & Role
              _buildCardSection(
                title: 'دور هذا الهاتف في المتجر',
                icon: Icons.person_pin,
                child: Column(
                  children: [
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'اسم الهاتف (يظهر للكاشير)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildRoleRadio(
                      title: 'نادل / بائع متجول (أخذ الطلبات وإرسالها)',
                      subtitle: 'مسح الباركود بالكاميرا وإرسال السلة للكاشير بضغطة زر',
                      value: 'order_taker',
                      icon: Icons.shopping_basket,
                    ),
                    _buildRoleRadio(
                      title: 'كاشير رئيسي (بيع ومحاسبة وطباعة)',
                      subtitle: 'إتمام المبيعات وطباعة الإيصالات',
                      value: 'cashier',
                      icon: Icons.point_of_sale,
                    ),
                    _buildRoleRadio(
                      title: 'شاشة عرض للزبون (Customer Display)',
                      subtitle: 'يوضع الهاتف أمام المشتري لعرض السلة الحية',
                      value: 'customer_display',
                      icon: Icons.tv,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Connect Button
              ElevatedButton(
                onPressed: _saveAndConnect,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.bolt, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'دخول الغرفة وبدء العمل',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardSection({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
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
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF059669).withOpacity(0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF059669).withOpacity(0.2)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 10, color: Color(0xFF059669), fontWeight: FontWeight.bold),
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
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669).withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF059669) : Colors.grey.withOpacity(0.2),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? const Color(0xFF059669) : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 10),
            Icon(icon, size: 20, color: isSelected ? const Color(0xFF059669) : Colors.black54),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                      color: isSelected ? const Color(0xFF059669) : Colors.black87,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PosWebViewScreen extends StatefulWidget {
  final String initialUrl;
  final String serverUrl;
  final String role;

  const PosWebViewScreen({
    super.key,
    required this.initialUrl,
    required this.serverUrl,
    required this.role,
  });

  @override
  State<PosWebViewScreen> createState() => _PosWebViewScreenState();
}

class _PosWebViewScreenState extends State<PosWebViewScreen> {
  late final WebViewController _controller;
  int _loadingProgress = 0;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            setState(() {
              _loadingProgress = progress;
            });
          },
          onPageFinished: (url) {
            setState(() {
              _loadingProgress = 100;
              _hasError = false;
            });
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) {
              setState(() {
                _hasError = true;
              });
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
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
          preferredSize: const Size.fromHeight(40),
          child: AppBar(
            backgroundColor: const Color(0xFF059669),
            foregroundColor: Colors.white,
            elevation: 0,
            title: Text(
              widget.role == 'order_taker'
                  ? '📱 بائع متجول — إرسال طلبات'
                  : widget.role == 'customer_display'
                      ? '🖥️ شاشة عرض الزبون'
                      : 'Gestiona Pro POS',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, size: 20),
                onPressed: () => _controller.reload(),
                tooltip: 'تحديث الصفحة',
              ),
              IconButton(
                icon: const Icon(Icons.settings, size: 20),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'إعدادات الغرفة',
              ),
            ],
            bottom: _loadingProgress < 100
                ? PreferredSize(
                    preferredSize: const Size.fromHeight(2),
                    child: LinearProgressIndicator(
                      value: _loadingProgress / 100.0,
                      backgroundColor: Colors.white24,
                      valueColor: const AlwaysStoppedAnimation<Color>(Colors.amber),
                    ),
                  )
                : null,
          ),
        ),
        body: _hasError
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.wifi_off, size: 64, color: Colors.redAccent),
                      const SizedBox(height: 16),
                      const Text(
                        'تعذر الاتصال بخادم نقطة البيع',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'تأكد من أن الهاتف والكمبيوتر متصلان بنفس شبكة الواي فاي، وأن العنوان صحيح:\n${widget.initialUrl}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _controller.reload(),
                            icon: const Icon(Icons.refresh),
                            label: const Text('إعادة المحاولة'),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton.icon(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.edit),
                            label: const Text('تغيير العنوان'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              )
            : WebViewWidget(controller: _controller),
      ),
    );
  }
}
