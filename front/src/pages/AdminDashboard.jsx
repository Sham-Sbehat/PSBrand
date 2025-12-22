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
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  Paper,
  Divider,
} from "@mui/material";
import {
  Logout,
  Assignment,
  People,
  CheckCircle,
  Pending,
  Store,
  AccountBalance,
  CalendarToday,
  Clear,
  Settings,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import OrdersList from "../components/admin/OrdersList";
import EmployeeManagement from "../components/admin/EmployeeManagement";
import SellerManagement from "../components/admin/SellerManagement";
import FinancialManagement from "../components/admin/FinancialManagement";
import ManagementDashboard from "../components/admin/ManagementDashboard";
import NotificationsBell from "../components/common/NotificationsBell";
import { ORDER_STATUS } from "../constants";
import calmPalette from "../theme/calmPalette";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout, employees } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [allOrders, setAllOrders] = useState([]);
  const [newNotificationReceived, setNewNotificationReceived] = useState(null);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [dailyOrdersDate, setDailyOrdersDate] = useState(getTodayDate());

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
          onNewNotification: (notification) => {
            console.log("📬 New notification received:", notification);
            setNewNotificationReceived(notification);
            // Reset after a moment to allow re-triggering
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
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
        <Toolbar 
          sx={{ 
            minHeight: { xs: 56, sm: 72 },
            paddingX: { xs: 1, sm: 2 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: "0.04em",
              fontSize: { xs: '1rem', sm: '1.5rem' },
              minWidth: 0,
            }}
          >
            PSBrand - لوحة الأدمن
          </Typography>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: { xs: 0.5, sm: 2 },
            flexWrap: 'nowrap'
          }}>
            <NotificationsBell onNewNotification={newNotificationReceived} />
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                backdropFilter: "blur(6px)",
                width: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
                fontSize: { xs: '0.875rem', sm: '1.25rem' }
              }}
            >
              {user?.name?.charAt(0) || "أ"}
            </Avatar>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 500, 
                color: "#f6f1eb",
                display: { xs: 'none', sm: 'block' },
                fontSize: { xs: '0.75rem', sm: '1rem' }
              }}
            >
              {user?.name || "الأدمن"}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                color: "#f6f1eb",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 2,
                padding: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }
              }}
            >
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth="xl" 
        sx={{ 
          paddingY: { xs: 2, sm: 5 },
          paddingX: { xs: 1, sm: 2, md: 3 }
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ marginBottom: { xs: 2, sm: 4 } }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle = calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={6} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: { xs: 2, sm: 4 },
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
                      transform: { xs: "none", sm: "translateY(-5px)" },
                      boxShadow: { xs: calmPalette.shadow, sm: "0 28px 50px rgba(46, 38, 31, 0.22)" },
                    },
                  }}
                >
                  <CardContent sx={{ padding: { xs: 1.5, sm: 2, md: 3 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 1, sm: 0 },
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h3"
                          sx={{ 
                            fontWeight: 700, 
                            color: cardStyle.highlight,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            marginTop: { xs: 0.5, sm: 1 },
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                          }}
                        >
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ 
                        fontSize: { xs: 32, sm: 40, md: 56 }, 
                        color: cardStyle.highlight,
                        flexShrink: 0
                      }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ marginBottom: { xs: 2, sm: 3 } }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              backgroundColor: calmPalette.surface,
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
              minHeight: { xs: 48, sm: 64 },
              '& .MuiTabs-scrollButtons': {
                color: calmPalette.textMuted,
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
            TabIndicatorProps={{
              sx: {
                height: "100%",
                borderRadius: { xs: 2, sm: 3 },
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
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
            <Tab
              label="إدارة الموظفين"
              icon={<People />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
            <Tab
              label="إدارة البائعين"
              icon={<Store />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
            <Tab
              label="الإدارة المالية"
              icon={<AccountBalance />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
            <Tab
              label="الطلبات اليومية"
              icon={<CalendarToday />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
            <Tab
              label="الإدارة"
              icon={<Settings />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                color: calmPalette.textMuted,
                minHeight: { xs: 48, sm: 64 },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                "&.Mui-selected": {
                  color: "#f7f2ea",
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 1 },
                  '& svg': {
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }
                }
              }}
            />
          </Tabs>
        </Box>

        <Box>
          {currentTab === 0 && <OrdersList />}
          {currentTab === 1 && <EmployeeManagement />}
          {currentTab === 2 && <SellerManagement />}
          {currentTab === 3 && <FinancialManagement />}
          {currentTab === 4 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  padding: { xs: 2, sm: 3 },
                  marginBottom: 3,
                  background: calmPalette.surface,
                  borderRadius: { xs: 2, sm: 3 },
                  boxShadow: calmPalette.shadow,
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  <Divider sx={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
                  <Typography
                    variant="h6"
                    sx={{
                      paddingX: 2,
                      fontWeight: 600,
                      color: calmPalette.textPrimary,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    فلترة حسب التاريخ
                  </Typography>
                  <Divider sx={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <TextField
                    type="date"
                    size="medium"
                    label="اختر التاريخ"
                    value={dailyOrdersDate}
                    onChange={(e) => {
                      setDailyOrdersDate(e.target.value);
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ fontSize: 20, color: 'text.secondary', pointerEvents: 'none' }} />
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
                      minWidth: { xs: 200, sm: 250 },
                      cursor: 'pointer',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '& input': {
                          cursor: 'pointer',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: calmPalette.textMuted,
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: calmPalette.textPrimary,
                      },
                    }}
                  />
                  <IconButton
                    size="medium"
                    onClick={() => {
                      setDailyOrdersDate(getTodayDate());
                    }}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                    title="إعادة تعيين إلى اليوم"
                  >
                    <Clear />
                  </IconButton>
                </Box>
              </Paper>
              <OrdersList dateFilter={dailyOrdersDate} />
            </Box>
          )}
          {currentTab === 5 && <ManagementDashboard />}
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
