import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Logout,
  DesignServices,
  Close,
  Note,
  Schedule,
  Print,
  CheckCircle,
  Dashboard,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import { COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(ORDER_STATUS.PENDING_PRINTING);

  // Fetch all orders
  const fetchOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await ordersService.getAllOrders();
      setAllOrders(response || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders(true); // Show loading on initial fetch only

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: () => {
            console.log('SignalR: New order created event received');
            fetchOrders(false);
          },
          onOrderStatusChanged: () => {
            console.log('SignalR: Order status changed');
            fetchOrders(false);
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
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
  };

  const handleNotesClick = (order) => {
    setSelectedOrder(order);
    setNotesDialogOpen(true);
  };

  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleSaveNotes = async (orderId, updatedNotes) => {
    await ordersService.updateOrderNotes(orderId, updatedNotes);
    // Update local state
    setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
    setAllOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, currentStatus) => {
    setUpdatingOrderId(orderId);
    try {
      let response;
      
      if (currentStatus === ORDER_STATUS.PENDING_PRINTING) {
        // Move from "بانتظار الطباعة" to "في مرحلة الطباعة"
        response = await orderStatusService.setInPrinting(orderId);
      } else if (currentStatus === ORDER_STATUS.IN_PRINTING) {
        // Move from "في مرحلة الطباعة" to "في مرحلة التحضير"
        response = await orderStatusService.setInPreparation(orderId);
      }
      
      // After successful update, refresh the orders list to get the latest data
      // Wait a bit for backend to process, then refresh
      setTimeout(() => {
        fetchOrders(false); // Don't show loading after action
      }, 500);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
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

  // Filter orders by status
  const filteredOrders = statusFilter === "all"
    ? allOrders
    : allOrders.filter((order) => order.status === parseInt(statusFilter));

  // Calculate stats
  const pendingPrintingCount = allOrders.filter(order => order.status === ORDER_STATUS.PENDING_PRINTING).length;
  const inPrintingCount = allOrders.filter(order => order.status === ORDER_STATUS.IN_PRINTING).length;
  const completedCount = allOrders.filter(order => order.status === ORDER_STATUS.COMPLETED).length;
  const totalOrdersCount = allOrders.length;

  const stats = [
    {
      title: "إجمالي الطلبات",
      value: totalOrdersCount,
      icon: Dashboard,
      color: "#1976d2",
    },
    {
      title: "بانتظار الطباعة",
      value: pendingPrintingCount,
      icon: Schedule,
      color: "#ed6c02",
    },
    {
      title: "في مرحلة الطباعة",
      value: inPrintingCount,
      icon: Print,
      color: "#2e7d32",
    },
    {
      title: "مكتملة",
      value: completedCount,
      icon: CheckCircle,
      color: "#9c27b0",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <AppBar
        position="static"
        elevation={2}
        sx={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        }}
      >
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            PSBrand - لوحة مدير التصميم
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "white", color: "#f5576c" }}>
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user?.name || "مدير التصميم"}
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
              <Grid item xs={12} sm={6} md={3} key={index}>
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

        <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              <DesignServices sx={{ verticalAlign: "middle", mr: 1 }} />
              جميع الطلبات ({filteredOrders.length})
            </Typography>

            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">جميع الطلبات</MenuItem>
              <MenuItem value={ORDER_STATUS.PENDING_PRINTING}>بانتظار الطباعة</MenuItem>
              <MenuItem value={ORDER_STATUS.IN_PRINTING}>في مرحلة الطباعة</MenuItem>
              <MenuItem value={ORDER_STATUS.IN_PREPARATION}>في مرحلة التحضير</MenuItem>
              <MenuItem value={ORDER_STATUS.COMPLETED}>مكتمل</MenuItem>
              <MenuItem value={ORDER_STATUS.CANCELLED}>ملغي</MenuItem>
              <MenuItem value={ORDER_STATUS.OPEN_ORDER}>الطلب مفتوح</MenuItem>
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>العدد</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نوع المنتج</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ملف PDF</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          <Box sx={{ padding: 4 }}>
                            <Typography variant="h6" color="text.secondary">
                              لا توجد طلبات حالياً
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.flatMap((order) => {
                      const status = getStatusLabel(order.status);
                      const designs = order.orderDesigns || [];
                      
                      // If no designs, show at least one row with order info
                      if (designs.length === 0) {
                        return (
                          <TableRow
                            key={`order-${order.id}`}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                            <TableCell>{order.client?.name || "-"}</TableCell>
                            <TableCell>{order.client?.phone || "-"}</TableCell>
                            <TableCell>
                              {order.designer?.name || "غير محدد"}
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                ID: {order.designer?.id || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
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
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleStatusUpdate(order.id, order.status)}
                                disabled={
                                  (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
                                  updatingOrderId === order.id
                                }
                              >
                                {updatingOrderId === order.id ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} color="inherit" />
                                    جاري التحميل...
                                  </Box>
                                ) : (
                                  order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                  order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      const rowCount = designs.length;
                      
                      // For each design in the order, create a separate row
                      return designs.map((design, designIndex) => {
                        const isFirstRow = designIndex === 0;
                        
                        // Calculate count for this specific design
                        const designCount = design.orderDesignItems?.reduce((sum, item) => {
                          return sum + (item.quantity || 0);
                        }, 0) || 0;
                        
                        // Get product type from first item of this design
                        const productType = design.orderDesignItems?.[0] 
                          ? `${FABRIC_TYPE_LABELS[design.orderDesignItems[0].fabricType] || design.orderDesignItems[0].fabricType} - ${SIZE_LABELS[design.orderDesignItems[0].size] || design.orderDesignItems[0].size}`
                          : "-";
                        
                        return (
                          <TableRow
                            key={`order-${order.id}-design-${design.id || designIndex}`}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            {isFirstRow && (
                              <>
                                <TableCell rowSpan={rowCount}>
                                  {order.orderNumber || `#${order.id}`}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.client?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.client?.phone || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.designer?.name || "غير محدد"}
                                  <br />
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {order.designer?.id || "-"}
                                  </Typography>
                                </TableCell>
                              </>
                            )}
                            <TableCell>{designCount}</TableCell>
                            <TableCell>{productType}</TableCell>
                            <TableCell>
                              {design?.mockupImageUrl && design.mockupImageUrl !== 'placeholder_mockup.jpg' ? (
                                <Box 
                                  sx={{ 
                                    width: 80, 
                                    height: 80, 
                                    position: 'relative',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: 0.8
                                    }
                                  }}
                                  onClick={() => handleImageClick(design.mockupImageUrl)}
                                >
                                  <img 
                                    src={design.mockupImageUrl} 
                                    alt={design.designName}
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                    style={{ 
                                      width: "100%", 
                                      height: "100%", 
                                      objectFit: "cover",
                                      borderRadius: "4px"
                                    }}
                                  />
                                  <Box 
                                    sx={{ 
                                      display: 'none',
                                      width: "100%", 
                                      height: "100%", 
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      bgcolor: '#f0f0f0',
                                      borderRadius: "4px",
                                      fontSize: '0.75rem',
                                      color: '#666'
                                    }}
                                  >
                                    صورة غير متوفرة
                                  </Box>
                                </Box>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {design?.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  href={design.printFileUrl}
                                  target="_blank"
                                  download
                                >
                                  PDF
                                </Button>
                              ) : "-"}
                            </TableCell>
                            {isFirstRow && (
                              <>
                                <TableCell rowSpan={rowCount}>
                                  <Chip
                                    label={status.label}
                                    color={status.color}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.orderDate 
                                    ? new Date(order.orderDate).toLocaleDateString("en-GB", { 
                                        year: "numeric", 
                                        month: "2-digit", 
                                        day: "2-digit"
                                      })
                                    : "-"
                                  }
                                </TableCell>
                                <TableCell rowSpan={rowCount} sx={{ textAlign: 'center' }}>
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
                                <TableCell rowSpan={rowCount}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStatusUpdate(order.id, order.status)}
                                    disabled={
                                      (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
                                      updatingOrderId === order.id
                                    }
                                  >
                                    {updatingOrderId === order.id ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={16} color="inherit" />
                                        جاري التحميل...
                                      </Box>
                                    ) : (
                                      order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                      order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"
                                    )}
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      });
                    })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Container>

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">معاينة الصورة</Typography>
          <IconButton onClick={handleCloseImageDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 2 }}>
          {selectedImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <img 
                src={selectedImage} 
                alt="معاينة الصورة"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <NotesDialog
        open={notesDialogOpen}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />
    </Box>
  );
};

export default DesignManagerDashboard;

