import { createContext, useContext, useState, useEffect } from "react";
import { employeesService } from "../services/api";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);

  // تحميل قائمة الموظفين
  const loadEmployees = async () => {
    try {
      // جلب جميع المستخدمين
      const employeesData = await employeesService.getAllEmployees();
      console.log('تم تحميل الموظفين:', employeesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('خطأ في تحميل الموظفين:', error);
    }
  };

  // جلب المستخدمين حسب الدور
  const loadUsersByRole = async (role) => {
    try {
      const usersData = await employeesService.getUsersByRole(role);
      console.log(`تم تحميل المستخدمين للدور ${role}:`, usersData);
      return usersData;
    } catch (error) {
      console.error(`خطأ في تحميل المستخدمين للدور ${role}:`, error);
      return [];
    }
  };

  // تحميل بيانات المستخدم من localStorage عند بدء التطبيق
  useEffect(() => {
    const savedUser = localStorage.getItem("userData");
    const savedToken = localStorage.getItem("authToken");
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      // تحميل قائمة الموظفين
      loadEmployees();
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    // تحميل قائمة الموظفين بعد تسجيل الدخول
    loadEmployees();
  };

  const logout = () => {
    // مسح البيانات من localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    setUser(null);
  };

  const addOrder = (order) => {
    const newOrder = {
      ...order,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: user?.name || "موظف",
      status: "pending",
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = (orderId, status) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  };

  const addEmployee = (employee) => {
    const newEmployee = {
      ...employee,
      createdAt: new Date().toISOString(),
    };
    setEmployees((prev) => [newEmployee, ...prev]);
    return newEmployee;
  };

  const deleteEmployee = (employeeId) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  };

  const value = {
    user,
    orders,
    employees,
    setEmployees,
    login,
    logout,
    addOrder,
    updateOrderStatus,
    addEmployee,
    deleteEmployee,
    loadUsersByRole,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
