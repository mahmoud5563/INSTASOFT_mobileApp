# توثيق واجهة المصادقة (Auth API)

كل الروتات تستخدم جدول user_add فقط. يجب إرسال الطلبات كـ JSON (POST) أو عبر Header في التوكن كما هو موضح.

---

## تسجيل الدخول

**POST** /auth/login

- تسجيل دخول المستخدم وارجاع التوكن.

### Body:
```json
{
  "username": "اسم_المستخدم",
  "password": "كلمة_المرور"
}
```
#### Response:
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "id": 1,
    "username": "demo",
    "power": 0,
    "intro_date": "2024-01-01"
  },
  "token": "JWT_TOKEN_HERE",
  "token_type": "Bearer"
}
```

---
## إنشاء مستخدم جديد

**POST** /auth/register

- تسجيل مستخدم جديد.

### Body:
```json
{
  "username": "اسم_المستخدم",
  "password": "كلمة_المرور",
  "power": 0
}
```
#### Response:
```json
{
  "message": "تم إنشاء الحساب بنجاح",
  "user": {
    "user_code": 1,
    "user_name": "demo",
    "user_power": 0,
    "user_check": true,
    "intro_date": "2024-01-01"
  }
}
```

---
## بيانات المستخدم الحالي

**GET** /auth/me

- يرجع بيانات المستخدم المرتبط بالتوكن.
- يجب إرسال التوكن في Header:  
`Authorization: Bearer {token}`

#### Response:
```json
{
  "user": {
    "id": 1,
    "username": "demo",
    "power": 0,
    "intro_date": "2024-01-01",
    "is_active": true
  }
}
```

---
## تغيير كلمة المرور

**POST** /auth/change-password

- يجب إرسال التوكن في الهيدر.

### Body:
```json
{
  "current_password": "كلمة_المرور_القديمة",
  "new_password": "كلمة_المرور_الجديدة"
}
```
#### Response:
```json
{
  "message": "تم تحديث كلمة المرور بنجاح"
}
```

---
## إعادة تعيين كلمة المرور (نسيت كلمة المرور)

**POST** /auth/forgot-password

- إعادة تعيين كلمة المرور عند النسيان.

### Body:
```json
{
  "username": "اسم_المستخدم",
  "current_password": "كلمة_المرور_القديمة",
  "new_password": "كلمة_المرور_الجديدة"
}
```
#### Response:
```json
{
  "message": "تم تحديث كلمة المرور بنجاح",
  "user": {
    "id": 1,
    "username": "demo"
  }
}
```

---

## ملاحظات:
- كل الاستعلامات تعمل مع جدول user_add بدون أي اشتراكات.
- حالة تفعيل المستخدم تعتمد على user_check و user_end_day.
- يجب إرسال التوكن مع أي روت محمي في header بالشكل:  
`Authorization: Bearer {token}`

---

