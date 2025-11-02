import axios from "axios";
import { STORAGE_KEYS } from "../constants";
import { storage } from "../utils";

// Configuration
const API_BASE_URL = "https://localhost:44345/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Helper to read token: prefer sessionStorage, fallback to localStorage (for "Remember me")
const getAuthToken = () => {
  try {
    const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    if (sessionToken) return sessionToken;
    const localToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    return localToken || null;
  } catch {
    return null;
  }
};

const clearAuthTokenEverywhere = () => {
  try { sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch {}
  try { sessionStorage.removeItem(STORAGE_KEYS.USER_DATA); } catch {}
  storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  storage.remove(STORAGE_KEYS.USER_DATA);
};

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = getAuthToken();
    const isLoginAttempt = error.config?.url?.includes('/Auth/login');
    
    // Only redirect to login if it's a 401 error and not a login attempt
    // Don't redirect if the token is missing (user might not be logged in)
    if (error.response?.status === 401 && token && !isLoginAttempt) {
      // Check if the error is due to expired token
      if (error.response?.data?.message?.includes('expired') || 
          error.response?.data?.message?.includes('invalid')) {
        // Unauthorized - redirect to login
        clearAuthTokenEverywhere();
        window.location.href = "/";
      }
    }
    
    return Promise.reject(error);
  }
);

// Constants
const USER_ROLES = {
  ADMIN: 1,
  DESIGNER: 2,
  PREPARER: 3,
  DESIGN_MANAGER: 4,
};

const ROLE_STRINGS = {
  [USER_ROLES.ADMIN]: "admin",
  [USER_ROLES.DESIGNER]: "designer",
  [USER_ROLES.PREPARER]: "preparer",
  [USER_ROLES.DESIGN_MANAGER]: "designmanager",
};

// Utility functions
const convertRoleToNumber = (role) => {
  const roleMap = {
    "admin": USER_ROLES.ADMIN,
    "designer": USER_ROLES.DESIGNER,
    "preparer": USER_ROLES.PREPARER,
    "designmanager": USER_ROLES.DESIGN_MANAGER,
  };
  return roleMap[role] || USER_ROLES.ADMIN;
};

const convertRoleToString = (roleNumber) => {
  return ROLE_STRINGS[roleNumber] || "unknown";
};

// Authentication Service
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

// Orders Service
export const ordersService = {
  getAllOrders: async (params = {}) => {
    // Supports backend pagination/filtering; keeps backward compatibility by returning array when possible
    const response = await api.get("/Orders/GetOrders", { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getOrderById: async (id) => {
    const response = await api.get(`/Orders/GetOrder${id}`); // backend route is GetOrder{id}
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post("/Orders/CreateOrder", orderData);
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/Orders/UpdateOrderStatus/${id}`, { status });
    return response.data;
  },

  deleteOrder: async (id) => {
    console.log('Attempting to delete order with ID:', id);
    try {
      // Swagger shows: DELETE /api/Orders/DeleteOrder{id} (without / before number)
      const response = await api.delete(`/Orders/DeleteOrder${id}`);
      console.log('Delete response status:', response.status);
      console.log('Delete response:', response);
      // 204 No Content has no response body
      return { success: true, status: response.status };
    } catch (error) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  uploadDesignImages: async (orderId, images) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append("images", image);
    });
    
    const response = await api.post(`/Orders/${orderId}/UploadImages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getOrdersByDesigner: async (designerId) => {
    const response = await api.get(`/Orders/GetOrdersDesigner/${designerId}`);
    return response.data;
  },

  getOrdersByStatus: async (status) => {
    const response = await api.get(`/Orders/GetOrderStatus/${status}`);
    return response.data;
  },

  // Get orders for a specific preparer (can filter by status)
  getOrdersForPreparer: async (preparerId, status = null) => {
    const params = { preparerId };
    if (status !== null) {
      params.status = status;
    }
    const response = await api.get(`/Orders/GetOrdersForPreparer`, { params });
    return response.data;
  },

  // Assign preparer to order (if preparerId is not provided, uses auth token)
  assignPreparer: async (orderId, preparerId = null) => {
    const params = preparerId ? { preparerId } : {};
    const response = await api.post(`/Orders/AssignPreparer/${orderId}`, null, { params });
    return response.data;
  },

  // Update order notes
  updateOrderNotes: async (orderId, notes) => {
    const response = await api.patch(`/Orders/${orderId}/Notes`, { notes });
    return response.data;
  },
};

// Order Status Service
export const orderStatusService = {
  setInPrinting: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetInPrinting/${orderId}`);
    return response.data;
  },

  setInPreparation: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetInPreparation/${orderId}`);
    return response.data;
  },

  setCompleted: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetCompleted/${orderId}`);
    return response.data;
  },

  setCancelled: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetCancelled/${orderId}`);
    return response.data;
  },

  // New: mark order as OpenOrder
  setOpenOrder: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetOpenOrder/${orderId}`);
    return response.data;
  },
};

// Employees Service
export const employeesService = {
  // Utility functions
  convertRoleToNumber,
  convertRoleToString,

  // API calls
  getAllEmployees: async () => {
    const response = await api.get("/Users/GetUsers");
    return response.data;
  },

  getUsersByRole: async (role) => {
    const response = await api.get(`/Users/role/${role}`);
    return response.data;
  },

  getEmployeeById: async (id) => {
    const response = await api.get(`/Users/GetUser/${id}`);
    return response.data;
  },

  createEmployee: async (employeeData) => {
    const apiData = {
      name: employeeData.name,
      username: employeeData.username,
      password: employeeData.password,
      phone: employeeData.phone,
      role: convertRoleToNumber(employeeData.role),
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

// Clients Service
export const clientsService = {
  createClient: async (clientData) => {
    const response = await api.post("/Client/CreateClient", clientData);
    return response.data;
  },

  getAllClients: async () => {
    const response = await api.get("/Client/GetClients");
    return response.data;
  },

  getClientById: async (id) => {
    const response = await api.get(`/Client/GetClient/${id}`);
    return response.data;
  },

  searchClients: async (searchTerm) => {
    const response = await api.get(`/Client/search?searchTerm=${encodeURIComponent(searchTerm)}`);
    return response.data;
  },

  updateClient: async (id, clientData) => {
    const response = await api.put(`/Client/UpdateClient/${id}`, clientData);
    return response.data;
  },

  deleteClient: async (id) => {
    const response = await api.delete(`/Client/DeleteClient/${id}`);
    return response.data;
  },
};

// Delivery Service
export const deliveryService = {
  getDeliveryRegions: async () => {
    const response = await api.get('/Delivery/GetDeliveryRegions');
    return response.data;
  },
  getDeliveryFee: async (regionName) => {
    const response = await api.get(`/Delivery/GetDeliveryFee/${encodeURIComponent(regionName)}`);
    return response.data;
  }
};

// Export constants for use in components
export { USER_ROLES, ROLE_STRINGS };