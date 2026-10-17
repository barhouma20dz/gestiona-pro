import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  final String storeName;
  final String cashierName;
  final String serverUrl;
  final Function(String storeName, String cashierName) onSaveStoreProfile;

  const SettingsScreen({
    super.key,
    required this.storeName,
    required this.cashierName,
    required this.serverUrl,
    required this.onSaveStoreProfile,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _storeNameCtrl;
  late TextEditingController _cashierNameCtrl;
  final TextEditingController _phoneCtrl = TextEditingController(text: '0550 12 34 56');
  final TextEditingController _addressCtrl = TextEditingController(text: 'الجزائر العاصمة');

  String _paperWidth = '80mm';
  bool _enableSoundFeedback = true;
  bool _autoPrintReceipt = false;

  @override
  void initState() {
    super.initState();
    _storeNameCtrl = TextEditingController(text: widget.storeName);
    _cashierNameCtrl = TextEditingController(text: widget.cashierName);
  }

  void _saveSettings() {
    widget.onSaveStoreProfile(
      _storeNameCtrl.text.trim(),
      _cashierNameCtrl.text.trim(),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: AppColors.primaryDark,
        content: Text('✓ تم حفظ إعدادات المتجر والطابعة بنجاح'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
              child: const Icon(Icons.settings_outlined, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 8),
            const Text('الإعدادات والملف التعريفي', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Store Profile Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.storefront_outlined, color: AppColors.primary, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'بيانات المتجر والنشاط التجاري',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _storeNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'اسم المتجر أو المؤسسة',
                        prefixIcon: Icon(Icons.badge_outlined, color: AppColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phoneCtrl,
                      decoration: const InputDecoration(
                        labelText: 'رقم هاتف المتجر',
                        prefixIcon: Icon(Icons.phone_outlined, color: AppColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _addressCtrl,
                      decoration: const InputDecoration(
                        labelText: 'عنوان المتجر',
                        prefixIcon: Icon(Icons.location_on_outlined, color: AppColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Cashier & Seller Identity Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.person_outline, color: AppColors.accentSky, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'هوية البائع وجهاز الكاشير',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _cashierNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'اسم البائع / الكاشير الافتراضي',
                        prefixIcon: Icon(Icons.account_circle_outlined, color: AppColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Thermal Printer Settings Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.print_outlined, color: AppColors.accentAmber, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'إعدادات الطابعة الحرارية (Thermal Printer)',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Text(
                          'مقاس ورق الفاتورة:',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(width: 14),
                        ChoiceChip(
                          label: const Text('80 مم (قياسي)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                          selected: _paperWidth == '80mm',
                          selectedColor: AppColors.primary,
                          onSelected: (val) => setState(() => _paperWidth = '80mm'),
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: const Text('58 مم (محمول)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                          selected: _paperWidth == '58mm',
                          selectedColor: AppColors.primary,
                          onSelected: (val) => setState(() => _paperWidth = '58mm'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('طباعة فورية عند إتمام البيع', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                      subtitle: const Text('إرسال الفاتورة للطابعة الحرارية بدون نافذة تأكيد', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      value: _autoPrintReceipt,
                      activeTrackColor: AppColors.primary,
                      onChanged: (val) => setState(() => _autoPrintReceipt = val),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('التأثيرات الصوتية واللمسية (Haptics)', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                      subtitle: const Text('إصدار صوت خفيف ونقر اهتزازي عند إضافة الأصناف للسلة', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      value: _enableSoundFeedback,
                      activeTrackColor: AppColors.primary,
                      onChanged: (val) => setState(() => _enableSoundFeedback = val),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Save Button
              SizedBox(
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _saveSettings,
                  icon: const Icon(Icons.save_outlined, size: 20),
                  label: const Text('حفظ جميع التغييرات', style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.bold)),
                ),
              ),

              const SizedBox(height: 24),

              // App Version Card
              Center(
                child: Column(
                  children: [
                    Text(
                      'Gestiona Pro POS Mobile v2.0',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: AppColors.textMuted.withValues(alpha: 0.8),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'نظام إدارة نقاط البيع والمتاجر الذكية المتكاملة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        color: AppColors.textMuted.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}
