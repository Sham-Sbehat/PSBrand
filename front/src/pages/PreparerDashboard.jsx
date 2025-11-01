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
  Divider,
  TextField,
} from "@mui/material";
import { Logout, Visibility, Close, Assignment, Person, Phone, LocationOn, Receipt, CalendarToday, ShoppingBag, Note, Edit, Save } from "@mui/icons-material";
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
  const [orderNotes, setOrderNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

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
    setOrderNotes(''); // Start with empty for new note
    setIsEditingNotes(false);
    setOpenDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedOrder(null);
    setOrderNotes('');
    setIsEditingNotes(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder || !orderNotes.trim()) return;
    setSavingNotes(true);
    try {
      const currentDate = new Date();
      const dateTime = currentDate.toLocaleString("ar-SA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory"
      });
      const authorName = user?.name || "مستخدم غير معروف";
      
      // Format: [DateTime] Author Name: Note Text
      const newNote = `[${dateTime}] ${authorName}: ${orderNotes.trim()}`;
      
      // Append to existing notes or create new
      const existingNotes = selectedOrder.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;
      
      await ordersService.updateOrderNotes(selectedOrder.id, updatedNotes);
      // Update local state
      setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
      setPreparerOrders(prev => prev.map(order => 
        order.id === selectedOrder.id ? { ...order, notes: updatedNotes } : order
      ));
      setOrderNotes(''); // Clear input
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes(false);
    }
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

      <Container maxWidth="xl" sx={{ paddingY: 4 }}>
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
              <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Note color="primary" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      الملاحظات
                    </Typography>
                  </Box>
                  {!isEditingNotes ? (
                    <IconButton size="small" onClick={() => setIsEditingNotes(true)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        <Save fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setIsEditingNotes(false);
                          setOrderNotes(selectedOrder.notes || '');
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                {isEditingNotes ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك هنا..."
                    variant="outlined"
                  />
                ) : (
                  <Box sx={{ 
                    minHeight: 60,
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    maxHeight: 300,
                    overflowY: 'auto'
                  }}>
                    {selectedOrder.notes ? (
                      selectedOrder.notes.split('\n\n').map((note, idx) => {
                        // Parse note format: [DateTime] Author: Text
                        const match = note.match(/^\[([^\]]+)\]\s+(.+?):\s*(.*)$/);
                        if (match) {
                          const [, datetime, author, text] = match;
                          return (
                            <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < selectedOrder.notes.split('\n\n').length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {author}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {datetime}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                                {text}
                              </Typography>
                            </Box>
                          );
                        }
                        // Fallback for old format
                        return (
                          <Typography key={idx} variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
                            {note}
                          </Typography>
                        );
                      })
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        لا توجد ملاحظات
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
                
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
    </Box>
  );
};

export default PreparerDashboard;
