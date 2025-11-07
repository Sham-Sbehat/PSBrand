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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Logout, Assignment, CheckCircle, Pending, Close, Visibility, Note, Edit, Save, Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS } from "../constants";
import OrderForm from "../components/employee/OrderForm";
import GlassDialog from "../components/common/GlassDialog";
import calmPalette from "../theme/calmPalette";

// Helper function to build full image/file URL
const getFullUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://psbrand-backend-production.up.railway.app/api";
  const baseDomain = API_BASE_URL.replace("/api", "");

  if (url.startsWith("/")) {
    return `${baseDomain}${url}`;
  }

  return `${baseDomain}/${url}`;
};

const getMockupImages = (design) => {
  if (!design) return [];
  const images = [];
  if (Array.isArray(design.mockupImageUrls)) {
    images.push(...design.mockupImageUrls);
  }
  if (design.mockupImageUrl) {
    images.push(design.mockupImageUrl);
  }
  return images.filter((url) => url && url !== "placeholder_mockup.jpg");
};

const getPrintFiles = (design) => {
  if (!design) return [];
  const files = [];
  if (Array.isArray(design.printFileUrls)) {
    files.push(...design.printFileUrls);
  }
  if (design.printFileUrl) {
    files.push(design.printFileUrl);
  }
  return files.filter((url) => url && url !== "placeholder_print.pdf");
};

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
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
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

    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }

    if (loadingImage === `image-${orderId}-${designId}`) {
      return null;
    }

    setLoadingImage(`image-${orderId}-${designId}`);
    try {
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find((d) => d.id === designId);

      const imageUrls = getMockupImages(design);
      const firstImage = imageUrls.find((url) => url && url !== "image_data_excluded" && url !== "placeholder_mockup.jpg");

      if (firstImage) {
        const fullImageUrl = getFullUrl(firstImage);
        setImageCache((prev) => ({
          ...prev,
          [cacheKey]: fullImageUrl,
        }));
        return fullImageUrl;
      }
    } catch (error) {
      console.error("Error loading image:", error);
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
        const files = getPrintFiles(design);
        const firstValidFile = files.find(url => url !== 'image_data_excluded');
        if (firstValidFile) {
          fileUrl = firstValidFile;
        } else if (files.includes('image_data_excluded')) {
          fileUrl = null;
        }

        if (!fileUrl) {
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
    } else {
      const fullFileUrl = getFullUrl(fileUrl);
      const link = document.createElement('a');
      link.href = fullFileUrl;
      link.download = fullFileUrl.split('/').pop() || 'file.pdf';
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
          mockupImageUrls: design.mockupImageUrls,
          printFileUrls: design.printFileUrls
        });
      });
      
      const loadPromises = order.orderDesigns.map(design => {
        const images = getMockupImages(design);
        const hasExcludedImage = images.includes('image_data_excluded');
        if (hasExcludedImage) {
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

  const handleImageClick = async (imageUrl, orderId, designId) => {
    if (!imageUrl || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }

    if (imageUrl === 'image_data_excluded' && orderId) {
      const cacheKey = `${orderId}-${designId}`;
      let imageToShow = imageCache[cacheKey];
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      if (imageToShow) {
        setSelectedImage(imageToShow);
        setImageDialogOpen(true);
      } else {
        alert('الصورة غير متوفرة');
      }
      return;
    }

    setSelectedImage(getFullUrl(imageUrl));
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

  const getStatusLabel = (status) => ({
    label: ORDER_STATUS_LABELS[status] || "غير معروف",
    color: ORDER_STATUS_COLORS[status] || "default",
  });

  const handleCancelOrder = async (order) => {
    if (!order) return;
    setCancelLoadingId(order.id);
    try {
      await orderStatusService.setCancelled(order.id);
      setOrdersList((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: ORDER_STATUS.CANCELLED } : item
        )
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: ORDER_STATUS.CANCELLED } : prev
        );
      }
      fetchDesignerOrdersCount(); // refresh counts if designer
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("حدث خطأ أثناء إلغاء الطلب. الرجاء المحاولة مرة أخرى.");
    } finally {
      setCancelLoadingId(null);
    }
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
    },
    {
      title: "قيد الانتظار",
      value: pendingOrders.length,
      icon: Pending,
    },
    {
      title: "مكتملة",
      value: completedOrders.length,
      icon: CheckCircle,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: calmPalette.background,
        paddingBottom: 6,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: calmPalette.appBar,
          boxShadow: "0 12px 30px rgba(34, 26, 21, 0.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            PSBrand - لوحة الموظف
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                backdropFilter: "blur(6px)",
              }}
            >
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500, color: "#f6f1eb" }}>
              {user?.name || "موظف"}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                color: "#f6f1eb",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 2,
              }}
            >
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ paddingY: 5 }}>
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle = calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={() => handleCardClick(index)}
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: 4,
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
                    cursor: index === 0 && user?.role === USER_ROLES.DESIGNER ? "pointer" : "default",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 55%)",
                      pointerEvents: "none",
                    },
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0 28px 50px rgba(46, 38, 31, 0.22)",
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
                        <Typography
                          variant="h3"
                          sx={{ fontWeight: 700, color: cardStyle.highlight }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            marginTop: 1,
                            color: "rgba(255, 255, 255, 0.8)",
                          }}
                        >
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ fontSize: 56, color: cardStyle.highlight }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <Box
          sx={{
            marginBottom: 4,
            background: calmPalette.surface,
            borderRadius: 4,
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
            padding: 3,
          }}
        >
          <OrderForm onSuccess={() => {
            setShowForm(false);
            fetchDesignerOrdersCount(); // Refresh orders count after creating new order
          }} />
        </Box>

        {employeeOrders.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              padding: 4,
              borderRadius: 4,
              background: calmPalette.surface,
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
          >
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
                      background: calmPalette.surfaceHover,
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 18px 36px rgba(46, 38, 31, 0.18)",
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
      <GlassDialog
        open={openOrdersModal}
        onClose={handleCloseOrdersModal}
        maxWidth="xl"
        title="اجمالي الطلبات"
        actions={
          <Button onClick={handleCloseOrdersModal} variant="contained">
            إغلاق
          </Button>
        }
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
            <Typography>جاري التحميل...</Typography>
          </Box>
        ) : ordersList.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
            <Typography>لا توجد طلبات</Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(94, 78, 62, 0.18)",
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          >
            <Table>
              <TableHead
                sx={{
                  backgroundColor: "rgba(94, 78, 62, 0.08)",
                  "& th": { fontWeight: 700, color: calmPalette.textPrimary },
                }}
              >
                <TableRow>
                  <TableCell>رقم الطلب</TableCell>
                  <TableCell>اسم العميل</TableCell>
                  <TableCell>الرقم</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersList.map((order) => {
                  const status = getStatusLabel(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { backgroundColor: "rgba(255,255,255,0.3)" },
                      }}
                    >
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{order.client?.name || "-"}</TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.totalAmount} ₪</TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      <TableCell>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("ar-SA", { calendar: "gregory" })
                          : "-"}
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
                    {order.status !== ORDER_STATUS.CANCELLED &&
                      order.status !== ORDER_STATUS.COMPLETED && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{ ml: 1 }}
                          onClick={() => handleCancelOrder(order)}
                          disabled={cancelLoadingId === order.id}
                        >
                          {cancelLoadingId === order.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            "إلغاء الطلب"
                          )}
                        </Button>
                      )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </GlassDialog>

      {/* Order Details Modal */}
      <GlassDialog
        open={openDetailsModal}
        onClose={handleCloseDetailsModal}
        maxWidth="md"
        title="تفاصيل الطلب"
        subtitle={selectedOrder?.orderNumber}
        actions={
          <Button onClick={handleCloseDetailsModal} variant="contained">
            إغلاق
          </Button>
        }
      >
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
                      <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: "rgba(255,255,255,0.5)", borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                          اسم التصميم: {design.designName}
                        </Typography>
                        {(() => {
                          const cacheKey = `${selectedOrder?.id}-${design.id}`;
                          const images = getMockupImages(design);
                          const validImages = images.filter(url => url && url !== 'placeholder_mockup.jpg');

                          if (validImages.length === 0) return null;

                          return (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                الصور ({validImages.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {validImages.map((imageUrl, imgIdx) => {
                                  if (imageUrl === 'image_data_excluded') {
                                    const isLoading = loadingImage === `image-${selectedOrder?.id}-${design.id}`;
                                    return (
                                      <Button
                                        key={`img-btn-${imgIdx}`}
                                        variant="outlined"
                                        size="small"
                                        startIcon={isLoading ? <CircularProgress size={16} /> : <ImageIcon />}
                                        onClick={() => handleImageClick(imageUrl, selectedOrder?.id, design.id)}
                                        disabled={isLoading}
                                      >
                                        عرض الصورة {imgIdx + 1}
                                      </Button>
                                    );
                                  }

                                  const displayUrl = getFullUrl(imageUrl);
                                  const isLoading = loadingImage === `image-${selectedOrder?.id}-${design.id}` && !imageCache[cacheKey];

                                  return (
                                    <Box
                                      key={`img-${imgIdx}`}
                                      sx={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        '&:hover': { opacity: 0.85 }
                                      }}
                                    >
                                      {isLoading ? (
                                        <Box sx={{
                                          width: 120,
                                          height: 120,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '8px',
                                          bgcolor: 'grey.100'
                                        }}>
                                          <CircularProgress size={20} />
                                        </Box>
                                      ) : (
                                        <img
                                          src={displayUrl}
                                          alt={`${design.designName} - صورة ${imgIdx + 1}`}
                                          onClick={() => handleImageClick(imageUrl, selectedOrder?.id, design.id)}
                                          style={{
                                            maxWidth: '140px',
                                            maxHeight: '140px',
                                            borderRadius: '8px',
                                            transition: 'transform 0.2s'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        })()}
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
                                  backgroundColor: "rgba(255,255,255,0.7)",
                                  border: "1px solid rgba(94, 78, 62, 0.12)"
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
                        <Box sx={{ mt: 1, p: 1, backgroundColor: "rgba(94, 131, 158, 0.18)", borderRadius: 2 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            إجمالي التصميم: {design.totalPrice} ₪
                          </Typography>
                        </Box>
                        {(() => {
                          const files = getPrintFiles(design);
                          if (files.length === 0) return null;

                          return (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                ملفات التصميم ({files.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {files.map((fileUrl, fileIdx) => (
                                  fileUrl === 'image_data_excluded' ? (
                                    <Button
                                      key={`file-btn-${fileIdx}`}
                                      variant="outlined"
                                      size="small"
                                      startIcon={loadingImage === `file-${selectedOrder?.id}-${design.id}` ? <CircularProgress size={16} /> : <PictureAsPdf />}
                                      onClick={() => openFile(fileUrl, selectedOrder?.id, design.id)}
                                      disabled={loadingImage === `file-${selectedOrder?.id}-${design.id}`}
                                    >
                                      تحميل الملف {fileIdx + 1}
                                    </Button>
                                  ) : (
                                    <Button
                                      key={`file-${fileIdx}`}
                                      variant="contained"
                                      size="small"
                                      startIcon={<PictureAsPdf />}
                                      onClick={() => openFile(fileUrl, selectedOrder?.id, design.id)}
                                    >
                                      ملف {fileIdx + 1}
                                    </Button>
                                  )
                                ))}
                              </Box>
                            </Box>
                          );
                        })()}
                      </Paper>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
      </GlassDialog>

      {/* Image Dialog */}
      <GlassDialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        title="معاينة الصورة"
        contentSx={{ padding: 0 }}
      >
        {selectedImage ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, padding: 3 }}>
            <img
              src={selectedImage}
              alt="معاينة الصورة"
              onError={(e) => {
                e.target.style.display = "none";
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = "flex";
                }
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 24px 65px rgba(15, 23, 42, 0.35)",
              }}
            />
            <Box
              sx={{
                display: "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "400px",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                لا يمكن عرض الصورة
              </Typography>
              <Typography variant="body2">الصورة غير متوفرة</Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              color: "text.secondary",
              padding: 4,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              الصورة غير متوفرة
            </Typography>
            <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات</Typography>
          </Box>
        )}
      </GlassDialog>
    </Box>
  );
};

export default EmployeeDashboard;
