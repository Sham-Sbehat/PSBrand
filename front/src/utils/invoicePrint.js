/**
 * توليد HTML الفاتورة من بيانات الطلبات (من API) للطباعة من الفرونت
 * يدعم طباعة طلب واحد أو عدة طلبات في فاتورة واحدة
 */

const INVOICE_SETTINGS = {
  companyName: import.meta.env.VITE_INVOICE_COMPANY_NAME || "PSBrand",
  companyPhone: import.meta.env.VITE_INVOICE_COMPANY_PHONE || "0569483466",
  companyAddress: import.meta.env.VITE_INVOICE_COMPANY_ADDRESS || "",
  logoUrl: import.meta.env.VITE_INVOICE_LOGO_URL || "https://res.cloudinary.com/dz5dobxsr/image/upload/v1770741443/logo_psb_1_f5sus5.png",
};

function escapeHtml(text) {
  if (text == null) return "";
  const s = String(text);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNum(n) {
  const num = Number(n);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

function getItemDescription(design, item) {
  const designName = design?.designName ?? design?.name ?? "-";
  const size = item?.sizeEntity?.nameAr ?? item?.sizeNameAr ?? item?.size ?? "-";
  const color = item?.colorEntity?.nameAr ?? item?.colorNameAr ?? item?.color ?? "-";
  const fabric = item?.fabricTypeEntity?.nameAr ?? item?.fabricTypeNameAr ?? item?.fabricType ?? "-";
  return `${designName} | ${size}، ${color}، ${fabric}`;
}

function renderOrderSection(order, startRowNum, isMultiOrder) {
  const client = order?.client ?? {};
  const clientName = client?.name ?? "-";
  const clientPhone = client?.phone ?? client?.phone1 ?? "-";
  const address = order?.clientAddress || client?.address || [order?.country, order?.province, order?.district].filter(Boolean).join("، ") || "-";
  const orderDate = order?.orderDate || order?.createdAt;
  const dateStr = orderDate ? new Date(orderDate).toISOString().slice(0, 10) : "-";

  let rowsHtml = "";
  let rowNum = startRowNum;
  const designs = order?.orderDesigns ?? [];

  for (const design of designs) {
    const items = design?.orderDesignItems ?? [];
    for (const item of items) {
      const desc = getItemDescription(design, item);
      const qty = item?.quantity ?? 0;
      const unitPrice = item?.unitPrice ?? 0;
      const totalPrice = item?.totalPrice ?? qty * unitPrice;
      rowsHtml += `
        <tr>
          <td style="border:1px solid #d1d9e0;padding:6px;text-align:center">${rowNum}</td>
          <td style="border:1px solid #d1d9e0;padding:6px;font-size:13px">${escapeHtml(desc)}</td>
          <td style="border:1px solid #d1d9e0;padding:6px;text-align:center">${qty}</td>
          <td style="border:1px solid #d1d9e0;padding:6px;text-align:left">${formatNum(unitPrice)}</td>
          <td style="border:1px solid #d1d9e0;padding:6px;text-align:left">${formatNum(totalPrice)}</td>
        </tr>`;
      rowNum++;
    }
  }

  const subTotal = Number(order?.subTotal ?? 0);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? 0);
  const additionalPrice = Number(order?.additionalPrice ?? 0);
  const totalAmount = Number(order?.totalAmount ?? 0);
  const notes = order?.notes ?? "";

  const orderHeader = isMultiOrder
    ? `<div style="margin-bottom:12px;padding:8px;background:#f5f7fa;border-radius:6px;border-right:4px solid #1e3a5f">
         <strong>رقم الطلب: ${escapeHtml(order?.orderNumber ?? order?.id ?? "-")}</strong> — التاريخ: ${dateStr} — العميل: ${escapeHtml(clientName)}
       </div>`
    : "";

  const summaryHtml = `
    <div style="margin-top:14px;margin-right:auto;width:220px;background:#e8eef4;padding:12px;border-radius:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>المجموع الفرعي:</span><span>${formatNum(subTotal)}</span></div>
      ${discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>الخصم:</span><span>-${formatNum(discountAmount)}</span></div>` : ""}
      ${deliveryFee > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>التوصيل:</span><span>${formatNum(deliveryFee)}</span></div>` : ""}
      ${additionalPrice > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>إضافي:</span><span>${formatNum(additionalPrice)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #d1d9e0;font-weight:bold">
        <span>المجموع النهائي</span><span>${formatNum(totalAmount)} ₪</span>
      </div>
    </div>`;

  return {
    orderHeader,
    clientInfo: !isMultiOrder
      ? `
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:16px">
      <div>
        <div style="font-weight:600;margin-bottom:4px">رقم الطلب: ${escapeHtml(order?.orderNumber ?? order?.id ?? "-")}</div>
        <div style="font-size:13px;color:#5a5a5a">التاريخ: ${dateStr}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:600;margin-bottom:4px">العميل</div>
        <div>${escapeHtml(clientName)}</div>
        <div style="font-size:13px">${escapeHtml(clientPhone)}</div>
        <div style="margin-top:8px;font-weight:600;font-size:13px">مكان التوصيل:</div>
        <div style="font-size:13px;color:#5a5a5a">${escapeHtml(address)}</div>
      </div>
    </div>`
      : `
    <div style="margin-bottom:12px;padding:8px;background:#f5f7fa;border-radius:6px;border-right:4px solid #1e3a5f">
      <strong>رقم الطلب: ${escapeHtml(order?.orderNumber ?? order?.id ?? "-")}</strong> — التاريخ: ${dateStr}
      <div style="margin-top:4px">العميل: ${escapeHtml(clientName)} | ${escapeHtml(clientPhone)}</div>
      <div style="margin-top:4px"><strong>مكان التوصيل:</strong> ${escapeHtml(address)}</div>
    </div>`,
    rowsHtml,
    summaryHtml,
    notes: notes ? `<div style="margin-top:12px"><strong>ملاحظات:</strong><div style="font-size:13px">${escapeHtml(notes)}</div></div>` : "",
    nextRowNum: rowNum,
  };
}

/**
 * توليد HTML كامل للفاتورة من قائمة طلبات
 * @param {Array} orders - مصفوفة الطلبات (يجب أن تحتوي على orderDesigns و orderDesignItems)
 * @returns {string} HTML جاهز للطباعة
 */
export function generateInvoiceHtml(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return "";

  const isMultiOrder = orders.length > 1;
  const logo = INVOICE_SETTINGS.logoUrl
    ? `<img src="${escapeHtml(INVOICE_SETTINGS.logoUrl)}" alt="Logo" style="height:42px;max-width:120px;object-fit:contain" />`
    : "";

  let contentBlocks = "";
  let rowNum = 1;

  if (isMultiOrder) {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const section = renderOrderSection(order, rowNum, true);
      contentBlocks += `
      <div class="order-block" style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px dashed #d1d9e0">
        ${section.orderHeader}
        <table>
          <thead>
            <tr style="background:#e8eef4">
              <th style="border:1px solid #d1d9e0;padding:8px;width:40px">ر.ت</th>
              <th style="border:1px solid #d1d9e0;padding:8px;text-align:right">الوصف</th>
              <th style="border:1px solid #d1d9e0;padding:8px;width:60px">الكمية</th>
              <th style="border:1px solid #d1d9e0;padding:8px;width:90px">سعر الوحدة</th>
              <th style="border:1px solid #d1d9e0;padding:8px;width:90px">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${section.rowsHtml}</tbody>
        </table>
        ${section.summaryHtml}
        ${section.notes}
      </div>`;
      rowNum = section.nextRowNum;
    }
  } else {
    const section = renderOrderSection(orders[0], 1, false);
    contentBlocks = `
  ${section.clientInfo}
  <table>
    <thead>
      <tr style="background:#e8eef4">
        <th style="border:1px solid #d1d9e0;padding:8px;width:40px">ر.ت</th>
        <th style="border:1px solid #d1d9e0;padding:8px;text-align:right">الوصف</th>
        <th style="border:1px solid #d1d9e0;padding:8px;width:60px">الكمية</th>
        <th style="border:1px solid #d1d9e0;padding:8px;width:90px">سعر الوحدة</th>
        <th style="border:1px solid #d1d9e0;padding:8px;width:90px">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${section.rowsHtml}</tbody>
  </table>
  ${section.summaryHtml}
  ${section.notes}`;
  }

  const title = isMultiOrder
    ? `فاتورة مجمعة (${orders.length} طلبات)`
    : `فاتورة طلب ${orders[0]?.orderNumber ?? orders[0]?.id ?? ""}`;

  const safeTitle = escapeHtml(title);
  const orderNums = orders.length === 1 
    ? String(orders[0]?.orderNumber ?? orders[0]?.id ?? "")
    : orders.map(o => o?.orderNumber ?? o?.id).filter(Boolean).join("-");
  const safeFilename = `فاتورة-${orderNums || Date.now()}.pdf`;
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 1.2cm; font-size: 14px; color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; }
    .invoice-actions { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .invoice-actions button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
    .invoice-actions .btn-print { background: #1976d2; color: white; }
    .invoice-actions .btn-pdf { background: #2e7d32; color: white; }
    .invoice-actions button:hover { opacity: 0.9; }
    @media print { .invoice-actions { display: none !important; } body { padding: 0.5cm; } .order-block { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="invoice-actions">
    <button class="btn-print" onclick="window.print()">طباعة</button>
    <button class="btn-pdf" onclick="saveAsPdf()">حفظ كـ PDF</button>
  </div>
  <div id="invoice-content">
  <div style="background:#1e3a5f;color:#fff;padding:16px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
    <div style="display:flex;align-items:center;gap:16px">
      ${logo}
      <div>
        <div style="font-size:20px;font-weight:bold">${escapeHtml(INVOICE_SETTINGS.companyName)}</div>
        ${INVOICE_SETTINGS.companyAddress ? `<div style="font-size:12px;opacity:0.9">${escapeHtml(INVOICE_SETTINGS.companyAddress)}</div>` : ""}
        ${INVOICE_SETTINGS.companyPhone ? `<div style="font-size:12px;opacity:0.9">${escapeHtml(INVOICE_SETTINGS.companyPhone)}</div>` : ""}
      </div>
    </div>
    <div style="font-size:24px;font-weight:bold">${escapeHtml(title)}</div>
  </div>

  ${contentBlocks}
  </div>
  <script>
    function saveAsPdf() {
      if (typeof html2pdf === 'undefined') {
        alert('جاري تحميل المكتبة...');
        return;
      }
      var el = document.getElementById('invoice-content');
      var opt = { margin: 10, filename: '${safeFilename}', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      html2pdf().set(opt).from(el).save();
    }
  </script>
</body>
</html>`;
}

/**
 * فتح نافذة الطباعة للطلبات المحددة
 * @param {Array} orders - مصفوفة الطلبات الكاملة (من getOrderById)
 */
export function openInvoicePrintWindow(orders) {
  const html = generateInvoiceHtml(orders);
  if (!html) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("الرجاء السماح بالنوافذ المنبثقة لطباعة الفاتورة");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
