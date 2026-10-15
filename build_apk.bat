@echo off
chcp 65001 > nul
echo ===================================================
echo     Gestiona Pro POS — بناء حزمة الأندرويد APK
echo ===================================================
echo.

set FLUTTER_BIN=C:\Users\Aladine20Dz\Develop\flutter\bin\flutter.bat
cd /d "%~dp0gestiona_mobile_app"

echo [1/3] فحص ملفات وتطبيقات Flutter...
call "%FLUTTER_BIN%" pub get

echo.
echo [2/3] جاري تجميع وبناء ملف APK (Release)...
call "%FLUTTER_BIN%" build apk --release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [خطأ] فشل بناء ملف APK. يرجى التحقق من الرسائل أعلاه.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] جاري نسخ الملف الناتج إلى المجلد الرئيسي...
copy /y "build\app\outputs\flutter-apk\app-release.apk" "..\GestionaPro_POS.apk"

echo.
echo ===================================================
echo [تم بنجاح!] تم إنشاء ملف الأندرويد جاهزاً للتثبيت:
echo %~dp0GestionaPro_POS.apk
echo ===================================================
echo.
echo يمكنك الآن إرسال الملف للهاتف عبر كابل USB أو البلوتوث أو الواتساب وتثبيته مباشرة!
pause
