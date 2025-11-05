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
import { Logout, Assignment, CheckCircle, Pending, Close, Visibility, Note, Edit, Save, Image as ImageIcon } from "@mui/icons-material";
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
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const [selectedImage, setSelectedImage] = useState(null); // Selected image for dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false); // Image dialog state

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

  // Load image for display (lazy loading)
  const loadImageForDisplay = async (orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    
    // Check cache first
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    // Don't load if already loading
    if (loadingImage === `image-${orderId}-${designId}`) {
      return null;
    }
    
    // Load if not in cache
    setLoadingImage(`image-${orderId}-${designId}`);
    try {
      console.log('Loading image for:', { orderId, designId });
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find(d => d.id === designId);
      if (design?.mockupImageUrl && design.mockupImageUrl !== 'image_data_excluded') {
        console.log('Image loaded successfully:', design.mockupImageUrl.substring(0, 50));
        // Save to cache
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: design.mockupImageUrl
        }));
        return design.mockupImageUrl;
      } else {
        console.log('Image not found or excluded:', design);
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setLoadingImage(null);
    }
    return null;
  };

  // Helper function to open file (handles both URLs and base64)
  const openFile = async (fileUrl, orderId, designId) => {
    if (!fileUrl || fileUrl === 'placeholder_print.pdf') {
      return;
    }

    // If file data is excluded, fetch full order data first
    if (fileUrl === 'image_data_excluded' && orderId) {
      setLoadingImage(`file-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        if (design?.printFileUrl && design.printFileUrl !== 'image_data_excluded') {
          fileUrl = design.printFileUrl;
        } else {
          alert('الملف غير متوفر');
          setLoadingImage(null);
          return;
        }
      } catch (error) {
        console.error('Error fetching order file:', error);
        alert('حدث خطأ أثناء جلب الملف');
        setLoadingImage(null);
        return;
      } finally {
        setLoadingImage(null);
      }
    }

    // Check if it's a base64 data URL
    if (fileUrl.startsWith('data:')) {
      try {
        let base64Data = '';
        let mimeType = 'application/pdf';
        
        if (fileUrl.includes(',')) {
          const parts = fileUrl.split(',');
          base64Data = parts[1];
          const mimeMatch = fileUrl.match(/data:([^;]+);base64/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        } else {
          base64Data = fileUrl;
        }

        const cleanBase64 = base64Data.replace(/\s/g, '');
        
        let blob;
        try {
          const response = await fetch(fileUrl);
          blob = await response.blob();
        } catch (fetchError) {
          const binaryString = atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
        }
        
        if (blob.size === 0) {
          throw new Error('الملف فارغ');
        }

        // Detect file type
        let fileExtension = 'pdf';
        if (mimeType) {
          const mimeToExt = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/svg+xml': 'svg',
            'image/gif': 'gif',
            'image/webp': 'webp'
          };
          fileExtension = mimeToExt[mimeType.toLowerCase()] || 'bin';
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `order_file_${Date.now()}.${fileExtension}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        }, 1000);
      } catch (error) {
        console.error('Error opening file:', error);
        alert('حدث خطأ أثناء فتح الملف.\n' + error.message);
      }
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileUrl.split('/').pop() || 'file.pdf';
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  const handleViewDetails = async (order) => {
    console.log('Opening order details:', order);
    console.log('Order designs:', order?.orderDesigns);
    
    setSelectedOrder(order);
    setOrderNotes(''); // Start with empty for new note
    setIsEditingNotes(false);
    setOpenDetailsModal(true);
    
    // Load images for all designs when modal opens
    if (order?.orderDesigns) {
      order.orderDesigns.forEach(design => {
        console.log('Design:', {
          id: design.id,
          name: design.designName,
          mockupImageUrl: design.mockupImageUrl,
          printFileUrl: design.printFileUrl
        });
      });
      
      const loadPromises = order.orderDesigns.map(design => {
        if (design.mockupImageUrl === 'image_data_excluded') {
          console.log('Loading image for design:', design.id);
          return loadImageForDisplay(order.id, design.id);
        }
        return Promise.resolve(null);
      });
      
      // Wait for all images to load, then update selectedOrder to trigger re-render
      Promise.all(loadPromises).then(() => {
        console.log('All images loaded');
        // Force re-render by updating selectedOrder
        setSelectedOrder(prev => ({ ...prev }));
      });
    }
  };

  // Force re-render when imageCache changes
  useEffect(() => {
    // This effect ensures that when imageCache updates, the component re-renders
  }, [imageCache]);

  const handleImageClick = (imageUrl) => {
    if (!imageUrl || imageUrl === 'image_data_excluded' || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
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
                        {/* Always show image section if mockupImageUrl exists */}
                        {design.mockupImageUrl && design.mockupImageUrl !== 'placeholder_mockup.jpg' && (
                          (() => {
                            const cacheKey = `${selectedOrder?.id}-${design.id}`;
                            const isExcluded = design.mockupImageUrl === 'image_data_excluded';
                            const cachedImage = imageCache[cacheKey];
                            const isLoading = loadingImage === `image-${selectedOrder?.id}-${design.id}`;
                            const displayImage = isExcluded ? cachedImage : design.mockupImageUrl;
                            
                            return (
                          <Box 
                            sx={{ 
                              mb: 2, 
                              display: "flex", 
                              justifyContent: "center",
                              alignItems: "center",
                              width: "100%",
                              height: "250px",
                                  backgroundColor: displayImage ? "#ffffff" : "#f5f5f5",
                              borderRadius: "8px",
                                  border: isExcluded && !cachedImage ? "1px dashed #ccc" : "1px solid #e0e0e0",
                              overflow: "hidden"
                            }}
                          >
                                {isLoading ? (
                                  <CircularProgress />
                                ) : displayImage ? (
                                  <img 
                                    src={displayImage} 
                                    alt={design.designName}
                                    onClick={() => handleImageClick(displayImage)}
                                    onError={(e) => {
                                      e.target.parentElement.style.display = 'none';
                                    }}
                                    style={{ 
                                      width: "auto", 
                                      height: "100%", 
                                      maxWidth: "100%",
                                      objectFit: "contain",
                                      cursor: "pointer",
                                      transition: "transform 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  />
                                ) : (
                                  <Box sx={{ color: '#999', textAlign: 'center' }}>
                                    <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2">جاري التحميل...</Typography>
                                  </Box>
                                )}
                          </Box>
                            );
                          })()
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
                        {/* Always show file section if printFileUrl exists */}
                        {design.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => openFile(design.printFileUrl, selectedOrder?.id, design.id)}
                              disabled={loadingImage === `file-${selectedOrder?.id}-${design.id}`}
                              startIcon={loadingImage === `file-${selectedOrder?.id}-${design.id}` ? <CircularProgress size={16} /> : null}
                              sx={{ width: "100%" }}
                            >
                              {design.printFileUrl === 'image_data_excluded' 
                                ? 'تنزبل ملف التصميم' 
                                : 'تنزبل ملف التصميم'}
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

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">معاينة الصورة</Typography>
          <IconButton onClick={handleCloseImageDialog} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 2 }}>
          {selectedImage && selectedImage !== 'image_data_excluded' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <img
                src={selectedImage}
                alt="معاينة الصورة"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
              <Box sx={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                color: 'text.secondary'
              }}>
                <Typography variant="h6" sx={{ mb: 2 }}>لا يمكن عرض الصورة</Typography>
                <Typography variant="body2">الصورة غير متوفرة</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              color: 'text.secondary'
            }}>
              <Typography variant="h6" sx={{ mb: 2 }}>الصورة غير متوفرة</Typography>
              <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EmployeeDashboard;
