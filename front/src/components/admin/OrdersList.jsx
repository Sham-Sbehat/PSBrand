import { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Visibility,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";

const OrdersList = () => {
  const { orders, updateOrderStatus } = useApp();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOrder(null);
  };

  const handleStatusChange = (orderId, newStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

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
          <MenuItem value="pending">قيد الانتظار</MenuItem>
          <MenuItem value="completed">مكتملة</MenuItem>
          <MenuItem value="cancelled">ملغية</MenuItem>
        </TextField>
      </Box>

      {filteredOrders.length === 0 ? (
        <Box sx={{ textAlign: "center", padding: 4 }}>
          <Typography variant="h6" color="text.secondary">
            لا توجد طلبات
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredOrders.map((order) => (
            <Grid item xs={12} md={6} lg={4} key={order.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  },
                }}
              >
                {order.imagePreviews && order.imagePreviews.length > 0 && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={order.imagePreviews[0]}
                    alt={order.customerName}
                    sx={{ objectFit: "cover" }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {order.customerName}
                    </Typography>
                    <Chip
                      label={
                        order.status === "pending"
                          ? "قيد الانتظار"
                          : order.status === "completed"
                          ? "مكتمل"
                          : "ملغي"
                      }
                      color={
                        order.status === "pending"
                          ? "warning"
                          : order.status === "completed"
                          ? "success"
                          : "error"
                      }
                      size="small"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    <strong>المقاس:</strong> {order.size} |{" "}
                    <strong>اللون:</strong> {order.color}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    <strong>السعر:</strong> {order.price} ₪
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    <strong>الموظف:</strong> {order.employeeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(order.createdAt).toLocaleDateString("ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      marginTop: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleViewOrder(order)}
                    >
                      عرض
                    </Button>
                    {order.status === "pending" && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() =>
                            handleStatusChange(order.id, "completed")
                          }
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleStatusChange(order.id, "cancelled")
                          }
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
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
                معلومات الزبون
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>الاسم:</strong> {selectedOrder.customerName}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>الهاتف:</strong> {selectedOrder.customerPhone}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>الموقع:</strong> {selectedOrder.customerLocation}
                </Typography>
                {selectedOrder.customerDetails && (
                  <Typography variant="body1" gutterBottom>
                    <strong>تفاصيل إضافية:</strong>{" "}
                    {selectedOrder.customerDetails}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ marginY: 2 }} />

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                تفاصيل الطلب
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>المقاس:</strong> {selectedOrder.size}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>اللون:</strong> {selectedOrder.color}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>السعر:</strong> {selectedOrder.price} ₪
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>التفاصيل:</strong> {selectedOrder.orderDetails}
                </Typography>
              </Box>

              <Divider sx={{ marginY: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات الموظف
              </Typography>
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>اسم الموظف:</strong> {selectedOrder.employeeName}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>التاريخ والوقت:</strong>{" "}
                  {new Date(selectedOrder.createdAt).toLocaleDateString("ar", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
              {selectedOrder.imagePreviews &&
                selectedOrder.imagePreviews.length > 0 && (
                  <>
                    <Divider sx={{ marginY: 2 }} />
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 600 }}
                    >
                      صور التصميم ({selectedOrder.imagePreviews.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedOrder.imagePreviews.map((image, index) => (
                        <Grid item xs={6} sm={4} key={index}>
                          <img
                            src={image}
                            alt={`تصميم ${index + 1}`}
                            style={{
                              width: "100%",
                              height: "150px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OrdersList;
