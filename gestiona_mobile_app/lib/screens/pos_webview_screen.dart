import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../theme/app_theme.dart';

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
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            setState(() {
              _loadingProgress = progress;
            });
          },
          onPageStarted: (url) {
            setState(() {
              _hasError = false;
              _loadingProgress = 10;
            });
          },
          onPageFinished: (url) {
            setState(() {
              _loadingProgress = 100;
            });
          },
          onWebResourceError: (error) {
            setState(() {
              _hasError = true;
              _errorMessage = error.description;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () async {
            if (await _controller.canGoBack()) {
              _controller.goBack();
            } else {
              if (context.mounted) Navigator.pop(context);
            }
          },
        ),
        title: Column(
          children: [
            Text(
              widget.role == 'owner'
                  ? 'كاشير رئيسي Gestiona Pro'
                  : 'شاشة البائع المتجول',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  widget.roomId,
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            tooltip: 'تحديث الصفحة',
            onPressed: () => _controller.reload(),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 22),
            tooltip: 'خروج إلى التطبيق الأصلي',
            onPressed: () => Navigator.pop(context),
          ),
        ],
        bottom: _loadingProgress < 100
            ? PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(
                  value: _loadingProgress / 100.0,
                  backgroundColor: AppColors.surface,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              )
            : null,
      ),
      body: _hasError
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.cloud_off, size: 64, color: AppColors.accentRose),
                    const SizedBox(height: 16),
                    const Text(
                      'تعذر الاتصال بخادم نقطة البيع',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _errorMessage.isNotEmpty
                          ? _errorMessage
                          : 'يرجى التأكد من تشغيل خادم Gestiona Pro على نفس شبكة الواي فاي',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _hasError = false;
                        });
                        _controller.loadRequest(Uri.parse(widget.initialUrl));
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('إعادة المحاولة'),
                    ),
                  ],
                ),
              ),
            )
          : WebViewWidget(controller: _controller),
    );
  }
}
