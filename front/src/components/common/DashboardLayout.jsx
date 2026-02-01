import { Box, Container, AppBar, Toolbar, Typography, IconButton, Avatar, Tooltip } from "@mui/material";
import { Logout, Message as MessageIcon } from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";
import PublicMessagesBanner from "./PublicMessagesBanner";

/**
 * تخطيط مشترك للوحات التحكم - AppBar + شريط الإعلانات + المحتوى
 * @param {string} title - عنوان اللوحة
 * @param {object} user - بيانات المستخدم
 * @param {function} onLogout - عند تسجيل الخروج
 * @param {array} publicMessages - الإعلانات العامة
 * @param {function} onHideMessage - عند إخفاء إعلان
 * @param {object} messagesAnchorEl - عنصر الـ anchor للرسائل
 * @param {function} setMessagesAnchorEl - تعيين عنصر الـ anchor
 * @param {number} unreadMessagesCount - عدد الرسائل غير المقروءة
 * @param {boolean} showMessageNotification - إظهار تنبيه الرسائل
 * @param {node} messagesIconExtra - محتوى إضافي داخل أيقونة الرسائل (مثل Badge)
 * @param {node} children - المحتوى
 * @param {boolean} isMobile - للتصغير على الموبايل
 * @param {function} onMessagesIconClick - عند النقر على أيقونة الرسائل (اختياري)
 * @param {string} containerMaxWidth - maxWidth للـ Container (lg, xl, إلخ)
 * @param {object} containerSx - تنسيق إضافي للـ Container
 */
const DashboardLayout = ({
  title,
  user,
  onLogout,
  publicMessages = [],
  onHideMessage,
  messagesAnchorEl,
  setMessagesAnchorEl,
  messagesIconExtra,
  children,
  isMobile = false,
  notificationsBell,
  onMessagesIconClick,
  containerMaxWidth = "xl",
  containerSx = {},
}) => {
  const handleMessagesClick = (e) => {
    if (messagesAnchorEl) setMessagesAnchorEl(null);
    else setMessagesAnchorEl(e.currentTarget);
    onMessagesIconClick?.();
  };
  return (
    <Box sx={{ minHeight: "100vh", backgroundImage: calmPalette.background, paddingBottom: 6 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ background: calmPalette.appBar, boxShadow: "0 12px 30px rgba(34, 26, 21, 0.25)", backdropFilter: "blur(10px)" }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 72 }, px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "0.04em", fontSize: { xs: "1rem", sm: "1.25rem" }, color: "#f6f1eb" }}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 2 } }}>
            {notificationsBell}
            <Tooltip title="رسائل الإدمن">
              <Box sx={{ position: "relative" }}>
                <IconButton
                  size={isMobile ? "small" : "medium"}
                  onClick={handleMessagesClick}
                  sx={{
                    color: "#f6f1eb",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 2,
                    backgroundColor: messagesAnchorEl ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                  }}
                >
                  <MessageIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                {messagesIconExtra}
              </Box>
            </Tooltip>
            <Avatar sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, bgcolor: "rgba(255, 255, 255, 0.22)", color: "#fff", backdropFilter: "blur(6px)", fontSize: { xs: "0.875rem", sm: "1.25rem" } }}>
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            {!isMobile && (
              <Typography variant="body1" sx={{ fontWeight: 500, color: "#f6f1eb" }}>
                {user?.name || "مستخدم"}
              </Typography>
            )}
            <IconButton size={isMobile ? "small" : "medium"} color="inherit" onClick={onLogout} sx={{ color: "#f6f1eb", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 2 }}>
              <Logout fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <PublicMessagesBanner messages={publicMessages} onHideMessage={onHideMessage} />

      <Container maxWidth={containerMaxWidth} sx={{ paddingY: { xs: 2, sm: 5 }, px: { xs: 1.5, sm: 3 }, ...containerSx }}>
        {children}
      </Container>
    </Box>
  );
};

export default DashboardLayout;
