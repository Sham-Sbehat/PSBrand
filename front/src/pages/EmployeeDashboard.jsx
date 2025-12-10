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
  Divider,
} from "@mui/material";
import { Logout, Assignment, CheckCircle, Pending, Close, Visibility, Note, Edit, Save, Image as ImageIcon, PictureAsPdf, Search, WhatsApp as WhatsAppIcon, CameraAlt } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, shipmentsService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS } from "../constants";
import { openWhatsApp } from "../utils";
import OrderForm from "../components/employee/OrderForm";
import GlassDialog from "../components/common/GlassDialog";
import NotificationsBell from "../components/common/NotificationsBell";
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

const getStatusChipColor = (status) => {
  const numericStatus = typeof status === "number" ? status : parseInt(status, 10);
  return ORDER_STATUS_COLORS[numericStatus] || "default";
};

const getStatusText = (status) => {
  const numericStatus = typeof status === "number" ? status : parseInt(status, 10);
  return ORDER_STATUS_LABELS[numericStatus] || "غير معروف";
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);
    const isoReady = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
    return new Date(hasTimezone ? isoReady : `${isoReady}Z`);
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  return null;
};

const formatDateTime = (dateValue) => {
  const normalized = normalizeDateValue(dateValue);
  if (!normalized || Number.isNaN(normalized.getTime())) return "-";

  try {
    return normalized.toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      calendar: "gregory",
    });
  } catch {
    return normalized.toString();
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  return `${numericValue.toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₪`;
};

const getFabricLabel = (fabricType) => {
  if (fabricType === null || fabricType === undefined) return "-";
  const numeric = typeof fabricType === "number" ? fabricType : parseInt(fabricType, 10);
  return FABRIC_TYPE_LABELS[numeric] || fabricType || "-";
};

const getSizeLabel = (size) => {
  if (size === null || size === undefined) return "-";
  if (typeof size === "number") {
    return SIZE_LABELS[size] || size;
  }
  const numeric = parseInt(size, 10);
  if (!Number.isNaN(numeric) && SIZE_LABELS[numeric]) {
    return SIZE_LABELS[numeric];
  }
  return size;
};

const getColorLabel = (color) => {
  if (color === null || color === undefined) return "-";
  const numeric = typeof color === "number" ? color : parseInt(color, 10);
  return COLOR_LABELS[numeric] || color || "-";
};

const InfoItem = ({ label, value }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 0.5,
      py: 0.5,
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box sx={{ typography: "body1", fontWeight: 600, color: "text.primary" }}>
      {value ?? "-"}
    </Box>
  </Box>
);

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
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [openDeliveryStatusDialog, setOpenDeliveryStatusDialog] = useState(false);
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [deliveryStatusLoading, setDeliveryStatusLoading] = useState(false);
  const [orderForDeliveryStatus, setOrderForDeliveryStatus] = useState(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderId: statusData }
  const [loadingDeliveryStatuses, setLoadingDeliveryStatuses] = useState({}); // { orderId: true }
  const [newNotificationReceived, setNewNotificationReceived] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [ordersSummary, setOrdersSummary] = useState({
    totalCount: 0,
    totalAmountWithDelivery: 0,
    totalAmountWithoutDelivery: 0,
    periodDescription: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOrderDesigns = selectedOrder?.orderDesigns || [];
  const totalOrderQuantity = selectedOrderDesigns.reduce((sum, design) => {
    const designCount =
      design?.orderDesignItems?.reduce((itemSum, item) => itemSum + (item?.quantity || 0), 0) || 0;
    return sum + designCount;
  }, 0);

  const discountDisplay = (() => {
    if (!selectedOrder) return "-";
    const parts = [];
    if (selectedOrder.discountAmount !== null && selectedOrder.discountAmount !== undefined) {
      parts.push(formatCurrency(selectedOrder.discountAmount));
    }
    if (
      selectedOrder.discountPercentage !== null &&
      selectedOrder.discountPercentage !== undefined &&
      selectedOrder.discountPercentage !== ""
    ) {
      parts.push(`${selectedOrder.discountPercentage}%`);
    }
    return parts.length > 0 ? parts.join(" / ") : "-";
  })();

  const discountNotes =
    typeof selectedOrder?.discountNotes === "string"
      ? selectedOrder.discountNotes.trim()
      : "";

  const selectedOrderNotes =
    typeof selectedOrder?.notes === "string" ? selectedOrder.notes.trim() : "";

  const sellerName =
    selectedOrder?.employee?.name ||
    selectedOrder?.employeeName ||
    selectedOrder?.salesRep?.name ||
    "-";

  // Fetch designer orders count on component mount
  const fetchDesignerOrdersCount = async () => {
    if (user?.role === USER_ROLES.DESIGNER && user?.id) {
      try {
        // استخدام API الجديد مع التاريخ الحالي
        const today = new Date();
        const isoDateString = today.toISOString();
        const response = await ordersService.getOrdersByDesignerAndMonth(user.id, isoDateString);
        const orders = response?.orders || (Array.isArray(response) ? response : []);
        setTotalOrdersCount(response?.totalCount || orders.length);
      } catch (error) {
        console.error('Error fetching orders count:', error);
      }
    }
  };

  // Fetch delivery status for orders sent to delivery company
  const fetchDeliveryStatus = async (orderId) => {
    // Check if already loading or loaded
    if (loadingDeliveryStatuses[orderId] || deliveryStatuses[orderId] !== undefined) {
      return;
    }
    
    setLoadingDeliveryStatuses(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(orderId);
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: statusData }));
    } catch (error) {
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: null }));
    } finally {
      setLoadingDeliveryStatuses(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  };

  useEffect(() => {
    fetchDesignerOrdersCount();

    // Subscribe to SignalR updates for real-time delivery status updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onDeliveryStatusChanged: (orderId, deliveryStatus) => {
            // Update delivery status in real-time when backend sends update
            console.log('Delivery status updated via SignalR for order:', orderId, deliveryStatus);
            setDeliveryStatuses(prev => ({
              ...prev,
              [orderId]: deliveryStatus
            }));
          },
          onShipmentStatusUpdated: (shipmentData) => {
            // Handle shipment status update from webhook (ShipmentStatusUpdated event)
            const orderId = shipmentData?.orderId;
            if (orderId) {
              // استخدام البيانات مباشرة من SignalR
              if (shipmentData?.status) {
                const statusData = {
                  orderId: shipmentData.orderId,
                  shipmentId: shipmentData.shipmentId,
                  roadFnShipmentId: shipmentData.roadFnShipmentId,
                  trackingNumber: shipmentData.trackingNumber,
                  status: typeof shipmentData.status === 'string' 
                    ? { arabic: shipmentData.status, english: shipmentData.status }
                    : shipmentData.status,
                  lastUpdate: shipmentData.lastUpdate
                };
                setDeliveryStatuses(prev => ({
                  ...prev,
                  [orderId]: statusData
                }));
              } else {
                // إذا لم تكن البيانات كاملة، نجلب من API
                fetchDeliveryStatus(orderId);
              }
            }
          },
          onShipmentNoteAdded: (shipmentData) => {
            // Handle shipment note added from webhook (ShipmentNoteAdded event)
            const orderId = shipmentData?.orderId;
            if (orderId) {
              // استخدام البيانات مباشرة من SignalR
              if (shipmentData?.status) {
                const statusData = {
                  orderId: shipmentData.orderId,
                  shipmentId: shipmentData.shipmentId,
                  roadFnShipmentId: shipmentData.roadFnShipmentId,
                  trackingNumber: shipmentData.trackingNumber,
                  status: typeof shipmentData.status === 'string' 
                    ? { arabic: shipmentData.status, english: shipmentData.status }
                    : shipmentData.status,
                  note: shipmentData.note,
                  lastUpdate: shipmentData.entryDateTime
                };
                setDeliveryStatuses(prev => ({
                  ...prev,
                  [orderId]: statusData
                }));
              } else {
                fetchDeliveryStatus(orderId);
              }
            }
          },
          onNewNotification: (notification) => {
            console.log("📬 New notification received:", notification);
            setNewNotificationReceived(notification);
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
        });
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  // Load delivery statuses for all orders - try to fetch for all orders
  // API will return error/empty if no shipment exists, which is fine
  useEffect(() => {
    if (!ordersList || ordersList.length === 0) return;
    
    // Try to fetch delivery status for all orders
    // We check if already loaded/loading to avoid duplicate requests
    ordersList.forEach(order => {
      // Check synchronously if already loaded or loading
      const isLoaded = deliveryStatuses[order.id] !== undefined;
      const isLoading = loadingDeliveryStatuses[order.id] === true;
      
      // Only fetch if not already checked
      if (!isLoaded && !isLoading) {
        // Try to fetch - if no shipment exists, API will return error and we set null
        fetchDeliveryStatus(order.id).catch(() => {
          // Silently fail - this order just doesn't have a shipment
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersList]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const loadOrdersByDate = async (dateString) => {
    if (user?.role !== USER_ROLES.DESIGNER || !user?.id) return;
    
    setLoading(true);
    try {
      // تحويل التاريخ من YYYY-MM-DD إلى ISO string
      const date = dateString ? new Date(dateString) : new Date();
      const isoDateString = date.toISOString();
      const response = await ordersService.getOrdersByDesignerAndMonth(user.id, isoDateString);
      
      // الـ API يرجع object يحتوي على orders array
      const orders = response?.orders || (Array.isArray(response) ? response : []);
      setOrdersList(Array.isArray(orders) ? orders : []);
      
      // حفظ معلومات الـ summary
      setOrdersSummary({
        totalCount: response?.totalCount || orders.length,
        totalAmountWithDelivery: response?.totalAmountWithDelivery || 0,
        totalAmountWithoutDelivery: response?.totalAmountWithoutDelivery || 0,
        periodDescription: response?.periodDescription || ''
      });
      
      // تحديث العدد الإجمالي
      setTotalOrdersCount(response?.totalCount || orders.length);
      
      // جلب حالة التوصيل لجميع الطلبات (مثل OrdersList.jsx)
      // API سيرجع خطأ/فارغ إذا لم تكن هناك شحنة، وهذا طبيعي
      orders.slice(0, 20).forEach(order => {
        fetchDeliveryStatus(order.id);
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrdersList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (index) => {
    // If it's the first card (Total Orders) and user is a designer, open modal
    if (index === 0 && user?.role === USER_ROLES.DESIGNER && user?.id) {
      // تعيين التاريخ الحالي كافتراضي إذا لم يكن محدد
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;
      setSelectedDate(todayString);
      
      await loadOrdersByDate(todayString);
      setOpenOrdersModal(true);
    }
  };

  const handleDateChange = async (event) => {
    const newDateString = event.target.value;
    if (!newDateString || !user?.id) return;
    
    setSelectedDate(newDateString);
    await loadOrdersByDate(newDateString);
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
    setSelectedOrder(order);
    setOrderNotes(''); // Start with empty for new note
    setIsEditingNotes(false);
    setOpenDetailsModal(true);
    
    // Load images for all designs when modal opens
    if (order?.orderDesigns) {
      order.orderDesigns.forEach(design => {
      });
      
      const loadPromises = order.orderDesigns.map(design => {
        const images = getMockupImages(design);
        const hasExcludedImage = images.includes('image_data_excluded');
        if (hasExcludedImage) {
          return loadImageForDisplay(order.id, design.id);
        }
        return Promise.resolve(null);
      });
      
      // Wait for all images to load, then update selectedOrder to trigger re-render
      Promise.all(loadPromises).then(() => {
        // Force re-render by updating selectedOrder
        setSelectedOrder(prev => ({ ...prev }));
      });
    }
  };

  const handleOpenEditOrder = async (order) => {
    setEditLoading(true);
    try {
      const fullOrder = await ordersService.getOrderById(order.id);
      setOrderToEdit(fullOrder || order);
      setOpenEditDialog(true);
    } catch (error) {
      alert("حدث خطأ أثناء جلب بيانات الطلب للتعديل");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEditOrder = () => {
    if (editLoading) return;
    setOpenEditDialog(false);
    setOrderToEdit(null);
  };

  const handleSubmitEditOrder = async (updatedOrder) => {
    if (!orderToEdit || !updatedOrder) return;

    setEditLoading(true);
    try {
      const payloadToSend = {
        ...orderToEdit,
        ...updatedOrder,
        id: orderToEdit.id,
      };

      if (Array.isArray(payloadToSend.orderDesigns)) {
        payloadToSend.orderDesigns = payloadToSend.orderDesigns.map((design) => ({
          ...design,
          orderId: payloadToSend.id,
        }));
      }

      await ordersService.updateOrder(orderToEdit.id, payloadToSend);

      let refreshed = [];
      try {
        if (user?.role === USER_ROLES.DESIGNER && user?.id) {
          refreshed = await ordersService.getOrdersByDesigner(user.id);
        } else {
          refreshed = await ordersService.getAllOrders();
        }
      } catch (refreshError) {
        console.error("Error refreshing orders after update:", refreshError);
      }

      if (Array.isArray(refreshed)) {
        setOrdersList(refreshed);
        setTotalOrdersCount(refreshed.length);
      }

      const updatedSelected =
        refreshed?.find?.((order) => order.id === orderToEdit.id) || payloadToSend;

      if (selectedOrder?.id === orderToEdit.id && updatedSelected) {
        setSelectedOrder(updatedSelected);
      }

      setOrderToEdit(updatedSelected);
      fetchDesignerOrdersCount();
    } catch (error) {
      console.error("Error updating order:", error);
      alert("حدث خطأ أثناء تحديث الطلب. الرجاء المحاولة مرة أخرى.");
    } finally {
      setEditLoading(false);
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
    setSearchQuery('');
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
    } finally {
      setCancelLoadingId(null);
    }
  };

  const handleDeliveryStatusClick = async (order) => {
    setOrderForDeliveryStatus(order);
    setDeliveryStatusLoading(true);
    setOpenDeliveryStatusDialog(true);
    setDeliveryStatusData(null);
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(order.id);
      setDeliveryStatusData(statusData);
    } catch (error) {
      console.error('Error fetching delivery status:', error);
      alert(`حدث خطأ أثناء جلب حالة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setDeliveryStatusLoading(false);
    }
  };

  const handleCloseDeliveryStatusDialog = () => {
    setOpenDeliveryStatusDialog(false);
    setDeliveryStatusData(null);
    setOrderForDeliveryStatus(null);
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
            <NotificationsBell onNewNotification={newNotificationReceived} />
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
          <>
            {/* Search Field */}
            <Box 
              sx={{ 
                marginBottom: 2,
                marginTop: 2,
                position: 'relative',
                width: '30%',
                minWidth: 400,
              }}
            >
              <TextField
                fullWidth
                size="medium"
                placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: 1,
                        color: searchQuery ? calmPalette.primary : 'text.secondary',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      <Search />
                    </Box>
                  ),
                }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(94, 78, 62, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 25px rgba(94, 78, 62, 0.15)',
                    backgroundColor: "rgba(255,255,255,0.95)",
                  },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    paddingLeft: 1,
                    '& fieldset': {
                      borderColor: 'rgba(94, 78, 62, 0.2)',
                      borderWidth: 2,
                      transition: 'all 0.3s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: calmPalette.primary + '80',
                      borderWidth: 2,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: calmPalette.primary,
                      borderWidth: 2,
                      boxShadow: `0 0 0 3px ${calmPalette.primary}20`,
                    },
                    '& input': {
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    },
                  },
                }}
              />
              {searchQuery && (
                <Box
                  sx={{
                    marginTop: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: calmPalette.primary + '15',
                    padding: '8px 16px',
                    borderRadius: 2,
                    width: 'fit-content',
                    border: `1px solid ${calmPalette.primary}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: calmPalette.primary + '25',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Search sx={{ fontSize: 18, color: calmPalette.primary }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: calmPalette.primary,
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    {(() => {
                      const filteredCount = searchQuery.trim()
                        ? ordersList.filter((order) => {
                            const clientName = order.client?.name || '';
                            const clientPhone = order.client?.phone || '';
                            const query = searchQuery.toLowerCase().trim();
                            return clientName.toLowerCase().includes(query) || clientPhone.includes(query);
                          }).length
                        : ordersList.length;
                      return `تم العثور على ${filteredCount} ${filteredCount === 1 ? 'نتيجة' : 'نتائج'}`;
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
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
                    <TableCell sx={{ fontWeight: 700 }}>حالة التوصيل</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const filteredOrders = searchQuery.trim()
                      ? ordersList.filter((order) => {
                          const clientName = order.client?.name || '';
                          const clientPhone = order.client?.phone || '';
                          const orderNumber = order.orderNumber || `#${order.id}` || '';
                          const query = searchQuery.toLowerCase().trim();
                          return (
                            clientName.toLowerCase().includes(query) || 
                            clientPhone.includes(query) ||
                            orderNumber.toLowerCase().includes(query)
                          );
                        })
                      : ordersList;
                    
                    if (filteredOrders.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Box sx={{ padding: 4 }}>
                              <Typography variant="body1" color="text.secondary">
                                {searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد طلبات'}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    return filteredOrders.map((order) => {
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
                      <TableCell>
                        {order.client?.phone ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{order.client.phone}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                openWhatsApp(order.client.phone);
                              }}
                              sx={{
                                color: '#25D366',
                                '&:hover': {
                                  backgroundColor: 'rgba(37, 211, 102, 0.1)',
                                },
                              }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{order.totalAmount} ₪</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={status.label} color={status.color} size="small" />
                          {order.needsPhotography && (
                            <CameraAlt sx={{ color: 'primary.main', fontSize: 20 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell
                        onClick={() => {
                          // Always allow clicking - we'll try to fetch delivery status
                          handleDeliveryStatusClick(order);
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        {(() => {
                          const statusData = deliveryStatuses[order.id];
                          const isLoading = loadingDeliveryStatuses[order.id];
                          
                          if (isLoading) {
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant="body2" color="text.secondary">
                                  جاري التحميل...
                                </Typography>
                              </Box>
                            );
                          }
                          
                          if (statusData === null) {
                            // We checked but no shipment exists
                            return (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            );
                          }
                          
                          if (statusData && statusData.status) {
                            return (
                              <Chip
                                label={statusData.status.arabic || statusData.status.english || 'غير معروف'}
                                sx={{
                                  backgroundColor: statusData.status.color || '#1976d2',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  maxWidth: '150px',
                                  '&:hover': {
                                    opacity: 0.9,
                                    transform: 'scale(1.05)',
                                  },
                                  transition: 'all 0.2s',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                }}
                                size="small"
                              />
                            );
                          }
                          
                          // No data yet - show dash (will be populated when shipment is created or fetched)
                          return (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("ar-SA", { calendar: "gregory" })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                          >
                            عرض 
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ minWidth: 100 }}
                            onClick={() => handleOpenEditOrder(order)}
                          >
                            تعديل
                          </Button>
                          {order.status !== ORDER_STATUS.CANCELLED &&
                            order.status !== ORDER_STATUS.COMPLETED && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                sx={{
                                  minWidth: 120,
                                  '&.Mui-disabled': {
                                    color: '#777777',
                                    borderColor: 'rgba(0,0,0,0.12)',
                                    backgroundColor: 'rgba(0,0,0,0.03)',
                                  },
                                }}
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
                        </Box>
                      </TableCell>
                    </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </GlassDialog>

      {/* Order Details Modal */}
      <GlassDialog
        open={openDetailsModal}
        onClose={handleCloseDetailsModal}
        maxWidth="lg"
        title="تفاصيل الطلب"
        subtitle={selectedOrder?.orderNumber}
        contentSx={{ padding: 3, maxHeight: "85vh", overflowY: "auto" }}
        actions={
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => selectedOrder && handleOpenEditOrder(selectedOrder)}
              disabled={!selectedOrder || editLoading}
            >
              تعديل
            </Button>
            <Button onClick={handleCloseDetailsModal} variant="contained">
              إغلاق
            </Button>
          </Box>
        }
      >
        {selectedOrder && (
          <Box sx={{ padding: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات الطلب
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="رقم الطلب"
                    value={selectedOrder.orderNumber || `#${selectedOrder.id}`}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="الحالة"
                    value={
                      <Chip
                        label={getStatusText(selectedOrder.status)}
                        color={getStatusChipColor(selectedOrder.status)}
                        size="small"
                      />
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="التاريخ" value={formatDateTime(selectedOrder.orderDate)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="إجمالي الكمية"
                    value={
                      totalOrderQuantity || totalOrderQuantity === 0 ? totalOrderQuantity : "-"
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المجموع الفرعي" value={formatCurrency(selectedOrder.subTotal)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="التخفيض" value={discountDisplay} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="رسوم التوصيل"
                    value={formatCurrency(selectedOrder.deliveryFee ?? selectedOrder.deliveryPrice)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المبلغ الإجمالي"
                    value={formatCurrency(selectedOrder.totalAmount)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="يحتاج تصوير"
                    value={
                      selectedOrder.needsPhotography ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CameraAlt sx={{ color: 'primary.main' }} />
                          <Typography variant="body2">نعم</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">لا</Typography>
                      )
                    }
                  />
                </Grid>
              </Grid>
              {discountNotes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    ملاحظات التخفيض
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {discountNotes}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات العميل
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الاسم" value={selectedOrder.client?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الهاتف" value={selectedOrder.client?.phone || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المدينة" value={selectedOrder.province || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المنطقة" value={selectedOrder.district || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الدولة" value={selectedOrder.country || "-"} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <InfoItem label="البائع" value={selectedOrder.designer?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InfoItem label="المعد" value={selectedOrder.preparer?.name || "غير محدد"} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
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
                      {savingNotes ? <CircularProgress size={16} /> : <Save fontSize="small" />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setOrderNotes("");
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
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    minHeight: 80,
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {selectedOrderNotes ? (
                    selectedOrderNotes.split("\n\n").map((note, idx, arr) => {
                      const match = note.match(/^\[([^\]]+)\]\s+(.+?):\s*(.*)$/);
                      if (match) {
                        const [, datetime, author, text] = match;
                        return (
                          <Box
                            key={idx}
                            sx={{
                              mb: 2,
                              pb: 2,
                              borderBottom: idx < arr.length - 1 ? "1px solid" : "none",
                              borderColor: "divider",
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                                {author}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {datetime}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                              {text}
                            </Typography>
                          </Box>
                        );
                      }
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
            </Box>

            {selectedOrderDesigns.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    التصاميم ({selectedOrderDesigns.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {selectedOrderDesigns.map((design, index) => {
                      const designItems = design?.orderDesignItems || [];
                      const designQuantity =
                        designItems.reduce(
                          (sum, item) => sum + (item?.quantity || 0),
                          0
                        ) || 0;
                      const orderId = selectedOrder?.id || 0;
                      const designId = design?.id || index;

                      return (
                        <Box
                          key={designId}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            padding: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 1,
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {design.designName || `تصميم ${index + 1}`}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              <Chip
                                label={`الكمية: ${designQuantity}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {design.totalPrice !== undefined && design.totalPrice !== null && (
                                <Chip
                                  label={`قيمة التصميم: ${formatCurrency(design.totalPrice)}`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>

                          {designItems.length > 0 && (
                            <TableContainer
                              sx={{
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>نوع القماش</TableCell>
                                    <TableCell>اللون</TableCell>
                                    <TableCell align="center">المقاس</TableCell>
                                    <TableCell align="center">الكمية</TableCell>
                                    <TableCell align="center">السعر الفردي</TableCell>
                                    <TableCell align="center">الإجمالي</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {designItems.map((item, idx) => (
                                    <TableRow key={item?.id || idx}>
                                      <TableCell>{getFabricLabel(item?.fabricType)}</TableCell>
                                      <TableCell>{getColorLabel(item?.color)}</TableCell>
                                      <TableCell align="center">{getSizeLabel(item?.size)}</TableCell>
                                      <TableCell align="center">{item?.quantity ?? "-"}</TableCell>
                                      <TableCell align="center">{formatCurrency(item?.unitPrice)}</TableCell>
                                      <TableCell align="center">
                                        {formatCurrency(item?.totalPrice ?? item?.unitPrice * item?.quantity)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}

                          {(() => {
                            const imageUrls =
                              design?.mockupImageUrls ||
                              (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
                            const validImages = imageUrls.filter(
                              (url) => url && url !== "placeholder_mockup.jpg"
                            );

                            if (validImages.length === 0) return null;

                            return (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  الصور ({validImages.length})
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                  {validImages.map((imageUrl, idx) =>
                                    imageUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={loadingImage === `image-${orderId}-${designId}` ? <CircularProgress size={16} /> : <ImageIcon />}
                                        onClick={() => handleImageClick(imageUrl, orderId, designId)}
                                        disabled={loadingImage === `image-${orderId}-${designId}`}
                                      >
                                        عرض الصورة {idx + 1}
                                      </Button>
                                    ) : (
                                      (() => {
                                        const displayUrl = getFullUrl(imageUrl);
                                        return (
                                          <Box
                                            key={idx}
                                            sx={{
                                              position: "relative",
                                              cursor: "pointer",
                                              "&:hover": { opacity: 0.8 },
                                            }}
                                          >
                                            <img
                                              src={displayUrl}
                                              alt={`${design.designName} - صورة ${idx + 1}`}
                                              onClick={() => handleImageClick(imageUrl, orderId, designId)}
                                              style={{
                                                maxWidth: "150px",
                                                maxHeight: "150px",
                                                height: "auto",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                transition: "transform 0.2s",
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.transform = "scale(1.05)")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.transform = "scale(1)")
                                              }
                                            />
                                          </Box>
                                        );
                                      })()
                                    )
                                  )}
                                </Box>
                              </Box>
                            );
                          })()}

                          {(() => {
                            const fileUrls =
                              design?.printFileUrls ||
                              (design?.printFileUrl ? [design.printFileUrl] : []);
                            const validFiles = fileUrls.filter(
                              (url) => url && url !== "placeholder_print.pdf"
                            );

                            if (validFiles.length === 0) return null;

                            return (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  ملفات التصميم ({validFiles.length})
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                  {validFiles.map((fileUrl, idx) =>
                                    fileUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={loadingImage === `file-${orderId}-${designId}` ? <CircularProgress size={16} /> : <PictureAsPdf />}
                                        onClick={() => openFile(fileUrl, orderId, designId)}
                                        disabled={loadingImage === `file-${orderId}-${designId}`}
                                      >
                                        تحميل الملف {idx + 1}
                                      </Button>
                                    ) : (
                                      <Button
                                        key={idx}
                                        variant="contained"
                                        size="small"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() => openFile(fileUrl, orderId, designId)}
                                      >
                                        📄 ملف {idx + 1}
                                      </Button>
                                    )
                                  )}
                                </Box>
                              </Box>
                            );
                          })()}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </GlassDialog>

      <GlassDialog
        open={openEditDialog}
        onClose={handleCloseEditOrder}
        maxWidth="xl"
        title="تعديل الطلب"
        contentSx={{ padding: 0 }}
        actions={null}
      >
        {orderToEdit && (
          <OrderForm
            mode="edit"
            initialOrder={orderToEdit}
            onUpdate={handleSubmitEditOrder}
            onCancel={handleCloseEditOrder}
            onSuccess={handleCloseEditOrder}
          />
        )}
      </GlassDialog>

      {/* Delivery Status Dialog */}
      <GlassDialog
        open={openDeliveryStatusDialog}
        onClose={handleCloseDeliveryStatusDialog}
        maxWidth="md"
        title="حالة التوصيل من شركة التوصيل"
        subtitle={orderForDeliveryStatus?.orderNumber ? `طلب رقم: ${orderForDeliveryStatus.orderNumber}` : undefined}
        actions={
          <Button onClick={handleCloseDeliveryStatusDialog} variant="contained">
            إغلاق
          </Button>
        }
      >
        <Box sx={{ padding: 3 }}>
          {deliveryStatusLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : deliveryStatusData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Order & Shipment Info */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  معلومات الشحنة
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الطلب"
                      value={deliveryStatusData.orderId || '-'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الشحنة"
                      value={deliveryStatusData.shipmentId || '-'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الشحنة (RoadFn)"
                      value={deliveryStatusData.roadFnShipmentId || '-'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم التتبع"
                      value={deliveryStatusData.trackingNumber || '-'}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Status Info */}
              {deliveryStatusData.status && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    حالة الشحنة
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={deliveryStatusData.status.arabic || deliveryStatusData.status.english || '-'}
                      sx={{
                        backgroundColor: deliveryStatusData.status.color || '#1976d2',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        padding: '8px 16px',
                      }}
                    />
                    {deliveryStatusData.status.english && (
                      <Typography variant="body2" color="text.secondary">
                        ({deliveryStatusData.status.english})
                      </Typography>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <InfoItem
                        label="معرف الحالة"
                        value={deliveryStatusData.status.id || '-'}
                      />
                    </Grid>
                    {deliveryStatusData.status.colorName && (
                      <Grid item xs={12} sm={6}>
                        <InfoItem
                          label="اسم اللون"
                          value={deliveryStatusData.status.colorName}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Driver Info */}
              {deliveryStatusData.driver && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      معلومات السائق
                    </Typography>
                    <Grid container spacing={2}>
                      {deliveryStatusData.driver.name && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="اسم السائق"
                            value={deliveryStatusData.driver.name}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.phone && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="هاتف السائق"
                            value={deliveryStatusData.driver.phone}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.vehicleNumber && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="رقم المركبة"
                            value={deliveryStatusData.driver.vehicleNumber}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.licenseNumber && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="رقم الرخصة"
                            value={deliveryStatusData.driver.licenseNumber}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </>
              )}

              {/* Additional Info */}
              {(!deliveryStatusData.status && !deliveryStatusData.driver) && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    لا توجد معلومات إضافية متاحة
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                لا توجد معلومات حالة توصيل متاحة لهذا الطلب
              </Typography>
            </Box>
          )}
        </Box>
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
