import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from "@mui/material";
import {
  Logout,
  DesignServices,
  CheckCircle,
  Pending,
  Schedule,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders } = useApp();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Filter orders that have designs (from designers)
  const designOrders = orders.filter(
    (order) => order.status !== "pending" && order.design
  );
  const pendingReview = designOrders.filter(
    (order) => order.status === "in_design" || order.status === "review"
  );
  const approvedDesigns = designOrders.filter(
    (order) => order.status === "approved" || order.status === "completed"
  );

  const stats = [
    {
      title: "إجمالي التصاميم",
      value: designOrders.length,
      icon: DesignServices,
      color: "#f093fb",
    },
    {
      title: "بانتظار المراجعة",
      value: pendingReview.length,
      icon: Schedule,
      color: "#ed6c02",
    },
    {
      title: "تصاميم معتمدة",
      value: approvedDesigns.length,
      icon: CheckCircle,
      color: "#2e7d32",
    },
    {
      title: "قيد المعالجة",
      value: orders.filter((o) => o.status === "in_design").length,
      icon: Pending,
      color: "#1976d2",
    },
  ];

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: { label: "جديد", color: "default" },
      in_design: { label: "قيد التصميم", color: "info" },
      review: { label: "قيد المراجعة", color: "warning" },
      approved: { label: "معتمد", color: "success" },
      completed: { label: "مكتمل", color: "success" },
      cancelled: { label: "ملغي", color: "error" },
    };
    return statusMap[status] || { label: status, color: "default" };
  };

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

        <Card elevation={3}>
          <CardContent>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 700, marginBottom: 3 }}
            >
              <DesignServices sx={{ verticalAlign: "middle", mr: 1 }} />
              الطلبات الواردة من البائعين
            </Typography>

            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نوع المنتج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التصميم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>تاريخ الإنشاء</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {designOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box sx={{ padding: 4 }}>
                          <Typography variant="h6" color="text.secondary">
                            لا توجد تصاميم واردة حالياً
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    designOrders.map((order) => {
                      const status = getStatusLabel(order.status);
                      return (
                        <TableRow
                          key={order.id}
                          hover
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{order.customerPhone}</TableCell>
                          <TableCell>{order.productType}</TableCell>
                          <TableCell>
                            {order.design ? (
                              <Chip
                                label="متوفر"
                                color="success"
                                size="small"
                                icon={<CheckCircle />}
                              />
                            ) : (
                              <Chip
                                label="غير متوفر"
                                color="default"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString(
                              "ar-SA"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                            >
                              عرض
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default DesignManagerDashboard;

