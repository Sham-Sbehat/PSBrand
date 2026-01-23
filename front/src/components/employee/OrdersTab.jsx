import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
} from "@mui/material";
import {
  Assignment,
  CheckCircle,
  Pending,
} from "@mui/icons-material";
import OrderForm from "./OrderForm";
import calmPalette from "../../theme/calmPalette";
import { USER_ROLES, COLOR_LABELS } from "../../constants";

const OrdersTab = ({
  user,
  orders,
  colors,
  totalOrdersCount,
  handleCardClick,
  fetchDesignerOrdersCount,
  getColorLabel,
  setOpenDepositOrderDialog,
  setOpenOrdersModal,
  setSelectedDate,
  loadOrdersByDate,
}) => {
  const employeeOrders = orders.filter(
    (order) => order.employeeName === user?.name
  );
  const pendingOrders = employeeOrders.filter(
    (order) => order.status === "pending"
  );
  const completedOrders = employeeOrders.filter(
    (order) => order.status === "completed"
  );

  const stats = [
    {
      title: "إجمالي الطلبات",
      value:
        user?.role === USER_ROLES.DESIGNER
          ? totalOrdersCount
          : employeeOrders.length,
      icon: Assignment,
    },
  ];

  return (
    <>
      <Grid container spacing={3} sx={{ marginBottom: 4 }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const cardStyle =
            calmPalette.statCards[index % calmPalette.statCards.length];
          return (
            <Grid item xs={12} sm={4} key={index}>
              <Card
                onClick={() => handleCardClick(index)}
                sx={{
                  position: "relative",
                  background: cardStyle.background,
                  color: cardStyle.highlight,
                  borderRadius: 4,
                  boxShadow: calmPalette.shadow,
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  backdropFilter: "blur(6px)",
                  cursor: (index === 0 && user?.role === USER_ROLES.DESIGNER)
                    ? "pointer"
                    : "default",
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
      <Box
        sx={{
          marginBottom: 4,
          background: calmPalette.surface,
          borderRadius: 4,
          boxShadow: calmPalette.shadow,
          backdropFilter: "blur(8px)",
          padding: 3,
        }}
      >
        <OrderForm
          onSuccess={() => {
            fetchDesignerOrdersCount(); // Refresh orders count after creating new order
          }}
          onOpenDepositOrderDialog={() => setOpenDepositOrderDialog(true)}
        />
      </Box>

      {employeeOrders.length > 0 && (
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
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, marginBottom: 3 }}
          >
            طلباتي السابقة
          </Typography>

          <Grid container spacing={3}>
            {employeeOrders.map((order) => (
              <Grid item xs={12} md={6} key={order.id}>
                <Card
                  sx={{
                    background: calmPalette.surfaceHover,
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 18px 36px rgba(46, 38, 31, 0.18)",
                    },
                  }}
                >
                  <CardContent>
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
                      <strong>الهاتف:</strong> {order.customerPhone}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>المقاس:</strong> {order.size} |{" "}
                      <strong>اللون:</strong>{" "}
                      {getColorLabel({
                        color: order.color,
                        colorId: order.colorId,
                      })}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>السعر:</strong> {order.price} ₪
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", marginTop: 1 }}
                    >
                      {new Date(order.createdAt).toLocaleDateString("ar", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </>
  );
};

export default OrdersTab;

