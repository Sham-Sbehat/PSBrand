import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import {
  Logout,
  Assignment,
  People,
  CheckCircle,
  Pending,
  Store,
  AccountBalance,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import OrdersList from "../components/admin/OrdersList";
import EmployeeManagement from "../components/admin/EmployeeManagement";
import SellerManagement from "../components/admin/SellerManagement";
import FinancialManagement from "../components/admin/FinancialManagement";
import { ORDER_STATUS } from "../constants";
import calmPalette from "../theme/calmPalette";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, employees } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [allOrders, setAllOrders] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        const response = await ordersService.getAllOrders();
        if (isMounted) {
          setAllOrders(response || []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        if (isMounted) {
          setAllOrders([]);
        }
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
        console.error("Failed to subscribe to order updates:", err);
      }
    })();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const stats = [
    {
      title: "إجمالي الطلبات",
      value: allOrders.length,
      icon: Assignment,
    },
    {
      title: "بانتظار الطباعة",
      value: allOrders.filter((order) => order.status === ORDER_STATUS.PENDING_PRINTING).length,
      icon: Pending,
    },
    {
      title: "مكتملة",
      value: allOrders.filter((order) => order.status === ORDER_STATUS.COMPLETED).length,
      icon: CheckCircle,
    },
    {
      title: "عدد الموظفين",
      value: employees.length,
      icon: People,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: calmPalette.background,
        paddingBottom: 6,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: calmPalette.appBar,
          boxShadow: "0 12px 30px rgba(34, 26, 21, 0.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            PSBrand - لوحة الأدمن
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                backdropFilter: "blur(6px)",
              }}
            >
              {user?.name?.charAt(0) || "أ"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500, color: "#f6f1eb" }}>
              {user?.name || "الأدمن"}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                color: "#f6f1eb",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 2,
              }}
            >
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ paddingY: 5 }}>
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle = calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: 4,
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
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

        <Box sx={{ marginBottom: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              backgroundColor: calmPalette.surface,
              borderRadius: 3,
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
            TabIndicatorProps={{
              sx: {
                height: "100%",
                borderRadius: 3,
                background:
                  "linear-gradient(135deg, rgba(96, 78, 62, 0.85) 0%, rgba(75, 61, 49, 0.9) 100%)",
                zIndex: -1,
              },
            }}
          >
            <Tab
              label="الطلبات"
              icon={<Assignment />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
            <Tab
              label="إدارة الموظفين"
              icon={<People />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
            <Tab
              label="إدارة البائعين"
              icon={<Store />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
            <Tab
              label="الإدارة المالية"
              icon={<AccountBalance />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: "1rem",
                color: calmPalette.textMuted,
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
              }}
            />
          </Tabs>
        </Box>

        <Box>
          {currentTab === 0 && <OrdersList />}
          {currentTab === 1 && <EmployeeManagement />}
          {currentTab === 2 && <SellerManagement />}
          {currentTab === 3 && <FinancialManagement />}
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
