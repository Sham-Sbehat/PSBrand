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
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  TextField,
  Tooltip,
} from "@mui/material";
import { Logout, Visibility, Assignment, Note, Image as ImageIcon, PictureAsPdf, Search, CameraAlt, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, shipmentsService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import GlassDialog from "../components/common/GlassDialog";
import calmPalette from "../theme/calmPalette";

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
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const [selectedImage, setSelectedImage] = useState(null); // Selected image for dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false); // Image dialog state
  const [openDeliveryStatusDialog, setOpenDeliveryStatusDialog] = useState(false);
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [deliveryStatusLoading, setDeliveryStatusLoading] = useState(false);
  const [orderForDeliveryStatus, setOrderForDeliveryStatus] = useState(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderId: statusData }
  const [loadingDeliveryStatuses, setLoadingDeliveryStatuses] = useState({}); // { orderId: true }
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryMyOrders, setSearchQueryMyOrders] = useState('');
  const [searchQueryCompleted, setSearchQueryCompleted] = useState('');

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

  // Fetch delivery status for orders sent to delivery company
  const fetchDeliveryStatus = async (orderId, order = null) => {
    // If order not provided, try to find it in available lists
    let orderToCheck = order;
    if (!orderToCheck) {
      // Try to find order in available lists
      orderToCheck = [...availableOrders, ...myOpenOrders, ...completedOrders].find(o => o.id === orderId);
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
      // Check if it has isClosed flag (set when status is 10: Closed)
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
    
    // Check if already loading or loaded
    if (loadingDeliveryStatuses[orderId] || deliveryStatuses[orderId] !== undefined) {
      return;
    }
    
    setLoadingDeliveryStatuses(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(orderId);
      
      // Check if status is closed 
      // If closed, save it with isClosed flag and don't fetch again
      const statusId = statusData?.status?.id || statusData?.statusId;
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
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: null }));
    } finally {
      setLoadingDeliveryStatuses(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  };

  // Fetch completed orders (Status 4: COMPLETED and Status 7: SENT_TO_DELIVERY_COMPANY with preparer === currentUser)
  const fetchCompletedOrders = async (showLoading = false, dateString = null) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setCompletedOrders([]);
        return;
      }
      
      // استخدام API الجديد مع التاريخ
      const dateToUse = dateString || selectedDate;
      const date = dateToUse ? new Date(dateToUse) : new Date();
      const isoDateString = date.toISOString();
      
      const response = await ordersService.getOrdersByPreparerAndMonth(currentUserId, isoDateString);
      
      // الـ API يرجع object يحتوي على orders array
      const orders = response?.orders || (Array.isArray(response) ? response : []);
      
      // Filter للطلبات المكتملة والمرسلة فقط
      const completedAndSent = orders.filter(
        order => order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
      );
      
      setCompletedOrders(completedAndSent);
      
      // جلب حالة التوصيل فقط للطلبات المرسلة لشركة التوصيل
      completedAndSent.slice(0, 20).forEach(order => {
        if (order.isSentToDeliveryCompany) {
          fetchDeliveryStatus(order.id, order);
        }
      });
    } catch (error) {
      console.error('Error fetching completed orders:', error);
      setCompletedOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleDateChange = async (event) => {
    const newDateString = event.target.value;
    if (!newDateString || !user?.id) return;
    
    setSelectedDate(newDateString);
    await fetchCompletedOrders(false, newDateString);
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
              fetchAllOrders(false);
            }
          },
          onOrderStatusChanged: (updatedOrder) => {
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
                } else if ((updatedOrder.status === ORDER_STATUS.COMPLETED || updatedOrder.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY) && isAssignedToMe) {
                  // Update in completed orders (includes both COMPLETED and SENT_TO_DELIVERY_COMPANY)
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
                  
                  // نجلب حالة التوصيل فقط إذا كان الطلب مرسل لشركة التوصيل
                    if (updatedOrder.isSentToDeliveryCompany) {
                      fetchDeliveryStatus(updatedOrder.id, updatedOrder);
                    }
                } else {
                  // Status changed to something else, remove from all lists
                  setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setCompletedOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                }
            }
            fetchAllOrders(false);
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
                // Only fetch if order is sent to delivery company
                // Find order in available lists to check isSentToDeliveryCompany
                const order = [...availableOrders, ...myOpenOrders, ...completedOrders].find(o => o.id === orderId);
                if (order && order.isSentToDeliveryCompany) {
                  fetchDeliveryStatus(orderId, order);
                }
              }
            }
          },
          onShipmentNoteAdded: (shipmentData) => {
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
                  note: shipmentData.note,
                  lastUpdate: shipmentData.entryDateTime
                };
                setDeliveryStatuses(prev => ({
                  ...prev,
                  [orderId]: statusData
                }));
              } else {
                // Only fetch if order is sent to delivery company
                // Find order in available lists to check isSentToDeliveryCompany
                const order = [...availableOrders, ...myOpenOrders, ...completedOrders].find(o => o.id === orderId);
                if (order && order.isSentToDeliveryCompany) {
                  fetchDeliveryStatus(orderId, order);
                }
              }
            }
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
    const allOrdersList = [...availableOrders, ...myOpenOrders, ...completedOrders];
    if (!allOrdersList || allOrdersList.length === 0) return;
    
    // Try to fetch delivery status for all orders
    // We check if already loaded/loading to avoid duplicate requests
    allOrdersList.forEach(order => {
      // Check synchronously if already loaded or loading
      const isLoaded = deliveryStatuses[order.id] !== undefined;
      const isLoading = loadingDeliveryStatuses[order.id] === true;
      
      // Only fetch if not already checked AND order is sent to delivery company
      if (!isLoaded && !isLoading && order.isSentToDeliveryCompany) {
        // Only fetch for orders sent to delivery company
        fetchDeliveryStatus(order.id, order).catch(() => {
          // Silently fail - this order just doesn't have a shipment
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableOrders, myOpenOrders, completedOrders]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Load image for display (lazy loading with Intersection Observer)
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
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find(d => d.id === designId);
      const images = getMockupImages(design);
      const firstImage = images.find(url => url && url !== 'image_data_excluded');

      if (firstImage) {
        const fullImageUrl = getFullUrl(firstImage);
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: fullImageUrl
        }));
        return fullImageUrl;
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setLoadingImage(null);
    }
    return null;
  };

  // Force re-render when imageCache changes (to update displayed images)
  useEffect(() => {
    // This effect ensures that when imageCache updates, the component re-renders
    // The dependency on imageCache will trigger re-render automatically
  }, [imageCache]);

  // Use Intersection Observer for lazy loading images
  useEffect(() => {
    let observer = null;
    
    // Wait a bit for DOM to render
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const { orderId, designId } = entry.target.dataset;
              if (orderId && designId) {
                const key = `${orderId}-${designId}`;
                
                // Check if already loaded or loading using current state
                setImageCache(prevCache => {
                  if (!prevCache[key]) {
                    setLoadingImage(prevLoading => {
                      if (prevLoading !== `image-${orderId}-${designId}`) {
                        // Load image when it becomes visible
                        loadImageForDisplay(parseInt(orderId), parseInt(designId));
                      }
                      return prevLoading;
                    });
                  }
                  return prevCache;
                });
              }
            }
          });
        },
        { rootMargin: '50px' } // Start loading 50px before image enters viewport
      );

      // Observe all image placeholders
      const imageElements = document.querySelectorAll('[data-image-placeholder="true"]');
      imageElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableOrders.length, myOpenOrders.length, completedOrders.length]); // Re-run when orders change

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
    setOpenDetailsModal(true);
    
    // Load images for all designs when modal opens
    if (order?.orderDesigns) {
      order.orderDesigns.forEach(design => {
      });
      
      const loadPromises = order.orderDesigns.map(design => {
        const images = getMockupImages(design);
        if (images.includes('image_data_excluded')) {
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

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedOrder(null);
  };

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

  // Handle status update: when OPEN_ORDER -> set IN_PACKAGING (إرسال للتغليف)
  // المحضر ينهي التحضير → الحالة تصبح 8 (في مرحلة التغليف)
  const handleStatusUpdate = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // Move from "الطلب مفتوح" (OPEN_ORDER) to "في مرحلة التغليف" (IN_PACKAGING)
      const response = await orderStatusService.setInPackaging(orderId);
      
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

  // Handle returning order from OPEN_ORDER to IN_PREPARATION (إرجاع الطلب)
  const handleReturnOrder = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // Move from "الطلب مفتوح" (OPEN_ORDER) back to "في مرحلة التحضير" (IN_PREPARATION)
      await orderStatusService.setInPreparation(orderId);
      
      // Update local state immediately
      setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      // After successful update, refresh the orders list
      setTimeout(() => {
        fetchAllOrders(false); // Don't show loading after action
        setCurrentTab(0); // Switch to "الطلبات المتاحة" tab
      }, 500);
      
    } catch (error) {
      console.error('Error returning order:', error);
      alert(`حدث خطأ أثناء إرجاع الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
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
        alert(`حدث خطأ أثناء جلب حالة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
      } else {
        // If NO_SHIPMENT, just show a message in the dialog without an alert
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

  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return {
      label: ORDER_STATUS_LABELS[numericStatus],
      color: ORDER_STATUS_COLORS[numericStatus]
    };
  };

const getStatusChipColor = (status) => {
  const info = getStatusLabel(status);
  return info.color || "default";
};

const getStatusText = (status) => {
  const info = getStatusLabel(status);
  return info.label || "غير معروف";
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

  const stats = [
    {
      title: "الطلبات المتاحة للتحضير",
      value: availableOrders.length,
      icon: Assignment,
    },
    {
      title: "قيد التحضير",
      value: myOpenOrders.length,
      icon: Assignment,
    },
    {
      title: "الطلبات المكتملة والمرسلة",
      value: completedOrders.length,
      icon: Assignment,
      onClick: () => {
        // تعيين التاريخ الحالي كافتراضي عند فتح Modal
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        setSelectedDate(todayString);
        fetchCompletedOrders(true, todayString);
        setOpenCompletedOrdersModal(true);
      },
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

  const handleCloseCompletedOrdersModal = () => {
    setOpenCompletedOrdersModal(false);
    setSearchQueryCompleted('');
  };

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
            PSBrand - لوحة محضر الطلبات
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
              {user?.name || "محضر طلبات"}
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

      <Container maxWidth="xl" sx={{ paddingY: 5 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle = calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={stat.onClick || undefined}
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: 4,
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
                    cursor: stat.onClick ? "pointer" : "default",
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

        {/* Tabs */}
        <Box sx={{ marginBottom: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              backgroundColor: calmPalette.surface,
              borderRadius: 3,
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
            TabIndicatorProps={{
              sx: {
                height: "100%",
                borderRadius: 3,
                background:
                  "linear-gradient(135deg, rgba(96, 78, 62, 0.85) 0%, rgba(75, 61, 49, 0.9) 100%)",
                zIndex: -1,
              },
            }}
          >
            <Tab
              label="الطلبات المتاحة للتحضير"
              icon={<Assignment />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
            <Tab
              label="قيد التحضير"
              icon={<Assignment />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Orders Table */}
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
          {currentTab === 0 && (
            <>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, marginBottom: 3 }}
          >
       الطلبات المتاحة للتحضير ({availableOrders.length})
          </Typography>

          {/* Search Field */}
          {!loading && availableOrders.length > 0 && (
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
                        ? availableOrders.filter((order) => {
                            const clientName = order.client?.name || '';
                            const clientPhone = order.client?.phone || '';
                            const orderNumber = order.orderNumber || `#${order.id}` || '';
                            const query = searchQuery.toLowerCase().trim();
                            return (
                              clientName.toLowerCase().includes(query) || 
                              clientPhone.includes(query) ||
                              orderNumber.toLowerCase().includes(query)
                            );
                          }).length
                        : availableOrders.length;
                      return `تم العثور على ${filteredCount} ${filteredCount === 1 ? 'نتيجة' : 'نتائج'}`;
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

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
            <TableContainer
              sx={{ 
                width: '100%',
                borderRadius: 3, 
                border: '1px solid rgba(94, 78, 62, 0.18)',
                backgroundColor: "rgba(255,255,255,0.4)",
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
              }}
            >
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: 'rgba(94, 78, 62, 0.08)',
                    '& th': { color: calmPalette.textPrimary },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(searchQuery.trim()
                    ? availableOrders.filter((order) => {
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
                    : availableOrders
                  ).map((order, index) => {
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
                        '&:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.35)' },
                        '&:hover': { backgroundColor: 'rgba(94, 78, 62, 0.12)' },
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
                      <TableCell>{order.province || "-"}</TableCell>
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
                          {order.needsPhotography && (
                            <Tooltip title="يحتاج تصوير">
                              <CameraAlt sx={{ color: 'primary.main', fontSize: 20, ml: 1 }} />
                            </Tooltip>
                          )}
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
            <TableContainer
              sx={{ 
                width: '100%',
                borderRadius: 3, 
                border: '1px solid rgba(94, 78, 62, 0.18)',
                backgroundColor: "rgba(255,255,255,0.4)",
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
              }}
            >
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: 'rgba(94, 78, 62, 0.08)',
                    '& th': { color: calmPalette.textPrimary },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(searchQueryMyOrders.trim()
                    ? myOpenOrders.filter((order) => {
                        const clientName = order.client?.name || '';
                        const clientPhone = order.client?.phone || '';
                        const orderNumber = order.orderNumber || `#${order.id}` || '';
                        const query = searchQueryMyOrders.toLowerCase().trim();
                        return (
                          clientName.toLowerCase().includes(query) || 
                          clientPhone.includes(query) ||
                          orderNumber.toLowerCase().includes(query)
                        );
                      })
                    : myOpenOrders
                  ).map((order, index) => {
                      return (
                    <TableRow 
                      key={order.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.35)' },
                        '&:hover': { backgroundColor: 'rgba(94, 78, 62, 0.12)' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
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
                            variant="outlined"
                            color="warning"
                            startIcon={<ArrowBack />}
                            onClick={() => handleReturnOrder(order.id)}
                            disabled={
                              order.status !== ORDER_STATUS.OPEN_ORDER ||
                              updatingOrderId === order.id
                            }
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
                              'إرجاع الطلب'
                            )}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleStatusUpdate(order.id)}
                            disabled={
                              order.status !== ORDER_STATUS.OPEN_ORDER ||
                              updatingOrderId === order.id
                            }
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
                              'إرسال للتغليف'
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
      <GlassDialog
        open={openCompletedOrdersModal}
        onClose={handleCloseCompletedOrdersModal}
        maxWidth="xl"
        title={`الطلبات المكتملة (${completedOrders.length})`}
       
      >
        {loading && completedOrders.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4, gap: 2, alignItems: "center" }}>
            <CircularProgress />
            <Typography>جاري التحميل...</Typography>
          </Box>
        ) : completedOrders.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
            <Typography>لا توجد طلبات مكتملة أو مرسلة</Typography>
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
                value={searchQueryCompleted}
                onChange={(e) => setSearchQueryCompleted(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: 1,
                        color: searchQueryCompleted ? calmPalette.primary : 'text.secondary',
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
              {searchQueryCompleted && (
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
                      const filteredCount = searchQueryCompleted.trim()
                        ? completedOrders.filter((order) => {
                            const clientName = order.client?.name || '';
                            const clientPhone = order.client?.phone || '';
                            const orderNumber = order.orderNumber || `#${order.id}` || '';
                            const query = searchQueryCompleted.toLowerCase().trim();
                            return (
                              clientName.toLowerCase().includes(query) || 
                              clientPhone.includes(query) ||
                              orderNumber.toLowerCase().includes(query)
                            );
                          }).length
                        : completedOrders.length;
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
                  <TableCell>رقم الهاتف</TableCell>
                  <TableCell>المحافظة</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>حالة التوصيل</TableCell>
                  <TableCell>تاريخ الطلب</TableCell>
                  <TableCell>الملاحظات</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {(searchQueryCompleted.trim()
                    ? completedOrders.filter((order) => {
                        const clientName = order.client?.name || '';
                        const clientPhone = order.client?.phone || '';
                        const orderNumber = order.orderNumber || `#${order.id}` || '';
                        const query = searchQueryCompleted.toLowerCase().trim();
                        return (
                          clientName.toLowerCase().includes(query) || 
                          clientPhone.includes(query) ||
                          orderNumber.toLowerCase().includes(query)
                        );
                      })
                    : completedOrders
                  ).map((order) => {
                  const status = getStatusLabel(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{ "&:nth-of-type(even)": { backgroundColor: "rgba(255,255,255,0.3)" } }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
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
                            
                            // If order is not sent to delivery company, don't show loading or fetch status
                            if (!order.isSentToDeliveryCompany) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              );
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
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              calendar: "gregory",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <IconButton
                          size="small"
                          onClick={() => handleNotesClick(order)}
                          sx={{
                            color: order.notes ? "primary.main" : "action.disabled",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                          title={order.notes ? "عرض/تعديل الملاحظات" : "إضافة ملاحظات"}
                        >
                          <Note />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                            sx={{ minWidth: '100px' }}
                          >
                            عرض التفاصيل
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedOrder && (() => {
              const numericStatus = typeof selectedOrder.status === 'number' 
                ? selectedOrder.status 
                : parseInt(selectedOrder.status, 10);
              const canOpenOrder = numericStatus === ORDER_STATUS.IN_PREPARATION;
              const canSendToPackaging = numericStatus === ORDER_STATUS.OPEN_ORDER;
              
              return (
                <>
                  {canOpenOrder && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={async () => {
                        await handleOpenOrder(selectedOrder.id);
                        handleCloseDetailsModal();
                      }}
                      sx={{
                        backgroundColor: '#1976d2',
                        '&:hover': {
                          backgroundColor: '#1565c0',
                        },
                      }}
                    >
                      فتح الطلب
                    </Button>
                  )}
                  {canSendToPackaging && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={async () => {
                        await handleStatusUpdate(selectedOrder.id);
                        handleCloseDetailsModal();
                      }}
                      disabled={updatingOrderId === selectedOrder.id}
                      sx={{
                        backgroundColor: '#2e7d32',
                        '&:hover': {
                          backgroundColor: '#1b5e20',
                        },
                      }}
                    >
                      {updatingOrderId === selectedOrder.id ? 'جاري التحميل...' : 'إرسال للتغليف'}
                    </Button>
                  )}
                </>
              );
            })()}
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
                  <InfoItem label="التاريخ" value={formatDateTime(selectedOrder.createdAt)} />
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
                                      <TableCell align="center">{formatCurrency(item?.totalPrice)}</TableCell>
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

export default PreparerDashboard;
