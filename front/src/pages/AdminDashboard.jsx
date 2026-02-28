import { useState, useEffect, useRef } from "react";
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
  Paper,
} from "@mui/material";
import {
  Logout,
  Assignment,
  People,
  CheckCircle,
  Pending,
  Store,
  AccountBalance,
  Settings,
  Business,
  AttachMoney,
  Dashboard,
  AccessTime,
  Build,
  Inventory,
  Reply as ReplyIcon,
  Send as SendIcon,
  FilterList,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, clientsService, depositOrdersService, notificationsService } from "../services/api";
import { subscribeToOrderUpdates, subscribeToDesigns } from "../services/realtime";
import OrdersList from "../components/admin/OrdersList";
import DepositOrdersList from "../components/admin/DepositOrdersList";
import EmployeeManagement from "../components/admin/EmployeeManagement";
import FinancialManagement from "../components/admin/FinancialManagement";
import ManagementDashboard from "../components/admin/ManagementDashboard";
import WelcomeDashboard from "../components/admin/WelcomeDashboard";
import NotificationsBell from "../components/common/NotificationsBell";
import SendMessageDialog from "../components/admin/SendMessageDialog";
import DesignRequestsTab from "../components/designManager/DesignRequestsTab";
import ImagePreviewDialog from "../components/common/ImagePreviewDialog";
import { ORDER_STATUS } from "../constants";
import calmPalette from "../theme/calmPalette";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout, employees } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [managementSubTabIndex, setManagementSubTabIndex] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [newNotificationReceived, setNewNotificationReceived] = useState(null);
  const [clientsCount, setClientsCount] = useState(0);
  const [depositOrdersCount, setDepositOrdersCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState(null); // للفلترة حسب الحالة
  const [sendMessageDialogOpen, setSendMessageDialogOpen] = useState(false);
  const [newMessageReceived, setNewMessageReceived] = useState(null);
  const [orderIdToOpen, setOrderIdToOpen] = useState(null); // للطلب الذي يجب فتحه من الإشعار
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Get today's date in YYYY-MM-DD format
  const [designRequestsRefreshKey, setDesignRequestsRefreshKey] = useState(0);
  const unsubscribeOrdersRef = useRef(null);
  const unsubscribeDesignsRef = useRef(null);
  const effectCancelledRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    effectCancelledRef.current = false;

    const fetchOrders = async () => {
      try {
        const response = await ordersService.getAllOrders();
        if (isMounted) {
          const list = Array.isArray(response) ? response : (response?.orders ?? []);
          setAllOrders(list);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        if (isMounted) {
          setAllOrders([]);
        }
      }
    };

    fetchOrders();

    // Fetch clients count
    const fetchClientsCount = async () => {
      try {
        const response = await clientsService.getAllClients();
        // Handle both array and object responses
        let clients = [];
        if (Array.isArray(response)) {
          clients = response;
        } else if (response && Array.isArray(response.clients)) {
          clients = response.clients;
        } else if (response && Array.isArray(response.data)) {
          clients = response.data;
        } else if (response && typeof response === 'object') {
          // If it's an object, try to find any array property
          const arrayKey = Object.keys(response).find(key => Array.isArray(response[key]));
          if (arrayKey) {
            clients = response[arrayKey];
          }
        }
        if (isMounted) {
          setClientsCount(clients.length);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        if (isMounted) {
          setClientsCount(0);
        }
      }
    };

    fetchClientsCount();

    // Fetch deposit orders count (all orders, not filtered by designer)
    // API returns paged result: use totalCount so the KPI matches "عدد الطلبات" in the tab
    const fetchDepositOrdersCount = async () => {
      try {
        const response = await depositOrdersService.getAllDepositOrders();
        const ordersArray = Array.isArray(response) ? response : (response?.data || []);
        const count = response?.totalCount ?? ordersArray.length;
        if (isMounted) {
          setDepositOrdersCount(count);
        }
      } catch (error) {
        console.error("Error fetching deposit orders count:", error);
        if (isMounted) {
          setDepositOrdersCount(0);
        }
      }
    };

    fetchDepositOrdersCount();

    (async () => {
      try {
        const unsub = await subscribeToOrderUpdates({
          onOrderCreated: () => fetchOrders(),
          onOrderStatusChanged: () => fetchOrders(),
          onNewNotification: (notification) => {
            setNewNotificationReceived(notification);
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
          onNewMessage: (message) => {
            setNewMessageReceived(message);
            setTimeout(() => setNewMessageReceived(null), 100);
          },
        });
        if (!effectCancelledRef.current) unsubscribeOrdersRef.current = unsub;
        else if (typeof unsub === "function") unsub();
      } catch (err) {
        console.error("Failed to subscribe to order updates:", err);
      }
      try {
        const unsubDesigns = await subscribeToDesigns({
          onDesignRequestsListChanged: () => setDesignRequestsRefreshKey((k) => k + 1),
          onDesignRequestUpdated: () => setDesignRequestsRefreshKey((k) => k + 1),
        });
        if (!effectCancelledRef.current) unsubscribeDesignsRef.current = unsubDesigns;
        else if (typeof unsubDesigns === "function") unsubDesigns();
      } catch (err) {
        console.warn("Design requests SignalR:", err);
      }
    })();

    return () => {
      isMounted = false;
      effectCancelledRef.current = true;
      const o = unsubscribeOrdersRef.current;
      const d = unsubscribeDesignsRef.current;
      unsubscribeOrdersRef.current = null;
      unsubscribeDesignsRef.current = null;
      if (typeof o === "function") o();
      if (typeof d === "function") d();
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setManagementSubTabIndex(null);
    // إعادة تعيين الفلتر عند تغيير التاب يدوياً
    if (newValue !== 1) {
      setStatusFilter(null);
    }
  };

  const handleStatCardClick = (statusToFilter) => {
    setStatusFilter(statusToFilter);
    setCurrentTab(1); // الانتقال إلى تاب الطلبات
  };

  // Handle notification click - navigate to orders tab and open the order
  const handleNotificationClick = async (relatedEntityId) => {
    if (!relatedEntityId) return;
    
    try {
      // Get order details first to get the correct orderId
      // relatedEntityId might be shipmentId, so we need to get orderId from the response
      const response = await notificationsService.getOrderDetails(relatedEntityId);
      const orderData = response?.order || response;
      const orderId = orderData?.id;
      
      if (orderId) {
        setOrderIdToOpen(orderId);
        setCurrentTab(1); // Switch to Orders tab
      }
    } catch (error) {
      console.error("Error getting order details from notification:", error);
      // Fallback: try using relatedEntityId directly as orderId
      setOrderIdToOpen(relatedEntityId);
      setCurrentTab(1);
    }
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
      title: "في مرحلةالتحضير",
      value: allOrders.filter((order) => order.status === ORDER_STATUS.IN_PREPARATION).length,
      icon: Build,
    },
    {
      title: "في مرحلة التغليف",
      value: allOrders.filter((order) => order.status === ORDER_STATUS.IN_PACKAGING).length,
      icon: Inventory,
    },
    {
      title: "طرد مرتجع",
      value: allOrders.filter((order) => order.status === ORDER_STATUS.RETURNED_SHIPMENT).length,
      icon: ReplyIcon,
    },
    {
      title: "عدد العملاء",
      value: clientsCount,
      icon: Business,
    },
    {
      title: "طلبات العربون",
      value: depositOrdersCount,
      icon: AttachMoney,
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
            <IconButton
              onClick={() => setSendMessageDialogOpen(true)}
              sx={{
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
              title="إرسال رسالة/إشعار"
            >
              <SendIcon />
            </IconButton>
            <NotificationsBell 
              onNewNotification={newNotificationReceived}
              onNotificationClick={handleNotificationClick}
            />
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
            
            // تحديد البطاقات القابلة للنقر والحالة المناسبة لكل منها
            let isClickable = false;
            let statusToFilter = null;
            let onCardClick = null;
            
            if (index === 0) {
              isClickable = true;
              statusToFilter = "all";
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 1) {
              isClickable = true;
              statusToFilter = ORDER_STATUS.PENDING_PRINTING;
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 2) {
              isClickable = true;
              statusToFilter = ORDER_STATUS.COMPLETED;
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 3) {
              isClickable = true;
              statusToFilter = ORDER_STATUS.IN_PREPARATION;
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 4) {
              isClickable = true;
              statusToFilter = ORDER_STATUS.IN_PACKAGING;
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 5) {
              isClickable = true;
              statusToFilter = ORDER_STATUS.RETURNED_SHIPMENT;
              onCardClick = () => handleStatCardClick(statusToFilter);
            } else if (index === 6) {
              // عدد العملاء → تاب الإدارة ثم تاب العملاء
              isClickable = true;
              onCardClick = () => {
                setManagementSubTabIndex(3);
                setCurrentTab(6);
              };
            } else if (index === 7) {
              // طلبات العربون → تاب طلبات العربون
              isClickable = true;
              onCardClick = () => setCurrentTab(2);
            }
            
            return (
              <Grid item xs={6} sm={6} md={3} key={index}>
                <Card
                  onClick={isClickable && onCardClick ? onCardClick : undefined}
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: { xs: 2, sm: 4 },
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
                    cursor: isClickable ? "pointer" : "default",
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
                  <CardContent sx={{ padding: { xs: 1.25, sm: 1.5, md: 2 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.75, sm: 0 },
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h3"
                          sx={{ 
                            fontWeight: 700, 
                            color: cardStyle.highlight,
                            fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' }
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            marginTop: { xs: 0.25, sm: 0.5 },
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' }
                          }}
                        >
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ 
                        fontSize: { xs: 28, sm: 36, md: 48 }, 
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

        <Box sx={{ marginBottom: { xs: 1.5, sm: 2 } }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              backgroundColor: "transparent",
              borderRadius: { xs: 2, sm: 3 },
              minHeight: { xs: 40, sm: 48 },
              borderBottom: "1px solid rgba(107, 142, 127, 0.15)",
              '& .MuiTabs-scrollButtons': {
                color: calmPalette.textMuted,
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
            TabIndicatorProps={{
              sx: {
                height: "3px",
                borderRadius: "3px 3px 0 0",
                background: "linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 100%)",
                bottom: 0,
              },
            }}
          >
            <Tab
              label="التحليلات"
              icon={<Dashboard />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
                  }
                }
              }}
            />
            <Tab
              label="الطلبات"
              icon={<Assignment />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
                  }
                }
              }}
            />
            <Tab
              label="طلبات العربون"
              icon={<AttachMoney />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
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
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
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
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
                  }
                }
              }}
            />
            <Tab
              label="طلبات التصاميم"
              icon={<FilterList />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
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
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.9rem" },
                color: "#7A9A8B",
                minHeight: { xs: 40, sm: 48 },
                padding: { xs: '6px 12px', sm: '8px 16px' },
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#6B8E7F",
                  backgroundColor: "rgba(107, 142, 127, 0.05)",
                },
                "&.Mui-selected": {
                  color: "#5A7A6B",
                  fontWeight: 700,
                },
                '& .MuiTab-iconWrapper': {
                  marginRight: { xs: 0.5, sm: 0.75 },
                  '& svg': {
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
                  }
                }
              }}
            />
          </Tabs>
        </Box>

        <Box>
          {currentTab === 0 && <WelcomeDashboard />}
          {currentTab === 1 && <OrdersList statusFilter={statusFilter} orderIdToOpen={orderIdToOpen} onOrderOpened={() => setOrderIdToOpen(null)} />}
          {currentTab === 2 && <DepositOrdersList />}
          {currentTab === 3 && <EmployeeManagement />}
          {currentTab === 4 && <FinancialManagement />}
          {currentTab === 5 && (
            <DesignRequestsTab
              setSelectedImage={setSelectedImage}
              setImageDialogOpen={setImageDialogOpen}
              designRequestsRefreshKey={designRequestsRefreshKey}
            />
          )}
          {currentTab === 6 && <ManagementDashboard initialSubTab={managementSubTabIndex} />}
        </Box>
      </Container>

      <ImagePreviewDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        image={selectedImage}
      />

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={sendMessageDialogOpen}
        onClose={() => setSendMessageDialogOpen(false)}
        onMessageSent={() => {
          // يمكن إضافة أي منطق إضافي بعد الإرسال
          console.log("Message sent successfully");
        }}
      />
    </Box>
  );
};

export default AdminDashboard;
