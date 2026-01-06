import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Paper,
  Avatar,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Message as MessageIcon,
  AdminPanelSettings,
  AccessTime,
  Refresh,
  Campaign,
  Mail,
} from "@mui/icons-material";
import { messagesService } from "../../services/api";
import { subscribeToMessages } from "../../services/realtime";
import { useApp } from "../../context/AppContext";
import calmPalette from "../../theme/calmPalette";

const MessagesTab = ({ onNewMessage }) => {
  const { user } = useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const unsubscribeRef = useRef(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Get messages for current user
      const allMessages = await messagesService.getMessagesToUser(user?.id);
      
      // Filter active messages (not expired)
      const now = new Date();
      const activeMessages = (allMessages || []).filter((msg) => {
        if (!msg.isActive) return false;
        if (msg.expiresAt) {
          const expiresDate = new Date(msg.expiresAt);
          return expiresDate > now;
        }
        return true; // No expiry date means always active
      });

      // Sort by date (newest first)
      activeMessages.sort(
        (a, b) =>
          new Date(b.createdAt || b.sentAt || 0) -
          new Date(a.createdAt || a.sentAt || 0)
      );

      setMessages(activeMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadMessages();
    }
  }, [user?.id]);

  // Subscribe to real-time message updates via SignalR
  useEffect(() => {
    if (!user?.id) return;

    const setupRealtime = async () => {
      try {
        const unsubscribe = await subscribeToMessages({
          onNewMessage: (message) => {
            // Reload messages when new message arrives
            loadMessages();
            // Also call the parent's onNewMessage callback if provided
            if (onNewMessage) {
              onNewMessage(message);
            }
          },
          onMessageUpdated: (message) => {
            // Reload messages when message is updated
            loadMessages();
          },
          onMessageRemoved: (data) => {
            // Reload messages when message is removed
            loadMessages();
          },
        });
        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error setting up real-time messages:", error);
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id, onNewMessage]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Separate messages into public (all employees) and private (specific employee)
  const publicMessages = messages.filter((msg) => msg.userId === null || msg.userId === undefined);
  const privateMessages = messages.filter((msg) => msg.userId !== null && msg.userId !== undefined);

  const renderMessageCard = (message) => {
    const expiryDate = formatExpiryDate(message.expiresAt);
    const isExpiringSoon =
      expiryDate &&
      new Date(message.expiresAt) - new Date() < 7 * 24 * 60 * 60 * 1000;
    
    // Check if message is new (created in last 24 hours)
    const isNew = message.createdAt && 
      (new Date() - new Date(message.createdAt)) < 24 * 60 * 60 * 1000;

    return (
      <Card
        key={message.id}
        elevation={0}
        sx={{
          background: "#ffffff",
          borderRadius: 2,
          border: isNew 
            ? "2px solid #1976d2" 
            : "1px solid rgba(94, 78, 62, 0.15)",
          transition: "all 0.2s ease",
          minHeight: "140px",
          display: "flex",
          flexDirection: "column",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(94, 78, 62, 0.15)",
            borderColor: isNew ? "#1976d2" : calmPalette.primary,
          },
        }}
      >
        <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Message Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flex: 1, minWidth: 0 }}>
              <Avatar
                sx={{
                  bgcolor: isNew ? "#1976d2" : calmPalette.primary,
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: calmPalette.textPrimary,
                    mb: 0.5,
                    fontSize: "0.95rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {message.title || "رسالة من الإدمن"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Chip
                    icon={<AdminPanelSettings sx={{ fontSize: 12 }} />}
                    label="من الإدارة"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      bgcolor: "rgba(94, 78, 62, 0.1)",
                      color: calmPalette.textPrimary,
                      "& .MuiChip-icon": {
                        fontSize: 12,
                        color: calmPalette.primary,
                      },
                    }}
                  />
                  {isNew && (
                    <Chip
                      label="جديد"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        bgcolor: "#1976d2",
                        color: "white",
                      }}
                    />
                  )}
                  {isExpiringSoon && expiryDate && (
                    <Chip
                      label={`ينتهي قريباً`}
                      size="small"
                      color="warning"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0, textAlign: "left" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: calmPalette.textSecondary,
                }}
              >
                <AccessTime sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                  {formatDateTime(message.createdAt || message.sentAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5, borderColor: "rgba(94, 78, 62, 0.1)" }} />

          {/* Message Content */}
          <Typography
            variant="body2"
            sx={{
              color: calmPalette.textPrimary,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              flex: 1,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              mb: expiryDate ? 1.5 : 0,
            }}
          >
            {message.content}
          </Typography>

          {/* Expiry Date (if exists) */}
          {expiryDate && !isExpiringSoon && (
            <Box
              sx={{
                mt: "auto",
                pt: 1.5,
                borderTop: "1px solid rgba(94, 78, 62, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <AccessTime sx={{ fontSize: 14, color: calmPalette.textSecondary }} />
              <Typography
                variant="caption"
                sx={{
                  color: calmPalette.textSecondary,
                  fontSize: "0.7rem",
                }}
              >
                ينتهي في: {expiryDate}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(e, newValue) => setCurrentTab(newValue)}
        variant="fullWidth"
        sx={{
          mb: 3,
          borderBottom: "2px solid rgba(94, 78, 62, 0.1)",
          "& .MuiTabs-indicator": {
            backgroundColor: calmPalette.primary,
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            minHeight: 56,
            color: calmPalette.textSecondary,
            "&.Mui-selected": {
              color: calmPalette.primary,
              fontWeight: 700,
            },
            "&:hover": {
              color: calmPalette.primary,
            },
          },
        }}
      >
        <Tab
          icon={<Campaign sx={{ fontSize: 20 }} />}
          iconPosition="start"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography>إعلان عام / تعميم</Typography>
              {publicMessages.length > 0 && (
                <Chip
                  label={publicMessages.length}
                  size="small"
                  sx={{
                    bgcolor: currentTab === 0 ? calmPalette.primary : "rgba(94, 78, 62, 0.2)",
                    color: currentTab === 0 ? "white" : calmPalette.textPrimary,
                    fontWeight: 700,
                    height: 22,
                    fontSize: "0.7rem",
                    minWidth: 24,
                  }}
                />
              )}
            </Box>
          }
        />
        <Tab
          icon={<Mail sx={{ fontSize: 20 }} />}
          iconPosition="start"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography>رسائل</Typography>
              {privateMessages.length > 0 && (
                <Chip
                  label={privateMessages.length}
                  size="small"
                  sx={{
                    bgcolor: currentTab === 1 ? calmPalette.primary : "rgba(94, 78, 62, 0.2)",
                    color: currentTab === 1 ? "white" : calmPalette.textPrimary,
                    fontWeight: 700,
                    height: 22,
                    fontSize: "0.7rem",
                    minWidth: 24,
                  }}
                />
              )}
            </Box>
          }
        />
      </Tabs>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Box>
          {publicMessages.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderRadius: 2,
                border: "1px solid rgba(94, 78, 62, 0.1)",
              }}
            >
              <Campaign
                sx={{
                  fontSize: 48,
                  color: calmPalette.textSecondary,
                  mb: 1.5,
                  opacity: 0.5,
                }}
              />
              <Typography variant="body1" sx={{ color: calmPalette.textPrimary, mb: 0.5, fontWeight: 600 }}>
                لا توجد إعلانات عامة حالياً
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontSize: "0.85rem" }}>
                سيتم عرض الإعلانات والتعميمات من الإدارة هنا عند توفرها
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {publicMessages.map((message) => renderMessageCard(message))}
            </Box>
          )}
        </Box>
      )}

      {currentTab === 1 && (
        <Box>
          {privateMessages.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderRadius: 2,
                border: "1px solid rgba(94, 78, 62, 0.1)",
              }}
            >
              <Mail
                sx={{
                  fontSize: 48,
                  color: calmPalette.textSecondary,
                  mb: 1.5,
                  opacity: 0.5,
                }}
              />
              <Typography variant="body1" sx={{ color: calmPalette.textPrimary, mb: 0.5, fontWeight: 600 }}>
                لا توجد رسائل خاصة حالياً
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontSize: "0.85rem" }}>
                سيتم عرض الرسائل الموجهة لك من الإدارة هنا عند توفرها
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {privateMessages.map((message) => renderMessageCard(message))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MessagesTab;

