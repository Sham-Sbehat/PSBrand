import axios from "axios";

// إعداد Axios للاتصال مع الباك اند .NET
const API_BASE_URL = "https://localhost:44345/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// إضافة Token للطلبات (للمصادقة)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
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
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ============= خدمات المصادقة =============
export const authService = {
  login: async (credentials) => {
    const response = await api.post("/Auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
};

// ============= خدمات الطلبات =============
export const ordersService = {
  // جلب جميع الطلبات
  getAllOrders: async () => {
    const response = await api.get("/orders");
    return response.data;
  },

  // جلب طلب محدد
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // إنشاء طلب جديد
  createOrder: async (orderData) => {
    const response = await api.post("/orders", orderData);
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
      formData.append("images", image);
    });
    const response = await api.post(`/orders/${orderId}/images`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export const employeesService = {
  convertRoleToNumber: (role) => {
    switch (role) {
      case "admin":
        return 1;
      case "designer":
        return 2;
      case "preparer":
        return 3;
      case "designmanager":
        return 4;
      default:
        return 1;
    }
  },
  convertRoleToString: (roleNumber) => {
    switch (roleNumber) {
      case 1:
        return "admin";
      case 2:
        return "designer";
      case 3:
        return "preparer";
      case 4:
        return "designmanager";
      default:
        return "unknown";
    }
  },

  getAllEmployees: async () => {
    const response = await api.get("/Users/GetUsers");
    return response.data;
  },
  getEmployeeById: async (id) => {
    const response = await api.get(`/Users/GetUser${id}`);
    return response.data;
  },
  createEmployee: async (employeeData) => {
    const apiData = {
      name: employeeData.name,
      username: employeeData.username,
      password: employeeData.password,
      phone: employeeData.phone,
      role: employeesService.convertRoleToNumber(employeeData.role),
      isActive: true,
    };

    const response = await api.post("/Users/CreateUser", apiData);
    return response.data;
  },

  deleteEmployee: async (id) => {
    const response = await api.delete(`/Users/DeleteUser/${id}`);
    return response.data;
  },
};
