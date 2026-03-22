import { STORAGE_KEYS } from "../constants";

/** يطابق مفاتيح Tenant:Tenants في الباكند */
export const TENANT_IDS = {
  PSBRAND: "1",
  MAVA: "2",
};

export const TENANT_OPTIONS = [
  { id: TENANT_IDS.PSBRAND, label: "PSBrand", description: "قاعدة البيانات الافتراضية" },
  { id: TENANT_IDS.MAVA, label: "MAVA", description: "قاعدة البيانات الثانية" },
];

const DEFAULT_TENANT = TENANT_IDS.PSBRAND;

export function getTenantId() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.TENANT_ID);
    if (v === TENANT_IDS.PSBRAND || v === TENANT_IDS.MAVA) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_TENANT;
}

export function setTenantId(id) {
  const normalized =
    id === TENANT_IDS.MAVA || id === "2" ? TENANT_IDS.MAVA : TENANT_IDS.PSBRAND;
  try {
    localStorage.setItem(STORAGE_KEYS.TENANT_ID, normalized);
  } catch {
    /* ignore */
  }
  return normalized;
}

/** لربط SignalR: إضافة tenant_id للـ URL (يدعم WebSocket بدون هيدر مخصص) */
export function appendTenantQuery(url) {
  const id = getTenantId();
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tenant_id=${encodeURIComponent(id)}`;
}
