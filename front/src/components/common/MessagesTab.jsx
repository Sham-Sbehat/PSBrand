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
} from "@mui/material";
import {
  Message as MessageIcon,
  AdminPanelSettings,
  AccessTime,
  Refresh,
} from "@mui/icons-material";
import { messagesService } from "../../services/api";
import { subscribeToMessages } from "../../services/realtime";
import { useApp } from "../../context/AppContext";
import calmPalette from "../../theme/calmPalette";

const MessagesTab = ({ onNewMessage }) => {
  const { user } = useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: calmPalette.primary,
              width: 56,
              height: 56,
            }}
          >
            <MessageIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: calmPalette.textPrimary, mb: 0.5 }}>
              رسائل الإدمن
            </Typography>
            <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
              آخر الرسائل والإشعارات من الإدارة
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={loadMessages}
          sx={{
            color: calmPalette.primary,
            "&:hover": {
              backgroundColor: "rgba(25, 118, 210, 0.1)",
            },
          }}
        >
          <Refresh />
        </IconButton>
      </Box>

      {/* Messages List */}
      {messages.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            borderRadius: 3,
            border: "1px solid rgba(94, 78, 62, 0.1)",
          }}
        >
          <MessageIcon
            sx={{
              fontSize: 64,
              color: calmPalette.textSecondary,
              mb: 2,
            }}
          />
          <Typography variant="h6" sx={{ color: calmPalette.textPrimary, mb: 1 }}>
            لا توجد رسائل حالياً
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
            سيتم عرض الرسائل والإشعارات من الإدارة هنا عند توفرها
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {messages.map((message) => {
            const expiryDate = formatExpiryDate(message.expiresAt);
            const isExpiringSoon =
              expiryDate &&
              new Date(message.expiresAt) - new Date() < 7 * 24 * 60 * 60 * 1000; // Less than 7 days

            return (
              <Grid item xs={12} key={message.id}>
                <Card
                  elevation={0}
                  sx={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 100%)",
                    borderRadius: 3,
                    border: "1px solid rgba(94, 78, 62, 0.15)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(94, 78, 62, 0.15)",
                      borderColor: calmPalette.primary,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Message Header */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: calmPalette.primary,
                            width: 40,
                            height: 40,
                          }}
                        >
                          <AdminPanelSettings />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: calmPalette.textPrimary,
                              mb: 0.5,
                            }}
                          >
                            {message.title || "رسالة من الإدمن"}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              label="من الإدارة"
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                            {isExpiringSoon && expiryDate && (
                              <Chip
                                label={`ينتهي: ${expiryDate}`}
                                size="small"
                                color="warning"
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: "left" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: calmPalette.textSecondary,
                          }}
                        >
                          <AccessTime sx={{ fontSize: 16 }} />
                          <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                            {formatDateTime(message.createdAt || message.sentAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Message Content */}
                    <Typography
                      variant="body1"
                      sx={{
                        color: calmPalette.textPrimary,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        fontSize: "1rem",
                        mb: expiryDate ? 2 : 0,
                      }}
                    >
                      {message.content}
                    </Typography>

                    {/* Expiry Date (if exists) */}
                    {expiryDate && !isExpiringSoon && (
                      <Box
                        sx={{
                          mt: 2,
                          pt: 2,
                          borderTop: "1px solid rgba(94, 78, 62, 0.1)",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: calmPalette.textSecondary,
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <AccessTime sx={{ fontSize: 14 }} />
                          ينتهي في: {expiryDate}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default MessagesTab;

