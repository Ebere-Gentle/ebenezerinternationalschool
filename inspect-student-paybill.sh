#!/usr/bin/env bash

echo "=============================================="
echo " EIS STUDENT PAY BILL INSPECTOR"
echo "=============================================="

echo
echo "===== STUDENT PAY BILL ====="
sed -n '1,260p' src/pages/student/StudentPayBill.tsx

echo
echo "===== PARENT PAY BILL ====="
sed -n '1,260p' src/pages/parent/ParentPayBill.tsx

echo
echo "===== PAYMENT HANDLER ====="
sed -n '1,760p' src/pages/parent/hooks/usePaymentHandlers.ts

echo
echo "===== SUCCESS RECEIPT ====="
sed -n '1,460p' src/pages/parent/components/SuccessReceiptModal.tsx

echo
echo "===== COMMON RECEIPT ====="
sed -n '1,700p' src/components/common/ReceiptModal.tsx

echo
echo "=============================================="
echo " INSPECTION COMPLETE"
echo "=============================================="
