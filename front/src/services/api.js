import axios from 'axios';

// إعداد Axios للاتصال مع الباك اند .NET
const API_BASE_URL = 'http://localhost:5000/api'; // سيتم تحديثه لاحقاً

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة Token للطلبات (للمصادقة)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// معالجة الأخطاء
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - إعادة توجيه لتسجيل الدخول
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ============= خدمات المصادقة =============
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// ============= خدمات الطلبات =============
export const ordersService = {
  // جلب جميع الطلبات
  getAllOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  // جلب طلب محدد
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // إنشاء طلب جديد
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // تحديث حالة الطلب
  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  // حذف طلب
  deleteOrder: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },

  // رفع صور التصميم
  uploadDesignImages: async (orderId, images) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    const response = await api.post(`/orders/${orderId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ============= خدمات الموظفين =============
export const employeesService = {
  // جلب جميع الموظفين
  getAllEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },

  // جلب موظف محدد
  getEmployeeById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  // إنشاء حساب موظف جديد
  createEmployee: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },

  // تحديث بيانات موظف
  updateEmployee: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },

  // حذف موظف
  deleteEmployee: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
};

// ============= خدمات الإحصائيات =============
export const statsService = {
  // جلب إحصائيات الأدمن
  getAdminStats: async () => {
    const response = await api.get('/stats/admin');
    return response.data;
  },

  // جلب إحصائيات موظف
  getEmployeeStats: async (employeeId) => {
    const response = await api.get(`/stats/employee/${employeeId}`);
    return response.data;
  },
};

export default api;


