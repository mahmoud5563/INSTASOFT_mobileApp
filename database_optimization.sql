-- تحسين أداء قاعدة البيانات - إضافة فهارس لتحسين الأداء
-- Database Performance Optimization - Adding Indexes for Better Performance

-- 1. فهارس لجدول account_add
CREATE NONCLUSTERED INDEX IX_account_add_code ON account_add (code);
CREATE NONCLUSTERED INDEX IX_account_add_acc_kind ON account_add (acc_kind);
CREATE NONCLUSTERED INDEX IX_account_add_acc_name ON account_add (acc_name);

-- 2. فهارس لجدول account_show
CREATE NONCLUSTERED INDEX IX_account_show_code ON account_show (code);
CREATE NONCLUSTERED INDEX IX_account_show_acc_kind ON account_show (acc_kind);
CREATE NONCLUSTERED INDEX IX_account_show_balance ON account_show (balance);

-- 3. فهارس لجدول account_trans
CREATE NONCLUSTERED INDEX IX_account_trans_code ON account_trans (code);
CREATE NONCLUSTERED INDEX IX_account_trans_date ON account_trans (trans_date);
CREATE NONCLUSTERED INDEX IX_account_trans_code_date ON account_trans (code, trans_date);

-- 4. فهارس لجدول invoice_list
CREATE NONCLUSTERED INDEX IX_invoice_list_accounts_code ON invoice_list (Accounts_code);
CREATE NONCLUSTERED INDEX IX_invoice_list_code ON invoice_list (code);
CREATE NONCLUSTERED INDEX IX_invoice_list_accounts_code_code ON invoice_list (Accounts_code, code);

-- 5. فهارس لجدول item_add
CREATE NONCLUSTERED INDEX IX_item_add_code ON item_add (code);

-- 6. فهارس لجدول item_movement
CREATE NONCLUSTERED INDEX IX_item_movement_acc_code ON item_movement (acc_code);
CREATE NONCLUSTERED INDEX IX_item_movement_code ON item_movement (code);
CREATE NONCLUSTERED INDEX IX_item_movement_date ON item_movement (trans_date);
CREATE NONCLUSTERED INDEX IX_item_movement_acc_code_code_date ON item_movement (acc_code, code, trans_date);

-- 7. فهارس مركبة لتحسين الاستعلامات المعقدة
CREATE NONCLUSTERED INDEX IX_account_add_kind_balance ON account_add (acc_kind, acc_Balance_open);
CREATE NONCLUSTERED INDEX IX_invoice_list_profits ON invoice_list (Accounts_code, code) 
    INCLUDE (item_earn, item_count, Accounts_name);

-- 8. إحصائيات محدثة لتحسين خطة التنفيذ
UPDATE STATISTICS account_add;
UPDATE STATISTICS account_show;
UPDATE STATISTICS account_trans;
UPDATE STATISTICS invoice_list;
UPDATE STATISTICS item_add;
UPDATE STATISTICS item_movement;

-- 9. تحسين استعلامات الأرباح
-- إنشاء view محسن لحساب الأرباح
CREATE VIEW v_customer_profits AS
SELECT 
    il.Accounts_code,
    il.Accounts_name,
    COUNT(*) as invoice_count,
    SUM(il.item_count) as total_items,
    SUM(il.item_earn * il.item_count) as total_earn,
    SUM(ia.buy * il.item_count) as total_cost,
    SUM((il.item_earn - ia.buy) * il.item_count) AS total_profit
FROM invoice_list il
INNER JOIN item_add ia ON il.code = ia.code
GROUP BY il.Accounts_code, il.Accounts_name;

-- 10. إنشاء view محسن للأرصدة
CREATE VIEW v_account_balances AS
SELECT 
    a.code,
    a.acc_name,
    a.acc_kind,
    a.acc_Balance_open,
    ISNULL(SUM(t.trans_debit), 0) AS total_debit,
    ISNULL(SUM(t.trans_credit), 0) AS total_credit,
    a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
FROM account_add a
LEFT JOIN account_trans t ON a.code = t.code
GROUP BY a.code, a.acc_name, a.acc_kind, a.acc_Balance_open;

-- ملاحظات مهمة:
-- 1. تأكد من تشغيل هذه الفهارس في بيئة التطوير أولاً
-- 2. راقب أداء قاعدة البيانات بعد إضافة الفهارس
-- 3. قد تحتاج إلى تعديل بعض الفهارس حسب نمط الاستخدام الفعلي
-- 4. استخدم SQL Server Management Studio لمراقبة أداء الاستعلامات
