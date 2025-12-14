import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Paper,
  TextField,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Logout,
  CalendarToday,
  Clear,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService } from "../services/api";
import { getCache, setCache, CACHE_KEYS } from "../utils/cache";
import OrdersList from "../components/admin/OrdersList";
import calmPalette from "../theme/calmPalette";

const DailyOrders = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBack = () => {
    navigate("/admin");
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

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
          <IconButton
            color="inherit"
            onClick={handleBack}
            sx={{
              color: "#f6f1eb",
              marginRight: { xs: 1, sm: 2 },
            }}
          >
            <ArrowBack />
          </IconButton>
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
            الطلبات اليومية
          </Typography>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: { xs: 0.5, sm: 2 },
            flexWrap: 'nowrap'
          }}>
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
        <Paper
          elevation={0}
          sx={{
            padding: { xs: 2, sm: 3, md: 4 },
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
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
              }}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                minWidth: { xs: 200, sm: 250 },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
            {selectedDate && (
              <IconButton
                size="medium"
                onClick={() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  setSelectedDate(`${year}-${month}-${day}`);
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
            )}
          </Box>

          {selectedDate && (
            <Typography
              variant="body2"
              sx={{
                marginTop: 2,
                textAlign: "center",
                color: calmPalette.textMuted,
                fontStyle: "italic",
              }}
            >
              عرض الطلبات بتاريخ: {formatDateForDisplay(selectedDate)}
            </Typography>
          )}
        </Paper>

        <Box>
          <OrdersList dateFilter={selectedDate} />
        </Box>
      </Container>
    </Box>
  );
};

export default DailyOrders;

