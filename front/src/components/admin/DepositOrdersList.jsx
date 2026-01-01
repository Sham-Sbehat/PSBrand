import { useState, useEffect, useCallback, useMemo } from "react";
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
  TablePagination,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Visibility,
  Delete,
  LocalShipping,
  Edit,
  Search,
  CheckCircle,
  ContactPhone,
  CalendarToday,
  Clear,
  Person,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import { depositOrdersService, shipmentsService } from "../../services/api";
import GlassDialog from "../common/GlassDialog";
import DepositOrderForm from "../employee/DepositOrderForm";

const DepositOrdersList = () => {
  const { user, employees, loadEmployees } = useApp();
  const [depositOrders, setDepositOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openShippingDialog, setOpenShippingDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [orderToShip, setOrderToShip] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingNotes, setShippingNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterDesignerId, setFilterDesignerId] = useState("");
  const [summaryData, setSummaryData] = useState({
    totalCount: 0,
    totalSum: 0,
    totalSumWithoutDelivery: 0,
  });

  // Fetch deposit orders
  const fetchDepositOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Build params object for API
      const params = {};
      if (filterDate) {
        // Convert date string (YYYY-MM-DD) to ISO date-time string
        // Create date in UTC at start of day (00:00:00 UTC)
        const [year, month, day] = filterDate.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        params.date = dateObj.toISOString();
      }
      if (filterDesignerId) {
        params.designerId = parseInt(filterDesignerId);
      }
      
      const data = await depositOrdersService.getAllDepositOrders(params);
      const ordersArray = Array.isArray(data) ? data : (data?.data || []);
      setDepositOrders(ordersArray);
      
      // Extract summary data from response
      if (data && !Array.isArray(data)) {
        setSummaryData({
          totalCount: data.totalCount || 0,
          totalSum: data.totalSum || 0,
          totalSumWithoutDelivery: data.totalSumWithoutDelivery || 0,
        });
      } else {
        // Calculate from orders if summary not available
        const totalSum = ordersArray.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const totalSumWithoutDelivery = ordersArray.reduce((sum, order) => sum + ((order.totalAmount || 0) - (order.deliveryFee || 0)), 0);
        setSummaryData({
          totalCount: ordersArray.length,
          totalSum: totalSum,
          totalSumWithoutDelivery: totalSumWithoutDelivery,
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء جلب طلبات العربون",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterDesignerId]);

  useEffect(() => {
    fetchDepositOrders();
    loadCities();
    // Load employees if not already loaded
    if (employees.length === 0 && loadEmployees) {
      loadEmployees();
    }
  }, [fetchDepositOrders, loadEmployees, employees.length]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterDate, filterDesignerId]);


  const loadCities = async () => {
    try {
      const citiesData = await shipmentsService.getCities();
      const citiesArray = Array.isArray(citiesData) ? citiesData : [];
      setCities(citiesArray);
    } catch (error) {
      setCities([]);
    }
  };

  const loadAreas = async (cityId) => {
    try {
      const areasData = await shipmentsService.getAreas(cityId);
      const areasArray = Array.isArray(areasData) ? areasData : [];
      setAreas(areasArray);
    } catch (error) {
      setAreas([]);
    }
  };


  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleEditOrder = (order) => {
    setOrderToEdit(order);
    setOpenEditDialog(true);
  };

  const handleDeleteOrder = (order) => {
    setOrderToDelete(order);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setDeleteLoading(true);
    try {
      await depositOrdersService.deleteDepositOrder(orderToDelete.id);
      setSnackbar({
        open: true,
        message: "تم حذف طلب العربون بنجاح",
        severity: "success",
      });
      fetchDepositOrders();
      setOpenDeleteDialog(false);
      setOrderToDelete(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء حذف طلب العربون",
        severity: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendToDelivery = (order) => {
    setOrderToShip(order);
    setShippingNotes("");
    setOpenShippingDialog(true);
  };

  const confirmShipping = async () => {
    if (!orderToShip) return;
    setShippingLoading(true);
    try {
      await depositOrdersService.sendToDeliveryCompany(orderToShip.id, shippingNotes);
      setSnackbar({
        open: true,
        message: "تم إرسال طلب العربون لشركة التوصيل بنجاح",
        severity: "success",
      });
      fetchDepositOrders();
      setOpenShippingDialog(false);
      setOrderToShip(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء إرسال طلب العربون",
        severity: "error",
      });
    } finally {
      setShippingLoading(false);
    }
  };

  const handleToggleContacted = async (order) => {
    try {
      await depositOrdersService.updateContactedStatus(
        order.id,
        !order.isContactedWithClient
      );
      setSnackbar({
        open: true,
        message: "تم تحديث حالة التواصل بنجاح",
        severity: "success",
      });
      fetchDepositOrders();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء تحديث حالة التواصل",
        severity: "error",
      });
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

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "-";
    try {
      const date = new Date(dateValue);
      // Use UTC timezone to display time as stored, without local timezone conversion
      return date.toLocaleString("ar-SA", {
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
      return "-";
    }
  };

  const getCityName = (cityId) => {
    if (!cityId) return "-";
    const city = cities.find((c) => c.id === cityId || c.Id === cityId);
    return city?.name || city?.Name || "-";
  };

  const getAreaName = (areaId, cityId) => {
    if (!areaId || !cityId) return "-";
    if (areas.length === 0 && cityId) {
      loadAreas(cityId);
    }
    const area = areas.find((a) => a.id === areaId || a.Id === areaId || a.areaId === areaId);
    return area?.name || area?.Name || area?.areaName || "-";
  };

  const getSellerName = (designerId) => {
    if (!designerId) return "-";
    const seller = employees.find((emp) => emp.id === designerId || emp.Id === designerId);
    return seller?.name || seller?.Name || "-";
  };

  // Filter and paginate orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return depositOrders;
    const query = searchQuery.toLowerCase();
    return depositOrders.filter(
      (order) =>
        order.orderNumber?.toLowerCase().includes(query) ||
        order.client?.name?.toLowerCase().includes(query) ||
        order.client?.phone?.includes(query)
    );
  }, [depositOrders, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, page, rowsPerPage]);

  const InfoItem = ({ label, value }) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ typography: "body1", fontWeight: 600, color: "text.primary" }}>
        {value ?? "-"}
      </Box>
    </Box>
  );

  const handleResetFilters = () => {
    setFilterDate("");
    setFilterDesignerId("");
    setPage(0);
  };

  // Get sellers (designers) from employees
  const sellers = useMemo(() => {
    return employees.filter(emp => 
      emp.role === 'designer' || 
      emp.role === 'بائع' ||
      (emp.id && emp.name)
    );
  }, [employees]);

  return (
    <Box>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            طلبات العربون
          </Typography>
          <TextField
            size="small"
            placeholder="ابحث عن طلب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {/* Filters Section */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            background: "linear-gradient(135deg, rgba(107, 142, 127, 0.05) 0%, rgba(139, 127, 168, 0.05) 100%)",
            border: "1px solid rgba(107, 142, 127, 0.15)",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#5A7A6B", minWidth: "fit-content" }}>
              الفلترة:
            </Typography>
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>البائع</InputLabel>
              <Select
                value={filterDesignerId}
                label="البائع"
                onChange={(e) => setFilterDesignerId(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <Person sx={{ fontSize: 18, color: "text.secondary", ml: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>جميع البائعين</em>
                </MenuItem>
                {sellers.map((seller) => (
                  <MenuItem key={seller.id || seller.Id} value={seller.id || seller.Id}>
                    {seller.name || seller.Name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="date"
              size="small"
              label="التاريخ"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ fontSize: 18, color: "text.secondary", ml: 1 }} />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                style: { cursor: 'pointer' },
                onClick: (e) => {
                  // Ensure the date picker opens when clicking on the input
                  if (e.target.showPicker) {
                    e.target.showPicker();
                  }
                }
              }}
              onClick={(e) => {
                // Open date picker when clicking anywhere on the TextField
                const input = e.currentTarget.querySelector('input[type="date"]');
                if (input && input.showPicker) {
                  e.preventDefault();
                  input.showPicker();
                } else {
                  // Fallback: focus the input which will show native date picker
                  input?.focus();
                  input?.click();
                }
              }}
              sx={{ 
                minWidth: 200,
                cursor: 'pointer',
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  '&:hover': {
                    cursor: 'pointer',
                  },
                  '& input': {
                    cursor: 'pointer',
                  },
                },
              }}
            />

            {(filterDate || filterDesignerId) && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleResetFilters}
                sx={{
                  color: "#5A7A6B",
                  borderColor: "#5A7A6B",
                  "&:hover": {
                    borderColor: "#4A6A5B",
                    backgroundColor: "rgba(90, 122, 107, 0.08)",
                  },
                }}
              >
                إعادة تعيين
              </Button>
            )}
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(107, 142, 127, 0.1) 0%, rgba(127, 179, 163, 0.08) 100%)",
                border: "1px solid rgba(107, 142, 127, 0.2)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#5A7A6B", fontWeight: 600, display: "block", mb: 1 }}>
                عدد الطلبات
              </Typography>
              <Typography variant="h5" sx={{ color: "#5A7A6B", fontWeight: 700 }}>
                {summaryData.totalCount}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(139, 127, 168, 0.1) 0%, rgba(166, 124, 142, 0.08) 100%)",
                border: "1px solid rgba(139, 127, 168, 0.2)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#6B5F7A", fontWeight: 600, display: "block", mb: 1 }}>
                إجمالي المبلغ (مع التوصيل)
              </Typography>
              <Typography variant="h5" sx={{ color: "#6B5F7A", fontWeight: 700 }}>
                {formatCurrency(summaryData.totalSum)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(201, 154, 154, 0.08) 100%)",
                border: "1px solid rgba(212, 165, 116, 0.2)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#B8955F", fontWeight: 600, display: "block", mb: 1 }}>
                إجمالي المبلغ (بدون التوصيل)
              </Typography>
              <Typography variant="h5" sx={{ color: "#B8955F", fontWeight: 700 }}>
                {formatCurrency(summaryData.totalSumWithoutDelivery)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الطلب</TableCell>
                    <TableCell>العميل</TableCell>
                    <TableCell>الهاتف</TableCell>
                    <TableCell>البائع</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>رسوم التوصيل</TableCell>
                    <TableCell>المدينة</TableCell>
                    <TableCell>تم الإرسال</TableCell>
                    <TableCell>حالة شركة التوصيل</TableCell>
                    <TableCell>تاريخ الإنشاء</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {searchQuery ? "لا توجد نتائج" : "لا توجد طلبات عربون"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {order.isContactedWithClient ? (
                              <Tooltip title="تم التواصل مع الزبون (انقر للتغيير)">
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleContacted(order)}
                                  sx={{
                                    color: '#4caf50',
                                    padding: 0.25,
                                    minWidth: 'auto',
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    },
                                  }}
                                >
                                  <CheckCircle sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="لم يتم التواصل مع الزبون بعد (انقر للتغيير)">
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleContacted(order)}
                                  sx={{
                                    color: '#9e9e9e',
                                    padding: 0.25,
                                    minWidth: 'auto',
                                    '&:hover': {
                                      backgroundColor: 'rgba(158, 158, 158, 0.1)',
                                    },
                                  }}
                                >
                                  <ContactPhone sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {order.orderNumber || `#${order.id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{order.client?.name || "-"}</TableCell>
                        <TableCell>{order.client?.phone || "-"}</TableCell>
                        <TableCell>{getSellerName(order.designerId)}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>{formatCurrency(order.deliveryFee)}</TableCell>
                        <TableCell>
                          {getCityName(order.clientRoadFnCityId) !== "-" 
                            ? getCityName(order.clientRoadFnCityId)
                            : order.province || order.district || "-"}
                        </TableCell>
                        <TableCell>
                          {order.isSentToDeliveryCompany ? (
                            <Chip label="تم الإرسال" color="success" size="small" />
                          ) : (
                            <Chip label="لم يتم الإرسال" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {order.isSentToDeliveryCompany && order.shipmentStatus ? (
                            <Chip
                              label={order.shipmentStatus}
                              color="info"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                            <Tooltip title="عرض التفاصيل">
                              <IconButton
                                size="small"
                                onClick={() => handleViewOrder(order)}
                                color="primary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                onClick={() => handleEditOrder(order)}
                                color="warning"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            {!order.isSentToDeliveryCompany && (
                              <Tooltip title="إرسال لشركة التوصيل">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSendToDelivery(order)}
                                  color="success"
                                >
                                  <LocalShipping />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteOrder(order)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredOrders.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="عدد الصفوف:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
              }
            />
          </>
        )}
      </Paper>

      {/* View Order Dialog */}
      <GlassDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedOrder(null);
        }}
        maxWidth="md"
        title={`طلب عربون #${selectedOrder?.orderNumber || selectedOrder?.id}`}
      >
        {selectedOrder && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <InfoItem label="العميل" value={selectedOrder.client?.name} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem label="رقم الهاتف" value={selectedOrder.client?.phone} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem label="رقم الهاتف الثاني" value={selectedOrder.clientPhone2 || "-"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem label="البائع" value={getSellerName(selectedOrder.designerId)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem label="مبلغ العربون" value={formatCurrency(selectedOrder.totalAmount)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem label="رسوم التوصيل" value={formatCurrency(selectedOrder.deliveryFee)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem
                  label="المجموع"
                  value={formatCurrency(
                    (selectedOrder.totalAmount || 0) + (selectedOrder.deliveryFee || 0)
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <InfoItem label="البلد" value={selectedOrder.country} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <InfoItem label="المحافظة" value={selectedOrder.province} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <InfoItem label="المنطقة" value={selectedOrder.district} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <InfoItem
                  label="المدينة (شركة التوصيل)"
                  value={getCityName(selectedOrder.clientRoadFnCityId)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <InfoItem
                  label="المنطقة (شركة التوصيل)"
                  value={getAreaName(
                    selectedOrder.clientRoadFnAreaId,
                    selectedOrder.clientRoadFnCityId
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <InfoItem label="العنوان الكامل" value={selectedOrder.clientAddress} />
              </Grid>
              {selectedOrder.notes && (
                <Grid item xs={12}>
                  <InfoItem label="ملاحظات" value={selectedOrder.notes} />
                </Grid>
              )}
              {selectedOrder.shippingNotes && (
                <Grid item xs={12}>
                  <InfoItem label="ملاحظات شركة التوصيل" value={selectedOrder.shippingNotes} />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <InfoItem label="تاريخ الإنشاء" value={formatDateTime(selectedOrder.createdAt)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoItem
                  label="تم التواصل"
                  value={
                    <Chip
                      label={selectedOrder.isContactedWithClient ? "نعم" : "لا"}
                      color={selectedOrder.isContactedWithClient ? "success" : "default"}
                      size="small"
                    />
                  }
                />
              </Grid>
              {selectedOrder.isSentToDeliveryCompany && selectedOrder.shipmentStatus && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      حالة التوصيل من شركة التوصيل
                    </Typography>
                    <Typography variant="body2">
                      {selectedOrder.shipmentStatus}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </GlassDialog>

      {/* Edit Dialog */}
      <GlassDialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setOrderToEdit(null);
        }}
        maxWidth="md"
        title="تعديل طلب العربون"
      >
        {orderToEdit && (
          <DepositOrderForm
            initialDepositOrder={orderToEdit}
            onSuccess={() => {
              setOpenEditDialog(false);
              setOrderToEdit(null);
              fetchDepositOrders();
            }}
            onCancel={() => {
              setOpenEditDialog(false);
              setOrderToEdit(null);
            }}
          />
        )}
      </GlassDialog>

      {/* Delete Dialog */}
      <GlassDialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setOrderToDelete(null);
        }}
        maxWidth="sm"
        title="تأكيد الحذف"
        actions={
          <>
            <Button
              onClick={() => {
                setOpenDeleteDialog(false);
                setOrderToDelete(null);
              }}
              disabled={deleteLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmDelete}
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
          هل أنت متأكد من حذف طلب العربون{" "}
          <strong>{orderToDelete?.orderNumber || `#${orderToDelete?.id}`}</strong>؟
        </Typography>
      </GlassDialog>

      {/* Shipping Dialog */}
      <GlassDialog
        open={openShippingDialog}
        onClose={() => {
          setOpenShippingDialog(false);
          setOrderToShip(null);
          setShippingNotes("");
        }}
        maxWidth="sm"
        title="إرسال طلب العربون لشركة التوصيل"
        actions={
          <>
            <Button
              onClick={() => {
                setOpenShippingDialog(false);
                setOrderToShip(null);
                setShippingNotes("");
              }}
              disabled={shippingLoading}
              variant="outlined"
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmShipping}
              color="success"
              variant="contained"
              disabled={shippingLoading}
              startIcon={shippingLoading ? <CircularProgress size={20} /> : <LocalShipping />}
            >
              {shippingLoading ? "جاري الإرسال..." : "إرسال"}
            </Button>
          </>
        }
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            إرسال طلب العربون{" "}
            <strong>{orderToShip?.orderNumber || `#${orderToShip?.id}`}</strong> إلى شركة التوصيل
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DepositOrdersList;

