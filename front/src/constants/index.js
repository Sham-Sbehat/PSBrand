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

// Fabric Types
export const FABRIC_TYPES = [
  'قطن',
  'بوليستر',
  'حرير',
  'صوف',
  'كتان',
  'دنة',
];

// Sizes
export const SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
];

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
