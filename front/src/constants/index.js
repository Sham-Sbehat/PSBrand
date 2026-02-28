// Order Status Constants
export const ORDER_STATUS = {
  PENDING_PRINTING: 1,    // بانتظار الطباعة
  IN_PRINTING: 2,         // في مرحلة الطباعة
  IN_PREPARATION: 3,      // في مرحلة التحضير
  COMPLETED: 4,           // مكتمل
  CANCELLED: 5,           // ملغي
  OPEN_ORDER: 6,          // الطلب مفتوح (المحضّر أخذ الطلب)
  SENT_TO_DELIVERY_COMPANY: 7,  // تم الإرسال لشركة التوصيل
  IN_PACKAGING: 8,        // في مرحلة التغليف
  RETURNED_SHIPMENT: 9,   // طرد مرتجع
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING_PRINTING]: 'بانتظار الطباعة',
  [ORDER_STATUS.IN_PRINTING]: 'في مرحلة الطباعة',
  [ORDER_STATUS.IN_PREPARATION]: 'في مرحلة التحضير',
  [ORDER_STATUS.COMPLETED]: 'مكتمل',
  [ORDER_STATUS.CANCELLED]: 'ملغي',
  [ORDER_STATUS.OPEN_ORDER]: 'الطلب مفتوح',
  [ORDER_STATUS.SENT_TO_DELIVERY_COMPANY]: 'تم الإرسال لشركة التوصيل',
  [ORDER_STATUS.IN_PACKAGING]:  'في مرحلة التغليف',
  [ORDER_STATUS.RETURNED_SHIPMENT]: 'طرد مرتجع',
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING_PRINTING]: 'warning',
  [ORDER_STATUS.IN_PRINTING]: 'info',
  [ORDER_STATUS.IN_PREPARATION]: 'secondary',
  [ORDER_STATUS.COMPLETED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'error',
  [ORDER_STATUS.OPEN_ORDER]: 'primary',
  [ORDER_STATUS.SENT_TO_DELIVERY_COMPANY]: 'info',
  [ORDER_STATUS.IN_PACKAGING]: 'warning',
  [ORDER_STATUS.RETURNED_SHIPMENT]: 'default',
};

// User Role Constants
export const USER_ROLES = {
  ADMIN: 1,
  DESIGNER: 2,
  PREPARER: 3,
  DESIGN_MANAGER: 4,
  PACKAGER: 5,
  MAIN_DESIGNER: 6,
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'مدير النظام',
  [USER_ROLES.DESIGNER]: 'بائع',
  [USER_ROLES.PREPARER]: 'معد',
  [USER_ROLES.DESIGN_MANAGER]: 'مدير التصميم',
  [USER_ROLES.PACKAGER]: 'مسؤول تغليف الطلبات',
  [USER_ROLES.MAIN_DESIGNER]: 'المصمم الرئيسي',
};


// Size Enum (matching backend exactly)
export const SIZE_ENUM = {
  Size2: 2,
  Size4: 4,
  Size6: 6,
  Size8: 8,
  Size10: 10,
  Size12: 12,
  Size14: 14,
  Size16: 16,
  Size18: 18,
  XS: 101,
  S: 102,
  M: 103,
  L: 104,
  XL: 105,
  XXL: 106,
  Size3XL: 107,
  Size4XL: 108,
  Size5XL: 109,
  Size6XL: 110,
  Size7XL: 111
};

// Size Labels (Arabic) - Handling conflicts by prioritizing letter sizes
export const SIZE_LABELS = {
  [SIZE_ENUM.Size2]: '2',
  [SIZE_ENUM.Size4]: '4',
  [SIZE_ENUM.Size6]: '6',
  [SIZE_ENUM.XS]: 'XS',
  [SIZE_ENUM.S]: 'S',
  [SIZE_ENUM.M]: 'M',
  [SIZE_ENUM.L]: 'L',
  [SIZE_ENUM.XL]: 'XL',
  [SIZE_ENUM.XXL]: 'XXL',
  [SIZE_ENUM.Size3XL]: '3XL',
  [SIZE_ENUM.Size4XL]: '4XL',
  [SIZE_ENUM.Size5XL]: '5XL',
  [SIZE_ENUM.Size6XL]: '6XL',
  [SIZE_ENUM.Size7XL]: '7XL',
  [SIZE_ENUM.Size8]: '8',
  [SIZE_ENUM.Size10]: '10',
  [SIZE_ENUM.Size12]: '12',
  [SIZE_ENUM.Size14]: '14',
  [SIZE_ENUM.Size16]: '16',
  [SIZE_ENUM.Size18]: '18'
};

// Fabric Type Enum (matching backend)
export const FABRIC_TYPE_ENUM = {
  Cotton200g: 1,        // قطن 200 غرام
  Cotton250g: 2,        // قطن 250 غرام
  Cotton100Percent: 3,  // 100% قطن
  FrenchTerry: 4,       // فرنشتيري
  LightSleeve: 5,       // كم خفيف
  HoodieFleecePadded: 6, // هودي فوتر مبطن
  Hoodie280g: 7,       // هودي 280 غرام
  Hoodie330g: 8,       // هودي 330 غرام
  Hoodie400g: 9,       // هودي 400 غرام
  JacketFleece: 10,    // جكيت فوتر
  Sweatshirt: 11,      // سويت شيرت
  HalfZip: 12,         // نص سحاب
  TrackSuit: 14        // ترنج
};

// Fabric Type Labels (Arabic)
export const FABRIC_TYPE_LABELS = {
  [FABRIC_TYPE_ENUM.Cotton200g]: 'قطن 200 غرام',
  [FABRIC_TYPE_ENUM.Cotton250g]: 'قطن 250 غرام',
  [FABRIC_TYPE_ENUM.Cotton100Percent]: '100% قطن',
  [FABRIC_TYPE_ENUM.FrenchTerry]: 'فرنشتيري',
  [FABRIC_TYPE_ENUM.LightSleeve]: 'كم خفيف',
  [FABRIC_TYPE_ENUM.HoodieFleecePadded]: 'هودي فوتر مبطن',
  [FABRIC_TYPE_ENUM.Hoodie280g]: 'هودي 280 غرام',
  [FABRIC_TYPE_ENUM.Hoodie330g]: 'هودي 330 غرام',
  [FABRIC_TYPE_ENUM.Hoodie400g]: 'هودي 400 غرام',
  [FABRIC_TYPE_ENUM.JacketFleece]: 'جكيت فوتر',
  [FABRIC_TYPE_ENUM.Sweatshirt]: 'سويت شيرت',
  [FABRIC_TYPE_ENUM.HalfZip]: 'نص سحاب',
  [FABRIC_TYPE_ENUM.TrackSuit]: 'ترنج'
};

// Color Labels (Arabic) - Fallback for when API data is not available
export const COLOR_LABELS = {
  1: 'أسود',
  2: 'أبيض',
  3: 'سكني',
  4: 'أزرق',
  5: 'بني',
  6: 'بنفسجي',
  7: 'زهري',
  8: 'بيج',
  9: 'خمري'
};

// Legacy arrays for backward compatibility (deprecated)
export const FABRIC_TYPES = Object.values(FABRIC_TYPE_LABELS);
export const SIZES = Object.values(SIZE_LABELS);

// Helper function to get size label by value (handles conflicts)
export const getSizeLabelByValue = (value) => {
  return SIZE_LABELS[value] || 'Unknown';
};

// Helper function to get size value by label
export const getSizeValueByLabel = (label) => {
  const entry = Object.entries(SIZE_LABELS).find(([key, value]) => value === label);
  return entry ? parseInt(entry[0]) : 0;
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    LOGOUT: '/auth/logout',
  },
  ORDERS: {
    GET_ALL: '/Orders/GetOrders',
    GET_BY_ID: '/Orders/GetOrder',
    CREATE: '/Orders/CreateOrder',
    UPDATE_STATUS: '/Orders/UpdateOrderStatus',
    DELETE: '/Orders/DeleteOrder',
    UPLOAD_IMAGES: '/Orders',
  },
  USERS: {
    GET_ALL: '/Users/GetUsers',
    GET_BY_ID: '/Users/GetUser',
    GET_BY_ROLE: '/Users/role',
    CREATE: '/Users/CreateUser',
    DELETE: '/Users/DeleteUser',
  },
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_DATA: 'userData',
  AUTH_TOKEN: 'authToken',
};

// Form Validation Rules
export const VALIDATION_RULES = {
  REQUIRED: (message = 'هذا الحقل مطلوب') => ({
    required: message,
  }),
  PHONE: (message = 'رقم الهاتف غير صحيح') => ({
    pattern: {
      value: /^[0-9+\-\s()]+$/,
      message,
    },
  }),
  EMAIL: (message = 'البريد الإلكتروني غير صحيح') => ({
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message,
    },
  }),
  MIN_LENGTH: (min, message = `يجب أن يكون على الأقل ${min} أحرف`) => ({
    minLength: {
      value: min,
      message,
    },
  }),
  MAX_LENGTH: (max, message = `يجب أن يكون على الأكثر ${max} أحرف`) => ({
    maxLength: {
      value: max,
      message,
    },
  }),
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'خطأ في الاتصال بالخادم',
  UNAUTHORIZED: 'غير مخول للوصول',
  FORBIDDEN: 'ممنوع الوصول',
  NOT_FOUND: 'المورد غير موجود',
  VALIDATION_ERROR: 'خطأ في التحقق من البيانات',
  UNKNOWN_ERROR: 'حدث خطأ غير متوقع',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'تم إنشاء الطلب بنجاح',
  ORDER_UPDATED: 'تم تحديث الطلب بنجاح',
  ORDER_DELETED: 'تم حذف الطلب بنجاح',
  USER_CREATED: 'تم إنشاء المستخدم بنجاح',
  USER_UPDATED: 'تم تحديث المستخدم بنجاح',
  USER_DELETED: 'تم حذف المستخدم بنجاح',
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
};

// Default Values
export const DEFAULT_VALUES = {
  ORDER: {
    STATUS: ORDER_STATUS.PENDING,
    QUANTITY: 1,
    UNIT_PRICE: 0,
    TOTAL_AMOUNT: 0,
  },
  USER: {
    IS_ACTIVE: true,
  },
};
