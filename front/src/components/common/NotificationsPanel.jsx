import { Box, Typography, List, ListItem, ListItemText, IconButton, Chip, Divider, Tooltip } from "@mui/material";
import {
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";

const getNotificationIcon = (type) => {
  switch (type) {
    case "shipment_cancelled":
      return <CancelIcon sx={{ color: "#d32f2f" }} />;
    case "shipment_followup":
      return <WarningIcon sx={{ color: "#ed6c02" }} />;
    case "order_created":
      return <InfoIcon sx={{ color: "#1976d2" }} />;
    case "order_completed":
      return <CheckCircleIcon sx={{ color: "#2e7d32" }} />;
    default:
      return <InfoIcon sx={{ color: calmPalette.textMuted }} />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case "shipment_cancelled":
      return "#d32f2f";
    case "shipment_followup":
      return "#ed6c02";
    case "order_created":
      return "#1976d2";
    case "order_completed":
      return "#2e7d32";
    default:
      return calmPalette.textMuted;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationsPanel = ({ notifications, onMarkAsRead, onDelete, refreshing = false }) => {
  if (notifications.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          لا توجد إشعارات
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0, maxHeight: "60vh", overflowY: "auto" }}>
      {notifications.map((notification, index) => (
        <Box key={notification.id}>
          <ListItem
            sx={{
              backgroundColor: notification.isRead ? "transparent" : "rgba(94, 78, 62, 0.05)",
              borderRadius: 2,
              mb: 1,
              "&:hover": {
                backgroundColor: notification.isRead
                  ? "rgba(94, 78, 62, 0.05)"
                  : "rgba(94, 78, 62, 0.1)",
              },
              transition: "background-color 0.2s",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%", gap: 1.5 }}>
              {/* Icon */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: `${getNotificationColor(notification.type)}15`,
                  mt: 0.5,
                }}
              >
                {getNotificationIcon(notification.type)}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: notification.isRead ? 500 : 700,
                      color: calmPalette.textPrimary,
                      flex: 1,
                    }}
                  >
                    {notification.title}
                  </Typography>
                  {!notification.isRead && (
                    <Chip
                      label="جديد"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        backgroundColor: "#1976d2",
                        color: "white",
                        ml: 1,
                      }}
                    />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    color: calmPalette.textMuted,
                    mb: 1,
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  {notification.message}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                    {formatDate(notification.createdAt)}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {!notification.isRead && (
                      <Tooltip title="تحديد كمقروء">
                        <IconButton
                          size="small"
                          onClick={() => onMarkAsRead(notification.id)}
                          sx={{
                            color: calmPalette.textMuted,
                            "&:hover": { color: calmPalette.textPrimary },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(notification.id)}
                        sx={{
                          color: calmPalette.textMuted,
                          "&:hover": { color: "#d32f2f" },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </Box>
          </ListItem>
          {index < notifications.length - 1 && <Divider sx={{ my: 0.5 }} />}
        </Box>
      ))}
    </List>
  );
};

export default NotificationsPanel;

