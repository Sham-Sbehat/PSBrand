import { Box, Typography, List, ListItem, ListItemText, IconButton, Chip, Divider, Tooltip } from "@mui/material";
import {
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  LocalShipping as LocalShippingIcon,
  Undo as UndoIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";

const getNotificationIcon = (type) => {

  const typeLower = (type || "").toLowerCase();
  
  // Handle cancelled/closed shipments
  if (typeLower.includes("cancelled") || typeLower.includes("ملغي") || typeLower.includes("مغلق")) {
    return <CancelIcon sx={{ color: "#d32f2f" }} />;
  }
  
  // Handle followup/needs followup
  if (typeLower.includes("followup") || typeLower.includes("متابعة") || typeLower.includes("follow")) {
    return <WarningIcon sx={{ color: "#ed6c02" }} />;
  }
  
  // Handle returned shipments (closed)
  if (typeLower.includes("returned") && typeLower.includes("closed")) {
    return <UndoIcon sx={{ color: "#9c27b0" }} />;
  }
  
  // Handle returned shipments
  if (typeLower.includes("returned") || typeLower.includes("مرتجع")) {
    return <LocalShippingIcon sx={{ color: "#9c27b0" }} />;
  }
  
  switch (type) {
    case "shipment_cancelled":
    case "shipment_cancelled_closed":
      return <CancelIcon sx={{ color: "#d32f2f" }} />;
    case "shipment_followup":
    case "shipment_needs_followup":
      return <WarningIcon sx={{ color: "#ed6c02" }} />;
    case "order_created":
      return <InfoIcon sx={{ color: "#1976d2" }} />;
    case "order_completed":
      return <CheckCircleIcon sx={{ color: "#2e7d32" }} />;
    case "returned_shipment_closed":
    case "shipment_returned_closed":
      return <UndoIcon sx={{ color: "#9c27b0" }} />;
    case "returned_shipment":
    case "shipment_returned":
      return <LocalShippingIcon sx={{ color: "#9c27b0" }} />;
    default:
      return <InfoIcon sx={{ color: calmPalette.textMuted }} />;
  }
};

const getNotificationColor = (type) => {
  const typeLower = (type || "").toLowerCase();
  
  // Handle cancelled/closed shipments
  if (typeLower.includes("cancelled") || typeLower.includes("ملغي") || typeLower.includes("مغلق")) {
    return "#d32f2f";
  }
  
  // Handle followup/needs followup
  if (typeLower.includes("followup") || typeLower.includes("متابعة") || typeLower.includes("follow")) {
    return "#ed6c02";
  }
  
  // Handle returned shipments
  if (typeLower.includes("returned") || typeLower.includes("مرتجع")) {
    return "#9c27b0";
  }
  
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
  
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationsPanel = ({ notifications, onMarkAsRead, onDelete, onViewOrderDetails, onNotificationClick, refreshing = false }) => {
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
            onClick={() => {
              if (notification.relatedEntityId && onNotificationClick) {
                onNotificationClick(notification.relatedEntityId);
              }
            }}
            sx={{
              backgroundColor: notification.isRead ? "transparent" : "rgba(94, 78, 62, 0.05)",
              borderRadius: 2,
              mb: 1,
              cursor: notification.relatedEntityId ? "pointer" : "default",
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
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.5, flexWrap: "wrap", gap: 0.5 }}>
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
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    {/* Check if notification is for deposit order */}
                    {(() => {
                      const typeLower = (notification.type || "").toLowerCase();
                      const messageLower = (notification.message || "").toLowerCase();
                      const titleLower = (notification.title || "").toLowerCase();
                      const isDepositOrder = 
                        typeLower.includes("deposit") || 
                        typeLower.includes("عربون") ||
                        messageLower.includes("عربون") ||
                        messageLower.includes("deposit") ||
                        titleLower.includes("عربون") ||
                        titleLower.includes("deposit") ||
                        (notification.message && notification.message.includes("للعربون"));
                      
                      if (isDepositOrder) {
                        return (
                          <Chip
                            icon={<AccountBalanceIcon sx={{ fontSize: "0.75rem !important" }} />}
                            label="عربون"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              backgroundColor: "#ff9800",
                              color: "white",
                              fontWeight: 600,
                              "& .MuiChip-icon": {
                                color: "white",
                              },
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                    {!notification.isRead && (
                      <Chip
                        label="جديد"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          backgroundColor: "#1976d2",
                          color: "white",
                        }}
                      />
                    )}
                  </Box>
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
                    {notification.relatedEntityId && (
                      <Tooltip title="عرض تفاصيل الطلب">
                        <IconButton
                          size="small"
                          onClick={() => onViewOrderDetails && onViewOrderDetails(notification.relatedEntityId)}
                          sx={{
                            color: calmPalette.textMuted,
                            "&:hover": { color: "#1976d2" },
                          }}
                        >
                          <AssignmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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


