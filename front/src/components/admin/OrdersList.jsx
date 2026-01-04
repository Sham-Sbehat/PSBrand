import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getCache, setCache, CACHE_KEYS } from "../../utils/cache";
import { debounce } from "../../utils";
import {
  Paper,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  TablePagination,
  CircularProgress,
  IconButton,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  InputAdornment,
  Menu,
  Checkbox,
} from "@mui/material";
import {
  Visibility,
  Delete,
  Note,
  ArrowUpward,
  ArrowDownward,
  ArrowForward,
  Image as ImageIcon,
  PictureAsPdf,
  LocalShipping,
  CameraAlt,
  History,
  Clear,
  CalendarToday,
  Edit,
  CheckCircle,
  ContactPhone,
} from "@mui/icons-material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useApp } from "../../context/AppContext";
import { ordersService, orderStatusService, shipmentsService, colorsService, sizesService, fabricTypesService } from "../../services/api";
import { subscribeToOrderUpdates } from "../../services/realtime";
import { openWhatsApp } from "../../utils";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  USER_ROLES,
  SIZE_LABELS,
  FABRIC_TYPE_LABELS,
  COLOR_LABELS,
} from "../../constants";
import NotesDialog from "../common/NotesDialog";
import GlassDialog from "../common/GlassDialog";
import OrderForm from "../employee/OrderForm";

// RoadFn Delivery Status Mapping
const DELIVERY_STATUSES = {
  "1": { id: 1, label: "مسودة", en: "Draft" },
  "2": { id: 2, label: "مؤكدة", en: "Submitted" },
  "4": { id: 4, label: "في المكتب", en: "Picked Up Office" },
  "5": { id: 5, label: "بحاجة متابعه", en: "ON HOLD" },
  "7": { id: 7, label: "مرتجع للمرسل", en: "Returned" },
  "8": { id: 8, label: "تحصيلات مع السائقين", en: "Cod" },
  "9": { id: 9, label: "في المحاسبة", en: "In Accounting 1010" },
  "10": { id: 10, label: "مغلق", en: "Closed" },
  "11": { id: 11, label: "ملغي", en: "Cancelled" },
  "12": { id: 12, label: "نقل بريد داخل فروع الشركة", en: "Transfer Branch" },
  "13": { id: 13, label: "متابعة قبل ارجاع الطرد", en: "Ready for pickup" },
  "14": { id: 14, label: "مع السائق", en: "With Driver" },
  "15": { id: 15, label: "احضار بدل", en: "Return Exchange11" },
  "16": { id: 16, label: "تاجيلات في المكتب", en: "Exchange Picked UP" },
  "17": { id: 17, label: "تحويل فرع للطرود المرتجعة", en: "Transfer office return" },
  "18": { id: 18, label: "ارسال الشحنات للشركه", en: "need to follow" },
  "19": { id: 19, label: "تأجيلات", en: "postponed" },
  "20": { id: 20, label: "فواتير قيد التسليم", en: "Invoices in progress" },
  "22": { id: 22, label: "رواجع يوم الخميس", en: "transfer branch between office" },
  "23": { id: 23, label: "طرود مرتجعه مغلقه", en: "Closed Returned" },
};

const OrdersList = ({ dateFilter: dateFilterProp, statusFilter: statusFilterProp, orderIdToOpen, onOrderOpened }) => {
  const { orders, user } = useApp();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalSum, setTotalSum] = useState(null);
  const [totalSumWithoutDelivery, setTotalSumWithoutDelivery] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState(null);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(dateFilterProp || ""); // Date filter for filtering orders by date
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Update dateFilter when prop changes
  useEffect(() => {
    if (dateFilterProp !== undefined) {
      setDateFilter(dateFilterProp);
    }
  }, [dateFilterProp]);
  
  // Update statusFilter when prop changes
  useEffect(() => {
    if (statusFilterProp !== undefined && statusFilterProp !== null) {
      setStatusFilter(statusFilterProp);
    }
  }, [statusFilterProp]);
  const [sortByState, setSortByState] = useState('asc'); // 'asc', 'desc', or null
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loadingFabricTypes, setLoadingFabricTypes] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [openShippingDialog, setOpenShippingDialog] = useState(false);
  const [orderToShip, setOrderToShip] = useState(null);
  const [shippingNotes, setShippingNotes] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]); // Array of order IDs for bulk shipping
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDeliveryStatusDialog, setOpenDeliveryStatusDialog] = useState(false);
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [deliveryStatusLoading, setDeliveryStatusLoading] = useState(false);
  const [orderForDeliveryStatus, setOrderForDeliveryStatus] = useState(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderId: statusData }
  const [loadingDeliveryStatuses, setLoadingDeliveryStatuses] = useState({}); // { orderId: true/false }
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState(null); // Track which order status is being updated
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null); // Anchor for status change menu
  const [orderForStatusChange, setOrderForStatusChange] = useState(null); // Order whose status is being changed

  const getFullUrl = (url) => {
    if (!url || typeof url !== 'string') return url;

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://psbrand-backend-production.up.railway.app/api";
    const baseDomain = API_BASE_URL.replace('/api', '');

    if (url.startsWith('/')) {
      return `${baseDomain}${url}`;
    }

    return `${baseDomain}/${url}`;
  };

  // Fetch delivery status for orders sent to delivery company
  const fetchDeliveryStatus = useCallback(async (orderId, order = null) => {
    // If order not provided, try to find it in allOrders
    let orderToCheck = order;
    if (!orderToCheck) {
      orderToCheck = allOrders.find(o => o.id === orderId);
    }
    
    // Check if order is sent to delivery company - if not, don't make API call
    if (orderToCheck && !orderToCheck.isSentToDeliveryCompany) {
      // Order not sent to delivery company, set null and return
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: null }));
      return;
    }
    
    // Check if order is already marked as closed in backend (IsDeliveryStatusClosed flag)
    // If closed, don't fetch again
    if (orderToCheck && orderToCheck.isDeliveryStatusClosed === true) {
      // Order delivery status is closed in backend, don't fetch again
      return;
    }
    
    // Also check if status is already loaded and is closed (for backward compatibility)
    const existingStatus = deliveryStatuses[orderId];
    if (existingStatus) {
      // Check if it has isClosed flag (set when status is 10, 11, or 23)
      if (existingStatus.isClosed === true) {
        // Status is closed, don't fetch again
        return;
      }
      // Also check by status ID for backward compatibility
      if (existingStatus.status) {
        const statusId = existingStatus.status.id || existingStatus.statusId;
        // Status IDs: 10 = Closed
        if (statusId === 10) {
          // Status is closed, don't fetch again
          return;
        }
      }
    }
    
    // Check if already loading
    setLoadingDeliveryStatuses(prev => {
      if (prev[orderId]) return prev; // Already loading
      return { ...prev, [orderId]: true };
    });
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(orderId);
      
      // Check if status is closed (10: Closed, 11: Cancelled, 23: Closed Returned)
      // Also check by text if status.id is not available
      const statusId = statusData?.status?.id || statusData?.statusId;
      const statusText = statusData?.status?.arabic || statusData?.status?.english || '';
      const isClosedByText = statusText.includes('مغلق') || 
                            statusText.includes('Cancelled') || 
                            statusText.includes('Closed Returned') ||
                            statusText.includes('Closed');
      
      if (statusId === 10 ) {
        // Status is closed - save it with isClosed flag (won't fetch again)
        setDeliveryStatuses(prev => ({ ...prev, [orderId]: { ...statusData, isClosed: true } }));
      } else {
        // Status is not closed - save normally
        setDeliveryStatuses(prev => ({ ...prev, [orderId]: statusData }));
      }
    } catch (error) {
      // إذا كان الخطأ هو "NO_SHIPMENT" (لم يتم إنشاء شحنة بعد)، هذا طبيعي ولا نعرضه
      const errorCode = error.response?.data?.code;
      if (errorCode !== 'NO_SHIPMENT') {
      console.error(`Error fetching delivery status for order ${orderId}:`, error);
      }
      // Set null to indicate failed to load
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: null }));
    } finally {
      setLoadingDeliveryStatuses(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  }, [allOrders]);

  // Fetch all orders from API
  const fetchOrders = useCallback(async () => {
      try {
        // Prepare params for API call
        const params = {};
        let cacheKey = CACHE_KEYS.ORDERS;
        
        const currentDateFilter = dateFilterProp || dateFilter;
        if (currentDateFilter) {
          // Convert date string (YYYY-MM-DD) to ISO date-time string
          // Create date in UTC to avoid timezone conversion issues
          // dateFilter format is "YYYY-MM-DD"
          const [year, month, day] = currentDateFilter.split('-').map(Number);
          // Create date in UTC at start of day (00:00:00 UTC)
          const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          params.date = dateObj.toISOString();
          cacheKey = `${CACHE_KEYS.ORDERS_BY_DATE}_${currentDateFilter}`;
        }
        
        // Check cache first (5 minutes TTL)
        const cachedData = getCache(cacheKey);
        if (cachedData) {
          // Handle both array (old cache) and object (new cache) formats
          if (Array.isArray(cachedData)) {
            setAllOrders(cachedData);
            setTotalSum(null);
            setTotalSumWithoutDelivery(null);
          } else {
            setAllOrders(cachedData.orders || []);
            setTotalSum(cachedData.totalSum ?? null);
            setTotalSumWithoutDelivery(cachedData.totalSumWithoutDelivery ?? null);
          }
          // Still fetch in background to update cache
          ordersService.getAllOrders(params).then(response => {
            if (Array.isArray(response)) {
              setAllOrders(response);
              setTotalSum(null);
              setTotalSumWithoutDelivery(null);
              setCache(cacheKey, response, 5 * 60 * 1000);
            } else {
              setAllOrders(response.orders || []);
              setTotalSum(response.totalSum ?? null);
              setTotalSumWithoutDelivery(response.totalSumWithoutDelivery ?? null);
              setCache(cacheKey, response, 5 * 60 * 1000);
            }
          }).catch(() => {
            // If background fetch fails, keep using cached data
          });
          return;
        }
        
        const response = await ordersService.getAllOrders(params);
        
        // Handle both array (no date filter) and object (with date filter) formats
        let ordersList = [];
        if (Array.isArray(response)) {
          ordersList = response;
          setAllOrders(response);
          setTotalSum(null);
          setTotalSumWithoutDelivery(null);
          setCache(cacheKey, response, 5 * 60 * 1000);
        } else {
          ordersList = response.orders || [];
          setAllOrders(ordersList);
          setTotalSum(response.totalSum ?? null);
          setTotalSumWithoutDelivery(response.totalSumWithoutDelivery ?? null);
          setCache(cacheKey, response, 5 * 60 * 1000);
        }
        
        // ✅ جلب حالة التوصيل تلقائياً فقط للطلبات المرسلة لشركة التوصيل
        // هذا يوفر الوقت للمستخدم ويقلل الحاجة للنقر على كل طلب
        ordersList.forEach(order => {
          // فقط إذا لم يتم جلبها من قبل وكانت مرسلة لشركة التوصيل
          // ولا تكون حالة التوصيل مغلقة
          if (!deliveryStatuses[order.id] && 
              !loadingDeliveryStatuses[order.id] && 
              order.isSentToDeliveryCompany &&
              !order.isDeliveryStatusClosed) {
            fetchDeliveryStatus(order.id, order).catch(() => {
              // تجاهل الأخطاء (404 للطلبات بدون شحنة)
            });
          }
        });
        
        // Return the orders for use in .then()
        return ordersList;
      } catch (error) {
        setAllOrders([]);
        setTotalSum(null);
        setTotalSumWithoutDelivery(null);
        return [];
      }
    }, [dateFilterProp, dateFilter]);
    
  // Fetch all orders from API + subscribe to realtime updates
  // Load colors, sizes, and fabric types on component mount
  useEffect(() => {
    loadColors();
    loadSizes();
    loadFabricTypes();
  }, []);

  useEffect(() => {
    const fetchOrdersWithLoading = async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    };

    fetchOrdersWithLoading();

    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: (newOrder) => {
            // ✅ تحديث محلي بدل refresh كامل - يوفر API call و bandwidth
            // لكن إذا كان هناك date filter، يجب إعادة جلب البيانات للحصول على totalSum المحدث
            const currentDateFilter = dateFilterProp || dateFilter;
            if (currentDateFilter) {
              // إعادة جلب البيانات للحصول على totalSum المحدث
              fetchOrders();
              return;
            }
            
            if (newOrder && typeof newOrder === 'object') {
              setAllOrders(prev => {
                // تجنب إضافة مكرر - تحديث إذا موجود
                const existingIndex = prev.findIndex(o => o.id === newOrder.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = newOrder;
                  return updated;
                }
                // إضافة جديد في البداية
                return [newOrder, ...prev];
              });
              // مسح cache للطلبات
              Object.keys(CACHE_KEYS).forEach(key => {
                if (key.includes('ORDERS')) {
                  setCache(CACHE_KEYS[key], null, 0);
                }
              });
            } else {
              // Fallback: refresh كامل فقط إذا لم تكن البيانات كاملة
              fetchOrders();
            }
          },
          onOrderStatusChanged: (orderData) => {
            // ✅ تحديث محلي بدل refresh كامل - يوفر API call و bandwidth
            const order = typeof orderData === 'object' ? orderData : null;
            if (order && order.id) {
              // Check if contacted status changed
              const hasContactedStatus = order.isContacted !== undefined || order.isContactedWithClient !== undefined;
              
              setAllOrders(prev => {
                const existingIndex = prev.findIndex(o => o.id === order.id);
                if (existingIndex >= 0) {
                  const existingOrder = prev[existingIndex];
                  // تحديث الطلب الموجود فقط - يتضمن تحديث حالة التواصل إذا كانت موجودة
                  const updated = [...prev];
                  updated[existingIndex] = { 
                    ...existingOrder, 
                    ...order,
                    // تحديث حالة التواصل إذا كانت موجودة في البيانات الجديدة
                    isContacted: order.isContacted !== undefined ? order.isContacted : (order.isContactedWithClient !== undefined ? order.isContactedWithClient : existingOrder.isContacted),
                    isContactedWithClient: order.isContactedWithClient !== undefined ? order.isContactedWithClient : (order.isContacted !== undefined ? order.isContacted : existingOrder.isContactedWithClient)
                  };
                  
                  // Log if contacted status changed
                  if (hasContactedStatus && (
                    existingOrder.isContacted !== updated[existingIndex].isContacted ||
                    existingOrder.isContactedWithClient !== updated[existingIndex].isContactedWithClient
                  )) {
                    console.log('📞 Contacted status updated via OrderStatusChanged:', order.id, updated[existingIndex].isContactedWithClient);
                  }
                  
                  return updated;
                }
                // إذا لم يكن موجود، أضفه
                return [order, ...prev];
              });
              
              // مسح cache للطلبات
              Object.keys(CACHE_KEYS).forEach(key => {
                if (key.includes('ORDERS')) {
                  setCache(CACHE_KEYS[key], null, 0);
                }
              });
            } else {
              // Fallback: refresh كامل فقط إذا لم تكن البيانات كاملة
              const currentDateFilter = dateFilterProp || dateFilter;
              if (currentDateFilter) {
                fetchOrders();
              }
            }
          },
          onOrderContactedStatusChanged: async (orderId, isContacted) => {
            // Update contacted status in real-time - fetch only the specific order
            console.log('📞 Contacted status changed via SignalR:', orderId, isContacted);
            
            try {
              // Fetch only the updated order from API
              const updatedOrder = await ordersService.getOrderById(orderId);
              
              if (updatedOrder && updatedOrder.id) {
                setAllOrders(prev => {
                  const existingIndex = prev.findIndex(o => o.id === orderId);
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      ...updatedOrder,
                      // Ensure contacted status is updated
                      isContacted: updatedOrder.isContacted !== undefined ? updatedOrder.isContacted : isContacted,
                      isContactedWithClient: updatedOrder.isContactedWithClient !== undefined ? updatedOrder.isContactedWithClient : isContacted
                    };
                    return updated;
                  }
                  return prev;
                });
              }
            } catch (error) {
              // If API call fails, update locally from SignalR data
              console.warn('Failed to fetch updated order, updating locally:', error);
              setAllOrders(prev => {
                const existingIndex = prev.findIndex(o => o.id === orderId);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    isContacted: isContacted,
                    isContactedWithClient: isContacted
                  };
                  return updated;
                }
                return prev;
              });
            }
          },
          // Also listen to OrderUpdated event (if backend sends it)
          onOrderUpdated: async (orderData) => {
            // Handle general order updates (may include contacted status)
            const order = typeof orderData === 'object' ? orderData : null;
            if (order && order.id) {
              // If order data is complete, use it directly
              if (order.isContacted !== undefined || order.isContactedWithClient !== undefined) {
                setAllOrders(prev => {
                  const existingIndex = prev.findIndex(o => o.id === order.id);
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      ...order,
                      isContacted: order.isContacted !== undefined ? order.isContacted : updated[existingIndex].isContacted,
                      isContactedWithClient: order.isContactedWithClient !== undefined ? order.isContactedWithClient : updated[existingIndex].isContactedWithClient
                    };
                    return updated;
                  }
                  return prev;
                });
              } else {
                // If data is incomplete, fetch the specific order
                try {
                  const updatedOrder = await ordersService.getOrderById(order.id);
                  if (updatedOrder && updatedOrder.id) {
                    setAllOrders(prev => {
                      const existingIndex = prev.findIndex(o => o.id === order.id);
                      if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = {
                          ...updated[existingIndex],
                          ...updatedOrder
                        };
                        return updated;
                      }
                      return prev;
                    });
                  }
                } catch (error) {
                }
              }
            }
          },
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
            console.log('📦 Shipment status updated via SignalR (webhook):', shipmentData);
            const orderId = shipmentData?.orderId;
            if (orderId) {
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
              }
              // Don't fetch if status is missing - user can click to load manually if needed
            }
          },
          onShipmentNoteAdded: (shipmentData) => {
            // Handle shipment note added from webhook (ShipmentNoteAdded event)
            const orderId = shipmentData?.orderId;
            if (orderId && shipmentData?.status) {
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
              }
            // Don't fetch if status is missing - user can click to load manually if needed
          },
        });
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [dateFilterProp, fetchOrders]); // Re-fetch orders when date filter prop changes

  // Don't auto-fetch delivery statuses - user can click to load manually
  // This prevents 404 errors for orders without shipments

  // Auto-scroll to order when orderIdToOpen is set (from notification click)
  const orderRowRefs = useRef({});
  
  useEffect(() => {
    if (orderIdToOpen && allOrders.length > 0) {
      const orderToOpen = allOrders.find(order => order.id === orderIdToOpen);
      if (orderToOpen) {
        // Set search query to order number to highlight it
        if (orderToOpen.orderNumber) {
          setSearchQuery(orderToOpen.orderNumber);
        }
        
        // Scroll to the order row after a short delay to ensure it's rendered
        setTimeout(() => {
          const rowRef = orderRowRefs.current[orderIdToOpen];
          if (rowRef) {
            rowRef.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            // Highlight the row briefly
            if (rowRef.style) {
              rowRef.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
              setTimeout(() => {
                if (rowRef.style) {
                  rowRef.style.backgroundColor = '';
                }
              }, 2000);
            }
          }
        }, 300);
        
        // Notify parent that order was found
        if (onOrderOpened) {
          onOrderOpened();
        }
      }
    }
  }, [orderIdToOpen, allOrders, onOrderOpened]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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

  const handleImageClick = async (imageUrl, orderId, designId) => {
    // If image data is excluded, fetch full order data
    if (imageUrl === 'image_data_excluded' && orderId) {
      setLoadingImage(`image-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        if (design?.mockupImageUrl && design.mockupImageUrl !== 'image_data_excluded') {
          setEnlargedImageUrl(getFullUrl(design.mockupImageUrl));
          setOpenImageDialog(true);
        } else {
          alert('الصورة غير متوفرة');
        }
      } catch (error) {
        alert('حدث خطأ أثناء جلب الصورة');
      } finally {
        setLoadingImage(null);
      }
      return;
    }
    
    // Don't open dialog if image data is excluded
    if (!imageUrl || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }
    setEnlargedImageUrl(getFullUrl(imageUrl));
    setOpenImageDialog(true);
  };

  // Helper function to open file (handles both URLs and base64)
  const openFile = async (fileUrl) => {
    if (!fileUrl || fileUrl === 'placeholder_print.pdf' || fileUrl === 'image_data_excluded') {
      return;
    }

    // Check if it's a base64 data URL
    if (fileUrl.startsWith('data:')) {
      // Convert base64 to blob and download
      try {
        // Extract base64 data (everything after comma)
        let base64Data = '';
        let mimeType = 'application/pdf';
        
        if (fileUrl.includes(',')) {
          const parts = fileUrl.split(',');
          base64Data = parts[1];
          // Extract MIME type from data URL
          const mimeMatch = fileUrl.match(/data:([^;]+);base64/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        } else {
          // Pure base64 string without data URL prefix
          base64Data = fileUrl;
        }

        // Clean base64 string (remove whitespace, newlines, etc.)
        const cleanBase64 = base64Data.replace(/\s/g, '');

        // Method 1: Try using fetch API first
        let blob;
        try {
          const response = await fetch(fileUrl);
          blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('الملف فارغ بعد التحويل');
          }
          
        } catch (fetchError) {
          
          // Method 2: Manual base64 to blob conversion (more reliable for large files)
          try {
            // Clean and validate base64
            const cleanBase64ForManual = base64Data.replace(/\s/g, '');
            
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64ForManual)) {
              throw new Error('الملف ليس بصيغة base64 صحيحة');
            }
            
            // Decode base64 in chunks for large files
            const binaryString = atob(cleanBase64ForManual);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Use detected MIME type or default to application/octet-stream
            const blobType = mimeType || 'application/octet-stream';
            blob = new Blob([bytes], { type: blobType });
            
            if (blob.size === 0) {
              throw new Error('الملف فارغ بعد التحويل');
            }
            
          } catch (manualError) {
           
            throw new Error('فشل في تحويل الملف. قد يكون الملف تالفاً أو كبيراً جداً.');
          }
        }
        
        // Detect file type from MIME type or blob content
        let fileExtension = 'pdf'; // default
        let fileName = `order_file_${Date.now()}`;
        
        // Determine file extension from MIME type
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
        } else {
          // Try to detect from file signature if MIME type is not available
          try {
            const arrayBuffer = await blob.slice(0, 8).arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // PDF signature
            if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
              fileExtension = 'pdf';
            }
            // PNG signature (89 50 4E 47)
            else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
              fileExtension = 'png';
            }
            // JPEG signature (FF D8 FF)
            else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
              fileExtension = 'jpg';
            }
            // SVG (check for <svg or <?xml)
            else {
              const textDecoder = new TextDecoder();
              const text = textDecoder.decode(uint8Array);
              if (text.includes('<svg') || (text.includes('<?xml') && text.includes('svg'))) {
                fileExtension = 'svg';
              }
            }
            
          } catch (sigError) {
          }
        }
        
        fileName = `${fileName}.${fileExtension}`;
        
        // Create blob URL for download
        const blobUrl = URL.createObjectURL(blob);
        
        // Download file directly
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Remove link and cleanup after download
        setTimeout(() => {
          document.body.removeChild(link);
          // Give more time for download to complete before revoking
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 10000); // 10 seconds - enough time for download
        }, 1000);
      } catch (error) {
        console.error('Error opening base64 file:', error);
        alert('حدث خطأ أثناء فتح الملف.\n' + error.message + '\n\nيرجى المحاولة مرة أخرى أو الاتصال بالدعم.');
      }
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      // Regular URL - download directly
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
    } else {
      const fullFileUrl = getFullUrl(fileUrl);
      const link = document.createElement('a');
      link.href = fullFileUrl;
      link.download = fullFileUrl.split('/').pop() || 'file.pdf';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  const handleFileClick = async (fileUrl, orderId, designId) => {
    // If file data is excluded, fetch full order data
    if (fileUrl === 'image_data_excluded' && orderId) {
      setLoadingImage(`file-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        
        if (design?.printFileUrl && design.printFileUrl !== 'image_data_excluded') {
          console.log('File found, opening...', {
            fileUrlLength: design.printFileUrl.length,
            isBase64: design.printFileUrl.startsWith('data:'),
            startsWith: design.printFileUrl.substring(0, 50)
          });
          // Open file using helper function
          await openFile(getFullUrl(design.printFileUrl));
        } else {
          console.error('File not available:', { 
            hasPrintFileUrl: !!design?.printFileUrl, 
            printFileUrl: design?.printFileUrl 
          });
          alert('الملف غير متوفر في قاعدة البيانات');
        }
      } catch (error) {
        console.error('Error fetching order file:', error);
        alert('حدث خطأ أثناء جلب الملف: ' + (error.message || 'خطأ غير معروف'));
      } finally {
        setLoadingImage(null);
      }
      return;
    }
    
    // Normal file handling
    await openFile(getFullUrl(fileUrl));
  };

  const handleCloseImageDialog = () => {
    setOpenImageDialog(false);
    setEnlargedImageUrl(null);
  };

  const handleSaveNotes = async (orderId, updatedNotes) => {
    await ordersService.updateOrderNotes(orderId, updatedNotes);
    // Update local state
    setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
    setAllOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
  };

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setOpenDeleteDialog(true);
  };

  const handleCancelClick = (order) => {
    setOrderToCancel(order);
    setOpenCancelDialog(true);
  };

  const handleEditClick = async (order) => {
    setEditLoading(true);
    try {
      const fullOrder = await ordersService.getOrderById(order.id);
      setOrderToEdit(fullOrder || order);
      setOpenEditDialog(true);
    } catch (error) {
      console.error('Error loading order for edit:', error);
      alert('حدث خطأ أثناء جلب بيانات الطلب للتعديل');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle status change for admin
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatusOrderId(orderId);
    try {
      // Use specific API for each status
      let statusUpdatePromise;
      switch (newStatus) {
        case ORDER_STATUS.PENDING_PRINTING:
          statusUpdatePromise = orderStatusService.setPendingPrinting(orderId);
          break;
        case ORDER_STATUS.IN_PRINTING:
          statusUpdatePromise = orderStatusService.setInPrinting(orderId);
          break;
        case ORDER_STATUS.IN_PREPARATION:
          statusUpdatePromise = orderStatusService.setInPreparation(orderId);
          break;
        case ORDER_STATUS.OPEN_ORDER:
          statusUpdatePromise = orderStatusService.setOpenOrder(orderId);
          break;
        case ORDER_STATUS.IN_PACKAGING:
          statusUpdatePromise = orderStatusService.setInPackaging(orderId);
          break;
        case ORDER_STATUS.COMPLETED:
          statusUpdatePromise = orderStatusService.setCompleted(orderId);
          break;
        case ORDER_STATUS.SENT_TO_DELIVERY_COMPANY:
          statusUpdatePromise = orderStatusService.setSentToDeliveryCompany(orderId);
          break;
        case ORDER_STATUS.CANCELLED:
          statusUpdatePromise = orderStatusService.setCancelled(orderId);
          break;
        default:
          // Fallback to general API if status not found
          statusUpdatePromise = ordersService.updateOrderStatus(orderId, newStatus);
          break;
      }
      
      await statusUpdatePromise;
      
      // Update order status locally
      setAllOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'تم تحديث حالة الطلب بنجاح',
        severity: 'success'
      });
      
      // Refresh orders list from server
      try {
        await fetchOrders();
      } catch (refreshError) {
        console.error('Error refreshing orders after status change:', refreshError);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
    } finally {
      setUpdatingStatusOrderId(null);
    }
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setOrderToDelete(null);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
    setOrderToCancel(null);
  };

  const handleCloseEditDialog = () => {
    if (editLoading) return;
    setOpenEditDialog(false);
    setOrderToEdit(null);
  };

  const handleShippingClick = (order) => {
    // التحقق من أن الطلب مكتمل قبل السماح بالإرسال
    const numericStatus = typeof order.status === 'number' 
      ? order.status 
      : parseInt(order.status, 10);
    
    if (numericStatus !== ORDER_STATUS.COMPLETED) {
      setSnackbar({
        open: true,
        message: 'الطلب يجب أن يكون مكتملاً لإرساله لشركة التوصيل',
        severity: 'warning'
      });
      return;
    }
    
    setOrderToShip(order);
    setShippingNotes('');
    setOpenShippingDialog(true);
  };

  const handleCloseShippingDialog = () => {
    if (shippingLoading) return;
    setOpenShippingDialog(false);
    setOrderToShip(null);
    setShippingNotes('');
  };

  const handleConfirmShipping = async () => {
    if (!orderToShip) return;

    // Check if this is bulk shipping
    if (orderToShip.isBulk && orderToShip.orderIds) {
      await handleBulkConfirmShipping();
      return;
    }

    setShippingLoading(true);
    try {
      await shipmentsService.createShipment(orderToShip.id, shippingNotes);
      
      // Set order status to sent to delivery company after successful shipment
      try {
        await orderStatusService.setSentToDeliveryCompany(orderToShip.id);
      } catch (statusError) {
        console.error('Error setting order status to sent to delivery company:', statusError);
        // Don't show error to user - shipment was created successfully
      }
      
      // Close dialog first
      handleCloseShippingDialog();
      
      // Show success toast
      setSnackbar({
        open: true,
        message: `تم إرسال الطلب ${orderToShip.orderNumber || `#${orderToShip.id}`} إلى شركة التوصيل بنجاح`,
        severity: 'success'
      });
      
      // Don't auto-fetch delivery status - user can click to load manually
      // This prevents 404 errors if shipment creation is delayed
      
      // Refresh orders list from server
      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
      } catch (refreshError) {
        console.error('Error refreshing orders after shipping:', refreshError);
      }
    } catch (error) {
      console.error('Error sending order to delivery company:', error);
      
      // Close dialog first even on error
      handleCloseShippingDialog();
      
      // Show error toast
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء إرسال الطلب إلى شركة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
    } finally {
      setShippingLoading(false);
    }
  };

  // Handle bulk shipping (multiple orders)
  const handleBulkShipping = () => {
    if (selectedOrders.length === 0) {
      setSnackbar({
        open: true,
        message: 'يرجى تحديد طلب واحد على الأقل',
        severity: 'warning'
      });
      return;
    }

    // Filter only completed orders
    const completedSelectedOrders = filteredOrders.filter(order => {
      const numericStatus = typeof order.status === 'number' 
        ? order.status 
        : parseInt(order.status, 10);
      return selectedOrders.includes(order.id) && numericStatus === ORDER_STATUS.COMPLETED;
    });

    if (completedSelectedOrders.length === 0) {
      setSnackbar({
        open: true,
        message: 'جميع الطلبات المحددة يجب أن تكون مكتملة',
        severity: 'warning'
      });
      return;
    }

    // Set selected orders and open dialog
    setOrderToShip({ id: null, isBulk: true, orderIds: completedSelectedOrders.map(o => o.id) });
    setShippingNotes('');
    setOpenShippingDialog(true);
  };

  const handleBulkConfirmShipping = async () => {
    if (!orderToShip || !orderToShip.isBulk || !orderToShip.orderIds || orderToShip.orderIds.length === 0) return;

    setShippingLoading(true);
    try {
      // Use the new API to create shipments for multiple orders
      await shipmentsService.createShipments(orderToShip.orderIds, shippingNotes);
      
      // Set order status to sent to delivery company for all orders
      try {
        await Promise.all(
          orderToShip.orderIds.map(orderId => 
            orderStatusService.setSentToDeliveryCompany(orderId).catch(err => {
              console.error(`Error setting status for order ${orderId}:`, err);
            })
          )
        );
      } catch (statusError) {
        console.error('Error setting order statuses:', statusError);
      }
      
      // Close dialog first
      handleCloseShippingDialog();
      
      // Clear selected orders
      setSelectedOrders([]);
      
      // Show success toast
      setSnackbar({
        open: true,
        message: `تم إرسال ${orderToShip.orderIds.length} طلب إلى شركة التوصيل بنجاح`,
        severity: 'success'
      });
      
      // Refresh orders list from server
      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
      } catch (refreshError) {
        console.error('Error refreshing orders after shipping:', refreshError);
      }
    } catch (error) {
      console.error('Error sending orders to delivery company:', error);
      
      // Close dialog first even on error
      handleCloseShippingDialog();
      
      // Show error toast
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء إرسال الطلبات إلى شركة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
    } finally {
      setShippingLoading(false);
    }
  };

  // Toggle order selection
  const handleToggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  // Select all visible orders
  const handleSelectAll = () => {
    const completedOrders = filteredOrders.filter(order => {
      const numericStatus = typeof order.status === 'number' 
        ? order.status 
        : parseInt(order.status, 10);
      return numericStatus === ORDER_STATUS.COMPLETED;
    });
    
    if (selectedOrders.length === completedOrders.length) {
      // Deselect all
      setSelectedOrders([]);
    } else {
      // Select all completed orders
      setSelectedOrders(completedOrders.map(o => o.id));
    }
  };

  const handleDeliveryStatusClick = async (order) => {
    setOrderForDeliveryStatus(order);
    setDeliveryStatusLoading(true);
    setOpenDeliveryStatusDialog(true);
    setDeliveryStatusData(null);
    
    // Only fetch if order is sent to delivery company
    if (!order.isSentToDeliveryCompany) {
      setDeliveryStatusData({ status: { arabic: "لم يتم إرسال الطلب لشركة التوصيل بعد", english: "Order not sent to delivery company yet" } });
      setDeliveryStatusLoading(false);
      return;
    }
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(order.id);
      setDeliveryStatusData(statusData);
    } catch (error) {
      // إذا كان الخطأ هو "NO_SHIPMENT" (لم يتم إنشاء شحنة بعد)، هذا طبيعي ولا نعرضه
      const errorCode = error.response?.data?.code;
      if (errorCode !== 'NO_SHIPMENT') {
      console.error('Error fetching delivery status:', error);
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء جلب حالة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
      } else {
        // If NO_SHIPMENT, just show a message in the dialog without a snackbar
        setDeliveryStatusData({ status: { arabic: "لم يتم إنشاء شحنة بعد", english: "No shipment created yet" } });
      }
    } finally {
      setDeliveryStatusLoading(false);
    }
  };

  const handleCloseDeliveryStatusDialog = () => {
    setOpenDeliveryStatusDialog(false);
    setDeliveryStatusData(null);
    setOrderForDeliveryStatus(null);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Ensure ID is a number
      const orderId = parseInt(orderToDelete.id);
      
      const response = await ordersService.deleteOrder(orderId);
      
      // Remove the order from local state immediately for better UX
      setAllOrders((prevOrders) => 
        prevOrders.filter((order) => order.id !== orderToDelete.id)
      );
      
      handleCloseDeleteDialog();
      
      // Refresh from server to ensure consistency
      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
      } catch (refreshError) {
        console.error('Error refreshing orders:', refreshError);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      console.error('Error details:', error.response);
      console.error('Error message:', error.message);
      alert(`حدث خطأ أثناء حذف الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
      
      // Revert optimistic update by refreshing
      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
      } catch (refreshError) {
        console.error('Error refreshing after failed delete:', refreshError);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;

    setCancelLoading(true);
    try {
      await orderStatusService.setCancelled(orderToCancel.id);

      setAllOrders(prev =>
        prev.map(order =>
          order.id === orderToCancel.id ? { ...order, status: ORDER_STATUS.CANCELLED } : order
        )
      );

      handleCloseCancelDialog();

      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
      } catch (refreshError) {
        console.error('Error refreshing orders after cancellation:', refreshError);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert(`حدث خطأ أثناء إلغاء الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirmEdit = async (updatedOrder) => {
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

      const refreshed = await ordersService.getAllOrders();
      setAllOrders(refreshed || []);

      const updatedSelected =
        refreshed?.find?.((order) => order.id === orderToEdit.id) || payloadToSend;

      if (selectedOrder?.id === orderToEdit.id && updatedSelected) {
        setSelectedOrder(updatedSelected);
      }

      setOrderToEdit(updatedSelected);
    } catch (error) {
      console.error("Error updating order:", error);
      alert(
        `حدث خطأ أثناء تحديث الطلب: ${
          error.response?.data?.message || error.message || "خطأ غير معروف"
        }`
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return ORDER_STATUS_LABELS[numericStatus] || status;
  };

  const getStatusColor = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return ORDER_STATUS_COLORS[numericStatus] || 'default';
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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;
    return `${numericValue.toLocaleString("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ₪`;
  };

  const formatDateTime = (dateValue) => {
    const normalized = normalizeDateValue(dateValue);
    if (!normalized || Number.isNaN(normalized.getTime())) return "-";
    try {
      // Use UTC timezone to display time as stored, without local timezone conversion
      return normalized.toLocaleString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        calendar: "gregory",
        timeZone: "UTC",
      });
    } catch {
      return normalized.toString();
    }
  };

  // Load colors from API
  const loadColors = async () => {
    setLoadingColors(true);
    try {
      const colorsData = await colorsService.getAllColors();
      setColors(Array.isArray(colorsData) ? colorsData : []);
    } catch (error) {
      console.error('Error loading colors:', error);
      setColors([]);
    } finally {
      setLoadingColors(false);
    }
  };

  // Load sizes from API
  const loadSizes = async () => {
    setLoadingSizes(true);
    try {
      const sizesData = await sizesService.getAllSizes();
      setSizes(Array.isArray(sizesData) ? sizesData : []);
    } catch (error) {
      console.error('Error loading sizes:', error);
      setSizes([]);
    } finally {
      setLoadingSizes(false);
    }
  };

  // Load fabric types from API
  const loadFabricTypes = async () => {
    setLoadingFabricTypes(true);
    try {
      const fabricTypesData = await fabricTypesService.getAllFabricTypes();
      setFabricTypes(Array.isArray(fabricTypesData) ? fabricTypesData : []);
    } catch (error) {
      console.error('Error loading fabric types:', error);
      setFabricTypes([]);
    } finally {
      setLoadingFabricTypes(false);
    }
  };

  const getFabricLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const fabricType = item;
      if (fabricType === null || fabricType === undefined) return "-";
      
      const fabricTypeId = typeof fabricType === 'string' && !isNaN(fabricType) && fabricType !== '' 
        ? Number(fabricType) 
        : (typeof fabricType === 'number' ? fabricType : null);
      
      if (fabricTypeId === null) {
        return fabricType;
      }
      
      // Use constants for legacy values
      if (FABRIC_TYPE_LABELS[fabricTypeId]) {
        return FABRIC_TYPE_LABELS[fabricTypeId];
      }
      
      if (fabricTypes.length > 0) {
        const fabricTypeObj = fabricTypes.find(f => f.id === fabricTypeId);
        if (fabricTypeObj) {
          return fabricTypeObj.name || fabricTypeObj.nameAr || "-";
        }
      }
      
      return fabricType || "-";
    }
    
    // New format: check if fabricTypeId is null (legacy order)
    if (item.fabricTypeId === null || item.fabricTypeId === undefined) {
      // Legacy order - use constants mapping
      const fabricType = item.fabricType;
      if (fabricType === null || fabricType === undefined) return "-";
      const fabricTypeId = typeof fabricType === 'string' && !isNaN(fabricType) && fabricType !== '' 
        ? Number(fabricType) 
        : (typeof fabricType === 'number' ? fabricType : null);
      if (fabricTypeId !== null && FABRIC_TYPE_LABELS[fabricTypeId]) {
        return FABRIC_TYPE_LABELS[fabricTypeId];
      }
      return fabricType || "-";
    }
    
    // New order - use API values
    if (item.fabricTypeNameAr) {
      return item.fabricTypeNameAr;
    }
    
    // Fallback to API lookup
    if (fabricTypes.length > 0) {
      const fabricTypeObj = fabricTypes.find(f => f.id === item.fabricTypeId);
      if (fabricTypeObj) {
        return fabricTypeObj.name || fabricTypeObj.nameAr || "-";
      }
    }
    
    return "-";
  };

  const getSizeLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const size = item;
      if (size === null || size === undefined) return "-";
      if (typeof size === "string" && !size.trim()) return "-";
      
      // Convert to number if it's a string number
      const sizeId = typeof size === 'string' && !isNaN(size) && size !== '' 
        ? Number(size) 
        : (typeof size === 'number' ? size : null);
      
      // If it's not a number, it might already be a name - return it
      if (sizeId === null) {
        // Check if it's already a name from API
        if (sizes.length > 0) {
          const sizeObj = sizes.find(s => 
            (s.nameAr && s.nameAr === size) || 
            (s.name && s.name === size)
          );
          if (sizeObj) {
            return sizeObj.name || sizeObj.nameAr || "-";
          }
        }
        return size;
      }
      
      // Use constants for legacy values
      if (SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      
      // Search in sizes array by legacyValue (not id)
      if (sizes.length > 0) {
        // Try to find by legacyValue (the numeric value like 2, 4, 6, 101, 102, etc.)
        let sizeObj = sizes.find(s => s.legacyValue === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
        
        // Try exact match by ID as fallback
        sizeObj = sizes.find(s => s.id === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
        
        // Try to match by converting to string and comparing
        sizeObj = sizes.find(s => String(s.id) === String(sizeId) || String(s.legacyValue) === String(sizeId));
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
      }
      
      return size || "-";
    }
    
    // New format: check if sizeId is null (legacy order)
    if (item.sizeId === null || item.sizeId === undefined) {
      // Legacy order - use constants mapping
      const size = item.size;
      if (size === null || size === undefined) return "-";
      const sizeId = typeof size === 'string' && !isNaN(size) && size !== '' 
        ? Number(size) 
        : (typeof size === 'number' ? size : null);
      if (sizeId !== null && SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      return size || "-";
    }
    
    // New order - use API values
    if (item.sizeNameAr) {
      return item.sizeName;
    }
    
    // Fallback to API lookup
    if (sizes.length > 0) {
      const sizeObj = sizes.find(s => s.id === item.sizeId || s.legacyValue === item.sizeId);
      if (sizeObj) {
        return sizeObj.name || sizeObj.nameAr || "-";
      }
    }
    
    return "-";
  };

  const getColorLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const color = item;
      if (color === null || color === undefined) return "-";
      
      const colorId = typeof color === 'string' && !isNaN(color) && color !== '' 
        ? Number(color) 
        : (typeof color === 'number' ? color : null);
      
      if (colorId === null) {
        return color;
      }
      
      // Use constants for legacy values
      if (COLOR_LABELS[colorId]) {
        return COLOR_LABELS[colorId];
      }
      
      if (colors.length > 0) {
        const colorObj = colors.find(c => c.id === colorId);
        if (colorObj) {
          return colorObj.name || colorObj.nameAr || "-";
        }
      }
      
      return color || "-";
    }
    
    // New format: check if colorId is null (legacy order)
    if (item.colorId === null || item.colorId === undefined) {
      // Legacy order - use constants mapping
      const color = item.color;
      if (color === null || color === undefined) return "-";
      const colorId = typeof color === 'string' && !isNaN(color) && color !== '' 
        ? Number(color) 
        : (typeof color === 'number' ? color : null);
      if (colorId !== null && COLOR_LABELS[colorId]) {
        return COLOR_LABELS[colorId];
      }
      return color || "-";
    }
    
    // New order - use API values
    if (item.colorNameAr) {
      return item.colorNameAr;
    }
    
    // Fallback to API lookup
    if (colors.length > 0) {
      const colorObj = colors.find(c => c.id === item.colorId);
      if (colorObj) {
        return colorObj.name || colorObj.nameAr || "-";
      }
    }
    
    return "-";
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

  const orderNotes =
    typeof selectedOrder?.notes === "string" ? selectedOrder.notes.trim() : "";
  const discountNotes =
    typeof selectedOrder?.discountNotes === "string" ? selectedOrder.discountNotes.trim() : "";

  // Load cities and areas for modification display
  useEffect(() => {
    const loadCitiesAndAreas = async () => {
      try {
        // Check cache for cities (30 minutes TTL - cities don't change often)
        let citiesArray = getCache(CACHE_KEYS.CITIES);
        if (!citiesArray) {
          const citiesData = await shipmentsService.getCities();
          citiesArray = Array.isArray(citiesData) ? citiesData : [];
          setCache(CACHE_KEYS.CITIES, citiesArray, 30 * 60 * 1000); // 30 minutes
        }
        setCities(citiesArray);
        
        // Check cache for all areas (30 minutes TTL)
        let allAreas = getCache(CACHE_KEYS.AREAS);
        if (!allAreas) {
          // Load areas for all cities in parallel (with caching per city)
          allAreas = [];
          const areaPromises = [];
          const uniqueCityIds = new Set();
          
          // Collect unique city IDs
          citiesArray.forEach(city => {
            if (city && (city.id || city.Id)) {
              const cityId = city.id || city.Id;
              if (!uniqueCityIds.has(cityId)) {
                uniqueCityIds.add(cityId);
                // Check cache for this city's areas
                const cachedCityAreas = getCache(`${CACHE_KEYS.AREAS}_city_${cityId}`);
                if (cachedCityAreas) {
                  allAreas.push(...cachedCityAreas);
                } else {
                  areaPromises.push(
                    shipmentsService.getAreas(cityId)
                      .then(areasData => {
                        const areasArray = Array.isArray(areasData) ? areasData : [];
                        const formattedAreas = areasArray.map(area => ({
                          ...area,
                          id: area.id || area.Id,
                          name: area.name || area.Name,
                          cityId: cityId
                        })).filter(area => area);
                        // Cache this city's areas
                        setCache(`${CACHE_KEYS.AREAS}_city_${cityId}`, formattedAreas, 30 * 60 * 1000);
                        return formattedAreas;
                      })
                      .catch(error => {
                        console.error(`Error loading areas for city ${cityId}:`, error);
                        return [];
                      })
                  );
                }
              }
            }
          });
          
          // Wait for all area requests to complete
          if (areaPromises.length > 0) {
            const results = await Promise.all(areaPromises);
            results.forEach(cityAreas => {
              if (Array.isArray(cityAreas)) {
                allAreas.push(...cityAreas);
              }
            });
          }
          
          // Cache all areas
          setCache(CACHE_KEYS.AREAS, allAreas, 30 * 60 * 1000); // 30 minutes
        }
        setAreas(allAreas || []);
      } catch (error) {
        console.error('Error loading cities:', error);
      }
    };
    loadCitiesAndAreas();
  }, []);

  // Helper function to get field display value
  const getFieldDisplayValue = (fieldName, value) => {
    if (value === '' || value === null || value === undefined) {
      return '(فارغ)';
    }

    const valueStr = String(value).trim();
    if (!valueStr || valueStr === 'null' || valueStr === 'undefined') {
      return '(فارغ)';
    }
    
    // Check if it's a city field
    if (fieldName && (fieldName === 'مدينة العميل' || fieldName === 'المدينة' || fieldName.includes('مدينة'))) {
      if (cities.length > 0) {
        const numValue = Number(valueStr);
        const city = cities.find(c => {
          const cityId = c.id || c.Id || c.cityId;
          const cityIdStr = String(cityId || '');
          const cityIdNum = Number(cityId);
          return cityIdStr === valueStr || 
                 cityIdStr === String(value) || 
                 (numValue && cityIdNum && numValue === cityIdNum) ||
                 (cityId && String(cityId) === valueStr);
        });
        if (city) {
          const cityName = city.name || city.Name || city.cityName;
          if (cityName) {
            return cityName;
          }
        }
      }
      return valueStr;
    }
    
    // Check if it's an area/district field
    if (fieldName && (fieldName === 'منطقة العميل' || fieldName === 'المنطقة' || fieldName.includes('منطقة'))) {
      if (areas.length > 0) {
        const numValue = Number(valueStr);
        const area = areas.find(a => {
          const areaId = a.id || a.Id || a.areaId;
          const areaIdStr = String(areaId || '');
          const areaIdNum = Number(areaId);
          return areaIdStr === valueStr || 
                 areaIdStr === String(value) || 
                 (numValue && areaIdNum && numValue === areaIdNum) ||
                 (areaId && String(areaId) === valueStr);
        });
        if (area) {
          const areaName = area.name || area.Name || area.areaName;
          if (areaName) {
            return areaName;
          }
        }
      }
      return valueStr;
    }
    
    return valueStr;
  };

  // Parse modification details
  const parseModificationDetails = (modificationDetailsString) => {
    if (!modificationDetailsString || typeof modificationDetailsString !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(modificationDetailsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing modification details:', error);
      return [];
    }
  };

  const modificationHistory = selectedOrder?.isModified 
    ? parseModificationDetails(selectedOrder?.modificationDetails)
    : [];

  // Filter by status
  const statusFilteredOrders =
    statusFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === parseInt(statusFilter));

  // Filter by delivery status
  const deliveryStatusFilteredOrders =
    deliveryStatusFilter === "all"
      ? statusFilteredOrders
      : statusFilteredOrders.filter((order) => {
          const statusData = deliveryStatuses[order.id];
          
          // No shipment
          if (deliveryStatusFilter === "no_shipment") {
            return statusData === null || statusData === undefined;
          }
          
          // Has shipment (any status)
          if (deliveryStatusFilter === "has_shipment") {
            return statusData !== null && statusData !== undefined;
          }
          
          // Specific status by ID
          if (!statusData || statusData === null) return false;
          
          // Get status ID from statusData
          // statusData.status.id or statusData.statusId or just check the status object
          let statusId = null;
          
          if (statusData.status) {
            if (typeof statusData.status === 'object' && statusData.status.id !== undefined) {
              statusId = statusData.status.id;
            } else if (typeof statusData.status === 'number') {
              statusId = statusData.status;
            }
          } else if (statusData.statusId !== undefined) {
            statusId = statusData.statusId;
          }
          
          // Filter by status ID
          if (statusId !== null && statusId !== undefined) {
            const filterStatusId = parseInt(deliveryStatusFilter);
            return statusId === filterStatusId;
          }
          
          // Fallback: try to match by status text if ID not available
          const statusAr = statusData?.status?.arabic || "";
          const statusEn = statusData?.status?.english || "";
          const statusText = (statusAr + " " + statusEn).toLowerCase();
          
          // Check if any of the status labels match (for backwards compatibility)
          const statusMap = DELIVERY_STATUSES[deliveryStatusFilter];
          if (statusMap) {
            const filterStatusId = parseInt(deliveryStatusFilter);
            const statusLabelAr = statusMap.label.toLowerCase();
            const statusLabelEn = statusMap.en.toLowerCase();
            return statusText.includes(statusLabelAr) || statusText.includes(statusLabelEn);
          }
          
          return false;
        });

  // Filter by client name, phone, or order number search
  const filteredOrders = searchQuery.trim()
    ? deliveryStatusFilteredOrders.filter((order) => {
        const clientName = order.client?.name || "";
        const clientPhone = order.client?.phone || "";
        const orderNumber = order.orderNumber || `#${order.id}` || "";
        const query = searchQuery.toLowerCase().trim();
        return (
          clientName.toLowerCase().includes(query) || 
          clientPhone.includes(query) ||
          orderNumber.toLowerCase().includes(query)
        );
      })
    : deliveryStatusFilteredOrders;

  // Sort by state if sortByState is set
  const sortedOrders = sortByState 
    ? [...filteredOrders].sort((a, b) => {
        const statusA = typeof a.status === 'number' ? a.status : parseInt(a.status) || 0;
        const statusB = typeof b.status === 'number' ? b.status : parseInt(b.status) || 0;
        return sortByState === 'asc' ? statusA - statusB : statusB - statusA;
      })
    : filteredOrders;

  // Calculate total count and price for each order
  const ordersWithTotals = sortedOrders.map((order) => {
    // Calculate total quantity across all designs and items
    const totalQuantity = order.orderDesigns?.reduce((sum, design) => {
      const designCount = design.orderDesignItems?.reduce((itemSum, item) => {
        return itemSum + (item.quantity || 0);
      }, 0) || 0;
      return sum + designCount;
    }, 0) || 0;

    // Calculate total amount
    const totalAmount = order.totalAmount || 0;

    return {
      ...order,
      totalQuantity,
      totalAmount,
    };
  });

  const paginatedOrders = ordersWithTotals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          جميع الطلبات ({sortedOrders.length})
        </Typography>
          {(dateFilterProp || dateFilter) && (totalSum !== null || totalSumWithoutDelivery !== null) && (
            <Box sx={{ display: "flex", gap: 2, marginTop: 1, flexWrap: "wrap" }}>
              {totalSum !== null && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  <strong>المجموع الإجمالي:</strong> ₪ {totalSum.toFixed(2)}
                </Typography>
              )}
              {totalSumWithoutDelivery !== null && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  <strong>المجموع بدون التوصيل:</strong> ₪ {totalSumWithoutDelivery.toFixed(2)}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          {selectedOrders.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LocalShipping />}
              onClick={handleBulkShipping}
              sx={{ minWidth: 150 }}
            >
              إرسال المحدد ({selectedOrders.length})
            </Button>
          )}
          <TextField
            size="small"
            placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
            sx={{ minWidth: 400 }}
          />
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0); // Reset to first page when filtering
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">جميع الطلبات</MenuItem>
            <MenuItem value={ORDER_STATUS.PENDING_PRINTING}>بانتظار الطباعة</MenuItem>
            <MenuItem value={ORDER_STATUS.IN_PRINTING}>في مرحلة الطباعة</MenuItem>
            <MenuItem value={ORDER_STATUS.IN_PREPARATION}>في مرحلة التحضير</MenuItem>
            <MenuItem value={ORDER_STATUS.IN_PACKAGING}>في مرحلة التغليف  </MenuItem>
            <MenuItem value={ORDER_STATUS.COMPLETED}>مكتمل</MenuItem>
            <MenuItem value={ORDER_STATUS.CANCELLED}>ملغي</MenuItem>
            <MenuItem value={ORDER_STATUS.OPEN_ORDER}>الطلب مفتوح</MenuItem>
            <MenuItem value={ORDER_STATUS.SENT_TO_DELIVERY_COMPANY}>تم الإرسال لشركة التوصيل</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={deliveryStatusFilter}
            onChange={(e) => {
              setDeliveryStatusFilter(e.target.value);
              setPage(0); // Reset to first page when filtering
            }}
            sx={{ minWidth: 220 }}
            label="حالة التوصيل"
          >
            <MenuItem value="all">جميع حالات التوصيل</MenuItem>
            <MenuItem value="no_shipment">بدون شحنة</MenuItem>
            <MenuItem value="has_shipment">لديه شحنة (أي حالة)</MenuItem>
            <MenuItem value="1">مسودة (Draft)</MenuItem>
            <MenuItem value="2">مؤكدة (Submitted)</MenuItem>
            <MenuItem value="4">في المكتب (Picked Up Office)</MenuItem>
            <MenuItem value="5">بحاجة متابعة (ON HOLD)</MenuItem>
            <MenuItem value="7">مرتجع للمرسل (Returned)</MenuItem>
            <MenuItem value="8">تحصيلات مع السائقين (Cod)</MenuItem>
            <MenuItem value="9">في المحاسبة (In Accounting)</MenuItem>
            <MenuItem value="10">مغلق (Closed)</MenuItem>
            <MenuItem value="11">ملغي (Cancelled)</MenuItem>
            <MenuItem value="12">نقل بريد داخل فروع الشركة</MenuItem>
            <MenuItem value="13">متابعة قبل ارجاع الطرد</MenuItem>
            <MenuItem value="14">مع السائق (With Driver)</MenuItem>
            <MenuItem value="15">احضار بدل (Return Exchange)</MenuItem>
            <MenuItem value="16">تاجيلات في المكتب</MenuItem>
            <MenuItem value="17">تحويل فرع للطرود المرتجعة</MenuItem>
            <MenuItem value="18">ارسال الشحنات للشركه</MenuItem>
            <MenuItem value="19">تأجيلات (postponed)</MenuItem>
            <MenuItem value="20">فواتير قيد التسليم</MenuItem>
            <MenuItem value="22">رواجع يوم الخميس</MenuItem>
            <MenuItem value="23">طرود مرتجعه مغلقه</MenuItem>
          </TextField>
        </Box>
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
                  <TableCell sx={{ fontWeight: 700, width: 50 }}>
                    <Checkbox
                      checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.filter(o => {
                        const numericStatus = typeof o.status === 'number' ? o.status : parseInt(o.status, 10);
                        return numericStatus === ORDER_STATUS.COMPLETED;
                      }).length}
                      indeterminate={selectedOrders.length > 0 && selectedOrders.length < filteredOrders.filter(o => {
                        const numericStatus = typeof o.status === 'number' ? o.status : parseInt(o.status, 10);
                        return numericStatus === ORDER_STATUS.COMPLETED;
                      }).length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      الحالة
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (sortByState === 'asc') {
                            setSortByState('desc');
                          } else if (sortByState === 'desc') {
                            setSortByState(null);
                          } else {
                            setSortByState('asc');
                          }
                        }}
                        sx={{ padding: 0.5 }}
                      >
                        {sortByState === 'asc' ? (
                          <ArrowUpward fontSize="small" color="primary" />
                        ) : sortByState === 'desc' ? (
                          <ArrowDownward fontSize="small" color="primary" />
                        ) : (
                          <ArrowUpward fontSize="small" color="disabled" />
                        )}
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الكمية الإجمالية</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>السعر الإجمالي</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>حالة التوصيل</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التفاصيل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      <Box sx={{ padding: 4 }}>
                        <Typography variant="h6" color="text.secondary">
                          لا توجد طلبات
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => {
                    return (
                      <TableRow
                        key={order.id}
                        ref={(el) => {
                          if (el) {
                            orderRowRefs.current[order.id] = el;
                          }
                        }}
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                          ...(orderIdToOpen === order.id ? {
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            transition: 'background-color 0.3s',
                          } : {}),
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleToggleOrderSelection(order.id)}
                            disabled={(() => {
                              const numericStatus = typeof order.status === 'number' 
                                ? order.status 
                                : parseInt(order.status, 10);
                              return numericStatus !== ORDER_STATUS.COMPLETED;
                            })()}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {order.isContacted || order.isContactedWithClient ? (
                              <Tooltip title="تم التواصل مع الزبون">
                                <CheckCircle 
                                  sx={{ 
                                    color: '#4caf50', 
                                    fontSize: 18,
                                    cursor: 'pointer'
                                  }} 
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title="لم يتم التواصل مع الزبون بعد">
                                <ContactPhone 
                                  sx={{ 
                                    color: '#9e9e9e', 
                                    fontSize: 18,
                                  }} 
                                />
                              </Tooltip>
                            )}
                            <Typography variant="body2">{order.orderNumber || `#${order.id}`}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{order.client?.name || "-"}</TableCell>
                        <TableCell>{order.designer?.name || "-"}</TableCell>
                        <TableCell>{order.preparer?.name || "-"}</TableCell>
                        <TableCell>
                          {order.createdAt 
                            ? new Date(order.createdAt).toLocaleDateString("ar-SA", { 
                                year: "numeric", 
                                month: "short", 
                                day: "numeric",
                                calendar: "gregory" 
                              })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={getStatusLabel(order.status)}
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                            {user?.role === USER_ROLES.ADMIN && (
                              <Tooltip title="تغيير الحالة">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    setOrderForStatusChange(order);
                                    setStatusMenuAnchor(e.currentTarget);
                                  }}
                                  disabled={updatingStatusOrderId === order.id}
                                  sx={{
                                    padding: '4px',
                                    '&:hover': {
                                      backgroundColor: 'action.hover',
                                    },
                                  }}
                                >
                                  {updatingStatusOrderId === order.id ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <Edit fontSize="small" sx={{ fontSize: '16px' }} />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                            {order.needsPhotography && (
                              <Tooltip title="يحتاج تصوير">
                                <CameraAlt sx={{ color: 'primary.main', fontSize: 20 }} />
                              </Tooltip>
                            )}
                            {order.isModified && (
                              <Tooltip title="تم تعديل الطلب">
                                <History sx={{ color: 'warning.main', fontSize: 20 }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{order.totalQuantity}</TableCell>
                        <TableCell>{order.totalAmount} ₪</TableCell>
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
                            
                            // If order is not sent to delivery company, don't show loading or fetch status
                            if (!order.isSentToDeliveryCompany) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              );
                            }
                            
                            // ✅ إذا لم يتم جلب البيانات بعد وكان الطلب مرسل لشركة التوصيل، ابدأ الجلب تلقائياً
                            // لكن لا نعيد الجلب إذا كانت الحالة مغلقة (10: Closed, 11: Cancelled, 23: Closed Returned)
                            if (statusData === undefined && !isLoading) {
                              // جلب تلقائي في الخلفية
                              fetchDeliveryStatus(order.id, order).catch(() => {
                                // تجاهل الأخطاء (404 للطلبات بدون شحنة)
                              });
                            } else if (statusData && statusData.status) {
                              // إذا كانت الحالة مغلقة، لا نعيد الجلب
                              const statusId = statusData.status.id || statusData.statusId;
                              if (statusId === 10 ) {
                                // Status is closed, don't fetch again - already displayed
                              }
                            }
                            
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
                              // Order is sent to delivery company but no shipment yet
                              return (
                                <Chip
                                  label="في انتظار الشحنة"
                                  sx={{
                                    backgroundColor: '#ff9800',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                />
                              );
                            }
                            
                            if (statusData && statusData.status) {
                              const statusLabel = statusData.status.arabic || statusData.status.english || 'غير معروف';
                              // Check if status is closed by text (مغلق, Cancelled, Closed Returned)
                              const isClosedByText = statusLabel.includes('مغلق') || 
                                                     statusLabel.includes('Cancelled') || 
                                                     statusLabel.includes('Closed Returned') ||
                                                     statusLabel.includes('Closed');
                              
                              return (
                                <Chip
                                  label={statusLabel.trim()}
                                  sx={{
                                    backgroundColor: statusData.status.color || (isClosedByText ? '#4caf50' : '#1976d2'),
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
                            
                            // If statusData exists but no status object, show default
                            if (statusData) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              );
                            }
                            
                            // جاري التحميل - اعرض مؤشر التحميل
                            return (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                               طلبات جاهزة
                              </Typography>
                            );
                          })()}
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
                          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewOrder(order)}
                              sx={{ 
                                fontSize: '0.8rem',
                                padding: '5px 10px',
                                minWidth: 'auto',
                                minHeight: '36px',
                                height: '36px',
                                '& .MuiButton-startIcon': {
                                  marginRight: '4px',
                                  marginLeft: 0,
                                },
                              }}
                            >
                              عرض
                            </Button>
                            <Tooltip 
                              title={
                                (() => {
                                  const numericStatus = typeof order.status === 'number' 
                                    ? order.status 
                                    : parseInt(order.status, 10);
                                  if (numericStatus === ORDER_STATUS.IN_PACKAGING) {
                                    return "لا يمكن تعديل الطلب في مرحلة التغليف";
                                  } else if (numericStatus === ORDER_STATUS.COMPLETED) {
                                    return "لا يمكن تعديل الطلب المكتمل";
                                  } else if (numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY) {
                                    return "لا يمكن تعديل الطلب المرسل لشركة التوصيل";
                                  }
                                  return "تعديل الطلب";
                                })()
                              } 
                              arrow 
                              placement="top"
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleEditClick(order)}
                                  disabled={
                                    (() => {
                                      const numericStatus = typeof order.status === 'number' 
                                        ? order.status 
                                        : parseInt(order.status, 10);
                                      return numericStatus === ORDER_STATUS.IN_PACKAGING ||
                                             numericStatus === ORDER_STATUS.COMPLETED ||
                                             numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY;
                                    })()
                                  }
                                  sx={{ 
                                    fontSize: '0.8rem',
                                    padding: '5px 10px',
                                    minWidth: 'auto',
                                    minHeight: '36px',
                                    height: '36px',
                                  }}
                                >
                                  تعديل
                                </Button>
                              </span>
                            </Tooltip>
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              disabled={
                                order.status === ORDER_STATUS.CANCELLED ||
                                order.status === ORDER_STATUS.COMPLETED
                              }
                              onClick={() => handleCancelClick(order)}
                              sx={{ 
                                fontSize: '0.8rem',
                                padding: '5px 10px',
                                minWidth: 'auto',
                                minHeight: '36px',
                                height: '36px',
                              }}
                            >
                              إلغاء
                            </Button>
                            <Tooltip 
                              title={
                                (() => {
                                  const numericStatus = typeof order.status === 'number' 
                                    ? order.status 
                                    : parseInt(order.status, 10);
                                  const hasDeliveryStatus = deliveryStatuses[order.id] && 
                                                           deliveryStatuses[order.id] !== null;
                                  const isSentToDelivery = order.isSentToDeliveryCompany === true;
                                  if (numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY || 
                                      hasDeliveryStatus || 
                                      isSentToDelivery) {
                                    return "تم الإرسال لشركة التوصيل";
                                  } else if (numericStatus !== ORDER_STATUS.COMPLETED) {
                                    return "الطلب يجب أن يكون مكتملاً لإرساله لشركة التوصيل";
                                  } else {
                                    return "إرسال الطلب لشركة التوصيل";
                                  }
                                })()
                              } 
                              arrow 
                              placement="top"
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleShippingClick(order)}
                                  disabled={
                                    (() => {
                                      const numericStatus = typeof order.status === 'number' 
                                        ? order.status 
                                        : parseInt(order.status, 10);
                                      // التحقق من وجود shipment أو delivery status
                                      const hasDeliveryStatus = deliveryStatuses[order.id] && 
                                                               deliveryStatuses[order.id] !== null;
                                      const isSentToDelivery = order.isSentToDeliveryCompany === true;
                                      // الزر مفعّل فقط عندما يكون الطلب مكتملاً وغير مرسل لشركة التوصيل
                                      return numericStatus !== ORDER_STATUS.COMPLETED || 
                                             numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ||
                                             hasDeliveryStatus ||
                                             isSentToDelivery;
                                    })()
                                  }
                                  sx={{
                                    color: '#2e7d32',
                                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                    width: '36px',
                                    height: '36px',
                                    minWidth: '36px',
                                    padding: '6px',
                                    '&:hover': {
                                      backgroundColor: 'rgba(46, 125, 50, 0.2)',
                                      color: '#1b5e20',
                                    },
                                    '&:disabled': {
                                      color: '#9e9e9e',
                                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                    },
                                    border: '1px solid rgba(46, 125, 50, 0.3)',
                                    borderRadius: 1,
                                  }}
                                >
                                  <LocalShipping fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(order)}
                              sx={{ 
                                width: '36px',
                                height: '36px',
                                minWidth: '36px',
                                padding: '6px',
                                ml: 0.5,
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={ordersWithTotals.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="عدد الصفوف في الصفحة:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
            }
          />
        </>
      )}

      {/* Details Dialog */}
      <GlassDialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        title="تفاصيل الطلب"
        subtitle={selectedOrder?.orderNumber}
        contentSx={{ padding: 0 }}
        actions={
          <Button onClick={handleCloseDialog} variant="contained">
            إغلاق
          </Button>
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
                        label={getStatusLabel(selectedOrder.status)}
                        color={getStatusColor(selectedOrder.status)}
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
                    value={formatCurrency(selectedOrder.deliveryFee)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="سعر إضافي"
                    value={formatCurrency(selectedOrder.additionalPrice)}
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
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المبلغ الإجمالي"
                    value={formatCurrency(selectedOrder.totalAmount)}
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
                  <InfoItem 
                    label="الهاتف" 
                    value={
                      selectedOrder.client?.phone ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{selectedOrder.client.phone}</Typography>
                          <Tooltip title="انقر للتواصل مع الزبون عبر الواتساب">
                          <IconButton
                            size="small"
                            onClick={() => {
                                openWhatsApp(selectedOrder.client.phone);
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
                          </Tooltip>
                        </Box>
                      ) : (
                        '-'
                      )
                    } 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المدينة" value={selectedOrder.province || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المنطقة" value={selectedOrder.district || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="البلد" value={selectedOrder.country || "-"} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="البائع" value={selectedOrder.designer?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="المعد" value={selectedOrder.preparer?.name || "غير محدد"} />
                </Grid>
              </Grid>
            </Box>

            {orderNotes && (
              <>
                <Divider />
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    ملاحظات الطلب
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {orderNotes}
                  </Typography>
                </Box>
              </>
            )}

            {selectedOrder?.isModified && (
              <>
                <Divider />
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <History color="warning" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      سجل التعديلات
                    </Typography>
                    <Chip 
                      label="تم التعديل" 
                      color="warning" 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  {modificationHistory.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {modificationHistory.map((modification, modIndex) => {
                        const timestamp = modification.Timestamp 
                          ? new Date(modification.Timestamp).toLocaleString("en-GB", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";
                        const changes = modification.Changes || [];

                        return (
                          <Box
                            key={modIndex}
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                              padding: 2,
                              bgcolor: "warning.50",
                            }}
                          >
                            <Typography 
                              variant="subtitle2" 
                              sx={{ fontWeight: 600, mb: 1.5, color: "warning.dark" }}
                            >
                              تعديل بتاريخ: {timestamp}
                            </Typography>
                            {changes.length > 0 ? (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {changes.map((change, changeIndex) => (
                                  <Box
                                    key={changeIndex}
                                    sx={{
                                      p: 1.5,
                                      bgcolor: "background.paper",
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}
                                    >
                                      {change.Field || "حقل غير معروف"}
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                      <Box sx={{ flex: 1, minWidth: 200 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                          القيمة القديمة:
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            p: 0.75, 
                                            bgcolor: "error.50", 
                                            borderRadius: 0.5,
                                            color: "error.dark",
                                            wordBreak: "break-word"
                                          }}
                                        >
                                          {getFieldDisplayValue(change.Field, change.OldValue)}
                                        </Typography>
                                      </Box>
                                      <ArrowForward sx={{ color: "text.secondary", mx: 1 }} />
                                      <Box sx={{ flex: 1, minWidth: 200 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                          القيمة الجديدة:
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            p: 0.75, 
                                            bgcolor: "success.50", 
                                            borderRadius: 0.5,
                                            color: "success.dark",
                                            wordBreak: "break-word"
                                          }}
                                        >
                                          {getFieldDisplayValue(change.Field, change.NewValue)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                لا توجد تفاصيل التعديلات
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد تفاصيل التعديلات
                    </Typography>
                  )}
                </Box>
              </>
            )}

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

                      return (
                        <Box
                          key={design.id || index}
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
                                      <TableCell>{getFabricLabel(item)}</TableCell>
                                      <TableCell>{getColorLabel(item)}</TableCell>
                                      <TableCell align="center">
                                        {getSizeLabel(item)}
                                      </TableCell>
                                      <TableCell align="center">
                                        {item?.quantity ?? "-"}
                                      </TableCell>
                                      <TableCell align="center">
                                        {formatCurrency(item?.unitPrice)}
                                      </TableCell>
                                      <TableCell align="center">
                                        {formatCurrency(item?.totalPrice)}
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
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                  {validImages.map((imageUrl, idx) =>
                                    imageUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage === `image-${selectedOrder.id}-${design.id}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <ImageIcon />
                                          )
                                        }
                                        onClick={() =>
                                          handleImageClick(imageUrl, selectedOrder.id, design.id)
                                        }
                                        disabled={
                                          loadingImage === `image-${selectedOrder.id}-${design.id}`
                                        }
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
                                              onClick={() =>
                                                handleImageClick(imageUrl, selectedOrder.id, design.id)
                                              }
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
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                  {validFiles.map((fileUrl, idx) =>
                                    fileUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage === `file-${selectedOrder.id}-${design.id}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <PictureAsPdf />
                                          )
                                        }
                                        onClick={() =>
                                          handleFileClick(fileUrl, selectedOrder.id, design.id)
                                        }
                                        disabled={
                                          loadingImage === `file-${selectedOrder.id}-${design.id}`
                                        }
                                      >
                                        تحميل الملف {idx + 1}
                                      </Button>
                                    ) : (
                                      <Button
                                        key={idx}
                                        variant="contained"
                                        size="small"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() =>
                                          handleFileClick(fileUrl, selectedOrder.id, design.id)
                                        }
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

            <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                startIcon={<Note />}
                onClick={() => handleNotesClick(selectedOrder)}
                sx={{ minWidth: 200 }}
              >
                عرض/تعديل الملاحظات
              </Button>
            </Box>
          </Box>
        )}
      </GlassDialog>

      {/* Delete Confirmation Dialog */}
      <GlassDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        title="تأكيد الحذف"
        actions={
          <>
            <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? <CircularProgress size={20} /> : "حذف"}
            </Button>
          </>
        }
      >
        <Typography variant="body1">
          هل أنت متأكد من رغبتك في حذف الطلب{" "}
          <strong>{orderToDelete?.orderNumber || `#${orderToDelete?.id}`}</strong>؟
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          هذا الإجراء لا يمكن التراجع عنه.
        </Typography>
      </GlassDialog>

      {/* Cancel Confirmation Dialog */}
      <GlassDialog
        open={openCancelDialog}
        onClose={handleCloseCancelDialog}
        maxWidth="sm"
        title="تأكيد الإلغاء"
        actions={
          <>
            <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
              تراجع
            </Button>
            <Button
              onClick={handleConfirmCancel}
              color="warning"
              variant="contained"
              disabled={cancelLoading}
            >
              {cancelLoading ? <CircularProgress size={20} /> : "تأكيد الإلغاء"}
            </Button>
          </>
        }
      >
        <Typography variant="body1">
          هل ترغب في إلغاء الطلب{" "}
          <strong>{orderToCancel?.orderNumber || `#${orderToCancel?.id}`}</strong>؟
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          سيتم تغيير حالة الطلب إلى ملغي ويمكن للموظفين رؤيتها في السجل.
        </Typography>
      </GlassDialog>

      {/* Shipping Dialog */}
      <GlassDialog
        open={openShippingDialog}
        onClose={handleCloseShippingDialog}
        maxWidth="sm"
        title="إرسال إلى شركة التوصيل"
        actions={
          <>
            <Button 
              onClick={handleCloseShippingDialog} 
              disabled={shippingLoading}
              variant="outlined"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmShipping}
              color="success"
              variant="contained"
              disabled={shippingLoading}
              startIcon={shippingLoading ? <CircularProgress size={20} /> : <LocalShipping />}
              sx={{
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20',
                }
              }}
            >
              {shippingLoading ? 'جاري الإرسال...' : 'إرسال'}
            </Button>
          </>
        }
      >
        <Box sx={{ padding: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            إرسال الطلب <strong>{orderToShip?.orderNumber || `#${orderToShip?.id}`}</strong> إلى شركة التوصيل
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            يمكنك إضافة ملاحظات خاصة بشركة التوصيل (اختياري)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="ملاحظات شركة التوصيل"
            value={shippingNotes}
            onChange={(e) => setShippingNotes(e.target.value)}
            placeholder="أدخل أي ملاحظات خاصة بشركة التوصيل..."
            disabled={shippingLoading}
            sx={{ mt: 2 }}
          />
        </Box>
      </GlassDialog>

      <GlassDialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        maxWidth="xl"
        title="تعديل الطلب"
        contentSx={{ padding: 0 }}
        actions={null}
      >
        {orderToEdit && (
          <OrderForm
            mode="edit"
            initialOrder={orderToEdit}
            onUpdate={handleConfirmEdit}
            onCancel={handleCloseEditDialog}
            onSuccess={handleCloseEditDialog}
          />
        )}
      </GlassDialog>

      {/* Enlarged Image Dialog */}
      <GlassDialog
        open={openImageDialog}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        title="معاينة التصميم"
        contentSx={{
          padding: 0,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
        }}
      >
        {enlargedImageUrl && enlargedImageUrl !== "image_data_excluded" ? (
          <Box
            sx={{
              padding: 3,
              minHeight: "70vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={enlargedImageUrl}
              alt="صورة مكبّرة"
              onError={(e) => {
                e.target.style.display = "none";
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              minHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "rgba(255,255,255,0.85)",
              gap: 1,
              padding: 4,
            }}
          >
            <Typography variant="h6">الصورة غير متوفرة</Typography>
            <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات</Typography>
          </Box>
        )}
      </GlassDialog>

      {/* Notes Dialog */}
      <NotesDialog
        open={openNotesDialog}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />

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

      {/* Status Change Menu for Admin */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
          setOrderForStatusChange(null);
        }}
        PaperProps={{
          sx: {
            minWidth: 200,
            maxHeight: 400,
          }
        }}
      >
         {orderForStatusChange && Object.entries(ORDER_STATUS_LABELS).map(([statusValue, statusLabel]) => {
          const numericStatus = parseInt(statusValue, 10);
          const isSelected = orderForStatusChange.status === numericStatus;
          return (
            <MenuItem
              key={statusValue}
              selected={isSelected}
              onClick={() => {
                if (!isSelected) {
                  handleStatusChange(orderForStatusChange.id, numericStatus);
                }
                setStatusMenuAnchor(null);
                setOrderForStatusChange(null);
              }}
              sx={{
                backgroundColor: isSelected ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Chip
                  label={statusLabel}
                  color={getStatusColor(numericStatus)}
                  size="small"
                  sx={{ height: '20px', fontSize: '0.7rem' }}
                />
                {isSelected && (
                  <Box sx={{ marginLeft: 'auto', color: 'primary.main' }}>
                    ✓
                  </Box>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Menu>

      {/* Snackbar Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default OrdersList;