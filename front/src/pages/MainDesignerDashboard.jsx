import { useState, useEffect, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Tooltip,
  Popover,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";
import {
  Logout,
  Close,
  Message as MessageIcon,
  Refresh,
  Image as ImageIcon,
  Upload,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { messagesService, mainDesignerService } from "../services/api";
import { subscribeToMessages } from "../services/realtime";
import MessagesTab from "../components/common/MessagesTab";
import WelcomePage from "../components/common/WelcomePage";
import DesignsManagement from "../components/mainDesigner/DesignsManagement";
import calmPalette from "../theme/calmPalette";

const MainDesignerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [newMessageReceived, setNewMessageReceived] = useState(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMessageNotification, setShowMessageNotification] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [publicMessages, setPublicMessages] = useState([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const unsubscribeRef = useRef(null);

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
        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error setting up real-time messages:", error);
      }
    };

    setupRealtime();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: calmPalette.background,
        paddingBottom: 6,
      }}
    >
      {/* App Bar */}
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
              color: "#f6f1eb",
            }}
          >
            PSBrand - لوحة المصمم
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Messages Icon */}
            <Tooltip title="رسائل الإدمن">
              <Box sx={{ position: "relative" }}>
                <IconButton
                  onClick={(e) => {
                    if (messagesAnchorEl) {
                      setMessagesAnchorEl(null);
                    } else {
                      setMessagesAnchorEl(e.currentTarget);
                    }
                    setShowMessageNotification(false);
                  }}
                  sx={{
                    color: "#f6f1eb",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 2,
                    position: "relative",
                    backgroundColor: messagesAnchorEl ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  <MessageIcon />
                </IconButton>
                {/* Notification Badge */}
                {unreadMessagesCount > 0 && (
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
                        "0%, 100%": {
                          transform: "scale(1)",
                          opacity: 1,
                        },
                        "50%": {
                          transform: "scale(1.4)",
                          opacity: 0.9,
                        },
                      },
                    }}
                  />
                )}
              </Box>
            </Tooltip>
            
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                backdropFilter: "blur(6px)",
              }}
            >
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500, color: "#f6f1eb" }}>
              {user?.name || "المصمم الرئيسي"}
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

      {/* Public Messages Banner - Messages sent to all users */}
      {publicMessages.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            background: calmPalette.surface,
            py: 1.5,
            width: "100%",
            overflow: "hidden",
            borderBottom: "2px solid rgba(94, 78, 62, 0.2)",
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
          }}
        >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                width: "100%",
                overflow: "hidden",
              }}
            >
              {/* Announcement Label - Fixed on left */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  px: 2.5,
                  background: "linear-gradient(135deg, rgba(97, 79, 65, 0.95) 0%, rgba(73, 59, 48, 0.95) 100%)",
                  color: calmPalette.statCards[0].highlight,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                  zIndex: 2,
                  borderRight: "2px solid rgba(94, 78, 62, 0.3)",
                  boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
                }}
              >
                <Typography
                  sx={{
                    color: calmPalette.statCards[0].highlight,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.1em",
                  }}
                >
                  📢 إعلان عام
                </Typography>
              </Box>

              {/* Scrolling Messages */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  marginLeft: "130px",
                  marginRight: "50px",
                  animation: "scroll 30s linear infinite",
                  "@keyframes scroll": {
                    "0%": {
                      transform: "translateX(100%)",
                    },
                    "100%": {
                      transform: "translateX(-100%)",
                    },
                  },
                }}
              >
                {/* Messages */}
                {publicMessages.map((message, index) => (
                  <Box
                    key={`${message.id}-${index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexShrink: 0,
                      minWidth: "fit-content",
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textPrimary,
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.title || "إعلان عام"}:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textSecondary,
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.content}
                    </Typography>
                    {index < publicMessages.length - 1 && (
                      <Box
                        sx={{
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          background: calmPalette.textSecondary,
                          opacity: 0.5,
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>

              {/* Close Button */}
              <IconButton
                onClick={() => {
                  if (publicMessages.length > 0) {
                    handleHideMessage(publicMessages[0].id);
                  }
                }}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: calmPalette.textPrimary,
                  backgroundColor: "rgba(94, 78, 62, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(94, 78, 62, 0.2)",
                  },
                  zIndex: 10,
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
        </Box>
      )}

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ paddingY: 5 }}>
        <Paper
          elevation={0}
          sx={{
            padding: 4,
            borderRadius: 3,
            background: calmPalette.surface,
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
          }}
        >
          <Box sx={{ marginBottom: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
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
                label="الرئيسية"
                icon={<MessageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 0 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '12px 0 0 12px',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label="التصاميم"
                icon={<ImageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 1 ? '#ffffff' : calmPalette.textMuted,
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
            <WelcomePage onNewMessage={newMessageReceived} />
          )}

          {/* Designs Management */}
          {currentTab === 1 && (
            <DesignsManagement />
          )}
        </Paper>
      </Container>

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
    </Box>
  );
};

export default MainDesignerDashboard;

