import { useState, useEffect, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Grid,
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
  TablePagination,
  Divider,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import {
  Logout,
  DesignServices,
  Close,
  Note,
  Schedule,
  Print,
  ArrowBack,
  ArrowForward,
  Visibility,
  Search,
  CameraAlt,
  History,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, shipmentsService, colorsService, sizesService, fabricTypesService } from "../services/api";
import { Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { subscribeToOrderUpdates } from "../services/realtime";
import { SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, USER_ROLES } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import GlassDialog from "../components/common/GlassDialog";
import calmPalette from "../theme/calmPalette";

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [pendingPrintingOrders, setPendingPrintingOrders] = useState([]); // Tab 0: Status 1 (PENDING_PRINTING)
  const [inPrintingOrders, setInPrintingOrders] = useState([]); // Tab 1: Status 2 (IN_PRINTING)
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Can be string or array
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryInPrinting, setSearchQueryInPrinting] = useState('');
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const activeImageLoads = useRef(new Set()); // Track active image loads to prevent duplicates
  const MAX_CONCURRENT_LOADS = 3; // Maximum concurrent image loads
  const [page, setPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Number of rows per page
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loadingFabricTypes, setLoadingFabricTypes] = useState(false);

  const getFullUrl = (inputUrl) => {
    if (!inputUrl || typeof inputUrl !== "string") return inputUrl;

    const trimmed = inputUrl.trim();
    if (!trimmed) return trimmed;

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }

    const normalizedPath = trimmed.replace(/\\/g, "/");
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL ||
      "https://psbrand-backend-production.up.railway.app/api";

    let baseDomain;
    try {
      baseDomain = new URL(API_BASE_URL).origin;
    } catch {
      baseDomain = API_BASE_URL.replace(/\/api.*$/i, "");
    }

    if (normalizedPath.startsWith("/")) {
      return `${baseDomain}${normalizedPath}`;
    }

    return `${baseDomain}/${normalizedPath}`;
  };


  // Fetch pending printing orders (Status 1: PENDING_PRINTING) - Tab 0
  const fetchPendingPrintingOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const orders = await ordersService.getOrdersByStatus(ORDER_STATUS.PENDING_PRINTING);
      setPendingPrintingOrders(orders || []);
    } catch (error) {
      console.error('Error fetching pending printing orders:', error);
      setPendingPrintingOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch in printing orders (Status 2: IN_PRINTING) - Tab 1
  const fetchInPrintingOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const orders = await ordersService.getOrdersByStatus(ORDER_STATUS.IN_PRINTING);
      setInPrintingOrders(orders || []);
    } catch (error) {
      console.error('Error fetching in printing orders:', error);
      setInPrintingOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchOrders = async (showLoading = false) => {
    await Promise.all([
      fetchPendingPrintingOrders(showLoading),
      fetchInPrintingOrders(false) // Don't show loading for second call
    ]);
  };

  // Load colors, sizes, and fabric types on component mount
  useEffect(() => {
    loadColors();
    loadSizes();
    loadFabricTypes();
  }, []);

  useEffect(() => {
    fetchOrders(true); // Show loading on initial fetch only

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: () => {
            fetchOrders(false);
          },
          onOrderStatusChanged: (orderData) => {
            // Always refresh from server when status changes to get latest data
            fetchOrders(false).catch(err => {
              console.error('Error refreshing orders after status change:', err);
            });
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


  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOrder(null);
  };

  // Load image for display (lazy loading with queue)
  const loadImageForDisplay = async (orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    const loadingKey = `image-${orderId}-${designId}`;
    
    // Check cache first
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    // Don't load if already loading
    if (activeImageLoads.current.has(loadingKey)) {
      return null;
    }
    
    // Check if we're at max concurrent loads - wait a bit
    if (activeImageLoads.current.size >= MAX_CONCURRENT_LOADS) {
      // Queue this load by retrying after a short delay
      setTimeout(() => {
        loadImageForDisplay(orderId, designId);
      }, 500);
      return null;
    }
    
    // Start loading
    activeImageLoads.current.add(loadingKey);
    setLoadingImage(loadingKey);
    
    try {
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find(d => d.id === designId);
      if (design?.mockupImageUrl && design.mockupImageUrl !== 'image_data_excluded') {
        // Save to cache
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: design.mockupImageUrl
        }));
        return design.mockupImageUrl;
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      activeImageLoads.current.delete(loadingKey);
      setLoadingImage(null);
    }
    return null;
  };

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
                
                // Check if already loaded or loading
                setImageCache(prevCache => {
                  const loadingKey = `image-${orderId}-${designId}`;
                  if (!prevCache[key] && !activeImageLoads.current.has(loadingKey)) {
                    // Load image when it becomes visible
                    loadImageForDisplay(parseInt(orderId), parseInt(designId));
                  }
                  return prevCache;
                });
                
                // Stop observing once we've triggered the load
                observer.unobserve(entry.target);
              }
            }
          });
        },
        { 
          rootMargin: '100px', // Start loading 100px before image enters viewport
          threshold: 0.01 // Trigger when 1% of image is visible
        }
      );

      // Observe all image placeholders
      const imageElements = document.querySelectorAll('[data-image-placeholder="true"]');
      imageElements.forEach((el) => observer.observe(el));
    }, 200);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrintingOrders.length, inPrintingOrders.length]); // Re-run only when orders count changes

  const handleImageClick = async (imageUrl, orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    
    // If image data is excluded, use cached or load it
    if (imageUrl === 'image_data_excluded' && orderId) {
      let imageToShow = imageCache[cacheKey];
      
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      
      if (imageToShow) {
        setSelectedImage(getFullUrl(imageToShow));
        setCurrentImageIndex(0);
        setImageDialogOpen(true);
      } else {
        alert('الصورة غير متوفرة');
      }
      return;
    }
    
    // Don't open dialog if image data is excluded
    if (!imageUrl || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }
      setSelectedImage(getFullUrl(imageUrl));
    setCurrentImageIndex(0);
    setImageDialogOpen(true);
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
            console.error('Both methods failed:', { fetchError, manualError });
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
      // Try to download as is
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = 'file.pdf';
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
          // Open file using helper function
          await openFile(design.printFileUrl);
        } else {
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
    await openFile(fileUrl);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
    setCurrentImageIndex(0);
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
    
    // Update the correct list based on order status
    if (selectedOrder.status === ORDER_STATUS.PENDING_PRINTING) {
      setPendingPrintingOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    } else if (selectedOrder.status === ORDER_STATUS.IN_PRINTING) {
      setInPrintingOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    }
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
      // Also switch tab if order moved from pending to in printing
      if (currentStatus === ORDER_STATUS.PENDING_PRINTING) {
        // Order moved from pending to in printing, switch to tab 1
        setTimeout(() => {
          fetchOrders(false).then(() => {
            setCurrentTab(1); // Switch to "في مرحلة الطباعة" tab
          });
        }, 500);
      } else {
        setTimeout(() => {
          fetchOrders(false); // Don't show loading after action
        }, 500);
      }
      
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

  const getStatusChipColor = (status) => {
    const statusInfo = getStatusLabel(status);
    return statusInfo.color || "default";
  };

  const getStatusText = (status) => {
    const statusInfo = getStatusLabel(status);
    return statusInfo.label || "غير معروف";
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

  const normalizeDateValue = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // If the string already contains a timezone offset or Z, trust it as-is
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

  const getFabricLabel = (fabricType) => {
    if (fabricType === null || fabricType === undefined) return "-";
    
    const fabricTypeId = typeof fabricType === 'string' && !isNaN(fabricType) && fabricType !== '' 
      ? Number(fabricType) 
      : (typeof fabricType === 'number' ? fabricType : null);
    
    if (fabricTypeId === null) {
      return fabricType;
    }
    
    if (fabricTypes.length > 0) {
      const fabricTypeObj = fabricTypes.find(f => f.id === fabricTypeId);
      if (fabricTypeObj) {
        return fabricTypeObj.nameAr || fabricTypeObj.name || "-";
      }
    }
    
    const numeric = typeof fabricType === "number" ? fabricType : parseInt(fabricType, 10);
    return FABRIC_TYPE_LABELS[numeric] || fabricType || "-";
  };

  const getSizeLabel = (size) => {
    if (size === null || size === undefined) return "-";
    if (typeof size === "string" && !size.trim()) return "-";
    
    const sizeId = typeof size === 'string' && !isNaN(size) && size !== '' 
      ? Number(size) 
      : (typeof size === 'number' ? size : null);
    
    if (sizeId === null) {
      return size;
    }
    
    if (sizes.length > 0) {
      const sizeObj = sizes.find(s => s.id === sizeId);
      if (sizeObj) {
        return sizeObj.nameAr || sizeObj.name || "-";
      }
    }
    
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
    
    const colorId = typeof color === 'string' && !isNaN(color) && color !== '' 
      ? Number(color) 
      : (typeof color === 'number' ? color : null);
    
    if (colorId === null) {
      return color;
    }
    
    if (colors.length > 0) {
      const colorObj = colors.find(c => c.id === colorId);
      if (colorObj) {
        return colorObj.nameAr || colorObj.name || "-";
      }
    }
    
    // Return color as-is if API colors not loaded yet
    return color || "-";
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
        const citiesData = await shipmentsService.getCities();
        const citiesArray = Array.isArray(citiesData) ? citiesData : [];
        setCities(citiesArray);
        
        // Load areas for all cities
        const allAreas = [];
        for (const city of citiesArray) {
          if (city && (city.id || city.Id)) {
            try {
              const cityId = city.id || city.Id;
              const areasData = await shipmentsService.getAreas(cityId);
              const areasArray = Array.isArray(areasData) ? areasData : [];
              areasArray.forEach(area => {
                if (area) {
                  allAreas.push({ 
                    ...area, 
                    id: area.id || area.Id,
                    name: area.name || area.Name,
                    cityId: cityId 
                  });
                }
              });
            } catch (error) {
              console.error(`Error loading areas for city ${city.id || city.Id}:`, error);
            }
          }
        }
        setAreas(allAreas);
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

  // Get filtered orders based on current tab and search query
  const getFilteredOrders = () => {
    const orders = currentTab === 0 ? pendingPrintingOrders : inPrintingOrders;
    const search = currentTab === 0 ? searchQuery : searchQueryInPrinting;
    
    if (!search.trim()) return orders;
    
    return orders.filter((order) => {
      const clientName = order.client?.name || "";
      const clientPhone = order.client?.phone || "";
      const orderNumber = order.orderNumber || `#${order.id}` || "";
      const query = search.toLowerCase().trim();
      return (
        clientName.toLowerCase().includes(query) ||
        clientPhone.toString().includes(query) ||
        orderNumber.toLowerCase().includes(query)
      );
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate total rows (each design counts as a row)
  const totalRows = filteredOrders.reduce((total, order) => {
    const designs = order.orderDesigns || [];
    return total + (designs.length > 0 ? designs.length : 1); // If no designs, count as 1 row
  }, 0);

  // Flatten orders to rows for pagination
  const flattenedRows = filteredOrders.flatMap((order) => {
    const designs = order.orderDesigns || [];
    if (designs.length === 0) {
      return [{ order, design: null, isFirstRow: true }];
    }
    return designs.map((design, index) => ({
      order,
      design,
      isFirstRow: index === 0
    }));
  });

  // Apply pagination
  const paginatedRows = flattenedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Clear loading states when changing page
    setLoadingImage(null);
    activeImageLoads.current.clear();
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
    // Clear loading states when changing rows per page
    setLoadingImage(null);
    activeImageLoads.current.clear();
  };

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(0);
    setLoadingImage(null);
    activeImageLoads.current.clear();
  }, [currentTab, searchQuery, searchQueryInPrinting]);


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
                color: "#f6f1eb",
              }}
            >
              PSBrand - لوحة مدير التصميم
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
                {user?.name || "مدير التصميم"}
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

          <Paper
            elevation={0}
            sx={{
              padding: 4,
              borderRadius: 3,
              background: calmPalette.surface,
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
          >
          <Box sx={{ marginBottom: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
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
                label={`بانتظار الطباعة (${pendingPrintingOrders.length})`}
                icon={<Schedule />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 0 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '12px 0 0 12px',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={`في مرحلة الطباعة (${inPrintingOrders.length})`}
                icon={<Print />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 1 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0 12px 12px 0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
              <Box sx={{ flex: '0 0 auto', width: '50%', position: 'relative' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                  value={currentTab === 0 ? searchQuery : searchQueryInPrinting}
                  onChange={(e) => {
                    if (currentTab === 0) {
                      setSearchQuery(e.target.value);
                    } else {
                      setSearchQueryInPrinting(e.target.value);
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: 1,
                          color: (currentTab === 0 ? searchQuery : searchQueryInPrinting) ? calmPalette.primary : 'text.secondary',
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
                        padding: '10px 14px',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                      },
                    },
                  }}
                />
                {(currentTab === 0 ? searchQuery : searchQueryInPrinting) && (
                  <Box
                    sx={{
                      marginTop: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      backgroundColor: calmPalette.primary + '15',
                      padding: '6px 16px',
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
                        const filteredCount = filteredOrders.length;
                        return `تم العثور على ${filteredCount} ${filteredCount === 1 ? 'نتيجة' : 'نتائج'}`;
                      })()}
                    </Typography>
                  </Box>
                )}
              </Box>
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
                    <TableRow sx={{ backgroundColor: calmPalette.surfaceHover }}>
                      <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>اسم الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ملف التصميم</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.length === 0 ? (
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
                      paginatedRows.map(({ order, design, isFirstRow }) => {
                      const status = getStatusLabel(order.status);
                      const designs = order.orderDesigns || [];
                      
                      // If no design (order has no designs)
                      if (!design) {
                        return (
                          <TableRow
                            key={`order-${order.id}`}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{order.client?.name || "-"}</TableCell>
                            <TableCell>
                              {order.designer?.name || "غير محدد"}
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={status.label}
                                  color={status.color}
                                  size="small"
                                />
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
                          <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewOrder(order)}
                              sx={{ minWidth: 90, flexShrink: 0 }}
                            >
                              عرض
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleStatusUpdate(order.id, order.status)}
                              disabled={
                                (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
                                updatingOrderId === order.id
                              }
                              sx={{ minWidth: 90, flexShrink: 0 }}
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
                          </Box>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // Calculate rowSpan for visible designs in current page
                      const visibleDesignsInOrder = paginatedRows.filter(row => row.order.id === order.id);
                      const rowCount = visibleDesignsInOrder.length;
                        
                        return (
                          <TableRow
                            key={`order-${order.id}-design-${design.id || Math.random()}`}
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
                              </>
                            )}
                            <TableCell>{design?.designName || "-"}</TableCell>
                            {isFirstRow && (
                              <>
                                <TableCell rowSpan={rowCount}>
                                  {order.client?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.designer?.name || "غير محدد"}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              {(() => {
                                // Support both old format (mockupImageUrl) and new format (mockupImageUrls array)
                                const imageUrls = design?.mockupImageUrls || (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
                                const validImages = imageUrls.filter(url => url && url !== 'placeholder_mockup.jpg');
                                
                                if (validImages.length === 0) return "-";
                                
                                const firstImage = validImages[0];
                                const cacheKey = `${order.id}-${design.id}`;
                                const isExcluded = firstImage === 'image_data_excluded';
                                const cachedImage = imageCache[cacheKey];
                                const isLoading = loadingImage === `image-${order.id}-${design.id}`;
                                const displayImage = getFullUrl(isExcluded ? cachedImage : firstImage);
                                
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box 
                                      sx={{ 
                                        width: 60, 
                                        height: 60, 
                                        position: 'relative',
                                        cursor: 'pointer',
                                          bgcolor: isExcluded && !cachedImage ? calmPalette.surface : 'transparent',
                                        borderRadius: "4px",
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                          border: isExcluded && !cachedImage ? '1px solid rgba(34, 28, 24, 0.1)' : 'none',
                                          flexShrink: 0,
                                          '&:hover': { opacity: 0.85 }
                                      }}
                                      onClick={() => handleImageClick(firstImage, order.id, design.id)}
                                      data-image-placeholder={isExcluded && !cachedImage ? "true" : "false"}
                                      data-order-id={order.id}
                                      data-design-id={design.id}
                                    >
                                      {isLoading ? (
                                        <CircularProgress size={20} />
                                      ) : displayImage ? (
                                        <img 
                                          src={displayImage} 
                                          alt={design.designName}
                                          onClick={() => {
                                            if (displayImage && displayImage !== 'image_data_excluded') {
                                              setSelectedImage(displayImage);
                                              setCurrentImageIndex(0);
                                              setImageDialogOpen(true);
                                            }
                                          }}
                                          onError={(e) => {
                                            e.target.src = '';
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) {
                                              e.target.nextSibling.style.display = 'flex';
                                            }
                                          }}
                                          style={{ 
                                            width: "100%", 
                                            height: "100%", 
                                            objectFit: "cover",
                                            borderRadius: "4px",
                                            cursor: displayImage && displayImage !== 'image_data_excluded' ? 'pointer' : 'default'
                                          }}
                                        />
                                      ) : (
                                        <Box 
                                          sx={{ 
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: "100%", 
                                            height: "100%", 
                                            color: calmPalette.textMuted,
                                            fontSize: '0.6rem',
                                            textAlign: 'center',
                                            px: 0.5
                                          }}
                                        >
                                          <ImageIcon sx={{ fontSize: 16, mb: 0.3, opacity: 0.5 }} />
                                          <span style={{ fontSize: '0.55rem' }}>تحميل...</span>
                                        </Box>
                                      )}
                                      <Box 
                                        sx={{ 
                                          display: 'none',
                                          width: "100%", 
                                          height: "100%", 
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                            bgcolor: calmPalette.surfaceHover,
                                          borderRadius: "4px",
                                          fontSize: '0.7rem',
                                            color: calmPalette.textPrimary
                                        }}
                                      >
                                        غير متوفرة
                                      </Box>
                                    </Box>
                                    {validImages.length > 1 && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          minWidth: 'auto',
                                          px: 1,
                                          py: 0.5,
                                          fontSize: '0.7rem',
                                          height: 'fit-content'
                                        }}
                                        onClick={() => {
                                          setSelectedImage(validImages);
                                          setCurrentImageIndex(0);
                                          setImageDialogOpen(true);
                                        }}
                                      >
                                        +{validImages.length - 1}
                                      </Button>
                                    )}
                                  </Box>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // Support both old format (printFileUrl) and new format (printFileUrls array)
                                const fileUrls = design?.printFileUrls || (design?.printFileUrl ? [design.printFileUrl] : []);
                                const validFiles = fileUrls.filter(url => url && url !== "placeholder_print.pdf");
                                
                                if (validFiles.length === 0) return "-";
                                
                                const firstFile = validFiles[0];
                                const isExcluded = firstFile === 'image_data_excluded';
                                
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    {isExcluded ? (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={loadingImage === `file-${order.id}-${design.id}` ? <CircularProgress size={14} /> : <PictureAsPdf />}
                                        onClick={() => handleFileClick(firstFile, order.id, design.id)}
                                        disabled={loadingImage === `file-${order.id}-${design.id}`}
                                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                                      >
                                        تحميل
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() => handleFileClick(firstFile, order.id, design.id)}
                                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                                      >
                                        PDF
                                      </Button>
                                    )}
                                    {validFiles.length > 1 && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          minWidth: 'auto',
                                          px: 1,
                                          py: 0.5,
                                          fontSize: '0.7rem',
                                          height: 'fit-content'
                                        }}
                                        onClick={() => {
                                          // Open all files - could show a dialog or download all
                                          validFiles.forEach((url, idx) => {
                                            setTimeout(() => handleFileClick(url, order.id, design.id), idx * 200);
                                          });
                                        }}
                                      >
                                        +{validFiles.length - 1}
                                      </Button>
                                    )}
                                  </Box>
                                );
                              })()}
                            </TableCell>
                            {isFirstRow && (
                              <>
                                <TableCell rowSpan={rowCount}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                      label={status.label}
                                      color={status.color}
                                      size="small"
                                    />
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
                          <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Visibility />}
                                  onClick={() => handleViewOrder(order)}
                                  sx={{ minWidth: 90, flexShrink: 0 }}
                                >
                                  عرض
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleStatusUpdate(order.id, order.status)}
                                  disabled={
                                    (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
                                    updatingOrderId === order.id
                                  }
                                  sx={{ minWidth: 90, flexShrink: 0 }}
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
                              </Box>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalRows}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="عدد الصفوف في الصفحة:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
                }
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </Paper>
      </Container>

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

            {selectedOrder?.isModified && user?.role === USER_ROLES.ADMIN && (
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

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {Array.isArray(selectedImage) 
              ? `معاينة الصور (${currentImageIndex + 1} / ${selectedImage.length})`
              : 'معاينة الصورة'}
          </Typography>
          <IconButton onClick={handleCloseImageDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 2 }}>
          {(() => {
            // Handle both single image (string) and multiple images (array)
            const images = Array.isArray(selectedImage) ? selectedImage : (selectedImage ? [selectedImage] : []);
            const currentImage = images[currentImageIndex];
            
            if (!currentImage || currentImage === 'image_data_excluded') {
              return (
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>الصورة غير متوفرة</Typography>
                  <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات لتقليل حجم البيانات</Typography>
                </Box>
              );
            }
            
            return (
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                {images.length > 1 && (
                  <>
                    <IconButton
                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      sx={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                        zIndex: 1
                      }}
                    >
                      <ArrowBack />
                    </IconButton>
                    <IconButton
                      onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                      sx={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                        zIndex: 1
                      }}
                    >
                      <ArrowForward />
                    </IconButton>
                  </>
                )}
                <img 
                  src={currentImage} 
                  alt={`معاينة الصورة ${currentImageIndex + 1}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
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
                  <Typography variant="body2">الصورة غير متوفرة في قائمة الطلبات</Typography>
                </Box>
                {images.length > 1 && (
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 2,
                    padding: '4px 8px'
                  }}>
                    {images.map((_, idx) => (
                      <Box
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: idx === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })()}
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


