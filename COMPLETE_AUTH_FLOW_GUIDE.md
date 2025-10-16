# دليل Flow المصادقة الكامل - من البداية للنهاية

## 🎯 نظرة عامة
هذا الدليل يوضح الـ flow الكامل للمصادقة من تسجيل مستخدم جديد وحتى إدارة الاشتراكات المتقدمة.

---

## 📋 الخطوات الكاملة

### المرحلة 1: إنشاء حساب جديد
### المرحلة 2: تسجيل الدخول (فترة تجريبية)
### المرحلة 3: إنشاء اشتراك
### المرحلة 4: إدارة الاشتراك
### المرحلة 5: العمليات المتقدمة

---

## 🚀 المرحلة 1: إنشاء حساب جديد

### الخطوة 1.1: تسجيل مستخدم جديد
**`POST /auth/register`**

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

**الاستجابة:**
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

**✅ النتيجة:** تم إنشاء الحساب بنجاح - المستخدم يحصل على 7 أيام فترة تجريبية

---

## 🔑 المرحلة 2: تسجيل الدخول (فترة تجريبية)

### الخطوة 2.1: تسجيل الدخول
**`POST /auth/login`**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmed123",
    "password": "password123"
  }'
```

**الاستجابة (فترة تجريبية):**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "last_login": "2024-01-15T10:35:00.000Z",
    "subscription": {
      "is_active": true,
      "plan_type": "trial",
      "start_date": "2024-01-15",
      "end_date": "2024-01-22",
      "days_remaining": 7,
      "is_trial": true,
      "trial_days_remaining": 7
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

**✅ النتيجة:** المستخدم الآن مسجل دخول وله 7 أيام فترة تجريبية

### الخطوة 2.2: التحقق من معلومات المستخدم
**`GET /auth/me`**

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**الاستجابة:**
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
      "plan_type": "trial",
      "start_date": "2024-01-15",
      "end_date": "2024-01-22",
      "days_remaining": 7,
      "is_trial": true,
      "trial_days_remaining": 7
    }
  }
}
```

### الخطوة 2.3: التحقق من حالة الاشتراك
**`GET /auth/subscription`**

```bash
curl -X GET http://localhost:3000/auth/subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**الاستجابة:**
```json
{
  "subscription": {
    "is_active": true,
    "plan_type": "trial",
    "start_date": "2024-01-15",
    "end_date": "2024-01-22",
    "days_remaining": 7,
    "is_trial": true,
    "trial_days_remaining": 7
  }
}
```

---

## 💳 المرحلة 3: إنشاء اشتراك

### الخيار 3.1: إنشاء اشتراك بدون توكن (للمستخدمين الجدد)
**`POST /auth/create-subscription`**

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

**الاستجابة:**
```json
{
  "message": "تم إنشاء الاشتراك بنجاح",
  "user": {
    "id": 1,
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "full_name": "أحمد محمد",
    "phone": "01234567890",
    "last_login": "2024-01-15T10:35:00.000Z",
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

**✅ النتيجة:** تم إنشاء اشتراك premium لمدة 3 أشهر + حصول على توكن جديد

---

## 🔄 المرحلة 4: إدارة الاشتراك

### الخطوة 4.1: تجديد الاشتراك (استبدال كامل)
**`POST /auth/renew-subscription`**

```bash
curl -X POST http://localhost:3000/auth/renew-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "plan_type": "pro",
    "months": 6
  }'
```

**الاستجابة:**
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

### الخطوة 4.2: تمديد الاشتراك الحالي
**`POST /auth/extend-subscription`**

```bash
curl -X POST http://localhost:3000/auth/extend-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "months": 2
  }'
```

**الاستجابة:**
```json
{
  "message": "تم تمديد الاشتراك بنجاح",
  "subscription": {
    "plan_type": "pro",
    "start_date": "2024-01-15",
    "end_date": "2024-09-15",
    "is_active": true,
    "days_remaining": 243,
    "months_added": 2
  }
}
```

### الخطوة 4.3: تغيير نوع الاشتراك
**`POST /auth/change-subscription-plan`**

```bash
curl -X POST http://localhost:3000/auth/change-subscription-plan \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "new_plan_type": "premium"
  }'
```

**الاستجابة:**
```json
{
  "message": "تم تغيير نوع الاشتراك بنجاح",
  "subscription": {
    "plan_type": "premium",
    "start_date": "2024-01-15",
    "end_date": "2024-09-15",
    "is_active": true,
    "days_remaining": 243,
    "previous_plan": "pro"
  }
}
```

---

## 🔧 المرحلة 5: العمليات المتقدمة

### الخطوة 5.1: تغيير كلمة المرور
**`POST /auth/change-password`**

```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword123"
  }'
```

**الاستجابة:**
```json
{
  "message": "تم تحديث كلمة المرور بنجاح"
}
```

### الخطوة 5.2: التحقق من حالة المستخدم
**`GET /auth/user-status`**

```bash
curl -X GET http://localhost:3000/auth/user-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**الاستجابة:**
```json
{
  "user_id": 1,
  "username": "ahmed123",
  "is_active_in_db": 1,
  "calculated_active": 1,
  "subscription": {
    "plan_type": "premium",
    "start_date": "2024-01-15",
    "end_date": "2024-09-15",
    "is_active": 1
  },
  "needs_update": false
}
```

### الخطوة 5.3: تسجيل الخروج
**`POST /auth/logout`**

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**الاستجابة:**
```json
{
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

## 🔄 Flow كامل في سيناريو واحد

### السيناريو: مستخدم جديد يريد استخدام النظام

```bash
# 1️⃣ إنشاء حساب جديد
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "full_name": "مستخدم جديد",
    "phone": "01234567890"
  }'

# 2️⃣ تسجيل الدخول (فترة تجريبية)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123"
  }'

# 3️⃣ التحقق من الحالة
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <token_from_step_2>"

# 4️⃣ إنشاء اشتراك بعد انتهاء الفترة التجريبية
curl -X POST http://localhost:3000/auth/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "plan_type": "premium",
    "months": 3
  }'

# 5️⃣ استخدام النظام مع الاشتراك الجديد
curl -X GET http://localhost:3000/auth/subscription \
  -H "Authorization: Bearer <new_token_from_step_4>"

# 6️⃣ تمديد الاشتراك لاحقاً
curl -X POST http://localhost:3000/auth/extend-subscription \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"months": 2}'

# 7️⃣ تسجيل الخروج
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <token>"
```

---

## 📊 حالات مختلفة للمستخدمين

### حالة 1: مستخدم جديد (فترة تجريبية)
```json
{
  "subscription": {
    "is_active": true,
    "plan_type": "trial",
    "is_trial": true,
    "trial_days_remaining": 7
  }
}
```

### حالة 2: مستخدم مع اشتراك نشط
```json
{
  "subscription": {
    "is_active": true,
    "plan_type": "premium",
    "is_trial": false,
    "days_remaining": 45
  }
}
```

### حالة 3: مستخدم مع اشتراك منتهي
```json
{
  "error": "حساب غير نشط",
  "message": "حسابك غير نشط. يرجى تجديد الاشتراك أو إنشاء اشتراك جديد",
  "subscription_required": true
}
```

---

## ⚠️ حالات الخطأ الشائعة

### خطأ في تسجيل الدخول
```json
{
  "error": "فشل تسجيل الدخول",
  "message": "اسم المستخدم أو كلمة المرور غير صحيحة"
}
```

### توكن غير صحيح
```json
{
  "error": "غير مصرح",
  "message": "توكن غير صحيح أو منتهي الصلاحية"
}
```

### اشتراك موجود بالفعل
```json
{
  "error": "اشتراك موجود",
  "message": "لديك اشتراك نشط بالفعل"
}
```

### انتهت صلاحية الاشتراك
```json
{
  "error": "انتهت صلاحية الاشتراك",
  "message": "يرجى تجديد الاشتراك للوصول للخدمة"
}
```

---

## 🎯 ملخص Flow

1. **إنشاء حساب** → فترة تجريبية 7 أيام
2. **تسجيل دخول** → استخدام النظام مجاناً
3. **إنشاء اشتراك** → استمرار الاستخدام
4. **إدارة الاشتراك** → تجديد/تمديد/تغيير
5. **العمليات اليومية** → تسجيل دخول/خروج/تغيير كلمة مرور

**✅ النتيجة النهائية:** نظام مصادقة كامل مع فترة تجريبية وإدارة شاملة للاشتراكات!
