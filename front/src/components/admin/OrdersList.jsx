import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import {
  Visibility,
  Delete,
  Note,
  ArrowUpward,
  ArrowDownward,
  Image as ImageIcon,
  PictureAsPdf,
  LocalShipping,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import { ordersService, orderStatusService, shipmentsService } from "../../services/api";
import { subscribeToOrderUpdates } from "../../services/realtime";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FABRIC_TYPE_LABELS,
  SIZE_LABELS,
  COLOR_LABELS,
} from "../../constants";
import NotesDialog from "../common/NotesDialog";
import GlassDialog from "../common/GlassDialog";
import OrderForm from "../employee/OrderForm";

const OrdersList = () => {
  const { orders, user } = useApp();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState(null);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortByState, setSortByState] = useState('asc'); // 'asc', 'desc', or null
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [openShippingDialog, setOpenShippingDialog] = useState(false);
  const [orderToShip, setOrderToShip] = useState(null);
  const [shippingNotes, setShippingNotes] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDeliveryStatusDialog, setOpenDeliveryStatusDialog] = useState(false);
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [deliveryStatusLoading, setDeliveryStatusLoading] = useState(false);
  const [orderForDeliveryStatus, setOrderForDeliveryStatus] = useState(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderId: statusData }
  const [loadingDeliveryStatuses, setLoadingDeliveryStatuses] = useState({}); // { orderId: true/false }

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
  const fetchDeliveryStatus = useCallback(async (orderId) => {
    // Check if already loading or loaded
    setLoadingDeliveryStatuses(prev => {
      if (prev[orderId]) return prev; // Already loading
      return { ...prev, [orderId]: true };
    });
    
    setDeliveryStatuses(currentStatuses => {
      if (currentStatuses[orderId]) {
        // Already loaded, cancel loading
        setLoadingDeliveryStatuses(prev => {
          const updated = { ...prev };
          delete updated[orderId];
          return updated;
        });
        return currentStatuses;
      }
      return currentStatuses;
    });
    
    try {
      const statusData = await shipmentsService.getDeliveryStatus(orderId);
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: statusData }));
    } catch (error) {
      console.error(`Error fetching delivery status for order ${orderId}:`, error);
      // Set null to indicate failed to load
      setDeliveryStatuses(prev => ({ ...prev, [orderId]: null }));
    } finally {
      setLoadingDeliveryStatuses(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  }, []);

  // Fetch all orders from API + subscribe to realtime updates
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersService.getAllOrders();
        const newOrders = response || [];
        
        // Update state with new orders
        setAllOrders(newOrders);
        
        // Fetch delivery statuses for orders sent to delivery company
        const sentOrders = newOrders.filter(
          order => order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
        );
        
        // Load delivery statuses in parallel (with limit to avoid overwhelming)
        sentOrders.slice(0, 20).forEach(order => {
          fetchDeliveryStatus(order.id);
        });
        
        // Return the orders for use in .then()
        return newOrders;
      } catch (error) {
        console.error('Error fetching orders:', error);
        setAllOrders([]);
        return [];
      }
    };
    
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
          onOrderCreated: () => {
            console.log('Order created - refreshing orders');
            fetchOrders(); // Refresh without loading indicator
          },
          onOrderStatusChanged: (orderData) => {
            console.log('🔔 Order status changed received from SignalR:', orderData);
            
            // Always refresh from server when status changes to get latest data
            // This ensures we always have the most up-to-date information
            fetchOrders().then((refreshedOrders) => {
              console.log('✅ Orders refreshed from server:', refreshedOrders?.length || 'unknown count');
              
              // Get order info from the received data
              const order = typeof orderData === 'object' ? orderData : null;
              const orderId = order?.id || orderData;
              const newStatus = order?.status;
              
              // Find the updated order in the refreshed list to get its status
              setAllOrders(currentOrders => {
                const updatedOrder = currentOrders.find(o => o.id === orderId || (order && o.id === order.id));
                if (updatedOrder) {
                  console.log('📦 Updated order found:', updatedOrder.id, 'Status:', updatedOrder.status);
                  
                  // If order status changed to SENT_TO_DELIVERY_COMPANY, fetch delivery status
                  if (updatedOrder.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY) {
                    setTimeout(() => {
                      console.log('🚚 Fetching delivery status for order:', updatedOrder.id);
                      fetchDeliveryStatus(updatedOrder.id);
                    }, 1000);
                  }
                }
                return currentOrders; // State already updated by fetchOrders
              });
            }).catch(err => {
              console.error('❌ Error refreshing orders after status change:', err);
            });
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
              // Fetch the latest delivery status from API
              console.log('🔄 Fetching updated delivery status for order:', orderId);
              fetchDeliveryStatus(orderId);
            }
          },
          onShipmentNoteAdded: (shipmentData) => {
            // Handle shipment note added from webhook (ShipmentNoteAdded event)
            console.log('📝 Shipment note added via SignalR (webhook):', shipmentData);
            const orderId = shipmentData?.orderId;
            if (orderId) {
              // Fetch the latest delivery status from API to get updated notes
              console.log('🔄 Fetching updated delivery status for order:', orderId);
              fetchDeliveryStatus(orderId);
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
  }, []);

  // Load delivery statuses for orders sent to delivery company when orders change
  useEffect(() => {
    const sentOrders = allOrders.filter(
      order => order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
    );
    
    // Load delivery statuses for new orders
    sentOrders.forEach(order => {
      // Check synchronously if already loaded or loading
      const isLoaded = deliveryStatuses[order.id] !== undefined;
      const isLoading = loadingDeliveryStatuses[order.id] === true;
      
      if (!isLoaded && !isLoading) {
        fetchDeliveryStatus(order.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrders]);

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
        console.error('Error fetching order image:', error);
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
        
        console.log('Processing base64 file:', {
          originalLength: base64Data.length,
          cleanedLength: cleanBase64.length,
          mimeType: mimeType
        });

        // Method 1: Try using fetch API first
        let blob;
        try {
          const response = await fetch(fileUrl);
          blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('الملف فارغ بعد التحويل');
          }
          
          console.log('Blob created via fetch:', {
            size: blob.size,
            type: blob.type
          });
        } catch (fetchError) {
          console.warn('Fetch method failed, trying manual conversion:', fetchError);
          
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
            
            console.log('Blob created via manual conversion:', {
              size: blob.size,
              type: blob.type
            });
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
            
            console.log('File type detected from signature:', fileExtension);
          } catch (sigError) {
            console.warn('Could not detect file type from signature, using default:', sigError);
          }
        }
        
        fileName = `${fileName}.${fileExtension}`;
        
        console.log('File info:', {
          mimeType: mimeType,
          fileExtension: fileExtension,
          fileName: fileName,
          blobSize: blob.size
        });
        
        // Create blob URL for download
        const blobUrl = URL.createObjectURL(blob);
        console.log('Blob URL created:', blobUrl, 'Size:', blob.size);
        
        // Download file directly
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        console.log('Triggering download...');
        link.click();
        
        // Remove link and cleanup after download
        setTimeout(() => {
          document.body.removeChild(link);
          // Give more time for download to complete before revoking
          setTimeout(() => {
            console.log('Revoking blob URL');
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
        console.log('Fetching full order to get file...', { orderId, designId });
        const fullOrder = await ordersService.getOrderById(orderId);
        console.log('Full order received:', fullOrder);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        console.log('Design found:', design);
        
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
      
      // Refresh orders list
      try {
        const updatedOrders = await ordersService.getAllOrders();
        setAllOrders(updatedOrders || []);
        
        // Fetch delivery status for the shipped order
        // Note: Real-time updates will come via SignalR, but we fetch once to get initial status
        fetchDeliveryStatus(orderToShip.id);
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
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء جلب حالة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
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
      console.log('Deleting order with ID:', orderToDelete.id);
      console.log('Order to delete:', orderToDelete);
      
      // Ensure ID is a number
      const orderId = parseInt(orderToDelete.id);
      console.log('Parsed order ID:', orderId);
      
      const response = await ordersService.deleteOrder(orderId);
      console.log('Delete response:', response);
      
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

  const getFabricLabel = (fabricType) => {
    if (fabricType === null || fabricType === undefined) return "-";
    const numeric = typeof fabricType === "number" ? fabricType : parseInt(fabricType, 10);
    return FABRIC_TYPE_LABELS[numeric] || fabricType || "-";
  };

  const getSizeLabel = (size) => {
    if (size === null || size === undefined) return "-";
    if (typeof size === "string" && !size.trim()) return "-";
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

  // Filter by status
  const statusFilteredOrders =
    statusFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === parseInt(statusFilter));

  // Filter by client name or phone search
  const filteredOrders = searchQuery.trim()
    ? statusFilteredOrders.filter((order) => {
        const clientName = order.client?.name || "";
        const clientPhone = order.client?.phone || "";
        const query = searchQuery.toLowerCase().trim();
        return clientName.toLowerCase().includes(query) || clientPhone.includes(query);
      })
    : statusFilteredOrders;

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
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          جميع الطلبات ({sortedOrders.length})
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="بحث باسم العميل أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
            sx={{ minWidth: 250 }}
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
            <MenuItem value={ORDER_STATUS.COMPLETED}>مكتمل</MenuItem>
            <MenuItem value={ORDER_STATUS.CANCELLED}>ملغي</MenuItem>
            <MenuItem value={ORDER_STATUS.OPEN_ORDER}>الطلب مفتوح</MenuItem>
            <MenuItem value={ORDER_STATUS.SENT_TO_DELIVERY_COMPANY}>تم الإرسال لشركة التوصيل</MenuItem>
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
                    <TableCell colSpan={11} align="center">
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
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                        <TableCell>{order.client?.name || "-"}</TableCell>
                        <TableCell>{order.designer?.name || "-"}</TableCell>
                        <TableCell>{order.preparer?.name || "-"}</TableCell>
                        <TableCell>
                          {order.orderDate 
                            ? new Date(order.orderDate).toLocaleDateString("ar-SA", { 
                                year: "numeric", 
                                month: "short", 
                                day: "numeric",
                                calendar: "gregory" 
                              })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{order.totalQuantity}</TableCell>
                        <TableCell>{order.totalAmount} ₪</TableCell>
                        <TableCell
                          onClick={() => {
                            if (order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY) {
                              handleDeliveryStatusClick(order);
                            }
                          }}
                          sx={{
                            cursor: order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ? 'pointer' : 'default',
                            '&:hover': order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ? {
                              backgroundColor: 'action.hover',
                            } : {},
                          }}
                        >
                          {order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ? (
                            (() => {
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
                                return (
                                  <Typography variant="body2" color="error">
                                    فشل التحميل
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
                              
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  غير متوفر - اضغط لعرض التفاصيل
                                </Typography>
                              );
                            })()
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
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
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewOrder(order)}
                              sx={{ 
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                minHeight: '36px',
                                height: '50px',
                              }}
                            >
                              عرض
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleEditClick(order)}
                              sx={{ 
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                minHeight: '36px',
                                height: '50px',
                              }}
                            >
                              تعديل
                            </Button>
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
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                minHeight: '36px',
                                height: '50px',
                              }}
                            >
                              إلغاء
                            </Button>
                            <Tooltip 
                              title={
                                order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY 
                                  ? "تم الإرسال لشركة التوصيل مسبقاً" 
                                  : "إرسال الطلب لشركة التوصيل"
                              } 
                              arrow 
                              placement="top"
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleShippingClick(order)}
                                  disabled={
                                    order.status === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ||
                                    order.status === ORDER_STATUS.CANCELLED 
                                  }
                                  sx={{
                                    color: '#2e7d32',
                                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                    width: '36px',
                                    height: '36px',
                                    minWidth: '36px',
                                    minHeight: '50px',
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
                                    padding: '8px',
                                  }}
                                >
                                  <LocalShipping fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                           <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(order)}
                              sx={{ 
                                width: '36px',
                                height: '36px',
                                minWidth: '36px',
                                minHeight: '36px',
                                padding: '8px',
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
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
                  <InfoItem label="الهاتف" value={selectedOrder.client?.phone || "-"} />
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
                                      <TableCell>{getFabricLabel(item?.fabricType)}</TableCell>
                                      <TableCell>{getColorLabel(item?.color)}</TableCell>
                                      <TableCell align="center">
                                        {getSizeLabel(item?.size)}
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