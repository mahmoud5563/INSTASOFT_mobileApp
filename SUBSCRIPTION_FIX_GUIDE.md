# دليل إصلاح مشكلة الاشتراك للمستخدمين الجدد

## المشكلة الأصلية
كان المستخدمون الجدد يواجهون مشكلة في تسجيل الدخول حيث كان النظام يطلب اشتراك نشط، لكن المستخدم لا يستطيع إنشاء اشتراك بدون توكن، مما يخلق مشكلة دائرية.

## الحلول المطبقة

### 1. إضافة فترة تجريبية (7 أيام)
- **الملف**: `routes/auth.js` و `middleware/auth.js`
- **الوصف**: المستخدمون الجدد يحصلون على فترة تجريبية لمدة 7 أيام من تاريخ إنشاء الحساب
- **المميزات**:
  - يمكن للمستخدم تسجيل الدخول خلال الفترة التجريبية
  - يحصل على توكن صالح
  - يمكنه استخدام جميع الخدمات خلال هذه الفترة

### 2. إنشاء endpoint جديد لإنشاء الاشتراك
- **الملف**: `routes/auth.js`
- **المسار**: `POST /auth/create-subscription`
- **الوصف**: يسمح للمستخدمين بإنشاء اشتراك جديد بدون الحاجة لتوكن
- **المعاملات المطلوبة**:
  ```json
  {
    "username": "اسم المستخدم أو البريد الإلكتروني",
    "password": "كلمة المرور",
    "plan_type": "نوع الاشتراك",
    "months": "عدد الأشهر (1-12)"
  }
  ```

### 3. تحديث منطق المصادقة
- **الملف**: `middleware/auth.js`
- **الوصف**: تم تحديث middleware المصادقة ليدعم الفترة التجريبية
- **المميزات**:
  - يتحقق من الفترة التجريبية قبل رفض الوصول
  - يعطي معلومات مفصلة عن حالة الاشتراك

## كيفية الاستخدام

### للمستخدمين الجدد:

#### 1. تسجيل الدخول (مع الفترة التجريبية)
```bash
POST /auth/login
{
  "username": "your_username",
  "password": "your_password"
}
```

**الاستجابة**:
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your_email@example.com",
    "subscription": {
      "is_active": true,
      "plan_type": "trial",
      "is_trial": true,
      "trial_days_remaining": 6,
      "days_remaining": 6
    }
  },
  "token": "jwt_token_here",
  "token_type": "Bearer"
}
```

#### 2. إنشاء اشتراك جديد (بدون توكن)
```bash
POST /auth/create-subscription
{
  "username": "your_username",
  "password": "your_password",
  "plan_type": "premium",
  "months": 3
}
```

**الاستجابة**:
```json
{
  "message": "تم إنشاء الاشتراك بنجاح",
  "user": {
    "id": 1,
    "username": "your_username",
    "subscription": {
      "is_active": true,
      "plan_type": "premium",
      "is_trial": false,
      "days_remaining": 90
    }
  },
  "token": "jwt_token_here",
  "token_type": "Bearer"
}
```

### للمستخدمين الموجودين:

#### 1. تسجيل الدخول العادي
```bash
POST /auth/login
{
  "username": "your_username",
  "password": "your_password"
}
```

#### 2. تجديد الاشتراك (يتطلب توكن)
```bash
POST /auth/renew-subscription
Authorization: Bearer your_token
{
  "plan_type": "premium",
  "months": 6
}
```

## حالات الاستجابة المختلفة

### 1. تسجيل دخول ناجح (فترة تجريبية)
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "subscription": {
      "is_active": true,
      "plan_type": "trial",
      "is_trial": true,
      "trial_days_remaining": 5
    }
  },
  "token": "jwt_token"
}
```

### 2. تسجيل دخول ناجح (اشتراك نشط)
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "subscription": {
      "is_active": true,
      "plan_type": "premium",
      "is_trial": false,
      "days_remaining": 25
    }
  },
  "token": "jwt_token"
}
```

### 3. حساب غير نشط (انتهت الفترة التجريبية)
```json
{
  "error": "حساب غير نشط",
  "message": "حسابك غير نشط. يرجى تجديد الاشتراك أو إنشاء اشتراك جديد",
  "subscription_required": true
}
```

### 4. اشتراك موجود بالفعل
```json
{
  "error": "اشتراك موجود",
  "message": "لديك اشتراك نشط بالفعل",
  "subscription": {
    "plan_type": "premium",
    "is_active": true
  }
}
```

## المميزات الجديدة

1. **فترة تجريبية**: 7 أيام مجانية للمستخدمين الجدد
2. **إنشاء اشتراك بدون توكن**: حل المشكلة الدائرية
3. **معلومات مفصلة عن الاشتراك**: تشمل حالة الفترة التجريبية
4. **مرونة في التعامل**: دعم مختلف حالات المستخدمين

## ملاحظات مهمة

- الفترة التجريبية تُحسب من تاريخ إنشاء الحساب
- يمكن للمستخدم إنشاء اشتراك في أي وقت خلال الفترة التجريبية
- بعد انتهاء الفترة التجريبية، يجب إنشاء اشتراك للاستمرار
- جميع endpoints السابقة تعمل كما هي بدون تغيير
