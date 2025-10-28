import { useState, useEffect } from "react";
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
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders } = useApp();
  const [designOrders, setDesignOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch orders by status (status = 1 and 2)
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Fetch orders with status 1 and 2
        const [status1Orders, status2Orders] = await Promise.all([
          ordersService.getOrdersByStatus(1),
          ordersService.getOrdersByStatus(2)
        ]);
        
        // Combine both arrays
        const allOrders = [...(status1Orders || []), ...(status2Orders || [])];
        setDesignOrders(allOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setDesignOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, currentStatus) => {
    try {
      let response;
      
      if (currentStatus === ORDER_STATUS.PENDING_PRINTING) {
        // Move from "بانتظار الطباعة" to "في مرحلة الطباعة"
        response = await orderStatusService.setInPrinting(orderId);
      } else if (currentStatus === ORDER_STATUS.IN_PRINTING) {
        // Move from "في مرحلة الطباعة" to "في مرحلة التحضير"
        response = await orderStatusService.setInPreparation(orderId);
      }
      
      if (response) {
        // Update the order status in the current list instead of re-fetching
        setDesignOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: currentStatus === ORDER_STATUS.PENDING_PRINTING ? ORDER_STATUS.IN_PRINTING : ORDER_STATUS.IN_PREPARATION }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const pendingReview = designOrders.filter(
    (order) => order.status === 1
  );
  const approvedDesigns = designOrders.filter(
    (order) => order.status === 2
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
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return {
      label: ORDER_STATUS_LABELS[numericStatus] || "غير معروف",
      color: ORDER_STATUS_COLORS[numericStatus] || "default"
    };
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
                    <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>العدد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نوع المنتج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ملف PDF</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Box sx={{ padding: 4 }}>
                          <Typography variant="h6" color="text.secondary">
                            جاري التحميل...
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : designOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Box sx={{ padding: 4 }}>
                          <Typography variant="h6" color="text.secondary">
                            لا توجد طلبات حالياً
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    designOrders.flatMap((order) => {
                      const status = getStatusLabel(order.status);
                      const designs = order.orderDesigns || [];
                      
                      // If no designs, show at least one row with order info
                      if (designs.length === 0) {
                        return (
                          <TableRow
                            key={`order-${order.id}`}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                            <TableCell>{order.client?.name || "-"}</TableCell>
                            <TableCell>{order.client?.phone || "-"}</TableCell>
                            <TableCell>
                              {order.designer?.name || "غير محدد"}
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                ID: {order.designer?.id || "-"}
                              </Typography>
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
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleStatusUpdate(order.id, order.status)}
                                disabled={order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING}
                              >
                                {order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                 order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      const rowCount = designs.length;
                      
                      // For each design in the order, create a separate row
                      return designs.map((design, designIndex) => {
                        const isFirstRow = designIndex === 0;
                        
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
                            key={`order-${order.id}-design-${design.id || designIndex}`}
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
                                <TableCell rowSpan={rowCount}>
                                  {order.client?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.client?.phone || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowCount}>
                                  {order.designer?.name || "غير محدد"}
                                  <br />
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {order.designer?.id || "-"}
                                  </Typography>
                                </TableCell>
                              </>
                            )}
                            <TableCell>{designCount}</TableCell>
                            <TableCell>{productType}</TableCell>
                            <TableCell>
                              {design?.mockupImageUrl && design.mockupImageUrl !== 'placeholder_mockup.jpg' ? (
                                <Box sx={{ width: 80, height: 80, position: 'relative' }}>
                                  <img 
                                    src={design.mockupImageUrl} 
                                    alt={design.designName}
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                    style={{ 
                                      width: "100%", 
                                      height: "100%", 
                                      objectFit: "cover",
                                      borderRadius: "4px"
                                    }}
                                  />
                                  <Box 
                                    sx={{ 
                                      display: 'none',
                                      width: "100%", 
                                      height: "100%", 
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      bgcolor: '#f0f0f0',
                                      borderRadius: "4px",
                                      fontSize: '0.75rem',
                                      color: '#666'
                                    }}
                                  >
                                    صورة غير متوفرة
                                  </Box>
                                </Box>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {design?.printFileUrl && design.printFileUrl !== "placeholder_print.pdf" ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  href={design.printFileUrl}
                                  target="_blank"
                                  download
                                >
                                  PDF
                                </Button>
                              ) : "-"}
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
                                <TableCell rowSpan={rowCount}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStatusUpdate(order.id, order.status)}
                                    disabled={order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING}
                                  >
                                    {order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                     order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"}
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      });
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

