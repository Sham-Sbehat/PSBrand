import axios from "axios";
import { STORAGE_KEYS } from "../constants";
import { storage } from "../utils";
import { getCache, setCache, clearCache, CACHE_KEYS } from "../utils/cache";

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://psbrand-backend-production.up.railway.app/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60 seconds timeout - increased for orders with large data
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
  PACKAGER: 5,
};

const ROLE_STRINGS = {
  [USER_ROLES.ADMIN]: "admin",
  [USER_ROLES.DESIGNER]: "designer",
  [USER_ROLES.PREPARER]: "preparer",
  [USER_ROLES.DESIGN_MANAGER]: "designmanager",
  [USER_ROLES.PACKAGER]: "packager",
};

// Utility functions
const convertRoleToNumber = (role) => {
  const roleMap = {
    "admin": USER_ROLES.ADMIN,
    "designer": USER_ROLES.DESIGNER,
    "preparer": USER_ROLES.PREPARER,
    "designmanager": USER_ROLES.DESIGN_MANAGER,
    "packager": USER_ROLES.PACKAGER,
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

// Helper function for retry logic
const retryRequest = async (requestFn, maxRetries = 2, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      // Only retry on timeout or network errors
      if (i === maxRetries - 1 || (!error.code?.includes('ECONNABORTED') && error.response)) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Orders Service
export const ordersService = {
  getAllOrders: async (params = {}) => {
    const userSpecifiedPage = params.page !== undefined;
    const baseParams = {
      page: userSpecifiedPage ? params.page : 1,
      pageSize: params.pageSize ?? 50, // تقليل من 100 إلى 50
    };
    const otherParams = { ...params, ...baseParams };

    const accumulatedOrders = [];
    let currentPage = baseParams.page;
    let keepFetching = true;
    let totalSum = null;
    let totalSumWithoutDelivery = null;
    const hasDateFilter = !!params.date;

    while (keepFetching) {
      const response = await retryRequest(async () => {
        return await api.get("/Orders/GetOrders", {
          params: { ...otherParams, page: currentPage },
          timeout: 60000,
        });
      });

      const payload = response.data;

      // Extract totalSum and totalSumWithoutDelivery from first page when date filter is active
      if (hasDateFilter && currentPage === baseParams.page) {
        if (!Array.isArray(payload) && payload) {
          totalSum = payload.totalSum ?? null;
          totalSumWithoutDelivery = payload.totalSumWithoutDelivery ?? null;
        }
      }

      if (Array.isArray(payload)) {
        accumulatedOrders.push(...payload);
        break;
      }

      const pageData = Array.isArray(payload?.data) ? payload.data : [];

      if (userSpecifiedPage) {
        // If date filter is active, return object with totals
        if (hasDateFilter) {
          return {
            orders: pageData,
            totalSum: payload?.totalSum ?? null,
            totalSumWithoutDelivery: payload?.totalSumWithoutDelivery ?? null,
          };
        }
        return pageData;
      }

      accumulatedOrders.push(...pageData);

      const hasNext =
        payload?.hasNextPage ??
        (typeof payload?.totalPages === "number"
          ? currentPage < payload.totalPages
          : false);

      if (!hasNext) {
        keepFetching = false;
      } else {
        currentPage += 1;
      }
    }

    // If date filter is active, return object with totals
    if (hasDateFilter) {
      return {
        orders: accumulatedOrders,
        totalSum,
        totalSumWithoutDelivery,
      };
    }

    return accumulatedOrders;
  },

  getOrderById: async (id) => {
    const response = await api.get(`/Orders/GetOrder/${id}`);
    return response.data;
  },

  getDesignersStatistics: async (date) => {
    // إرسال التاريخ بصيغة YYYY-MM-DD مباشرة
    const response = await api.get("/Orders/GetDesignersStatistics", {
      params: { date },
    });
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

  updateOrder: async (id, orderData) => {
    const response = await api.put(`/Orders/UpdateOrder/${id}`, orderData);
    return response.data;
  },

  deleteOrder: async (id) => {
    try {
      // Swagger shows: DELETE /api/Orders/DeleteOrder{id} (without / before number)
      const response = await api.delete(`/Orders/DeleteOrder/${id}`);
      // 204 No Content has no response body
      return { success: true, status: response.status };
    } catch (error) {
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

  // Upload files before creating order
  uploadFiles: async (files) => {
    if (!files || files.length === 0) {
      return { success: true, uploadedCount: 0, totalCount: 0, files: [] };
    }
    
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    
    const response = await api.post("/Orders/UploadFiles", formData, {
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

  getOrdersByDesignerAndMonth: async (designerId, date) => {
    const response = await api.get(`/Orders/GetOrdersByDesignerAndMonth`, {
      params: {
        designerId: designerId,
        date: date
      }
    });
    return response.data;
  },

  getOrdersByPreparerAndMonth: async (preparerId, date) => {
    const response = await api.get(`/Orders/GetOrdersByPreparerAndMonth`, {
      params: {
        preparerId: preparerId,
        date: date
      }
    });
    return response.data;
  },

  getOrdersByStatus: async (status, date = null) => {
    const params = {};
    if (date) {
      params.date = date;
    }
    const response = await api.get(`/Orders/GetOrderStatus/${status}`, { params });
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

  // Update contacted status (toggle)
  updateContactedStatus: async (orderId, isContacted) => {
    const response = await api.patch(`/Orders/${orderId}/ContactedStatus`, {
      isContactedWithClient: isContacted
    });
    return response.data;
  },

  // Get confirmed delivery orders
  getConfirmedDeliveryOrders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.designerId) queryParams.append('designerId', params.designerId);
    
    const queryString = queryParams.toString();
    const url = `/Orders/GetConfirmedDeliveryOrders${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },
};

// Deposit Orders Service
export const depositOrdersService = {
  getAllDepositOrders: async (params = {}) => {
    const response = await api.get("/DepositOrders/GetDepositOrders", {
      params,
    });
    return response.data;
  },

  getDepositOrderById: async (id) => {
    const response = await api.get(`/DepositOrders/GetDepositOrder/${id}`);
    return response.data;
  },

  createDepositOrder: async (depositOrderData) => {
    const response = await api.post("/DepositOrders/CreateDepositOrder", depositOrderData);
    return response.data;
  },

  updateDepositOrder: async (id, depositOrderData) => {
    const response = await api.put(`/DepositOrders/UpdateDepositOrder/${id}`, depositOrderData);
    return response.data;
  },

  deleteDepositOrder: async (id) => {
    try {
      const response = await api.delete(`/DepositOrders/DeleteDepositOrder/${id}`);
      return { success: true, status: response.status };
    } catch (error) {
      throw error;
    }
  },

  updateContactedStatus: async (id, isContactedWithClient) => {
    const response = await api.patch(`/DepositOrders/${id}/ContactedStatus`, {
      isContactedWithClient,
    });
    return response.data;
  },

  sendToDeliveryCompany: async (id, shippingNotes = "") => {
    const response = await api.post(`/DepositOrders/${id}/SendToDeliveryCompany`, {
      shippingNotes,
    });
    return response.data;
  },
};

// Order Status Service
export const orderStatusService = {
  setPendingPrinting: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetPendingPrinting/${orderId}`);
    return response.data;
  },

  setInPrinting: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetInPrinting/${orderId}`);
    return response.data;
  },

  setInPreparation: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetInPreparation/${orderId}`);
    return response.data;
  },

  setOpenOrder: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetOpenOrder/${orderId}`);
    return response.data;
  },

  setInPackaging: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetInPackaging/${orderId}`);
    return response.data;
  },

  setCompleted: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetCompleted/${orderId}`);
    return response.data;
  },

  setSentToDeliveryCompany: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetSentToDeliveryCompany/${orderId}`);
    return response.data;
  },

  setCancelled: async (orderId) => {
    const response = await api.post(`/OrderStatus/SetCancelled/${orderId}`);
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
    // Correct endpoint format: /Client/UpdateClient{id} (without / before id)
    const response = await api.put(`/Client/UpdateClient${id}`, clientData);
    return response.data;
  },

  deleteClient: async (id) => {
    // Correct endpoint format: /Client/DeleteClient{id} (without / before id)
    const response = await api.delete(`/Client/DeleteClient${id}`);
    // 204 No Content has no response body
    return { success: true, status: response.status };
  },
};

// Colors Service
export const colorsService = {
  getAllColors: async () => {
    // Check cache first (cache for 30 days - colors don't change often)
    const cacheKey = CACHE_KEYS.COLORS;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await api.get("/Colors");
    const colors = response.data;
    
    // Cache for 30 days
    setCache(cacheKey, colors, 30 * 24 * 60 * 60 * 1000);
    
    return colors;
  },

  getColorById: async (id) => {
    const response = await api.get(`/Colors/${id}`);
    return response.data;
  },

  createColor: async (colorData) => {
    const response = await api.post("/Colors", colorData);
    // Clear cache after creating new color
    clearCache(CACHE_KEYS.COLORS);
    return response.data;
  },

  updateColor: async (id, colorData) => {
    const response = await api.put(`/Colors/${id}`, colorData);
    // Clear cache after updating color
    clearCache(CACHE_KEYS.COLORS);
    return response.data;
  },

  deleteColor: async (id) => {
    try {
      const response = await api.delete(`/Colors/${id}`);
      return response.data;
    } finally {
      // Clear cache even if delete fails
      clearCache(CACHE_KEYS.COLORS);
    }
  },
};

// Sizes Service
export const sizesService = {
  getAllSizes: async () => {
    // Check cache first (cache for 30 days - sizes don't change often)
    const cacheKey = CACHE_KEYS.SIZES;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await api.get("/Sizes");
    const sizes = response.data;
    
    // Cache for 30 days
    setCache(cacheKey, sizes, 30 * 24 * 60 * 60 * 1000);
    
    return sizes;
  },

  getSizeById: async (id) => {
    const response = await api.get(`/Sizes/${id}`);
    return response.data;
  },

  createSize: async (sizeData) => {
    const response = await api.post("/Sizes", sizeData);
    // Clear cache after creating new size
    clearCache(CACHE_KEYS.SIZES);
    return response.data;
  },

  updateSize: async (id, sizeData) => {
    const response = await api.put(`/Sizes/${id}`, sizeData);
    // Clear cache after updating size
    clearCache(CACHE_KEYS.SIZES);
    return response.data;
  },

  deleteSize: async (id) => {
    try {
      const response = await api.delete(`/Sizes/${id}`);
      return response.data;
    } finally {
      // Clear cache even if delete fails
      clearCache(CACHE_KEYS.SIZES);
    }
  },
};

// Fabric Types Service
export const fabricTypesService = {
  getAllFabricTypes: async () => {
    // Check cache first (cache for 30 days - fabric types don't change often)
    const cacheKey = CACHE_KEYS.FABRIC_TYPES;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await api.get("/FabricTypes");
    const fabricTypes = response.data;
    
    // Cache for 30 days
    setCache(cacheKey, fabricTypes, 30 * 24 * 60 * 60 * 1000);
    
    return fabricTypes;
  },

  getFabricTypeById: async (id) => {
    const response = await api.get(`/FabricTypes/${id}`);
    return response.data;
  },

  createFabricType: async (fabricTypeData) => {
    const response = await api.post("/FabricTypes", fabricTypeData);
    // Clear cache after creating new fabric type
    clearCache(CACHE_KEYS.FABRIC_TYPES);
    return response.data;
  },

  updateFabricType: async (id, fabricTypeData) => {
    const response = await api.put(`/FabricTypes/${id}`, fabricTypeData);
    // Clear cache after updating fabric type
    clearCache(CACHE_KEYS.FABRIC_TYPES);
    return response.data;
  },

  deleteFabricType: async (id) => {
    try {
      const response = await api.delete(`/FabricTypes/${id}`);
      return response.data;
    } finally {
      // Clear cache even if delete fails
      clearCache(CACHE_KEYS.FABRIC_TYPES);
    }
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

// Shipments Service
export const shipmentsService = {
  getCities: async () => {
    // Check cache first (cache for 30 days - cities don't change often)
    const cacheKey = CACHE_KEYS.CITIES;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await api.get('/Shipments/GetCities');
    const cities = response.data;
    
    // Cache for 30 days
    setCache(cacheKey, cities, 30 * 24 * 60 * 60 * 1000);
    
    return cities;
  },
  getAreas: async (cityId) => {
    if (!cityId) return [];
    
    // Check cache first (cache for 30 days - areas don't change often)
    const cacheKey = `${CACHE_KEYS.AREAS}_${cityId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await api.get('/Shipments/GetAreas', {
      params: { cityId }
    });
    const areas = response.data;
    
    // Cache for 30 days
    setCache(cacheKey, areas, 30 * 24 * 60 * 60 * 1000);
    
    return areas;
  },
  createShipment: async (orderId, shippingNotes = '') => {
    const response = await api.post(`/Shipments/Create/${orderId}`, {
      shippingNotes: shippingNotes || ''
    });
    return response.data;
  },
  getDeliveryStatus: async (orderId) => {
    const response = await api.get(`/Shipments/GetDeliveryStatus/${orderId}`);
    return response.data;
  }
};

// Financial Categories Service
export const financialCategoriesService = {
  // Create a new financial category
  createCategory: async (categoryData) => {
    const response = await api.post('/financial-categories/CreateCategory', categoryData);
    return response.data;
  },
  
  // Update an existing financial category
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/financial-categories/${id}`, categoryData);
    return response.data;
  },
  
  // Delete a financial category
  deleteCategory: async (id) => {
    const response = await api.delete(`/financial-categories/${id}`);
    return response.data;
  },
  
  // Get categories by type (1 for revenue/income, 2 for expenses)
  getCategoriesByType: async (type) => {
    const response = await api.get(`/financial-categories/ByType/${type}`);
    return response.data;
  },
};

// Expense Sources Service
export const expenseSourcesService = {
  // Get all expense sources
  getSources: async () => {
    const response = await api.get('/expense-sources/GetSources');
    return response.data;
  },
  
  // Create a new expense source
  createSource: async (sourceData) => {
    const response = await api.post('/expense-sources/CreateSource', sourceData);
    return response.data;
  },
  
  // Update an existing expense source
  updateSource: async (id, sourceData) => {
    const response = await api.put(`/expense-sources/UpdateSource/${id}`, sourceData);
    return response.data;
  },
  
  // Delete an expense source
  deleteSource: async (id) => {
    const response = await api.delete(`/expense-sources/DeleteSource/${id}`);
    return response.data;
  },
};

// Financial Transactions Service
export const transactionsService = {
  // Create a new financial transaction
  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },
  
  // Get all transactions
  getAllTransactions: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },
  
  // Get transactions by month
  getTransactionsByMonth: async (year, month, categoryId = null, sourceId = null) => {
    const params = {
      year: year,
      month: month
    };
    if (categoryId) params.categoryId = categoryId;
    if (sourceId) params.sourceId = sourceId;
    
    const response = await api.get('/transactions/ByMonth', { params });
    return response.data;
  },
  
  // Get transactions by category
  getTransactionsByCategory: async (categoryId, year, month) => {
    const params = { year, month };
    const response = await api.get(`/transactions/ByCategory/${categoryId}`, { params });
    return response.data;
  },
  
  // Get transactions by source
  getTransactionsBySource: async (sourceId, year, month) => {
    const params = { year, month };
    const response = await api.get(`/transactions/BySource/${sourceId}`, { params });
    return response.data;
  },
  
  // Update a financial transaction
  updateTransaction: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },
  
  // Delete a financial transaction
  deleteTransaction: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
};

// Financial Reports Service
export const reportsService = {
  // Get financial summary report
  getSummary: async () => {
    const response = await api.get('/reports/summary');
    return response.data;
  },
  
  // Get monthly financial report by year and month
  getMonthlyReport: async (year, month) => {
    const response = await api.get(`/reports/monthly/${year}/${month}`);
    return response.data;
  },
};

// Accounting Service
export const accountingService = {
  // Calculate income from orders for a specific month
  calculateIncomeFromOrders: async (year, month) => {
    const response = await api.get('/accounting/CalculateIncomeFromOrders', {
      params: { year, month }
    });
    return response.data;
  },
};

// Notifications Service
export const notificationsService = {
  // Get all notifications for current user
  getNotifications: async (isRead = null) => {
    const params = isRead !== null ? { isRead } : {};
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  // Get order details by relatedEntityId (for notifications)
  getOrderDetails: async (relatedEntityId) => {
    const response = await api.get(`/notifications/order-details/${relatedEntityId}`);
    return response.data;
  },
};

// Export constants for use in components
export { USER_ROLES, ROLE_STRINGS };