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
} from "@mui/material";
import { Logout, Visibility, Close, Assignment } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";

const PreparerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [preparerOrders, setPreparerOrders] = useState([]);
  const [preparerOrdersLoading, setPreparerOrdersLoading] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders for preparer (status 3: IN_PREPARATION, status 6: OPEN_ORDER)
  const fetchPreparerOrders = async () => {
    setPreparerOrdersLoading(true);
    try {
      const [prepOrders, openOrders] = await Promise.all([
        ordersService.getOrdersByStatus(3),
        ordersService.getOrdersByStatus(6)
      ]);
      const merged = [...(prepOrders || []), ...(openOrders || [])];
      setPreparerOrders(merged);
    } catch (error) {
      console.error('Error fetching preparer orders:', error);
      setPreparerOrders([]);
    } finally {
      setPreparerOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchPreparerOrders();
  }, []);

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

  // Handle status update: when already OPEN_ORDER -> set COMPLETED
  const handleStatusUpdate = async (orderId) => {
    try {
      // Move from "في مرحلة التحضير" to "مكتمل"
      const response = await orderStatusService.setCompleted(orderId);
      
      if (response) {
        // Update the order status in the current list instead of re-fetching
        setPreparerOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Mark order as OPEN_ORDER (when preparer takes the order)
  const handleOpenOrder = async (orderId) => {
    try {
      // 1) Assign current preparer to this order (uses auth token server-side)
      await ordersService.assignPreparer(orderId);
      // 2) Set status to OpenOrder
      const response = await orderStatusService.setOpenOrder(orderId);
      if (response) {
        // Reflect new status locally
        setPreparerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: ORDER_STATUS.OPEN_ORDER } : o));
      }
    } catch (error) {
      console.error('Error setting order to OPEN_ORDER:', error);
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
      title: "الطلبات الجاهزة للتحضير",
      value: preparerOrders.length,
      icon: Assignment,
      color: "#2e7d32",
    },
  ];

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

      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`,
                    color: "white",
                    transition: "transform 0.2s",
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

        {/* Orders Table */}
        <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, marginBottom: 3 }}
          >
            الطلبات الجاهزة للتحضير ({preparerOrders.length})
          </Typography>

          {preparerOrdersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
              <Typography sx={{ marginLeft: 2 }}>جاري تحميل الطلبات...</Typography>
            </Box>
          ) : preparerOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <Typography color="text.secondary">لا توجد طلبات جاهزة للتحضير</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ 
              borderRadius: 2, 
              border: '1px solid #e0e0e0',
              '& .MuiTable-root': {
                direction: 'ltr'
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
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preparerOrders.map((order, index) => (
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
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                            color={order.status === ORDER_STATUS.OPEN_ORDER ? 'success' : 'primary'}
                            onClick={() => (order.status === ORDER_STATUS.OPEN_ORDER ? handleStatusUpdate(order.id) : handleOpenOrder(order.id))}
                            sx={{ 
                              minWidth: '120px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {order.status === ORDER_STATUS.OPEN_ORDER ? 'إكمال الطلب' : 'فتح الطلب'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Order Details Modal */}
      <Dialog
        open={openDetailsModal}
        onClose={handleCloseDetailsModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">تفاصيل الطلب</Typography>
          <IconButton onClick={handleCloseDetailsModal}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">رقم الطلب:</Typography>
                  <Typography variant="body1">{selectedOrder.orderNumber}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">اسم العميل:</Typography>
                  <Typography variant="body1">{selectedOrder.client?.name || "-"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">رقم الهاتف:</Typography>
                  <Typography variant="body1">{selectedOrder.client?.phone || "-"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">البلد:</Typography>
                  <Typography variant="body1">{selectedOrder.country || "-"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">المحافظة:</Typography>
                  <Typography variant="body1">{selectedOrder.province || "-"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">المنطقة:</Typography>
                  <Typography variant="body1">{selectedOrder.district || "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">المجموع الفرعي:</Typography>
                  <Typography variant="body1">{selectedOrder.subTotal} ₪</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">الإجمالي:</Typography>
                  <Typography variant="body1">{selectedOrder.totalAmount} ₪</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">التاريخ:</Typography>
                  <Typography variant="body1">
                    {selectedOrder.orderDate 
                      ? new Date(selectedOrder.orderDate).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit"
                        })
                      : "-"
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">الحالة:</Typography>
                  <Chip
                    label={getStatusLabel(selectedOrder.status).label}
                    color={getStatusLabel(selectedOrder.status).color}
                    size="small"
                  />
                </Grid>
                
                {selectedOrder.orderDesigns && selectedOrder.orderDesigns.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      التصاميم:
                    </Typography>
                    {selectedOrder.orderDesigns.map((design, idx) => (
                      <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: "#f5f5f5" }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                          اسم التصميم: {design.designName}
                        </Typography>
                        {design.mockupImageUrl && (
                          <Box 
                            sx={{ 
                              mb: 2, 
                              display: "flex", 
                              justifyContent: "center",
                              alignItems: "center",
                              width: "100%",
                              height: "250px",
                              backgroundColor: "#ffffff",
                              borderRadius: "8px",
                              border: "1px solid #e0e0e0",
                              overflow: "hidden"
                            }}
                          >
                            <img 
                              src={design.mockupImageUrl} 
                              alt={design.designName}
                              onError={(e) => {
                                e.target.parentElement.style.display = 'none';
                              }}
                              style={{ 
                                width: "auto", 
                                height: "100%", 
                                maxWidth: "100%",
                                objectFit: "contain"
                              }}
                            />
                          </Box>
                        )}
                        {design.orderDesignItems && design.orderDesignItems.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1.5 }}>
                              عناصر التصميم:
                            </Typography>
                            {design.orderDesignItems.map((item, itemIdx) => (
                              <Paper 
                                key={itemIdx} 
                                sx={{ 
                                  p: 1.5, 
                                  mb: 1.5, 
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e0e0e0"
                                }}
                              >
                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      حجم: {SIZE_LABELS[item.size] || item.size}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      لون: {COLOR_LABELS[item.color] || item.color}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      نوع القماش: {FABRIC_TYPE_LABELS[item.fabricType] || item.fabricType}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      الكمية: {item.quantity}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      سعر الوحدة: {item.unitPrice} ₪
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
                                      المجموع: {item.totalPrice} ₪
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Paper>
                            ))}
                          </Box>
                        )}
                        <Box sx={{ mt: 1, p: 1, backgroundColor: "#e3f2fd", borderRadius: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            إجمالي التصميم: {design.totalPrice} ₪
                          </Typography>
                        </Box>
                        {design.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              href={design.printFileUrl}
                              target="_blank"
                              download
                              sx={{ width: "100%" }}
                            >
                              📄 تحميل ملف PDF
                            </Button>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsModal}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PreparerDashboard;
