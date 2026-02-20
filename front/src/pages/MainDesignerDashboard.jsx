import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Tooltip,
  Popover,
  Snackbar,
  Alert,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close,
  Message as MessageIcon,
  Refresh,
  Image as ImageIcon,
  Upload,
  Add,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { messagesService, mainDesignerService } from "../services/api";
import { subscribeToMessages, subscribeToDesigns, subscribeToOrderUpdates } from "../services/realtime";
import MessagesTab from "../components/common/MessagesTab";
import WelcomePage from "../components/common/WelcomePage";
import DashboardLayout from "../components/common/DashboardLayout";
import NotificationsBell from "../components/common/NotificationsBell";
import DesignsManagement from "../components/mainDesigner/DesignsManagement";
import AvailableDesignsTab from "../components/mainDesigner/AvailableDesignsTab";
import MyDesignsTab from "../components/mainDesigner/MyDesignsTab";
import calmPalette from "../theme/calmPalette";

const MainDesignerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [currentTab, setCurrentTab] = useState(0);
  const [newMessageReceived, setNewMessageReceived] = useState(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMessageNotification, setShowMessageNotification] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [publicMessages, setPublicMessages] = useState([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const [designRequestsRefreshKey, setDesignRequestsRefreshKey] = useState(0);
  const [newNotificationReceived, setNewNotificationReceived] = useState(null);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [designRequestIdToOpen, setDesignRequestIdToOpen] = useState(null);
  const unsubscribeRef = useRef(null);
  const unsubscribeDesignsRef = useRef(null);
  const unsubscribeOrderUpdatesRef = useRef(null);
  const effectCancelledRef = useRef(false);

  // Load public messages (for all employees)
  const loadPublicMessages = async () => {
    try {
      let hiddenIds = [];
      try {
        const storageKey = user?.id ? `hiddenPublicMessages_${user.id}` : 'hiddenPublicMessages';
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          hiddenIds = JSON.parse(saved);
        }
      } catch (e) {
        console.error("Error reading hidden messages from localStorage:", e);
      }

      const allMessages = await messagesService.getMessagesToUser(user?.id);
      const publicMsgs = (allMessages || []).filter((msg) => {
        if (msg.userId !== null && msg.userId !== undefined) return false;
        if (!msg.isActive) return false;
        if (hiddenIds.includes(msg.id)) return false;
        if (msg.expiresAt) {
          const expiresDate = new Date(msg.expiresAt);
          return expiresDate > new Date();
        }
        return true;
      });

      publicMsgs.sort(
        (a, b) =>
          new Date(b.createdAt || b.sentAt || 0) -
          new Date(a.createdAt || a.sentAt || 0)
      );

      setPublicMessages(publicMsgs);
      setHiddenMessageIds(hiddenIds);
    } catch (error) {
      console.error("Error loading public messages:", error);
      setPublicMessages([]);
    }
  };

  // Load messages count
  const loadMessagesCount = async () => {
    try {
      const allMessages = await messagesService.getMessagesToUser(user?.id);
      const now = new Date();
      const activeMessages = (allMessages || []).filter((msg) => {
        if (!msg.isActive) return false;
        if (msg.expiresAt) {
          const expiresDate = new Date(msg.expiresAt);
          return expiresDate > now;
        }
        return true;
      });
      setUnreadMessagesCount(activeMessages.length);
    } catch (error) {
      console.error("Error loading messages count:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadPublicMessages();
      loadMessagesCount();
    }
  }, [user?.id]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!user?.id) return;

    effectCancelledRef.current = false;

    const setupRealtime = async () => {
      try {
        const unsubscribe = await subscribeToMessages({
          onNewMessage: (message) => {
            loadPublicMessages();
            loadMessagesCount();
            if (message.userId === null || message.userId === undefined) {
              setNewMessageReceived(message);
              setNewMessageData(message);
              setShowMessageNotification(true);
            }
          },
          onMessageUpdated: () => {
            loadPublicMessages();
            loadMessagesCount();
          },
          onMessageRemoved: () => {
            loadPublicMessages();
            loadMessagesCount();
          },
        });
        if (!effectCancelledRef.current) unsubscribeRef.current = unsubscribe;
        else if (typeof unsubscribe === "function") unsubscribe();
      } catch (error) {
        console.error("Error setting up real-time messages:", error);
      }
      try {
        const unsubDesigns = await subscribeToDesigns({
          onDesignRequestsListChanged: () => setDesignRequestsRefreshKey((k) => k + 1),
          onDesignRequestUpdated: () => setDesignRequestsRefreshKey((k) => k + 1),
          onNewNotification: (notification) => {
            setNewNotificationReceived(notification);
            setNotificationRefreshKey((k) => k + 1);
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
        });
        if (!effectCancelledRef.current) unsubscribeDesignsRef.current = unsubDesigns;
        else if (typeof unsubDesigns === "function") unsubDesigns();
      } catch (err) {
        console.warn("Design requests SignalR (المصمم):", err);
      }
      try {
        const unsubOrderUpdates = await subscribeToOrderUpdates({
          onNewNotification: (notification) => {
            setNewNotificationReceived(notification);
            setNotificationRefreshKey((k) => k + 1);
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
        });
        if (!effectCancelledRef.current) unsubscribeOrderUpdatesRef.current = unsubOrderUpdates;
        else if (typeof unsubOrderUpdates === "function") unsubOrderUpdates();
      } catch (err) {
        console.warn("Order updates SignalR (المصمم - للإشعارات):", err?.message || err);
      }
    };

    setupRealtime();

    return () => {
      effectCancelledRef.current = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (unsubscribeDesignsRef.current) {
        unsubscribeDesignsRef.current();
        unsubscribeDesignsRef.current = null;
      }
      if (unsubscribeOrderUpdatesRef.current) {
        unsubscribeOrderUpdatesRef.current();
        unsubscribeOrderUpdatesRef.current = null;
      }
    };
  }, [user?.id]);

  const handleHideMessage = (messageId) => {
    setHiddenMessageIds(prev => {
      const updated = [...prev, messageId];
      const storageKey = user?.id ? `hiddenPublicMessages_${user.id}` : 'hiddenPublicMessages';
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    setPublicMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // الانتقال لطلب التصميم عند النقر على إشعار طلب تصميم
  const handleNotificationClick = (relatedEntityId, relatedEntityType) => {
    if (!relatedEntityId || !user?.id) return;
    if (relatedEntityType === "DesignRequest") {
      setDesignRequestIdToOpen(relatedEntityId);
      setCurrentTab(2); // تبويب تصاميمي
    }
  };

  return (
    <DashboardLayout
      title="PSBrand - لوحة المصمم"
      user={user}
      onLogout={handleLogout}
      publicMessages={publicMessages}
      onHideMessage={handleHideMessage}
      messagesAnchorEl={messagesAnchorEl}
      setMessagesAnchorEl={setMessagesAnchorEl}
      notificationsBell={<NotificationsBell onNewNotification={newNotificationReceived} notificationRefreshKey={notificationRefreshKey} onNotificationClick={handleNotificationClick} />}
      messagesIconExtra={
        unreadMessagesCount > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#ff1744",
              border: "2px solid #5E4E3E",
              animation: showMessageNotification ? "pulse 1.5s infinite" : "none",
              boxShadow: showMessageNotification ? "0 0 8px rgba(255, 23, 68, 0.6)" : "none",
              "@keyframes pulse": {
                "0%, 100%": { transform: "scale(1)", opacity: 1 },
                "50%": { transform: "scale(1.4)", opacity: 0.9 },
              },
            }}
          />
        )
      }
      onMessagesIconClick={() => setShowMessageNotification(false)}
      containerSx={{ paddingY: 6, px: 4 }}
    >
        <Paper
          elevation={0}
          sx={{
            padding: { xs: 2, sm: 5 },
            borderRadius: 4,
            background: calmPalette.surface,
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
            mb: 3,
            overflow: "hidden",
          }}
        >
          <Box sx={{ marginBottom: 3, overflow: "hidden" }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
              variant={isMobile ? "scrollable" : "fullWidth"}
              scrollButtons={isMobile ? "auto" : false}
              allowScrollButtonsMobile
              sx={{
                backgroundColor: calmPalette.surface,
                borderRadius: 3,
                boxShadow: calmPalette.shadow,
                backdropFilter: "blur(8px)",
                minHeight: { xs: 48, sm: 56 },
                "& .MuiTab-root": {
                  minWidth: { xs: "auto", sm: undefined },
                  fontSize: { xs: "0.8rem", sm: "1rem" },
                  minHeight: { xs: 48, sm: 56 },
                },
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
                label="الرئيسية"
                icon={<MessageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 56 },
                  color: currentTab === 0 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '12px 0 0 12px',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={isMobile ? "الواردة" : "التصاميم الواردة"}
                icon={<ImageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 56 },
                  color: currentTab === 1 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label="تصاميمي"
                icon={<ImageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 56 },
                  color: currentTab === 2 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={isMobile ? "إضافة" : "إضافة تصميم جديد"}
                icon={<Add />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 56 },
                  color: currentTab === 3 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={isMobile ? "المتابعة" : "متابعة حالة التصاميم"}
                icon={<ImageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 56 },
                  color: currentTab === 4 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0 12px 12px 0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
            </Tabs>
          </Box>

          {/* Welcome Page */}
          {currentTab === 0 && (
            <WelcomePage
              onNewMessage={newMessageReceived}
              userName={user?.name || "المصمم الرئيسي"}
              dashboardTitle="لوحة المصمم"
              greetingMessage="نتمنى لك يوم إبداع وتصميم مميز! 🎨"
            />
          )}

          {/* Available Designs from Sellers */}
          {currentTab === 1 && (
            <AvailableDesignsTab designRequestsRefreshKey={designRequestsRefreshKey} />
          )}

          {/* My Assigned Designs */}
          {currentTab === 2 && (
            <MyDesignsTab
              designRequestsRefreshKey={designRequestsRefreshKey}
              designRequestIdToOpen={designRequestIdToOpen}
              onDesignRequestOpened={() => setDesignRequestIdToOpen(null)}
            />
          )}

          {/* Add Design Form */}
          {currentTab === 3 && (
            <DesignsManagement showFormInTab={true} />
          )}

          {/* Designs Management - Follow Design Status */}
          {currentTab === 4 && (
            <DesignsManagement showFormInTab={false} />
          )}
        </Paper>

      {/* Messages Popover */}
      <Popover
        open={Boolean(messagesAnchorEl)}
        anchorEl={messagesAnchorEl}
        onClose={() => {
          setMessagesAnchorEl(null);
          loadMessagesCount();
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: { xs: "90vw", sm: 480, md: 580 },
            maxWidth: 580,
            maxHeight: "85vh",
            background: "linear-gradient(135deg, #ffffff 0%, #faf9f7 100%)",
            borderRadius: 4,
            boxShadow: "0 12px 48px rgba(94, 78, 62, 0.25), 0 4px 16px rgba(94, 78, 62, 0.15)",
            mt: 1.5,
            border: "1px solid rgba(94, 78, 62, 0.15)",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Box sx={{ p: 0, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "transparent" }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2.5,
              pb: 2,
              background: "linear-gradient(135deg, rgba(94, 78, 62, 0.08) 0%, rgba(94, 78, 62, 0.03) 100%)",
              borderBottom: "2px solid rgba(94, 78, 62, 0.12)",
              flexShrink: 0,
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "1px",
                background: "linear-gradient(90deg, transparent 0%, rgba(94, 78, 62, 0.1) 50%, transparent 100%)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  background: "linear-gradient(135deg, " + calmPalette.primary + " 0%, " + calmPalette.primaryDark + " 100%)",
                  width: 44,
                  height: 44,
                  boxShadow: "0 4px 12px rgba(94, 78, 62, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <MessageIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    color: calmPalette.textPrimary, 
                    fontSize: "1.15rem", 
                    mb: 0.25,
                    background: "linear-gradient(135deg, " + calmPalette.textPrimary + " 0%, " + calmPalette.primary + " 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  رسائل الإدمن
                </Typography>
                <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.8rem", fontWeight: 500 }}>
                  آخر الرسائل والإشعارات
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                onClick={loadMessagesCount}
                size="small"
                sx={{
                  color: calmPalette.textPrimary,
                  backgroundColor: "rgba(94, 78, 62, 0.05)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(94, 78, 62, 0.15)",
                    transform: "rotate(180deg)",
                  },
                }}
              >
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                onClick={() => {
                  setMessagesAnchorEl(null);
                  loadMessagesCount();
                }}
                size="small"
                sx={{
                  color: calmPalette.textPrimary,
                  backgroundColor: "rgba(94, 78, 62, 0.05)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(220, 53, 69, 0.1)",
                    color: "#dc3545",
                    transform: "scale(1.1)",
                  },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
          
          {/* Messages Content */}
          <Box 
            sx={{ 
              p: 2.5, 
              pt: 2, 
              overflow: "auto", 
              flex: 1,
              background: "rgba(255, 255, 255, 0.4)",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "rgba(94, 78, 62, 0.05)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(94, 78, 62, 0.2)",
                borderRadius: "4px",
                "&:hover": {
                  background: "rgba(94, 78, 62, 0.3)",
                },
              },
            }}
          >
            <MessagesTab
              onNewMessage={(message) => {
                setNewMessageReceived(message);
                loadMessagesCount();
              }}
            />
          </Box>
        </Box>
      </Popover>

      {/* Message Notification Snackbar */}
      <Snackbar
        open={showMessageNotification}
        autoHideDuration={6000}
        onClose={() => {
          setShowMessageNotification(false);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          zIndex: 9999,
          mt: 2,
        }}
      >
        <Alert
          onClose={() => {
            setShowMessageNotification(false);
          }} 
          severity="info"
          icon={<MessageIcon />}
          sx={{ 
            width: '100%',
            minWidth: 300,
            maxWidth: 500,
            bgcolor: "#ffffff",
            color: calmPalette.textPrimary,
            boxShadow: "0 8px 24px rgba(94, 78, 62, 0.3)",
            border: `1px solid ${calmPalette.primary}`,
            "& .MuiAlert-icon": {
              color: "#1976d2",
              fontSize: 28,
            },
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "1rem" }}>
            رسالة جديدة من الإدارة
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.9rem", color: calmPalette.textSecondary }}>
            {newMessageData?.title || "رسالة جديدة"}
          </Typography>
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default MainDesignerDashboard;

