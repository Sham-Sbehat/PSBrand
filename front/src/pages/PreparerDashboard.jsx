import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { Logout, Visibility, Close, Assignment, Person, Phone, LocationOn, Receipt, CalendarToday, ShoppingBag, Note } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";

const PreparerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [availableOrders, setAvailableOrders] = useState([]); // Tab 0: Status 3 (IN_PREPARATION)
  const [myOpenOrders, setMyOpenOrders] = useState([]); // Tab 1: Status 6 (OPEN_ORDER) with preparer === currentUser
  const [completedOrders, setCompletedOrders] = useState([]); // Tab 2: Status 4 (COMPLETED) with preparer === currentUser
  const [loading, setLoading] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openCompletedOrdersModal, setOpenCompletedOrdersModal] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Fetch available orders (Status 3: IN_PREPARATION) - Tab 0
  const fetchAvailableOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const prepOrders = await ordersService.getOrdersByStatus(3);
      setAvailableOrders(prepOrders || []);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch my open orders (Status 6: OPEN_ORDER with preparer === currentUser) - Tab 1
  const fetchMyOpenOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setMyOpenOrders([]);
        return;
      }
      
      // Use GetOrdersForPreparer API with status 6 (OPEN_ORDER)
      const myOrders = await ordersService.getOrdersForPreparer(currentUserId, ORDER_STATUS.OPEN_ORDER);
      setMyOpenOrders(myOrders || []);
    } catch (error) {
      console.error('Error fetching my open orders:', error);
      setMyOpenOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch completed orders (Status 4: COMPLETED with preparer === currentUser)
  const fetchCompletedOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setCompletedOrders([]);
        return;
      }
      
      // Use GetOrdersForPreparer API with status 4 (COMPLETED)
      const myCompletedOrders = await ordersService.getOrdersForPreparer(currentUserId, ORDER_STATUS.COMPLETED);
      setCompletedOrders(myCompletedOrders || []);
    } catch (error) {
      console.error('Error fetching completed orders:', error);
      setCompletedOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch both tabs data
  const fetchAllOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      await Promise.all([
        fetchAvailableOrders(false),
        fetchMyOpenOrders(false),
        fetchCompletedOrders(false)
      ]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAllOrders(true); // Show loading on initial fetch only

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: (newOrder) => {
            console.log('SignalR: New order created event received', newOrder);
            if (newOrder && typeof newOrder === 'object' && newOrder.id) {
              if (newOrder.status === ORDER_STATUS.IN_PREPARATION) {
                // Add to available orders
                setAvailableOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === newOrder.id);
                  if (exists) return prevOrders;
                  return [newOrder, ...prevOrders];
                });
              } else if (newOrder.status === ORDER_STATUS.OPEN_ORDER) {
                // Check if it's assigned to current user
                const orderPreparerId = newOrder.preparer?.id || newOrder.preparerId || (typeof newOrder.preparer === 'number' ? newOrder.preparer : null);
                const currentUserId = user?.id;
                const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
                const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
                
                if (preparerIdNum === currentUserIdNum) {
                  setMyOpenOrders(prevOrders => {
                    const exists = prevOrders.some(order => order.id === newOrder.id);
                    if (exists) return prevOrders;
                    return [newOrder, ...prevOrders];
                  });
                }
              }
            } else {
              console.log('No order data received, refreshing list');
              fetchAllOrders(false);
            }
          },
          onOrderStatusChanged: (updatedOrder) => {
            console.log('SignalR: Order status changed', updatedOrder);
            if (updatedOrder) {
              const orderPreparerId = updatedOrder.preparer?.id || updatedOrder.preparerId || (typeof updatedOrder.preparer === 'number' ? updatedOrder.preparer : null);
              const currentUserId = user?.id;
              const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
              const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
              const isAssignedToMe = preparerIdNum === currentUserIdNum;

              if (updatedOrder.status === ORDER_STATUS.IN_PREPARATION) {
                // Update in available orders
                setAvailableOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === updatedOrder.id);
                  if (exists) {
                    return prevOrders.map(order => 
                      order.id === updatedOrder.id ? updatedOrder : order
                    );
                  } else {
                    return [updatedOrder, ...prevOrders];
                  }
                });
                // Remove from my open orders if it was there
                setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
              } else if (updatedOrder.status === ORDER_STATUS.OPEN_ORDER && isAssignedToMe) {
                // Update in my open orders
                setMyOpenOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === updatedOrder.id);
                  if (exists) {
                    return prevOrders.map(order => 
                      order.id === updatedOrder.id ? updatedOrder : order
                    );
                  } else {
                    return [updatedOrder, ...prevOrders];
                  }
                });
                // Remove from available orders
                setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                } else if (updatedOrder.status === ORDER_STATUS.COMPLETED && isAssignedToMe) {
                  // Update in completed orders
                  setCompletedOrders(prevOrders => {
                    const exists = prevOrders.some(order => order.id === updatedOrder.id);
                    if (exists) {
                      return prevOrders.map(order => 
                        order.id === updatedOrder.id ? updatedOrder : order
                      );
                    } else {
                      return [updatedOrder, ...prevOrders];
                    }
                  });
                  // Remove from other lists
                  setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                } else {
                  // Status changed to something else, remove from all lists
                  setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setCompletedOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                }
            }
            fetchAllOrders(false);
          },
        });
        console.log('SignalR: Successfully subscribed to order updates');
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setOpenDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleNotesClick = (order) => {
    setSelectedOrder(order);
    setOpenNotesDialog(true);
  };

  const handleCloseNotesDialog = () => {
    setOpenNotesDialog(false);
    setSelectedOrder(null);
  };

  const handleSaveNotes = async (orderId, updatedNotes) => {
    await ordersService.updateOrderNotes(orderId, updatedNotes);
    // Update local state for all order lists
    setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
    setAvailableOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
    setMyOpenOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
    setCompletedOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
  };

  // Handle status update: when already OPEN_ORDER -> set COMPLETED
  const handleStatusUpdate = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // Move from "في مرحلة التحضير" to "مكتمل"
      const response = await orderStatusService.setCompleted(orderId);
      
      // After successful update, refresh the orders list to get the latest data
      // Wait a bit for backend to process, then refresh
      setTimeout(() => {
        fetchAllOrders(false); // Don't show loading after action
      }, 500);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Mark order as OPEN_ORDER (when preparer takes the order)
  const handleOpenOrder = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // 1) Assign current preparer to this order
      await ordersService.assignPreparer(orderId, user?.id);
      // 2) Set status to OpenOrder
      const response = await orderStatusService.setOpenOrder(orderId);
      
      // After successful update, refresh the orders list and switch to Tab 1
      setTimeout(() => {
        fetchAllOrders(false); // Don't show loading after action
        setCurrentTab(1); // Switch to "طلباتي المفتوحة" tab
      }, 500);
      
    } catch (error) {
      console.error('Error setting order to OPEN_ORDER:', error);
      alert(`حدث خطأ أثناء فتح الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return {
      label: ORDER_STATUS_LABELS[numericStatus] || "غير معروف",
      color: ORDER_STATUS_COLORS[numericStatus] || "default"
    };
  };

  const stats = [
    {
      title: "الطلبات المتاحة للتحضير",
      value: availableOrders.length,
      icon: Assignment,
      color: "#1976d2",
    },
    {
      title: "قيد التحضير",
      value: myOpenOrders.length,
      icon: Assignment,
      color: "#2e7d32",
    },
    {
      title: "الطلبات المكتملة",
      value: completedOrders.length,
      icon: Assignment,
      color: "#9c27b0",
      onClick: () => setOpenCompletedOrdersModal(true),
    },
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Refresh the relevant tab when switching
    if (newValue === 0) {
      fetchAvailableOrders(false);
    } else if (newValue === 1) {
      fetchMyOpenOrders(false);
    }
  };

  const handleCloseCompletedOrdersModal = () => {
    setOpenCompletedOrdersModal(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            PSBrand - لوحة محضر الطلبات
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "secondary.main" }}>
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user?.name || "محضر طلبات"}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ paddingY: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={stat.onClick || undefined}
                  sx={{
                    background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`,
                    color: "white",
                    transition: "transform 0.2s",
                    cursor: stat.onClick ? "pointer" : "default",
                    "&:hover": {
                      transform: "translateY(-5px)",
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body1" sx={{ marginTop: 1 }}>
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ fontSize: 60, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Tabs */}
        <Box sx={{ marginBottom: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <Tab
              label="الطلبات المتاحة للتحضير"
              icon={<Assignment />}
              iconPosition="start"
              sx={{ fontWeight: 600, fontSize: "1rem" }}
            />
            <Tab
              label="قيد التحضير"
              icon={<Assignment />}
              iconPosition="start"
              sx={{ fontWeight: 600, fontSize: "1rem" }}
            />
          </Tabs>
        </Box>

        {/* Orders Table */}
        <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
          {currentTab === 0 && (
            <>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, marginBottom: 3 }}
          >
       الطلبات المتاحة للتحضير ({availableOrders.length})
          </Typography>

              {loading && availableOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
              <Typography sx={{ marginLeft: 2 }}>جاري تحميل الطلبات...</Typography>
            </Box>
              ) : availableOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <Typography color="text.secondary">لا توجد طلبات متاحة للفتح</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ 
              width: '100%',
              borderRadius: 2, 
              border: '1px solid #e0e0e0',
              overflowX: 'auto',
              '& .MuiTable-root': {
                direction: 'ltr',
                width: '100%',
                minWidth: '1200px'
              },
              '& .MuiTableCell-root': {
                whiteSpace: 'nowrap',
                padding: '14px 18px',
                fontSize: '0.95rem'
              }
            }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>البلد</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المجموع الفرعي</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableOrders.map((order, index) => {
                      // Get preparer ID from order
                      const orderPreparerId = order.preparer?.id || order.preparerId || (typeof order.preparer === 'number' ? order.preparer : null);
                      const currentUserId = user?.id;
                      
                      // Normalize IDs to numbers for comparison
                      const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
                      const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
                      
                      const isAssignedToOther = preparerIdNum !== null && preparerIdNum !== currentUserIdNum;
                      
                      // Can open order: Status is IN_PREPARATION and not assigned to another preparer
                      const canOpenOrder = order.status === ORDER_STATUS.IN_PREPARATION && !isAssignedToOther;
                      
                      // Show button only if can open
                      const showActionButton = canOpenOrder;
                      
                      return (
                    <TableRow 
                      key={order.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                        '&:hover': { backgroundColor: '#e3f2fd' },
                        // Gray out if assigned to another preparer
                        opacity: (isAssignedToOther && order.status === ORDER_STATUS.IN_PREPARATION) ? 0.6 : 1
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.country || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.subTotal || 0} ₪
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: '1rem' }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate 
                          ? new Date(order.orderDate).toLocaleDateString("en-GB", { 
                              year: "numeric", 
                              month: "2-digit", 
                              day: "2-digit" 
                            })
                          : "-"
                        }
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleNotesClick(order)}
                          sx={{
                            color: order.notes ? 'primary.main' : 'action.disabled',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          title={order.notes ? 'عرض/تعديل الملاحظات' : 'إضافة ملاحظات'}
                        >
                          <Note />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                            sx={{ 
                              minWidth: '100px',
                              fontSize: '0.8rem'
                            }}
                          >
                            عرض التفاصيل
                          </Button>
                          {showActionButton ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleOpenOrder(order.id)}
                              disabled={updatingOrderId === order.id}
                              sx={{ 
                                minWidth: '120px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {updatingOrderId === order.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CircularProgress size={14} color="inherit" />
                                  جاري...
                                </Box>
                              ) : (
                                'فتح الطلب'
                              )}
                            </Button>
                          ) : isAssignedToOther ? (
                            <Chip
                              label={`مفتوح من: ${order.preparer?.name || 'محضر آخر'}`}
                              color="warning"
                              size="small"
                              sx={{ minWidth: '120px' }}
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
              )}
            </>
          )}

          {currentTab === 1 && (
            <>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: 700, marginBottom: 3 }}
              >
                 قيد التحضير ({myOpenOrders.length})
              </Typography>

              {loading && myOpenOrders.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ marginLeft: 2 }}>جاري تحميل الطلبات...</Typography>
                </Box>
              ) : myOpenOrders.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <Typography color="text.secondary">لا توجد طلبات مفتوحة</Typography>
                </Box>
              ) : (
            <TableContainer sx={{ 
              width: '100%',
              borderRadius: 2, 
              border: '1px solid #e0e0e0',
              overflowX: 'auto',
              '& .MuiTable-root': {
                direction: 'ltr',
                width: '100%',
                minWidth: '1200px'
              },
              '& .MuiTableCell-root': {
                whiteSpace: 'nowrap',
                padding: '14px 18px',
                fontSize: '0.95rem'
              }
            }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>البلد</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المجموع الفرعي</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myOpenOrders.map((order, index) => {
                      return (
                    <TableRow 
                      key={order.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                        '&:hover': { backgroundColor: '#e3f2fd' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.country || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.subTotal || 0} ₪
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: '1rem' }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate 
                          ? new Date(order.orderDate).toLocaleDateString("en-GB", { 
                              year: "numeric", 
                              month: "2-digit", 
                              day: "2-digit" 
                            })
                          : "-"
                        }
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleNotesClick(order)}
                          sx={{
                            color: order.notes ? 'primary.main' : 'action.disabled',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          title={order.notes ? 'عرض/تعديل الملاحظات' : 'إضافة ملاحظات'}
                        >
                          <Note />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                            sx={{ 
                              minWidth: '100px',
                              fontSize: '0.8rem'
                            }}
                          >
                            عرض التفاصيل
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleStatusUpdate(order.id)}
                            disabled={updatingOrderId === order.id}
                            sx={{ 
                              minWidth: '120px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {updatingOrderId === order.id ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CircularProgress size={14} color="inherit" />
                                جاري...
                              </Box>
                            ) : (
                              'إكمال الطلب'
                            )}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
              )}
            </>
          )}
        </Paper>
      </Container>

      {/* Completed Orders Modal */}
      <Dialog
        open={openCompletedOrdersModal}
        onClose={handleCloseCompletedOrdersModal}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">الطلبات المكتملة ({completedOrders.length})</Typography>
          <IconButton onClick={handleCloseCompletedOrdersModal}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loading && completedOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
              <Typography sx={{ marginLeft: 2 }}>جاري التحميل...</Typography>
            </Box>
          ) : completedOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <Typography>لا توجد طلبات مكتملة</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>البلد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المحافظة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>تاريخ الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {completedOrders.map((order) => {
                    const status = getStatusLabel(order.status);
                    return (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {order.orderNumber || `#${order.id}`}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {order.client?.name || "-"}
                        </TableCell>
                        <TableCell>{order.client?.phone || "-"}</TableCell>
                        <TableCell>{order.country || "-"}</TableCell>
                        <TableCell>{order.province || "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>
                          {order.totalAmount || 0} ₪
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>
                          {order.orderDate 
                            ? new Date(order.orderDate).toLocaleDateString("ar-SA", { 
                                year: "numeric", 
                                month: "2-digit", 
                                day: "2-digit" 
                              })
                            : "-"
                          }
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleNotesClick(order)}
                            sx={{
                              color: order.notes ? 'primary.main' : 'action.disabled',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                            title={order.notes ? 'عرض/تعديل الملاحظات' : 'إضافة ملاحظات'}
                          >
                            <Note />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                          >
                            عرض التفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompletedOrdersModal}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog
        open={openDetailsModal}
        onClose={handleCloseDetailsModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          bgcolor: "primary.main",
          color: "white",
          padding: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            تفاصيل الطلب
          </Typography>
          <IconButton onClick={handleCloseDetailsModal} sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 3, maxHeight: '85vh', overflowY: 'auto' }}>
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* Order Basic Info */}
              <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                  <Receipt color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    معلومات الطلب
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        رقم الطلب
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {selectedOrder.orderNumber}
                      </Typography>
                    </Box>
                </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        التاريخ
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    {selectedOrder.orderDate 
                          ? new Date(selectedOrder.orderDate).toLocaleDateString("ar-SA", {
                          year: "numeric",
                              month: "long",
                              day: "numeric"
                        })
                      : "-"
                    }
                  </Typography>
                    </Box>
                </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        الحالة
                      </Typography>
                  <Chip
                    label={getStatusLabel(selectedOrder.status).label}
                    color={getStatusLabel(selectedOrder.status).color}
                        size="medium"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Client Info */}
              <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                  <Person color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    معلومات العميل
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        الاسم
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.client?.name || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        رقم الهاتف
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.client?.phone || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        العنوان
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.district && `${selectedOrder.district}, `}
                      {selectedOrder.province && `${selectedOrder.province}, `}
                      {selectedOrder.country || "-"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Financial Summary */}
              <Paper elevation={3} sx={{ p: 2.5, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid rgba(255,255,255,0.3)" }}>
                  <Receipt sx={{ color: "white" }} fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>
                    الملخص المالي
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        المجموع الفرعي
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedOrder.subTotal || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        رسوم التوصيل
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedOrder.deliveryFee || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        الإجمالي الكلي
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {selectedOrder.totalAmount || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Notes Section */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Note />}
                  onClick={() => handleNotesClick(selectedOrder)}
                  sx={{ minWidth: 200 }}
                >
                  عرض/تعديل الملاحظات
                </Button>
              </Box>
                
              {/* Designs Section */}
                {selectedOrder.orderDesigns && selectedOrder.orderDesigns.length > 0 && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <ShoppingBag color="primary" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      التصاميم والمنتجات ({selectedOrder.orderDesigns.length})
                    </Typography>
                  </Box>
                    {selectedOrder.orderDesigns.map((design, idx) => (
                    <Paper key={idx} elevation={2} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                          {design.designName || `التصميم ${idx + 1}`}
                        </Typography>
                        {design.totalPrice && (
                          <Chip 
                            label={`إجمالي: ${design.totalPrice} ₪`}
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      
                      {design.mockupImageUrl && design.mockupImageUrl !== 'placeholder_mockup.jpg' && (
                        <Box sx={{ mb: 2.5, textAlign: "center", p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <img 
                              src={design.mockupImageUrl} 
                              alt={design.designName}
                              style={{ 
                                maxWidth: "100%",
                              maxHeight: "300px",
                              objectFit: "contain",
                              borderRadius: "8px"
                              }}
                            />
                          </Box>
                        )}

                        {design.orderDesignItems && design.orderDesignItems.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                            عناصر التصميم ({design.orderDesignItems.length})
                          </Typography>
                          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                  <TableCell sx={{ fontWeight: 700 }}>المقاس</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>اللون</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>نوع القماش</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700 }}>الكمية</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>سعر الوحدة</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>المجموع</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {design.orderDesignItems.map((item, itemIdx) => (
                                  <TableRow key={itemIdx} hover>
                                    <TableCell>{SIZE_LABELS[item.size] || item.size}</TableCell>
                                    <TableCell>{COLOR_LABELS[item.color] || item.color}</TableCell>
                                    <TableCell>{FABRIC_TYPE_LABELS[item.fabricType] || item.fabricType}</TableCell>
                                    <TableCell align="center">{item.quantity}</TableCell>
                                    <TableCell align="right">{item.unitPrice} ₪</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: "primary.main" }}>
                                      {item.totalPrice || (item.unitPrice * item.quantity)} ₪
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}

                        {design.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" && (
                        <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                            <Button
                              variant="contained"
                              color="primary"
                              href={design.printFileUrl}
                              target="_blank"
                              download
                            fullWidth
                            sx={{ py: 1.2, fontWeight: 600 }}
                            >
                            تحميل ملف PDF للطباعة
                            </Button>
                          </Box>
                        )}
                      </Paper>
                    ))}
                </Box>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button 
            onClick={handleCloseDetailsModal}
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <NotesDialog
        open={openNotesDialog}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />
    </Box>
  );
};

export default PreparerDashboard;
