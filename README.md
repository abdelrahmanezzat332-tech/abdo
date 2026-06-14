# الكيان

تطبيق داخلي عربي لإدارة وتسويق الوحدات العقارية، مبني باستخدام Next.js وSupabase وجاهز للنشر على Vercel.

## التشغيل المحلي

```bash
npm install
npm run dev
```

ثم افتح:

```text
http://localhost:3000
```

## Supabase

1. افتح Supabase SQL Editor في المشروع الجديد `alkayan`.
2. شغل الملف `supabase/schema.sql` كاملًا.
3. من صفحة التسجيل داخل التطبيق، أنشئ حساب الأدمن بالبريد:

```text
abdelrahmanezzat332@gmail.com
```

أي حساب بهذا البريد يحصل تلقائيًا على صلاحيات Admin كاملة داخل جدول `users`.

## متغيرات البيئة

المفاتيح العامة موجودة في `.env.example`. على Vercel أضف:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## الوحدات الجزئية

بعد تشغيل `supabase/schema.sql`، شغّل ملف
`supabase/add-partial-units.sql` مرة واحدة من Supabase SQL Editor لإضافة
حقول ودوال الوحدات الجزئية بدون تعديل بيانات الوحدات الحالية.
