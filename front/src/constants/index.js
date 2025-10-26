// Order Status Constants
export const ORDER_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'قيد التحضير',
  [ORDER_STATUS.APPROVED]: 'معتمد',
  [ORDER_STATUS.COMPLETED]: 'مكتمل',
  [ORDER_STATUS.CANCELLED]: 'ملغي',
};

// User Role Constants
export const USER_ROLES = {
  ADMIN: 1,
  DESIGNER: 2,
  PREPARER: 3,
  DESIGN_MANAGER: 4,
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'مدير النظام',
  [USER_ROLES.DESIGNER]: 'مصمم',
  [USER_ROLES.PREPARER]: 'معد',
  [USER_ROLES.DESIGN_MANAGER]: 'مدير التصميم',
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
  XS: 1,
  S: 2,        // Note: Same value as Size2
  M: 3,
  L: 4,        // Note: Same value as Size4
  XL: 5,
  XXL: 6,      // Note: Same value as Size6
  Size3XL: 7,
  Size4XL: 8,
  Size5XL: 9,
  Size6XL: 10,
  Size7XL: 11
};

// Size Labels (Arabic) - Handling conflicts by prioritizing letter sizes
export const SIZE_LABELS = {
  [SIZE_ENUM.XS]: 'XS',
  [SIZE_ENUM.S]: 'S',           // Prioritizing S over Size2 for value 2
  [SIZE_ENUM.M]: 'M',
  [SIZE_ENUM.L]: 'L',           // Prioritizing L over Size4 for value 4
  [SIZE_ENUM.XL]: 'XL',
  [SIZE_ENUM.XXL]: 'XXL',       // Prioritizing XXL over Size6 for value 6
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

// Color Enum (matching backend)
export const COLOR_ENUM = {
  Black: 1,         // أسود
  White: 2,         // أبيض
  Skin: 3,          // سكني
  Blue: 4,          // أزرق
  Brown: 5,         // بني
  Purple: 6,        // بنفسجي
  Pink: 7,          // زهري
  Beige: 8,         // بيج
  Burgundy: 9       // خمري
};

// Color Labels (Arabic)
export const COLOR_LABELS = {
  [COLOR_ENUM.Black]: 'أسود',
  [COLOR_ENUM.White]: 'أبيض',
  [COLOR_ENUM.Skin]: 'سكني',
  [COLOR_ENUM.Blue]: 'أزرق',
  [COLOR_ENUM.Brown]: 'بني',
  [COLOR_ENUM.Purple]: 'بنفسجي',
  [COLOR_ENUM.Pink]: 'زهري',
  [COLOR_ENUM.Beige]: 'بيج',
  [COLOR_ENUM.Burgundy]: 'خمري'
};

// Legacy arrays for backward compatibility (deprecated)
export const FABRIC_TYPES = Object.values(FABRIC_TYPE_LABELS);
export const SIZES = Object.values(SIZE_LABELS);
export const COLORS = Object.values(COLOR_LABELS);

// Size conflict resolution helper
export const SIZE_CONFLICTS = {
  2: { primary: 'S', secondary: 'Size2' },
  4: { primary: 'L', secondary: 'Size4' },
  6: { primary: 'XXL', secondary: 'Size6' }
};

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
