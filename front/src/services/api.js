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
  MAIN_DESIGNER: 6,
};

const ROLE_STRINGS = {
  [USER_ROLES.ADMIN]: "admin",
  [USER_ROLES.DESIGNER]: "designer",
  [USER_ROLES.PREPARER]: "preparer",
  [USER_ROLES.DESIGN_MANAGER]: "designmanager",
  [USER_ROLES.PACKAGER]: "packager",
  [USER_ROLES.MAIN_DESIGNER]: "maindesigner",
};

// Utility functions
const convertRoleToNumber = (role) => {
  const roleMap = {
    "admin": USER_ROLES.ADMIN,
    "designer": USER_ROLES.DESIGNER,
    "preparer": USER_ROLES.PREPARER,
    "designmanager": USER_ROLES.DESIGN_MANAGER,
    "packager": USER_ROLES.PACKAGER,
    "maindesigner": USER_ROLES.MAIN_DESIGNER,
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

  getDesignersFabricTypeStatistics: async (date, designerId = null) => {
    // إحصائيات أنواع القماش لكل بائع
    const params = { date };
    if (designerId) {
      params.designerId = designerId;
    }
    const response = await api.get("/Orders/GetDesignersFabricTypeStatistics", {
      params,
    });
    return response.data;
  },

  getDeliveryOrdersStatistics: async (date) => {
    // إحصائيات طلبات التوصيل لآخر 7 أيام
    const response = await api.get("/Orders/GetDeliveryOrdersStatistics", {
      params: { date },
    });
    return response.data;
  },

  getFabricTypePiecesCount: async () => {
    const response = await api.get("/Orders/GetFabricTypePiecesCount");
    return response.data;
  },

  getOrderStatusStatistics: async (status) => {
    const response = await api.get("/Orders/GetOrderStatusStatistics", {
      params: { status },
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

  updateEmployee: async (id, employeeData) => {
    // Prepare data according to API spec: /api/Users/UpdateUser{id}
    // Required fields: id, name, username, password, phone, role, isActive
    const apiData = {
      id: id,
      name: employeeData.name || '',
      username: employeeData.username || '',
      password: employeeData.password !== undefined ? employeeData.password : '', // Empty string if not updating password
      phone: employeeData.phone || '',
      role: typeof employeeData.role === 'number' ? employeeData.role : (employeeData.role || 1),
      isActive: employeeData.isActive !== undefined ? employeeData.isActive : true,
    };

    // Add optional fields only if they are provided and not empty
    if (employeeData.monthlySalary !== undefined && employeeData.monthlySalary !== null) {
      apiData.monthlySalary = employeeData.monthlySalary;
    }
    if (employeeData.jobTitle) {
      apiData.jobTitle = employeeData.jobTitle;
    }
    if (employeeData.email) {
      apiData.email = employeeData.email;
    }
    if (employeeData.notes) {
      apiData.notes = employeeData.notes;
    }

    const response = await api.put(`/Users/UpdateUser${id}`, apiData);
    return response.data;
  },

  toggleUserActiveStatus: async (id, isActive) => {
    const response = await api.put(`/Users/ToggleUserActiveStatus/${id}`, {
      isActive: isActive,
    });
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
  createShipments: async (orderIds, shippingNotes = '') => {
    // Create shipments for multiple orders using the new API endpoint
    const response = await api.post('/Shipments/Create', {
      shippingNotes: shippingNotes || '',
      orderIds: orderIds
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
  // Calculate income from deposit orders for a specific month
  calculateIncomeFromDepositOrders: async (year, month) => {
    const response = await api.get('/accounting/CalculateIncomeFromDepositOrders', {
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

// Design Inventory Logs Service (Employee Attendance/Shift Tracking)
export const designInventoryLogsService = {
  // Get all design inventory logs
  getAllLogs: async (params = {}) => {
    const response = await api.get("/DesignInventoryLogs/GetDesignInventoryLogs", {
      params,
    });
    return response.data;
  },

  // Get a specific log by ID
  getLogById: async (id) => {
    const response = await api.get(`/DesignInventoryLogs/GetDesignInventoryLog/${id}`);
    return response.data;
  },

  // Create a new log
  createLog: async (logData) => {
    const response = await api.post("/DesignInventoryLogs/CreateDesignInventoryLog", logData);
    return response.data;
  },

  // Update an existing log
  updateLog: async (id, logData) => {
    const response = await api.put(`/DesignInventoryLogs/UpdateDesignInventoryLog/${id}`, logData);
    return response.data;
  },

  // Delete a log
  deleteLog: async (id) => {
    const response = await api.delete(`/DesignInventoryLogs/DeleteDesignInventoryLog/${id}`);
    return response.data;
  },

  // Check if log exists
  checkLogExists: async (params = {}) => {
    const response = await api.get("/DesignInventoryLogs/CheckLogExists", {
      params,
    });
    return response.data;
  },

  // Get shift time values
  getShiftTimeValues: async () => {
    const response = await api.get("/DesignInventoryLogs/GetShiftTimeValues");
    return response.data;
  },
};

// Messages Service
export const mainDesignerService = {
  // Generate upload URL for file
  generateUploadUrl: async (fileName, fileSize, contentType, folder = 'designs') => {
    const response = await api.post('/MainDesigner/GenerateUploadUrl', {
      fileName,
      fileSize,
      contentType,
      folder,
    });
    return response.data;
  },

  // Upload file through backend (alternative if CORS is not configured)
  uploadFileThroughBackend: async (file, folder = 'designs') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await api.post('/MainDesigner/UploadFile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Confirm file upload
  confirmFileUpload: async (fileKey, fileSize, contentType) => {
    const requestBody = {
      fileKey: String(fileKey),
      fileSize: Number(fileSize),
      contentType: String(contentType),
    };
    console.log("📤 ConfirmFileUpload request:", requestBody);
    const response = await api.post('/MainDesigner/ConfirmFileUpload', requestBody);
    console.log("✅ ConfirmFileUpload response:", response.data);
    return response.data;
  },

  // Generate download URL for file
  generateDownloadUrl: async (fileKey) => {
    const response = await api.get(`/MainDesigner/GenerateDownloadUrl/${encodeURIComponent(fileKey)}`);
    return response.data;
  },

  // Create design
  createDesign: async (designData) => {
    const response = await api.post('/MainDesigner/CreateDesign', designData);
    return response.data;
  },

  // Add design files
  // Note: Request body should be an array of strings, not an object
  addDesignFiles: async (designId, fileKeys) => {
    const response = await api.post(`/MainDesigner/AddDesignFiles/${designId}`, fileKeys);
    return response.data;
  },

  // Get all designs
  getDesigns: async (params = {}) => {
    const response = await api.get('/MainDesigner/GetDesigns', { params });
    return response.data;
  },

  // Search designs
  searchDesigns: async (searchTerm, params = {}) => {
    const searchParams = {
      ...params,
      searchTerm: searchTerm
    };
    const response = await api.get('/MainDesigner/SearchDesigns', { params: searchParams });
    return response.data;
  },

  // Get designs by creator userId
  getDesignsByCreator: async (userId) => {
    const response = await api.get(`/MainDesigner/GetDesignsByCreator/${userId}`);
    return response.data;
  },

  // Get designs by creator userId with status filter
  getDesignsByCreatorAndStatus: async (userId, status = null) => {
    const params = { createdBy: userId };
    if (status !== null && status !== undefined) {
      params.status = status;
    }
    const response = await api.get('/MainDesigner/GetDesigns', { params });
    return response.data;
  },

  // Get design by ID
  getDesignById: async (id) => {
    const response = await api.get(`/MainDesigner/GetDesignById/${id}`);
    return response.data;
  },

  // Get design by serial number
  getDesignBySerialNumber: async (serialNumber) => {
    const response = await api.get(`/MainDesigner/GetDesignBySerialNumber/${serialNumber}`);
    return response.data;
  },

  // Update design
  updateDesign: async (id, designData) => {
    const response = await api.put(`/MainDesigner/UpdateDesign/${id}`, designData);
    return response.data;
  },

  // Update design status
  updateDesignStatus: async (id, status, notes = "") => {
    const response = await api.put(`/MainDesigner/UpdateDesignStatus/${id}`, { status, notes });
    return response.data;
  },

  // Delete design
  deleteDesign: async (id) => {
    const response = await api.delete(`/MainDesigner/DeleteDesign/${id}`);
    return response.data;
  },
};

export const messagesService = {
  // Get messages to a specific user
  getMessagesToUser: async (userId) => {
    const response = await api.get(`/messages/To-Specific-User`, {
      params: { userId }
    });
    return response.data;
  },

  // Get all messages (admin only)
  getAllMessages: async () => {
    const response = await api.get("/messages/All-Messsages");
    return response.data;
  },

  // Get message by ID
  getMessageById: async (id) => {
    const response = await api.get(`/messages/Get-Massage-By${id}`);
    return response.data;
  },

  // Create new message
  // messageData: { userId: number (null for all), title: string, content: string, isActive: boolean, expiresAt: string }
  createMessage: async (messageData) => {
    // Build request body exactly as API expects
    // userId: null for all users, number for specific user
    // expiresAt: ISO 8601 string if provided, otherwise set default future date
    
    let expiresAtValue;
    if (messageData.expiresAt) {
      // If expiresAt is provided, convert to ISO string
      if (typeof messageData.expiresAt === 'string') {
        // If it's already a datetime-local string, convert to ISO
        if (messageData.expiresAt.includes('T') && !messageData.expiresAt.includes('Z')) {
          expiresAtValue = new Date(messageData.expiresAt).toISOString();
        } else {
          expiresAtValue = messageData.expiresAt;
        }
      } else {
        expiresAtValue = new Date(messageData.expiresAt).toISOString();
      }
    } else {
      // If not provided, set a default future date (1 year from now)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expiresAtValue = futureDate.toISOString();
    }
    
    // Build request body exactly matching API schema
    const requestBody = {
      userId: messageData.userId === null || messageData.userId === undefined 
        ? null 
        : Number(messageData.userId), // null للكل، number للموظف المحدد
      title: String(messageData.title || ""), // Must be string
      content: String(messageData.content || ""), // Must be string
      isActive: Boolean(messageData.isActive !== undefined ? messageData.isActive : true), // Must be boolean
      expiresAt: String(expiresAtValue), // Must be ISO 8601 string
    };
    
    console.log("📤 Sending message with data:", JSON.stringify(requestBody, null, 2));
    
    try {
      const response = await api.post("/messages/Crete-New-Massage", requestBody);
      console.log("✅ Message sent successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error sending message:", error.response?.data || error.message);
      throw error;
    }
  },

  // Update message
  updateMessage: async (id, messageData) => {
    const response = await api.put(`/messages/Update-Massage${id}`, messageData);
    return response.data;
  },

  // Delete message
  deleteMessage: async (id) => {
    const response = await api.delete(`/messages/Delete-Massage${id}`);
    return response.data;
  },

  // Toggle message active status
  toggleMessageActive: async (id) => {
    const response = await api.patch(`/messages/Toggle-Active${id}`);
    return response.data;
  },
};

// Design Requests Service
export const designRequestsService = {
  // Upload images for design request
  uploadImages: async (files) => {
    console.log("🚀 designRequestsService.uploadImages called with files:", files);
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    } else {
      formData.append("files", files);
    }
    
    console.log("📤 Sending request to /DesignRequests/UploadImages");
    try {
      const response = await api.post("/DesignRequests/UploadImages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("✅ Upload response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Upload error:", error);
      console.error("❌ Error response:", error.response?.data);
      throw error;
    }
  },

  // Create design request
  createDesignRequest: async (designData) => {
    console.log("🚀 designRequestsService.createDesignRequest called");
    console.log("📤 Request payload:", JSON.stringify(designData, null, 2));
    try {
      const response = await api.post("/DesignRequests", designData);
      console.log("✅ Create design request response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Create design request error:", error);
      console.error("❌ Error response:", error.response?.data);
      throw error;
    }
  },

  // Get design requests with pagination and filters
  getDesignRequests: async (params = {}) => {
    const queryParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
    
    if (params.status !== undefined && params.status !== null) {
      queryParams.status = params.status;
    }
    
    if (params.createdBy !== undefined && params.createdBy !== null) {
      queryParams.createdBy = params.createdBy;
    }
    
    if (params.mainDesignerId !== undefined && params.mainDesignerId !== null) {
      queryParams.mainDesignerId = params.mainDesignerId;
    }

    const response = await api.get("/DesignRequests", {
      params: queryParams,
    });
    return response.data;
  },

  // Assign designer to design request
  assignDesigner: async (designRequestId, designerId) => {
    console.log("🚀 designRequestsService.assignDesigner called", { designRequestId, designerId });
    try {
      // If designerId is null or undefined, send null explicitly
      const payload = designerId === null || designerId === undefined 
        ? { designerId: null }
        : { designerId: designerId };
      
      const response = await api.put(`/DesignRequests/${designRequestId}/AssignDesigner`, payload);
      console.log("✅ Assign designer response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Assign designer error:", error);
      console.error("❌ Error response:", error.response?.data);
      throw error;
    }
  },

  // Update design request
  updateDesignRequest: async (designRequestId, designData) => {
    console.log("🚀 designRequestsService.updateDesignRequest called", { designRequestId, designData });
    try {
      const response = await api.put(`/DesignRequests/${designRequestId}`, designData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete design request
  deleteDesignRequest: async (designRequestId) => {
    try {
      const response = await api.delete(`/DesignRequests/${designRequestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Set design request state
  setState: async (designRequestId, status) => {
    try {
      const response = await api.put(`/DesignRequests/${designRequestId}/SetState`, {
        status: status,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update design request note
  updateNote: async (designRequestId, note) => {
    try {
      const response = await api.patch(`/DesignRequests/${designRequestId}/note`, {
        note: note,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Set design images for a design request
  setDesignImages: async (designRequestId, imageKeys) => {
    console.log("🚀 designRequestsService.setDesignImages called", { designRequestId, imageKeys });
    try {
      const response = await api.patch(`/DesignRequests/${designRequestId}/designImages`, {
        imageKeys: imageKeys,
      });
      console.log("✅ Set design images response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Set design images error:", error);
      console.error("❌ Error response:", error.response?.data);
      throw error;
    }
  },
};

// Shift Time Constants
export const SHIFT_TIME_VALUES = ['A', 'B', 'A+B', 'OFF'];
export const SHIFT_TIME_ENUM = {
  A: 1,
  B: 2,
  APlusB: 3, // A+B
  OFF: 4,
};

// Export constants for use in components
export { USER_ROLES, ROLE_STRINGS };