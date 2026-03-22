/**
 * استخراج قائمة العملاء والعدد الإجمالي من رد الـ API (يدعم مصفوفة أو كائن + totalCount/count).
 * يُستخدم في لوحة الأدمن وإدارة العملاء حتى لا يختلف الرقم في الشريط عن الجدول.
 */
export function parseClientsListResponse(response) {
  let clients = [];
  let total = 0;

  if (Array.isArray(response)) {
    clients = response;
    total = response.length;
    return { clients, total };
  }

  if (!response || typeof response !== "object") {
    return { clients: [], total: 0 };
  }

  const totalFromMeta =
    response.totalCount ??
    response.total ??
    response.count ??
    response.TotalCount ??
    response.Count;

  if (Array.isArray(response.clients)) {
    clients = response.clients;
    total = totalFromMeta ?? clients.length;
    return { clients, total };
  }

  if (Array.isArray(response.data)) {
    clients = response.data;
    total = totalFromMeta ?? clients.length;
    return { clients, total };
  }

  const arrayKey = Object.keys(response).find((key) => Array.isArray(response[key]));
  if (arrayKey) {
    clients = response[arrayKey];
    total = totalFromMeta ?? clients.length;
    return { clients, total };
  }

  if (typeof totalFromMeta === "number") {
    return { clients: [], total: totalFromMeta };
  }

  return { clients: [], total: 0 };
}
