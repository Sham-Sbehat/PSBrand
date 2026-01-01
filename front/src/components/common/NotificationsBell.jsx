import { useState, useEffect, useRef } from "react";
import { IconButton, Badge, Popover, Box, Typography, Divider, Button, CircularProgress, Chip, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { Notifications as NotificationsIcon, Close, Assignment, Person, Phone, LocationOn, Receipt, CalendarToday, LocalShipping, CameraAlt } from "@mui/icons-material";
import { notificationsService } from "../../services/api";
import NotificationsPanel from "./NotificationsPanel";
import GlassDialog from "./GlassDialog";
import calmPalette from "../../theme/calmPalette";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../constants";

const NotificationsBell = ({ onNewNotification }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orderDetailsDialogOpen, setOrderDetailsDialogOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [returnedShipmentDetails, setReturnedShipmentDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const notificationsRef = useRef([]);
  const unreadCountRef = useRef(0);

  const open = Boolean(anchorEl);

  // Load notifications
  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationsService.getNotifications(),
        notificationsService.getUnreadCount(),
      ]);

      const notificationsList = notificationsResponse?.notifications || [];
      const count = unreadResponse?.unreadCount || 0;

      notificationsRef.current = notificationsList;
      unreadCountRef.current = count;
      setNotifications(notificationsList);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle new notification from SignalR
  useEffect(() => {
    if (onNewNotification) {
      // Reload notifications when new one arrives
      loadNotifications(false);
    }
  }, [onNewNotification]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    loadNotifications(false); // Refresh when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      await loadNotifications(false);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications(false);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      await loadNotifications(false);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleViewOrderDetails = async (relatedEntityId) => {
    if (!relatedEntityId) return;
    
    setLoadingOrderDetails(true);
    setOrderDetailsDialogOpen(true);
    setOrderDetails(null);
    setShipmentDetails(null);
    setReturnedShipmentDetails(null);
    
    try {
      const response = await notificationsService.getOrderDetails(relatedEntityId);
      // Handle both response structures: direct order or { order, shipment, returnedShipment }
      const orderData = response?.order || response;
      const shipmentData = response?.shipment || null;
      const returnedShipmentData = response?.returnedShipment || response?.returnedShipments?.[0] || null;
      setOrderDetails(orderData);
      setShipmentDetails(shipmentData);
      setReturnedShipmentDetails(returnedShipmentData);
    } catch (error) {
      console.error("Error fetching order details:", error);
      setOrderDetails(null);
      setShipmentDetails(null);
      setReturnedShipmentDetails(null);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleCloseOrderDetailsDialog = () => {
    setOrderDetailsDialogOpen(false);
    setOrderDetails(null);
    setShipmentDetails(null);
    setReturnedShipmentDetails(null);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
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
      return dateString;
    }
  };

  const getColorLabel = (color) => {
    if (color === null || color === undefined) return "-";
    const numeric = typeof color === "number" ? color : parseInt(color, 10);
    // Return color as-is if API colors not loaded yet
    return color || "-";
  };

  const getSizeLabel = (size) => {
    if (size === null || size === undefined) return "-";
    // Return size as-is if API sizes not loaded yet
    return size || "-";
  };

  const getFabricLabel = (fabricType) => {
    if (fabricType === null || fabricType === undefined) return "-";
    // Return fabricType as-is if API fabricTypes not loaded yet
    return fabricType || "-";
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: "white",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: "90vw",
            maxHeight: "80vh",
            mt: 1,
            borderRadius: 3,
            boxShadow: calmPalette.shadow,
            backgroundColor: calmPalette.surface,
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              الإشعارات
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={handleMarkAllAsRead}
                  sx={{
                    fontSize: "0.75rem",
                    textTransform: "none",
                    color: calmPalette.textPrimary,
                  }}
                >
                  تحديد الكل كمقروء
                </Button>
              )}
              <IconButton size="small" onClick={handleClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <NotificationsPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onViewOrderDetails={handleViewOrderDetails}
              refreshing={refreshing}
            />
          )}
        </Box>
      </Popover>

      {/* Order Details Dialog */}
      <GlassDialog
        open={orderDetailsDialogOpen}
        onClose={handleCloseOrderDetailsDialog}
        title="تفاصيل الطلب"
        icon={<Assignment />}
        maxWidth="md"
      >
        {loadingOrderDetails ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : orderDetails ? (
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 3,
                mb: 3,
              }}
            >
              {/* Order Header Card */}
              <Card
                sx={{
                  background: "linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)",
                  border: "1px solid rgba(25, 118, 210, 0.2)",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                  <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Receipt sx={{ color: "#1976d2", fontSize: 22 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                        معلومات الطلب
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Receipt sx={{ color: "#1976d2", fontSize: 18 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                            رقم الطلب
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                          {orderDetails.orderNumber || "-"}
                        </Typography>
                      </Box>

                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <CalendarToday sx={{ color: "#1976d2", fontSize: 18 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                            تاريخ الطلب
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {formatDateTime(orderDetails.createdAt)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                          الحالة
                        </Typography>
                        <Chip
                          label={ORDER_STATUS_LABELS[orderDetails.status] || "غير معروف"}
                          color={ORDER_STATUS_COLORS[orderDetails.status] || "default"}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                          يحتاج تصوير
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {orderDetails.needsPhotography ? (
                            <>
                              <CameraAlt sx={{ color: "primary.main", fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                نعم
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                              لا
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

              {/* Client Information Card */}
              <Card
                sx={{
                  background: "linear-gradient(135deg, rgba(94, 78, 62, 0.05) 0%, rgba(94, 78, 62, 0.02) 100%)",
                  border: "1px solid rgba(94, 78, 62, 0.15)",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                  <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Person sx={{ color: calmPalette.textPrimary, fontSize: 22 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                        معلومات العميل
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                          الاسم
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                          {orderDetails.client?.name || "-"}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                          الهاتف
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Phone sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                            {orderDetails.client?.phone || "-"}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                          العنوان
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 16, color: "text.secondary", mt: 0.3 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                              {[
                                orderDetails.client?.district || orderDetails.district,
                                orderDetails.client?.province || orderDetails.province,
                                orderDetails.client?.country || orderDetails.country
                              ].filter(Boolean).join("، ") || "-"}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

              {/* Financial Summary Card */}
              <Card
                sx={{
                  background: "linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.02) 100%)",
                  border: "1px solid rgba(46, 125, 50, 0.15)",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                  <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Receipt sx={{ color: "#2e7d32", fontSize: 22 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                        الملخص المالي
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                          المجموع الفرعي:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                          {formatCurrency(orderDetails.subTotal)}
                        </Typography>
                      </Box>

                      {orderDetails.discountAmount > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                            الخصم ({orderDetails.discountPercentage || 0}%):
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: "#d32f2f", fontSize: "1rem" }}>
                            -{formatCurrency(orderDetails.discountAmount)}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                          رسوم التوصيل:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                          {formatCurrency(orderDetails.deliveryFee)}
                        </Typography>
                      </Box>

                      {orderDetails.additionalPrice > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                            سعر إضافي:
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                            {formatCurrency(orderDetails.additionalPrice)}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 1 }} />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          py: 1,
                          px: 1.5,
                          borderRadius: 1,
                          background: "linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)",
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                          الإجمالي:
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "1.25rem" }}>
                          {formatCurrency(orderDetails.totalAmount)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
            </Box>

            {/* Order Designs Section */}
            {orderDetails.orderDesigns && orderDetails.orderDesigns.length > 0 && (
              <Box sx={{ mb: 3 }}>
                  <Card
                    sx={{
                      background: "rgba(94, 78, 62, 0.03)",
                      border: "1px solid rgba(94, 78, 62, 0.1)",
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: calmPalette.textPrimary }}>
                        التصاميم والطلبات
                      </Typography>
                      {orderDetails.orderDesigns.map((design, designIndex) => (
                        <Box key={design.id} sx={{ mb: designIndex < orderDetails.orderDesigns.length - 1 ? 3 : 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}>
                            {design.designName || `تصميم ${designIndex + 1}`}
                          </Typography>
                          {design.orderDesignItems && design.orderDesignItems.length > 0 && (
                            <TableContainer component={Paper} sx={{ boxShadow: "none", background: "transparent" }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>المقاس</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>اللون</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>نوع القماش</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>الكمية</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>سعر الوحدة</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>الإجمالي</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {design.orderDesignItems.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{getSizeLabel(item.size)}</TableCell>
                                      <TableCell>{getColorLabel(item.color)}</TableCell>
                                      <TableCell>{getFabricLabel(item.fabricType)}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(item.totalPrice)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                          {design.totalPrice && (
                            <Box sx={{ mt: 1, textAlign: "left" }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                                إجمالي التصميم: {formatCurrency(design.totalPrice)}
                              </Typography>
                            </Box>
                          )}
                          {designIndex < orderDetails.orderDesigns.length - 1 && <Divider sx={{ mt: 2 }} />}
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
              </Box>
            )}

            {/* Shipment Information */}
            {shipmentDetails && (
              <Box sx={{ mb: 3 }}>
                  <Card
                    sx={{
                      background: "linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(156, 39, 176, 0.02) 100%)",
                      border: "1px solid rgba(156, 39, 176, 0.15)",
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <LocalShipping sx={{ color: "#9c27b0", fontSize: 22 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                          معلومات الشحنة
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                              رقم التتبع
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                              {shipmentDetails.trackingNumber || "-"}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                              الحالة
                            </Typography>
                            <Chip
                              label={shipmentDetails.status || "-"}
                              color="secondary"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </Grid>

                        {shipmentDetails.roadFnShipmentId && (
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                رقم الشحنة (RoadFn)
                              </Typography>
                              <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
                                {shipmentDetails.roadFnShipmentId}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {shipmentDetails.updatedAt && (
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                آخر تحديث
                              </Typography>
                              <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
                                {formatDateTime(shipmentDetails.updatedAt)}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
              </Box>
            )}

            {/* Returned Shipment Information */}
            {returnedShipmentDetails && (
              <Box sx={{ mb: 3 }}>
                  <Card
                    sx={{
                      background: "linear-gradient(135deg, rgba(211, 47, 47, 0.05) 0%, rgba(211, 47, 47, 0.02) 100%)",
                      border: "1px solid rgba(211, 47, 47, 0.15)",
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <LocalShipping sx={{ color: "#d32f2f", fontSize: 22 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                          معلومات الطرد المرتجع
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                              رقم التتبع
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                              {returnedShipmentDetails.trackingNumber || "-"}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                              الحالة
                            </Typography>
                            <Chip
                              label={returnedShipmentDetails.status || "مرتجع"}
                              color="error"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </Grid>

                        {returnedShipmentDetails.roadFnShipmentId && (
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                رقم الشحنة (RoadFn)
                              </Typography>
                              <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
                                {returnedShipmentDetails.roadFnShipmentId}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {returnedShipmentDetails.updatedAt && (
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                آخر تحديث
                              </Typography>
                              <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
                                {formatDateTime(returnedShipmentDetails.updatedAt)}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {returnedShipmentDetails.returnDate && (
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                تاريخ الإرجاع
                              </Typography>
                              <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
                                {formatDateTime(returnedShipmentDetails.returnDate)}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {returnedShipmentDetails.returnReason && (
                          <Grid item xs={12}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                                سبب الإرجاع
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: "0.9rem", p: 1, borderRadius: 1, background: "rgba(211, 47, 47, 0.05)" }}>
                                {returnedShipmentDetails.returnReason}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
              </Box>
            )}

            {/* Notes Section */}
            {(orderDetails.notes || orderDetails.discountNotes) && (
              <Box sx={{ mb: 3 }}>
                  <Card
                    sx={{
                      background: "rgba(94, 78, 62, 0.03)",
                      border: "1px solid rgba(94, 78, 62, 0.1)",
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      {orderDetails.notes && (
                        <Box sx={{ mb: orderDetails.discountNotes ? 2 : 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: calmPalette.textPrimary }}>
                            ملاحظات الطلب
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.7,
                              color: calmPalette.textPrimary,
                              fontSize: "0.9rem",
                              p: 1.5,
                              borderRadius: 1,
                              background: "rgba(94, 78, 62, 0.05)",
                            }}
                          >
                            {orderDetails.notes}
                          </Typography>
                        </Box>
                      )}

                      {orderDetails.discountNotes && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: calmPalette.textPrimary }}>
                            ملاحظات الخصم
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.7,
                              color: calmPalette.textPrimary,
                              fontSize: "0.9rem",
                              p: 1.5,
                              borderRadius: 1,
                              background: "rgba(94, 78, 62, 0.05)",
                            }}
                          >
                            {orderDetails.discountNotes}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              لا يمكن جلب تفاصيل الطلب
            </Typography>
          </Box>
        )}
      </GlassDialog>
    </>
  );
};

export default NotificationsBell;


