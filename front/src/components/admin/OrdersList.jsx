import { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  TablePagination,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  Delete,
  Note,
  ArrowUpward,
  ArrowDownward,
  Close,
  Image as ImageIcon,
  PictureAsPdf,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import { ordersService } from "../../services/api";
import { subscribeToOrderUpdates } from "../../services/realtime";
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../constants";
import NotesDialog from "../common/NotesDialog";

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortByState, setSortByState] = useState('asc'); // 'asc', 'desc', or null

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

  // Fetch all orders from API + subscribe to realtime updates
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await ordersService.getAllOrders();
        setAllOrders(response || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: () => fetchOrders(),
          onOrderStatusChanged: () => fetchOrders(),
        });
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

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

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setOrderToDelete(null);
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

  const filteredOrders =
    statusFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === parseInt(statusFilter));

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
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          جميع الطلبات ({sortedOrders.length})
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
                  <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المصمم</TableCell>
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
                  <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التفاصيل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
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
                            >
                              عرض
                            </Button>
                           
                          </Box>
                        </TableCell>
                        <TableCell>
                           <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(order)}
                            >
                              <Delete />
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
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الطلب</DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات الطلب
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>رقم الطلب:</strong> {selectedOrder.orderNumber || `#${selectedOrder.id}`}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>التاريخ:</strong>{" "}
                  {selectedOrder.orderDate 
                    ? new Date(selectedOrder.orderDate).toLocaleDateString("ar-SA", { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric",
                        calendar: "gregory" 
                      })
                    : "-"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>الحالة:</strong> <Chip
                    label={getStatusLabel(selectedOrder.status)}
                    color={getStatusColor(selectedOrder.status)}
                    size="small"
                  />
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>المجموع الفرعي:</strong> {selectedOrder.subTotal} ₪
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>التخفيض:</strong> {selectedOrder.discountAmount} ₪
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>رسوم التوصيل:</strong> {selectedOrder.deliveryFee} ₪
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>المبلغ الإجمالي:</strong> {selectedOrder.totalAmount} ₪
                </Typography>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات العميل
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>الاسم:</strong> {selectedOrder.client?.name || "-"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>الهاتف:</strong> {selectedOrder.client?.phone || "-"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>المنطقة:</strong> {selectedOrder.district || "-"}
                </Typography>
              </Box>

              {/* Designs */}
              {selectedOrder.orderDesigns && selectedOrder.orderDesigns.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    التصاميم ({selectedOrder.orderDesigns.length})
                  </Typography>
                  <Box sx={{ marginBottom: 3 }}>
                    {selectedOrder.orderDesigns.map((design, index) => (
                      <Box
                        key={design.id || index}
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: 2,
                          padding: 2,
                          marginBottom: 2,
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                          {design.designName}
                        </Typography>
                        {(() => {
                          // Support both old format (mockupImageUrl) and new format (mockupImageUrls array)
                          const imageUrls = design?.mockupImageUrls || (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
                          const validImages = imageUrls.filter(url => url && url !== 'placeholder_mockup.jpg');
                          
                          if (validImages.length === 0) return null;
                          
                          return (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                الصور ({validImages.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {validImages.map((imageUrl, idx) => (
                                  imageUrl === 'image_data_excluded' ? (
                                    <Button
                                      key={idx}
                                      variant="outlined"
                                      size="small"
                                      startIcon={loadingImage === `image-${selectedOrder.id}-${design.id}` ? <CircularProgress size={16} /> : <ImageIcon />}
                                      onClick={() => handleImageClick(imageUrl, selectedOrder.id, design.id)}
                                      disabled={loadingImage === `image-${selectedOrder.id}-${design.id}`}
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
                                        position: 'relative',
                                        cursor: 'pointer',
                                        '&:hover': { opacity: 0.8 }
                                      }}
                                    >
                                      <img
                                        src={displayUrl}
                                        alt={`${design.designName} - صورة ${idx + 1}`}
                                        onClick={() => handleImageClick(imageUrl, selectedOrder.id, design.id)}
                                        style={{
                                          maxWidth: '150px',
                                          maxHeight: '150px',
                                          height: 'auto',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                      />
                                    </Box>
                                      );
                                    })()
                                  )
                                ))}
                              </Box>
                            </Box>
                          );
                        })()}
                        {(() => {
                          // Support both old format (printFileUrl) and new format (printFileUrls array)
                          const fileUrls = design?.printFileUrls || (design?.printFileUrl ? [design.printFileUrl] : []);
                          const validFiles = fileUrls.filter(url => url && url !== "placeholder_print.pdf");
                          
                          if (validFiles.length === 0) return null;
                          
                          return (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                ملفات التصميم ({validFiles.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {validFiles.map((fileUrl, idx) => (
                                  fileUrl === 'image_data_excluded' ? (
                                    <Button
                                      key={idx}
                                      variant="outlined"
                                      size="small"
                                      startIcon={loadingImage === `file-${selectedOrder.id}-${design.id}` ? <CircularProgress size={16} /> : <PictureAsPdf />}
                                      onClick={() => handleFileClick(fileUrl, selectedOrder.id, design.id)}
                                      disabled={loadingImage === `file-${selectedOrder.id}-${design.id}`}
                                    >
                                      تحميل الملف {idx + 1}
                                    </Button>
                                  ) : (
                                    <Button
                                      key={idx}
                                      variant="contained"
                                      size="small"
                                      startIcon={<PictureAsPdf />}
                                      onClick={() => handleFileClick(fileUrl, selectedOrder.id, design.id)}
                                    >
                                      📄 ملف {idx + 1}
                                    </Button>
                                  )
                                ))}
                              </Box>
                            </Box>
                          );
                        })()}
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>المصمم:</strong> {selectedOrder.designer?.name || "-"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>المعد:</strong> {selectedOrder.preparer?.name || "غير محدد"}
                </Typography>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تأكيد الحذف</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1">
            هل أنت متأكد من رغبتك في حذف الطلب{" "}
            <strong>{orderToDelete?.orderNumber || `#${orderToDelete?.id}`}</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </Dialog>

      {/* Enlarged Image Dialog */}
      <Dialog
        open={openImageDialog}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
          }
        }}
      >
        <DialogContent sx={{
          padding: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '70vh'
        }}>
          {enlargedImageUrl && enlargedImageUrl !== 'image_data_excluded' ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={enlargedImageUrl}
                alt="صورة مكبّرة"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
              <Box sx={{ 
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '70vh',
                color: 'white'
              }}>
                <Typography variant="h6" sx={{ mb: 2 }}>لا يمكن عرض الصورة</Typography>
                <Typography variant="body2">الصورة غير متوفرة</Typography>
              </Box>
              <IconButton
                onClick={handleCloseImageDialog}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '70vh',
              color: 'white'
            }}>
              <Typography variant="h6" sx={{ mb: 2 }}>الصورة غير متوفرة</Typography>
              <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات</Typography>
              <IconButton
                onClick={handleCloseImageDialog}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <NotesDialog
        open={openNotesDialog}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />
    </Paper>
  );
};

export default OrdersList;