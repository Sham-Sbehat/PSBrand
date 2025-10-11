import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);

  // تسجيل الدخول
  const login = (userData) => {
    setUser(userData);
  };

  // تسجيل الخروج
  const logout = () => {
    setUser(null);
  };

  // إضافة طلب جديد
  const addOrder = (order) => {
    const newOrder = {
      ...order,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'موظف',
      status: 'pending',
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  // تحديث حالة الطلب
  const updateOrderStatus = (orderId, status) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  // إضافة موظف جديد
  const addEmployee = (employee) => {
    const newEmployee = {
      ...employee,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    setEmployees((prev) => [newEmployee, ...prev]);
    return newEmployee;
  };

  // حذف موظف
  const deleteEmployee = (employeeId) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  };

  const value = {
    user,
    orders,
    employees,
    login,
    logout,
    addOrder,
    updateOrderStatus,
    addEmployee,
    deleteEmployee,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


