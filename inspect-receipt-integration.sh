#!/usr/bin/env bash

echo "=============================================="
echo " EIS RECEIPT INTEGRATION INSPECTOR"
echo "=============================================="

echo
echo "===== 1. PROJECT STRUCTURE ====="
find src -maxdepth 4 -type f \
  \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  | sort

echo
echo "===== 2. PARENT PAY BILL FILES ====="
find src -type f \
  \( -iname "*ParentPayBill*" -o -iname "*PayBill*" -o -iname "*Payment*" \) \
  -print

echo
echo "===== 3. RECEIPT FILES ====="
find src -type f \
  \( -iname "*receipt*" -o -iname "*invoice*" \) \
  -print

echo
echo "===== 4. SUPABASE FILES ====="
find src supabase -type f \
  \( -iname "*supabase*" -o -path "*/functions/*" -o -path "*/migrations/*" \) \
  -print 2>/dev/null

echo
echo "===== 5. ROUTER / APP FILES ====="
find src -type f \
  \( -iname "App.tsx" -o -iname "App.jsx" -o -iname "*router*" -o -iname "*routes*" \) \
  -print

echo
echo "===== 6. PAYMENT REFERENCES ====="
grep -RniE \
  "paystack|transaction_reference|transactionRef|payment_id|receipt_number|generatePDF|Payment Successful" \
  src \
  --include="*.tsx" \
  --include="*.ts" \
  --include="*.jsx" \
  --include="*.js" \
  2>/dev/null \
  | head -n 250

echo
echo "===== 7. SUPABASE PAYMENT TABLE REFERENCES ====="
grep -RniE \
  "from\\(['\"]payments|from\\(['\"]fee_invoices|student_fee_assignments|payments" \
  src \
  --include="*.tsx" \
  --include="*.ts" \
  --include="*.jsx" \
  --include="*.js" \
  2>/dev/null \
  | head -n 200

echo
echo "===== 8. EXISTING RECEIPT SECURITY FILES ====="
find src supabase -type f \
  \( -iname "*security*" -o -iname "*barcode*" -o -iname "*qr*" -o -iname "*verify*" \) \
  -print 2>/dev/null

echo
echo "=============================================="
echo " INSPECTION COMPLETE"
echo "=============================================="
