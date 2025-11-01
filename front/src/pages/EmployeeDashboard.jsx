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
  TextField,
  CircularProgress,
} from "@mui/material";
import { Logout, Assignment, CheckCircle, Pending, Close, Visibility, Note, Edit, Save } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService } from "../services/api";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS } from "../constants";
import OrderForm from "../components/employee/OrderForm";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders } = useApp();
  const [showForm, setShowForm] = useState(true);
  const [openOrdersModal, setOpenOrdersModal] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Fetch designer orders count on component mount
  const fetchDesignerOrdersCount = async () => {
    if (user?.role === USER_ROLES.DESIGNER && user?.id) {
      try {
        const response = await ordersService.getOrdersByDesigner(user.id);
        setTotalOrdersCount(response?.length || 0);
      } catch (error) {
        console.error('Error fetching orders count:', error);
      }
    }
  };

  useEffect(() => {
    fetchDesignerOrdersCount();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCardClick = async (index) => {
    // If it's the first card (Total Orders) and user is a designer, open modal
    if (index === 0 && user?.role === USER_ROLES.DESIGNER && user?.id) {
      setLoading(true);
      try {
        const response = await ordersService.getOrdersByDesigner(user.id);
        setOrdersList(response || []);
        setTotalOrdersCount(response?.length || 0); // Update count
        setOpenOrdersModal(true);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setOrderNotes(''); // Start with empty for new note
    setIsEditingNotes(false);
    setOpenDetailsModal(true);
  };

  const handleCloseOrdersModal = () => {
    setOpenOrdersModal(false);
    setOrdersList([]);
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
      setOrdersList(prev => prev.map(order => 
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

  const getStatusLabel = (status) => {
    const statusMap = {
      0: { label: "قيد الانتظار", color: "warning" },
      1: { label: "قيد التصميم", color: "info" },
      2: { label: "مكتمل", color: "success" },
    };
    return statusMap[status] || { label: "غير معروف", color: "default" };
  };

  const employeeOrders = orders.filter(
    (order) => order.employeeName === user?.name
  );
  const pendingOrders = employeeOrders.filter(
    (order) => order.status === "pending"
  );
  const completedOrders = employeeOrders.filter(
    (order) => order.status === "completed"
  );

  const stats = [
    {
      title: "إجمالي الطلبات",
      value: user?.role === USER_ROLES.DESIGNER ? totalOrdersCount : employeeOrders.length,
      icon: Assignment,
      color: "#1976d2",
    },
    {
      title: "قيد الانتظار",
      value: pendingOrders.length,
      icon: Pending,
      color: "#ed6c02",
    },
    {
      title: "مكتملة",
      value: completedOrders.length,
      icon: CheckCircle,
      color: "#2e7d32",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            PSBrand - لوحة الموظف
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "secondary.main" }}>
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user?.name || "موظف"}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={() => handleCardClick(index)}
                  sx={{
                    background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`,
                    color: "white",
                    transition: "transform 0.2s",
                    cursor: index === 0 && user?.role === USER_ROLES.DESIGNER ? "pointer" : "default",
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
        <Box sx={{ marginBottom: 4 }}>
          <OrderForm onSuccess={() => {
            setShowForm(false);
            fetchDesignerOrdersCount(); // Refresh orders count after creating new order
          }} />
        </Box>

        {employeeOrders.length > 0 && (
          <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 700, marginBottom: 3 }}
            >
              طلباتي السابقة
            </Typography>

            <Grid container spacing={3}>
              {employeeOrders.map((order) => (
                <Grid item xs={12} md={6} key={order.id}>
                  <Card
                    sx={{
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: 2,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {order.customerName}
                        </Typography>
                        <Chip
                          label={
                            order.status === "pending"
                              ? "قيد الانتظار"
                              : order.status === "completed"
                              ? "مكتمل"
                              : "ملغي"
                          }
                          color={
                            order.status === "pending"
                              ? "warning"
                              : order.status === "completed"
                              ? "success"
                              : "error"
                          }
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>الهاتف:</strong> {order.customerPhone}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>المقاس:</strong> {order.size} |{" "}
                        <strong>اللون:</strong> {order.color}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>السعر:</strong> {order.price} ₪
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", marginTop: 1 }}
                      >
                        {new Date(order.createdAt).toLocaleDateString("ar", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Container>

      {/* Orders Modal */}
      <Dialog
        open={openOrdersModal}
        onClose={handleCloseOrdersModal}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6"> اجمالي الطلبات</Typography>
          <IconButton onClick={handleCloseOrdersModal}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <Typography>جاري التحميل...</Typography>
            </Box>
          ) : ordersList.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <Typography>لا توجد طلبات</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordersList.map((order) => {
                    const status = getStatusLabel(order.status);
                    return (
                      <TableRow key={order.id} hover>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{order.client?.name || "-"}</TableCell>
                        <TableCell>{order.client?.phone || "-"}</TableCell>
                        <TableCell>{order.totalAmount} ₪</TableCell>
                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {order.orderDate 
                            ? new Date(order.orderDate).toLocaleDateString("ar-SA", { calendar: "gregory" })
                            : "-"
                          }
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
          <Button onClick={handleCloseOrdersModal}>إغلاق</Button>
        </DialogActions>
      </Dialog>

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
                  <Typography variant="subtitle2" color="text.secondary">الفرعي:</Typography>
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
                      ? new Date(selectedOrder.orderDate).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          calendar: "gregory"
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
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Note color="primary" fontSize="small" />
                      <Typography variant="subtitle2" color="text.secondary">الملاحظات:</Typography>
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
                          {savingNotes ? <CircularProgress size={16} /> : <Save fontSize="small" />}
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setIsEditingNotes(false);
                            setOrderNotes('');
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
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                      minHeight: 60,
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

export default EmployeeDashboard;
