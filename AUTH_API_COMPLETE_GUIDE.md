# دليل شامل لـ APIs المصادقة (Authentication APIs)

## 📋 نظرة عامة
هذا الدليل يوضح جميع APIs الخاصة بالمصادقة في ملف `routes/auth.js` مع أمثلة مفصلة لكل endpoint.

---

## 🔐 APIs المصادقة الأساسية

### 1. تسجيل الدخول
**`POST /auth/login`**

#### الوصف
تسجيل دخول المستخدم مع دعم الفترة التجريبية (7 أيام للمستخدمين الجدد)

#### المعاملات المطلوبة
```json
{
  "username": "string",  // اسم المستخدم أو البريد الإلكتروني
  "password": "string"   // كلمة المرور (6 أحرف على الأقل)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmed123",
    "password": "password123"
  }'
```

#### الاستجابات المحتملة

**✅ نجح تسجيل الدخول (فترة تجريبية)**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "last_login": "2024-01-15T10:30:00.000Z",
    "subscription": {
      "is_active": true,
      "plan_type": "trial",
      "start_date": "2024-01-08",
      "end_date": "2024-01-15",
      "days_remaining": 3,
      "is_trial": true,
      "trial_days_remaining": 3
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

**✅ نجح تسجيل الدخول (اشتراك نشط)**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "last_login": "2024-01-15T10:30:00.000Z",
    "subscription": {
      "is_active": true,
      "plan_type": "premium",
      "start_date": "2024-01-01",
      "end_date": "2024-04-01",
      "days_remaining": 76,
      "is_trial": false,
      "trial_days_remaining": 0
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

**❌ فشل تسجيل الدخول**
```json
{
  "error": "فشل تسجيل الدخول",
  "message": "اسم المستخدم أو كلمة المرور غير صحيحة"
}
```

**❌ حساب غير نشط**
```json
{
  "error": "حساب غير نشط",
  "message": "حسابك غير نشط. يرجى تجديد الاشتراك أو إنشاء اشتراك جديد",
  "subscription_required": true
}
```

---

### 2. تسجيل مستخدم جديد
**`POST /auth/register`**

#### الوصف
إنشاء حساب مستخدم جديد

#### المعاملات المطلوبة
```json
{
  "username": "string",    // اسم المستخدم (3 أحرف على الأقل)
  "email": "string",       // البريد الإلكتروني (صيغة صحيحة)
  "password": "string",    // كلمة المرور (6 أحرف على الأقل)
  "full_name": "string",   // الاسم الكامل
  "phone": "string"        // رقم الهاتف (اختياري)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "password": "password123",
    "full_name": "أحمد محمد",
    "phone": "01234567890"
  }'
```

#### الاستجابات المحتملة

**✅ نجح التسجيل**
```json
{
  "message": "تم إنشاء الحساب بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "is_active": 1,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**❌ بيانات غير صحيحة**
```json
{
  "error": "بيانات غير صحيحة",
  "details": [
    "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    "البريد الإلكتروني غير صحيح"
  ]
}
```

**❌ مستخدم موجود**
```json
{
  "error": "مستخدم موجود",
  "message": "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل"
}
```

---

### 3. تسجيل الخروج
**`POST /auth/logout`**

#### الوصف
تسجيل خروج المستخدم (حذف التوكن من العميل)

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الاستجابة
```json
{
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

### 4. معلومات المستخدم الحالي
**`GET /auth/me`**

#### الوصف
جلب معلومات المستخدم المسجل دخوله حالياً

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### مثال على الطلب
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الاستجابة
```json
{
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "subscription": {
      "is_active": true,
      "plan_type": "premium",
      "start_date": "2024-01-01",
      "end_date": "2024-04-01",
      "days_remaining": 76,
      "is_trial": false,
      "trial_days_remaining": 0
    }
  }
}
```

---

## 🔑 إدارة كلمة المرور

### 5. تغيير كلمة المرور
**`POST /auth/change-password`**

#### الوصف
تغيير كلمة مرور المستخدم الحالي

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### المعاملات المطلوبة
```json
{
  "current_password": "string",  // كلمة المرور الحالية
  "new_password": "string"       // كلمة المرور الجديدة (6 أحرف على الأقل)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "oldpassword123",
    "new_password": "newpassword123"
  }'
```

#### الاستجابات المحتملة

**✅ نجح التغيير**
```json
{
  "message": "تم تحديث كلمة المرور بنجاح"
}
```

**❌ كلمة مرور غير صحيحة**
```json
{
  "error": "كلمة مرور غير صحيحة",
  "message": "كلمة المرور الحالية غير صحيحة"
}
```

---

## 📊 إدارة الاشتراكات

### 6. معلومات الاشتراك الحالي
**`GET /auth/subscription`**

#### الوصف
جلب معلومات الاشتراك للمستخدم الحالي

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### مثال على الطلب
```bash
curl -X GET http://localhost:3000/auth/subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الاستجابة
```json
{
  "subscription": {
    "is_active": true,
    "plan_type": "premium",
    "start_date": "2024-01-01",
    "end_date": "2024-04-01",
    "days_remaining": 76,
    "is_trial": false,
    "trial_days_remaining": 0
  }
}
```

---

### 7. إنشاء اشتراك جديد (بدون توكن)
**`POST /auth/create-subscription`**

#### الوصف
إنشاء اشتراك جديد للمستخدمين الجدد بدون الحاجة لتوكن

#### المعاملات المطلوبة
```json
{
  "username": "string",  // اسم المستخدم أو البريد الإلكتروني
  "password": "string",  // كلمة المرور
  "plan_type": "string", // نوع الاشتراك (مثل: basic, premium, pro)
  "months": "number"     // عدد الأشهر (1-12)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmed123",
    "password": "password123",
    "plan_type": "premium",
    "months": 3
  }'
```

#### الاستجابات المحتملة

**✅ نجح إنشاء الاشتراك**
```json
{
  "message": "تم إنشاء الاشتراك بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "last_login": "2024-01-15T10:30:00.000Z",
    "subscription": {
      "is_active": true,
      "plan_type": "premium",
      "start_date": "2024-01-15",
      "end_date": "2024-04-15",
      "days_remaining": 90,
      "is_trial": false,
      "trial_days_remaining": 0
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

**❌ اشتراك موجود بالفعل**
```json
{
  "error": "اشتراك موجود",
  "message": "لديك اشتراك نشط بالفعل",
  "subscription": {
    "plan_type": "premium",
    "start_date": "2024-01-01",
    "end_date": "2024-04-01",
    "is_active": true
  }
}
```

---

### 8. تجديد الاشتراك (استبدال كامل)
**`POST /auth/renew-subscription`**

#### الوصف
تجديد الاشتراك بالكامل (استبدال الاشتراك الحالي)

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### المعاملات المطلوبة
```json
{
  "plan_type": "string", // نوع الاشتراك الجديد
  "months": "number"     // عدد الأشهر (1-12)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/renew-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "plan_type": "pro",
    "months": 6
  }'
```

#### الاستجابة
```json
{
  "message": "تم تجديد الاشتراك بنجاح",
  "subscription": {
    "plan_type": "pro",
    "start_date": "2024-01-15",
    "end_date": "2024-07-15",
    "is_active": true,
    "days_remaining": 181
  }
}
```

---

### 9. تمديد الاشتراك الحالي
**`POST /auth/extend-subscription`**

#### الوصف
إضافة أشهر للاشتراك الحالي (بدون تغيير نوع الاشتراك)

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### المعاملات المطلوبة
```json
{
  "months": "number"  // عدد الأشهر المراد إضافتها (1-12)
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/extend-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "months": 3
  }'
```

#### الاستجابة
```json
{
  "message": "تم تمديد الاشتراك بنجاح",
  "subscription": {
    "plan_type": "premium",
    "start_date": "2024-01-01",
    "end_date": "2024-07-01",
    "is_active": true,
    "days_remaining": 167,
    "months_added": 3
  }
}
```

---

### 10. تغيير نوع الاشتراك
**`POST /auth/change-subscription-plan`**

#### الوصف
تغيير نوع الاشتراك مع الحفاظ على تاريخ الانتهاء

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### المعاملات المطلوبة
```json
{
  "new_plan_type": "string"  // نوع الاشتراك الجديد
}
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/change-subscription-plan \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "new_plan_type": "pro"
  }'
```

#### الاستجابة
```json
{
  "message": "تم تغيير نوع الاشتراك بنجاح",
  "subscription": {
    "plan_type": "pro",
    "start_date": "2024-01-01",
    "end_date": "2024-04-01",
    "is_active": true,
    "days_remaining": 76,
    "previous_plan": "premium"
  }
}
```

---

## 🔧 APIs الإدارة

### 11. تحديث حالة جميع المستخدمين
**`POST /auth/update-all-users-status`**

#### الوصف
تحديث حالة جميع المستخدمين بناءً على الاشتراكات النشطة

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### مثال على الطلب
```bash
curl -X POST http://localhost:3000/auth/update-all-users-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الاستجابة
```json
{
  "message": "تم تحديث حالة جميع المستخدمين بنجاح",
  "statistics": {
    "total_users": 150,
    "active_users": 120,
    "inactive_users": 30
  }
}
```

---

### 12. حالة المستخدم الحالي
**`GET /auth/user-status`**

#### الوصف
جلب حالة المستخدم الحالي مع تفاصيل الاشتراك

#### Headers المطلوبة
```
Authorization: Bearer <token>
```

#### مثال على الطلب
```bash
curl -X GET http://localhost:3000/auth/user-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الاستجابة
```json
{
  "user_id": 1,
  "username": "ahmed123",
  "is_active_in_db": 1,
  "calculated_active": 1,
  "subscription": {
    "plan_type": "premium",
    "start_date": "2024-01-01",
    "end_date": "2024-04-01",
    "is_active": 1
  },
  "needs_update": false
}
```

---

## 📝 ملاحظات مهمة

### رموز الحالة (Status Codes)
- **200**: نجح الطلب
- **201**: تم إنشاء المورد بنجاح
- **400**: بيانات غير صحيحة
- **401**: غير مصرح (توكن غير صحيح أو منتهي الصلاحية)
- **403**: ممنوع (حساب غير نشط)
- **404**: غير موجود
- **409**: تعارض (مستخدم أو اشتراك موجود)
- **500**: خطأ في الخادم

### أنواع الاشتراكات المدعومة
- **trial**: فترة تجريبية (7 أيام)
- **basic**: اشتراك أساسي
- **premium**: اشتراك مميز
- **pro**: اشتراك احترافي

### الفترة التجريبية
- المستخدمون الجدد يحصلون على 7 أيام مجانية
- يمكن استخدام جميع الخدمات خلال الفترة التجريبية
- بعد انتهاء الفترة التجريبية، يجب إنشاء اشتراك للاستمرار

### التوكن (JWT Token)
- صالح لمدة 24 ساعة (قابل للتخصيص)
- يحتوي على معلومات المستخدم والاشتراك
- يجب إرساله في header `Authorization: Bearer <token>`

### الأمان
- كلمات المرور مشفرة باستخدام bcrypt
- التحقق من صحة البيانات قبل المعالجة
- حماية من SQL Injection باستخدام parameterized queries

---

## 🚀 أمثلة سريعة

### تسجيل مستخدم جديد وتسجيل دخول
```bash
# 1. تسجيل مستخدم جديد
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "full_name": "مستخدم جديد"
  }'

# 2. تسجيل دخول (فترة تجريبية)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123"
  }'

# 3. إنشاء اشتراك
curl -X POST http://localhost:3000/auth/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "plan_type": "premium",
    "months": 3
  }'
```

### إدارة الاشتراك
```bash
# 1. جلب معلومات الاشتراك
curl -X GET http://localhost:3000/auth/subscription \
  -H "Authorization: Bearer <token>"

# 2. تمديد الاشتراك
curl -X POST http://localhost:3000/auth/extend-subscription \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"months": 2}'

# 3. تغيير نوع الاشتراك
curl -X POST http://localhost:3000/auth/change-subscription-plan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"new_plan_type": "pro"}'
```

هذا الدليل يغطي جميع APIs الخاصة بالمصادقة مع أمثلة مفصلة لكل endpoint! 🎉
