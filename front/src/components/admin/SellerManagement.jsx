import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  TablePagination,
  IconButton,
} from '@mui/material';
import {
  Store,
  Assignment,
  ArrowBack,
  ArrowForward,
  TouchApp,
  CalendarToday,
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { employeesService, ordersService } from '../../services/api';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants';
import { openWhatsApp } from '../../utils';
import calmPalette from '../../theme/calmPalette';

const SellerManagement = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSummary, setOrdersSummary] = useState({
    totalCount: 0,
    totalAmountWithDelivery: 0,
    totalAmountWithoutDelivery: 0,
    periodDescription: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // التاريخ المحدد بالشكل YYYY-MM-DD (للـ input type="date")
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const response = await employeesService.getUsersByRole(2); // role 2 = Designer/Seller
      setSellers(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error loading sellers:', err);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };


  const loadSellerOrders = async (seller, dateString) => {
    if (!seller) return;
    
    setOrdersLoading(true);
    setPage(0); // Reset pagination
    try {
      // تحويل التاريخ من YYYY-MM-DD إلى ISO string (YYYY-MM-DDTHH:mm:ss)
      const date = dateString ? new Date(dateString) : new Date();
      const isoDateString = date.toISOString();
      const response = await ordersService.getOrdersByDesignerAndMonth(seller.id, isoDateString);
      
      // الـ API يرجع object يحتوي على orders array
      // response structure: { designerId, periodStart, periodEnd, periodDescription, totalCount, orders: [...] }
      const orders = response?.orders || (Array.isArray(response) ? response : []);
      setSellerOrders(Array.isArray(orders) ? orders : []);
      
      // حفظ معلومات الـ summary
      setOrdersSummary({
        totalCount: response?.totalCount || orders.length,
        totalAmountWithDelivery: response?.totalAmountWithDelivery || 0,
        totalAmountWithoutDelivery: response?.totalAmountWithoutDelivery || 0,
        periodDescription: response?.periodDescription || ''
      });
      
      console.log('Loaded seller orders:', {
        totalCount: response?.totalCount || orders.length,
        ordersCount: orders.length,
        periodDescription: response?.periodDescription,
        totalAmountWithDelivery: response?.totalAmountWithDelivery,
        totalAmountWithoutDelivery: response?.totalAmountWithoutDelivery
      });
    } catch (err) {
      console.error('Error loading seller orders:', err);
      setSellerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSelectSeller = async (seller) => {
    setSelectedSeller(seller);
    // تعيين التاريخ الحالي كافتراضي
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    setSelectedDate(todayString);
    await loadSellerOrders(seller, todayString);
  };

  const handleDateChange = async (event) => {
    const newDateString = event.target.value;
    if (!newDateString || !selectedSeller) return;
    
    setSelectedDate(newDateString);
    await loadSellerOrders(selectedSeller, newDateString);
  };

  const handleBack = () => {
    setSelectedSeller(null);
    setSellerOrders([]);
    setPage(0);
    setStatusFilter('all');
    setSearchQuery('');
    setOrdersSummary({
      totalCount: 0,
      totalAmountWithDelivery: 0,
      totalAmountWithoutDelivery: 0,
      periodDescription: ''
    });
    // إعادة تعيين التاريخ للتاريخ الحالي
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return ORDER_STATUS_LABELS[numericStatus] || status;
  };

  const getStatusColor = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return ORDER_STATUS_COLORS[numericStatus] || 'default';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        calendar: 'gregory'
      });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;
    return `${numericValue.toLocaleString('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ₪`;
  };

  // Filter orders by status
  const statusFilteredOrders =
    statusFilter === 'all'
      ? sellerOrders
      : sellerOrders.filter((order) => order.status === parseInt(statusFilter));

  // Filter by client name, phone, or order number search
  const filteredOrders = searchQuery.trim()
    ? statusFilteredOrders.filter((order) => {
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
    : statusFilteredOrders;

  // Calculate totals for each order
  const ordersWithTotals = filteredOrders.map((order) => {
    const totalQuantity = order.orderDesigns?.reduce((sum, design) => {
      const designCount = design.orderDesignItems?.reduce((itemSum, item) => {
        return itemSum + (item.quantity || 0);
      }, 0) || 0;
      return sum + designCount;
    }, 0) || 0;

    return {
      ...order,
      totalQuantity,
      totalAmount: order.totalAmount || 0,
    };
  });

  const paginatedOrders = ordersWithTotals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Show seller orders view
  if (selectedSeller) {
    return (
      <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3 }}>
          <IconButton onClick={handleBack} sx={{ color: 'primary.main' }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              طلبات البائع: {selectedSeller.name}
            </Typography>
            {ordersSummary.periodDescription && (
              <Typography variant="body2" color="text.secondary">
                {ordersSummary.periodDescription}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ marginBottom: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={2}
              sx={{
                padding: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${calmPalette.primary}10 0%, ${calmPalette.primary}20 100%)`,
                border: `1px solid ${calmPalette.primary}30`,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 0.5 }}>
                عدد الطلبات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: calmPalette.primary }}>
                {ordersSummary.totalCount}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={2}
              sx={{
                padding: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, #4caf5010 0%, #4caf5020 100%)`,
                border: `1px solid #4caf5030`,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 0.5 }}>
                المجموع مع التوصيل
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                {formatCurrency(ordersSummary.totalAmountWithDelivery)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={2}
              sx={{
                padding: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, #ff980010 0%, #ff980020 100%)`,
                border: `1px solid #ff980030`,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 0.5 }}>
                المجموع بدون التوصيل
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {formatCurrency(ordersSummary.totalAmountWithoutDelivery)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Date Picker Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            marginBottom: 3,
            padding: 2,
            backgroundColor: 'action.hover',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
          }}
        >
          <CalendarToday sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 'fit-content' }}>
            اختر التاريخ:
          </Typography>
          <TextField
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              style: { textAlign: 'right', fontFamily: 'inherit' },
            }}
            sx={{ 
              minWidth: 200,
              '& input': {
                padding: '10px 14px',
              }
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 'auto', flex: 1, minWidth: 200 }}>
            سيتم عرض الطلبات  بناءً على التاريخ المحدد
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 400 }}
          />
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
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
        </Box>

        {ordersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الكمية الإجمالية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>السعر الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box sx={{ padding: 4 }}>
                          <Typography variant="h6" color="text.secondary">
                            لا توجد طلبات
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                        <TableCell>{order.client?.name || '-'}</TableCell>
                        <TableCell>
                          {order.client?.phone ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{order.client.phone}</Typography>
                              <IconButton
                                size="small"
                                onClick={() => openWhatsApp(order.client.phone)}
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
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{order.totalQuantity}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={ordersWithTotals.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف في الصفحة:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
              }
            />
          </>
        )}
      </Paper>
    );
  }

  // Show sellers list view
  return (
    <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, marginBottom: 1 }}>
          إدارة البائعين ({sellers.length})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          padding: 1.5,
          backgroundColor: 'action.hover',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
        }}>
          <TouchApp sx={{ fontSize: 18, color: 'primary.main' }} />
          اضغط على أي بائع لعرض جميع طلباته
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : sellers.length === 0 ? (
        <Box sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            لا يوجد بائعين
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sellers.map((seller) => (
            <Grid item xs={12} sm={6} md={4} key={seller.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: calmPalette.shadow,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 28px 50px rgba(46, 38, 31, 0.22)',
                    borderColor: calmPalette.primary,
                    '& .view-orders-button': {
                      backgroundColor: calmPalette.primary,
                      color: '#fff',
                      transform: 'scale(1.05)',
                    },
                    '& .arrow-icon': {
                      transform: 'translateX(5px)',
                    },
                  },
                }}
                onClick={() => handleSelectSeller(seller)}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      marginBottom: 2.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${calmPalette.primary}20 0%, ${calmPalette.primary}30 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${calmPalette.primary}40`,
                      }}
                    >
                      <Store sx={{ fontSize: 36, color: calmPalette.primary }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 0.5 }}>
                        {seller.name || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TouchApp sx={{ fontSize: 16 }} />
                        {seller.phone || '-'}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    className="view-orders-button"
                    endIcon={<ArrowForward className="arrow-icon" sx={{ transition: 'transform 0.3s' }} />}
                    sx={{
                      marginTop: 2,
                      padding: '10px 16px',
                      borderRadius: 2,
                      borderColor: calmPalette.primary,
                      color: calmPalette.primary,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: calmPalette.primary,
                        backgroundColor: calmPalette.primary,
                        color: '#fff',
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSeller(seller);
                    }}
                  >
                    <Assignment sx={{ marginLeft: 1, fontSize: 20 }} />
                    عرض طلبات البائع
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default SellerManagement;

