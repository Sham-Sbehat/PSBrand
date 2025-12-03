import { useState, useEffect, useRef } from "react";
import { IconButton, Badge, Popover, Box, Typography, Divider, Button, CircularProgress } from "@mui/material";
import { Notifications as NotificationsIcon, Close } from "@mui/icons-material";
import { notificationsService } from "../../services/api";
import NotificationsPanel from "./NotificationsPanel";
import calmPalette from "../../theme/calmPalette";

const NotificationsBell = ({ onNewNotification }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const notificationsRef = useRef([]);
  const unreadCountRef = useRef(0);

  const open = Boolean(anchorEl);

  // Load notifications
  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationsService.getNotifications(),
        notificationsService.getUnreadCount(),
      ]);

      const notificationsList = notificationsResponse?.notifications || [];
      const count = unreadResponse?.unreadCount || 0;

      notificationsRef.current = notificationsList;
      unreadCountRef.current = count;
      setNotifications(notificationsList);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle new notification from SignalR
  useEffect(() => {
    if (onNewNotification) {
      // Reload notifications when new one arrives
      loadNotifications(false);
    }
  }, [onNewNotification]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    loadNotifications(false); // Refresh when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      await loadNotifications(false);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications(false);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      await loadNotifications(false);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: "white",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: "90vw",
            maxHeight: "80vh",
            mt: 1,
            borderRadius: 3,
            boxShadow: calmPalette.shadow,
            backgroundColor: calmPalette.surface,
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              الإشعارات
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={handleMarkAllAsRead}
                  sx={{
                    fontSize: "0.75rem",
                    textTransform: "none",
                    color: calmPalette.textPrimary,
                  }}
                >
                  تحديد الكل كمقروء
                </Button>
              )}
              <IconButton size="small" onClick={handleClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <NotificationsPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              refreshing={refreshing}
            />
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationsBell;

