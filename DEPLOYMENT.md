# 🚀 دليل النشر: GitHub + Vercel + Neon

## الخطوة 1: إنشاء قاعدة بيانات Neon

1. اذهب إلى https://console.neon.tech وسجّل حساباً مجانياً
2. أنشئ مشروعاً جديداً (New Project)
3. اختر اسم المشروع (مثلاً: swiftbill-pos)
4. اختر المنطقة الأقرب لك (Frankfurt للجزائر/أوروبا)
5. انسخ **Connection String** (يبدأ بـ `postgresql://...`)

## الخطوة 2: رفع المشروع على GitHub

```bash
# في مجلد المشروع
git init
git add .
git commit -m "Initial commit: SwiftBill POS SaaS"
git branch -M main
git remote add origin https://github.com/USERNAME/swiftbill-pos.git
git push -u origin main
```

## الخطوة 3: النشر على Vercel

1. اذهب إلى https://vercel.com وسجّل دخولك بـ GitHub
2. اضغط "New Project" → اختر مستودع `swiftbill-pos`
3. في إعدادات Environment Variables، أضف:
   - `DATABASE_URL` = رابط Neon الذي نسخته
   - `JWT_SECRET` = سلسلة عشوائية (مثلاً: `swiftbill-secret-$(openssl rand -hex 32)`)
4. في إعدادات Build:
   - Build Command: `npx prisma generate && next build`
   - (Vercel سيكتشف Next.js تلقائياً)
5. اضغط "Deploy"

## الخطوة 4: إعداد قاعدة البيانات على Vercel

بعد أول نشر، اذهب إلى Vercel Dashboard → المشروع → Settings → Functions
أو شغّل الأمر محلياً:

```bash
# ثبّت Vercel CLI
npm i -g vercel

# سجّل دخولك
vercel login

# اربط المشروع
vercel link

# اضبط متغيرات البيئة
vercel env add DATABASE_URL
vercel env add JWT_SECRET

# ادفع قاعدة البيانات (سيستخدم DATABASE_URL من .env)
npx prisma db push --accept-data-loss

# زرع بيانات المدير العام
npx prisma db seed  # أو: bun prisma/seed-superadmin.ts
```

## الخطوة 5: إضافة Prisma Postgres

في `prisma/schema.prisma`، عند النشر على Neon، غيّر:
```prisma
datasource db {
  provider = "postgresql"  // بدل "sqlite"
  url      = env("DATABASE_URL")
}
```

ثم شغّل:
```bash
npx prisma generate
npx prisma db push
```

## بيانات الدخول

بعد زرع بيانات المدير العام (م-0: بلا قيم افتراضية مضمّنة):
```bash
SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="strong-password" bun prisma/seed-superadmin.ts
```
- البريد وكلمة المرور يحددهما أنت عبر متغيرات البيئة — لا تنشرهما في المستودع

## ملاحظات مهمة

- ⚠️ لا ترفع ملف `.env` إلى GitHub (مُتجاهل في .gitignore)
- ⚠️ استبدل JWT_SECRET بسلسلة عشوائية قوية
- ⚠️ أضف نطاق Vercel إلى CORS إذا لزم الأمر
- ✅ الكوكيز مضبوطة على `sameSite: "none"` + `secure: false` (غيّر `secure` إلى `true` عند استخدام HTTPS)
