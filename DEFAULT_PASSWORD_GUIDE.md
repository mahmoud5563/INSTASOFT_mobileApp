# دليل كلمات المرور الافتراضية

## نظرة عامة
تم إضافة دعم لكلمتي مرور افتراضيتين في نظام المصادقة:
- `11000` - كلمة مرور افتراضية للإدارة (admin)
- `13579` - كلمة مرور افتراضية للعملاء (client)

هذه الكلمات تعمل كبديل لكلمة المرور العادية في الحالات التالية:

## الاستخدامات المدعومة

### 1. تسجيل الدخول (Login)
يمكن استخدام كلمات المرور الافتراضية `11000` أو `13579` بدلاً من كلمة المرور العادية:

```bash
POST /api/auth/login
Content-Type: application/json

{
    "username": "your_username",
    "password": "11000"
}
```

أو

```bash
POST /api/auth/login
Content-Type: application/json

{
    "username": "your_username",
    "password": "13579"
}
```

### 2. نسيان كلمة المرور (Forgot Password)
يمكن استخدام كلمة المرور الافتراضية في حقل "current_password":

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
    "username": "your_username",
    "current_password": "11000",
    "new_password": "your_new_password"
}
```

### 3. تغيير كلمة المرور (Change Password)
يمكن استخدام كلمة المرور الافتراضية في حقل "current_password":

```bash
POST /api/auth/change-password
Authorization: Bearer your_token
Content-Type: application/json

{
    "current_password": "11000",
    "new_password": "your_new_password"
}
```

### 4. إنشاء اشتراك جديد
يمكن استخدام كلمة المرور الافتراضية للتحقق من الهوية:

```bash
POST /api/auth/create-subscription
Content-Type: application/json

{
    "username": "your_username",
    "password": "11000",
    "plan_type": "premium",
    "months": 6
}
```

## الأمان

⚠️ **تحذير مهم**: كلمة المرور الافتراضية `11000` مخصصة للاستخدام في حالات الطوارئ أو الإدارة فقط. يُنصح بتغييرها إلى كلمة مرور قوية بعد الاستخدام.

## الاختبار

يمكنك اختبار الوظائف باستخدام ملف الاختبار المرفق:

```bash
node test_default_password.js
```

تأكد من:
1. تشغيل الخادم أولاً (`npm start`)
2. وجود مستخدم في قاعدة البيانات للاختبار
3. تحديث اسم المستخدم في ملف الاختبار

## ملاحظات تقنية

- كلمة المرور الافتراضية تعمل كـ fallback فقط
- يتم التحقق من كلمة المرور العادية أولاً، ثم كلمة المرور الافتراضية
- كلمة المرور الافتراضية لا تحتاج تشفير لأنها ثابتة
- جميع العمليات الأخرى (تسجيل مستخدم جديد، إلخ) لا تدعم كلمة المرور الافتراضية
- **متطلبات كلمة المرور**: الحد الأدنى لكلمة المرور هو 5 أحرف (تم تحديثه من 6 أحرف)

## التحديثات المستقبلية

يمكن تغيير كلمة المرور الافتراضية من خلال تعديل متغير `DEFAULT_PASSWORD` في ملف `routes/auth.js`.
