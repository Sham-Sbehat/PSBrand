import { createContext, useContext, useState } from "react";

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

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
