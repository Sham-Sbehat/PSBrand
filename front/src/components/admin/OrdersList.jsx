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
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import { ordersService } from "../../services/api";
import { subscribeToOrderUpdates } from "../../services/realtime";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "../../constants";

const OrdersList = () => {
  const { orders } = useApp();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    const colorMap = {
      [ORDER_STATUS.PENDING]: 'warning',
      [ORDER_STATUS.APPROVED]: 'info',
      [ORDER_STATUS.COMPLETED]: 'success',
      [ORDER_STATUS.CANCELLED]: 'error',
    };
    return colorMap[numericStatus] || 'default';
  };

  const filteredOrders =
    statusFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === parseInt(statusFilter));

  // Calculate total count and price for each order
  const ordersWithTotals = filteredOrders.map((order) => {
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
          <MenuItem value={ORDER_STATUS.PENDING}>قيد الانتظار</MenuItem>
          <MenuItem value={ORDER_STATUS.APPROVED}>معتمد</MenuItem>
          <MenuItem value={ORDER_STATUS.COMPLETED}>مكتمل</MenuItem>
          <MenuItem value={ORDER_STATUS.CANCELLED}>ملغي</MenuItem>
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
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الكمية الإجمالية</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>السعر الإجمالي</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التفاصيل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
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
                        {design.mockupImageUrl && design.mockupImageUrl !== 'placeholder_mockup.jpg' && (
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={design.mockupImageUrl}
                              alt={design.designName}
                              style={{ maxWidth: '300px', height: 'auto', borderRadius: '8px' }}
                            />
                          </Box>
                        )}
                        {design.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" && (
                          <Box sx={{ mb: 2 }}>
                            <Button
                              variant="contained"
                              href={design.printFileUrl}
                              target="_blank"
                              download
                            >
                              📄 تحميل ملف PDF
                            </Button>
                          </Box>
                        )}
                        {design.orderDesignItems && design.orderDesignItems.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            {design.orderDesignItems.map(item => `${item.quantity}x`).join(', ')} عنصر
                          </Typography>
                        )}
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
                  {selectedOrder.designer?.id && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (ID: {selectedOrder.designer.id})
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>المعد:</strong> {selectedOrder.preparer?.name || "غير محدد"}
                  {selectedOrder.preparer?.id && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (ID: {selectedOrder.preparer.id})
                    </Typography>
                  )}
                </Typography>
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
    </Paper>
  );
};

export default OrdersList;