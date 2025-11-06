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
  TablePagination,
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
  ArrowBack,
  ArrowForward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { subscribeToOrderUpdates } from "../services/realtime";
import { COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";

// Helper function to build full image/file URL
const getFullUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  // If it's already a full URL (http/https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a data URL (base64), return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's a relative path starting with /, build full URL
  if (url.startsWith('/')) {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://psbrand-backend-production.up.railway.app/api";
    // Remove /api from base URL to get the domain
    const baseDomain = API_BASE_URL.replace('/api', '');
    return `${baseDomain}${url}`;
  }
  
  // Return as is for other cases
  return url;
};

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Can be string or array
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(ORDER_STATUS.PENDING_PRINTING);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const activeImageLoads = useRef(new Set()); // Track active image loads to prevent duplicates
  const MAX_CONCURRENT_LOADS = 3; // Maximum concurrent image loads
  const [page, setPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Number of rows per page

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
      
      // Support both old format (mockupImageUrl) and new format (mockupImageUrls array)
      const imageUrls = design?.mockupImageUrls || (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
      const firstImage = imageUrls.find(url => url && url !== 'image_data_excluded' && url !== 'placeholder_mockup.jpg');
      
      if (firstImage) {
        // Convert to full URL and save to cache
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
  }, [allOrders.length]); // Re-run only when orders count changes

  const handleImageClick = async (imageUrl, orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    
    // If image data is excluded, use cached or load it
    if (imageUrl === 'image_data_excluded' && orderId) {
      let imageToShow = imageCache[cacheKey];
      
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      
      if (imageToShow) {
        setSelectedImage(imageToShow);
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
    // Convert to full URL before displaying
    const fullImageUrl = getFullUrl(imageUrl);
    setSelectedImage(fullImageUrl);
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
    } else {
      // Regular URL - convert to full URL if needed and download
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
        
        // Support both old format (printFileUrl) and new format (printFileUrls array)
        const fileUrls = design?.printFileUrls || (design?.printFileUrl ? [design.printFileUrl] : []);
        const firstFile = fileUrls.find(url => url && url !== 'image_data_excluded' && url !== 'placeholder_print.pdf');
        
        if (firstFile) {
          console.log('File found, opening...', {
            fileUrlLength: firstFile.length,
            isBase64: firstFile.startsWith('data:'),
            startsWith: firstFile.substring(0, 50)
          });
          // Open file using helper function (getFullUrl will be called inside openFile)
          await openFile(firstFile);
        } else {
          console.error('File not available:', { 
            hasPrintFileUrl: !!design?.printFileUrl,
            hasPrintFileUrls: !!design?.printFileUrls,
            printFileUrl: design?.printFileUrl,
            printFileUrls: design?.printFileUrls
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

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
    setLoadingImage(null);
    activeImageLoads.current.clear();
  }, [statusFilter]);

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
                      <TableCell sx={{ fontWeight: 700 }}>اسم الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>العدد</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نوع المنتج</TableCell>
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
                      
                      // Calculate rowSpan for visible designs in current page
                      const visibleDesignsInOrder = paginatedRows.filter(row => row.order.id === order.id);
                      const rowCount = visibleDesignsInOrder.length;
                        
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
                            <TableCell>{designCount}</TableCell>
                            <TableCell>{productType}</TableCell>
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
                                 const displayImage = isExcluded ? cachedImage : getFullUrl(firstImage);
                                
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box 
                                      sx={{ 
                                        width: 60, 
                                        height: 60, 
                                        position: 'relative',
                                        cursor: 'pointer',
                                        bgcolor: isExcluded && !cachedImage ? '#f5f5f5' : 'transparent',
                                        borderRadius: "4px",
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: isExcluded && !cachedImage ? '1px solid #e0e0e0' : 'none',
                                        flexShrink: 0,
                                        '&:hover': { opacity: 0.8 }
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
                                            color: '#bbb',
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
                                          bgcolor: '#f0f0f0',
                                          borderRadius: "4px",
                                          fontSize: '0.7rem',
                                          color: '#666'
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
                                           // Convert all image URLs to full URLs
                                           const fullImageUrls = validImages.map(img => getFullUrl(img));
                                           setSelectedImage(fullImageUrls);
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
                                           // Open all files - convert to full URLs first
                                           validFiles.forEach((url, idx) => {
                                             const fullUrl = getFullUrl(url);
                                             setTimeout(() => handleFileClick(fullUrl, order.id, design.id), idx * 200);
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
             const images = Array.isArray(selectedImage) 
               ? selectedImage.map(img => getFullUrl(img))
               : (selectedImage ? [getFullUrl(selectedImage)] : []);
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


