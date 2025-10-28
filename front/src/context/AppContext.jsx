import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { employeesService } from "../services/api";
import { STORAGE_KEYS } from "../constants";
import { storage } from "../utils";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // State management
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);


  // Load employees from API
  const loadEmployees = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    
    setLoading(true);
    try {
      const employeesData = await employeesService.getAllEmployees();
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('خطأ في تحميل الموظفين:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load users by role
  const loadUsersByRole = useCallback(async (role) => {
    try {
      const usersData = await employeesService.getUsersByRole(role);
      return usersData || [];
    } catch (error) {
      console.error(`خطأ في تحميل المستخدمين للدور ${role}:`, error);
      return [];
    }
  }, []);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      const savedUser = storage.get(STORAGE_KEYS.USER_DATA);
      const savedToken = storage.get(STORAGE_KEYS.AUTH_TOKEN);
      
      console.log('Initializing app with:', { savedUser, savedToken });
      console.log('Raw localStorage values:', {
        authToken: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        userData: localStorage.getItem(STORAGE_KEYS.USER_DATA)
      });
      
      if (savedUser && savedToken) {
        try {
          setUser(savedUser);
          console.log('User restored from localStorage:', savedUser);
        } catch (error) {
          console.error('خطأ في تحميل بيانات المستخدم:', error);
        }
      } else {
        console.log('No saved user or token found');
      }
    };

    initializeApp();
  }, []);

  // Login function
  const login = useCallback((userData) => {
    setUser(userData);
    loadEmployees();
  }, [loadEmployees]);

  // Logout function
  const logout = useCallback(() => {
    storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    storage.remove(STORAGE_KEYS.USER_DATA);
    setUser(null);
    setOrders([]);
    setEmployees([]);
  }, []);

  // Add order to context
  const addOrder = useCallback((order) => {
    const newOrder = {
      ...order,
      id: order.id || Date.now(),
      createdAt: order.createdAt || new Date().toISOString(),
      createdBy: user?.name || "موظف",
      status: order.status || "pending",
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }, [user]);

  // Update order status
  const updateOrderStatus = useCallback((orderId, status) => {
    setOrders((prev) =>
      prev.map((order) => 
        order.id === orderId ? { ...order, status } : order
      )
    );
  }, []);

  // Add employee
  const addEmployee = useCallback((employee) => {
    const newEmployee = {
      ...employee,
      createdAt: new Date().toISOString(),
    };
    setEmployees((prev) => [newEmployee, ...prev]);
    return newEmployee;
  }, []);

  // Delete employee
  const deleteEmployee = useCallback((employeeId) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  }, []);

  // Memoized context value
  const contextValue = useMemo(() => ({
    // State
    user,
    orders,
    employees,
    loading,
    
    // Actions
    login,
    logout,
    addOrder,
    updateOrderStatus,
    addEmployee,
    deleteEmployee,
    loadUsersByRole,
    loadEmployees,
    
    // Setters (for external state management if needed)
    setEmployees,
  }), [
    user,
    orders,
    employees,
    loading,
    login,
    logout,
    addOrder,
    updateOrderStatus,
    addEmployee,
    deleteEmployee,
    loadUsersByRole,
    loadEmployees,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};