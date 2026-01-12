import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Avatar,
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  People,
  AttachMoney,
  BarChart,
  PieChart,
  CalendarToday,
  AccessTime,
  ShowChart,
  Inventory,
  CheckCircle,
  Pending,
  Print,
  LocalShipping,
  Inventory2,
  Cancel,
  OpenInNew,
  Assignment,
} from "@mui/icons-material";
import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ComposedChart,
  Line,
  Area,
} from "recharts";
import { ordersService, designInventoryLogsService, SHIFT_TIME_ENUM } from "../../services/api";
import calmPalette from "../../theme/calmPalette";
import { useApp } from "../../context/AppContext";

// Rich and elegant darker colors
const COLORS = [
  "#6B8E7F", // Darker Mint Green
  "#8B7FA8", // Darker Lavender
  "#D4A574", // Darker Peach/Tan
  "#7FB3A3", // Darker Teal
  "#C99A9A", // Muted Rose
  "#A67C8E", // Muted Purple
  "#6B9BC4", // Deeper Sky Blue
  "#B8A082", // Warm Beige
  "#9B8B6F", // Darker Tan
  "#8FA3B8", // Steel Blue
  "#A89BB8", // Muted Lavender
  "#C4A882", // Warm Tan
];

// Rich gradient colors for charts
const VIBRANT_COLORS = [
  "#6B8E7F", "#8B7FA8", "#D4A574", "#7FB3A3", 
  "#C99A9A", "#A67C8E", "#6B9BC4", "#B8A082"
];

// Shift time colors
const SHIFT_COLORS = {
  A: { bg: "#4CAF50", text: "#fff", label: "دوام A", icon: "🌅" },
  B: { bg: "#2196F3", text: "#fff", label: "دوام B", icon: "🌆" },
  "A+B": { bg: "#FF9800", text: "#fff", label: "دوام A+B", icon: "⏰" },
  OFF: { bg: "#9E9E9E", text: "#fff", label: "إجازة", icon: "🏖️" },
};

// Helper function to convert shiftTime to string
const getShiftLabel = (shiftTime) => {
  if (typeof shiftTime === 'string') {
    if (shiftTime === "A" || shiftTime === "A+B" || shiftTime === "B" || shiftTime === "OFF") {
      return shiftTime;
    }
    return "";
  }
  if (shiftTime === SHIFT_TIME_ENUM.A) return "A";
  if (shiftTime === SHIFT_TIME_ENUM.B) return "B";
  if (shiftTime === SHIFT_TIME_ENUM.APlusB) return "A+B";
  if (shiftTime === SHIFT_TIME_ENUM.OFF) return "OFF";
  return "";
};

const WelcomeDashboard = () => {
  const theme = useTheme();
  const { user, employees, loadEmployees } = useApp();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState([]);
  const [fabricTypeStats, setFabricTypeStats] = useState([]);
  const [fabricTypeStatsFull, setFabricTypeStatsFull] = useState(null); // Full response object
  const [loadingFabricStats, setLoadingFabricStats] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState([]);
  const [loadingDeliveryStats, setLoadingDeliveryStats] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState("all"); // "all" or designerId
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [todayShifts, setTodayShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftsDate, setShiftsDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [fabricTypePieces, setFabricTypePieces] = useState(null);
  const [loadingFabricPieces, setLoadingFabricPieces] = useState(false);
  const [orderStatusStats, setOrderStatusStats] = useState([]);
  const [loadingStatusStats, setLoadingStatusStats] = useState(false);

  // Load employees on mount
  useEffect(() => {
    if (employees.length === 0) {
      loadEmployees();
    }
  }, []);

  // Get date string based on filter - إرجاع التاريخ بصيغة YYYY-MM-DD فقط
  const getDateString = () => {
    // الحصول على التاريخ بصيغة YYYY-MM-DD
    const getDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const now = new Date();

    switch (dateFilter) {
      case "today":
        return getDateString(now);
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return getDateString(yesterday);
      case "month":
        // أول يوم من الشهر الحالي
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        return getDateString(firstDayOfMonth);
      case "customMonth":
        // أول يوم من الشهر المحدد
        const firstDayOfSelectedMonth = new Date(selectedYear, selectedMonth - 1, 1);
        return getDateString(firstDayOfSelectedMonth);
      case "custom":
        if (selectedDate) {
          return selectedDate; // إرجاع التاريخ المخصص مباشرة بصيغة YYYY-MM-DD
        }
        return getDateString(now);
      default:
        return getDateString(now);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const dateString = getDateString();
      const data = await ordersService.getDesignersStatistics(dateString);
      // البيانات تأتي في شكل object يحتوي على designers array
      const statsArray = Array.isArray(data) 
        ? data 
        : (data?.designers || data?.data || []);
      setStatistics(statsArray);
    } catch (error) {
      setStatistics([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fabric type statistics
  const fetchFabricTypeStatistics = async () => {
    setLoadingFabricStats(true);
    try {
      const dateString = getDateString();
      const designerIdParam = selectedDesigner === "all" ? null : parseInt(selectedDesigner);
      const data = await ordersService.getDesignersFabricTypeStatistics(dateString, designerIdParam);
      const statsArray = Array.isArray(data) ? data : (data?.designers || data?.data || []);
      setFabricTypeStats(statsArray);
      setFabricTypeStatsFull(data); // Save full response object
    } catch (error) {
      setFabricTypeStats([]);
      setFabricTypeStatsFull(null);
    } finally {
      setLoadingFabricStats(false);
    }
  };

  // Fetch delivery orders statistics
  const fetchDeliveryOrdersStatistics = async () => {
    setLoadingDeliveryStats(true);
    try {
      const dateString = getDateString();
      const data = await ordersService.getDeliveryOrdersStatistics(dateString);
      const statsArray = Array.isArray(data) ? data : (data?.dailyStatistics || []);
      setDeliveryStats(statsArray);
    } catch (error) {
      setDeliveryStats([]);
    } finally {
      setLoadingDeliveryStats(false);
    }
  };

  // Fetch shifts for selected date
  const fetchTodayShifts = async () => {
    setLoadingShifts(true);
    try {
      if (!shiftsDate) {
        setTodayShifts([]);
        return;
      }
      
      const dateObj = new Date(shiftsDate);
      dateObj.setHours(12, 0, 0, 0);
      const dateISO = dateObj.toISOString();
      
      const response = await designInventoryLogsService.getAllLogs({ date: dateISO });
      const logsData = Array.isArray(response) ? response : response?.data || [];
      setTodayShifts(logsData);
    } catch (error) {
      setTodayShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };

  // Fetch fabric type pieces count
  const fetchFabricTypePiecesCount = async () => {
    setLoadingFabricPieces(true);
    try {
      const data = await ordersService.getFabricTypePiecesCount();
      setFabricTypePieces(data);
    } catch (error) {
      console.error("Error fetching fabric type pieces count:", error);
      setFabricTypePieces(null);
    } finally {
      setLoadingFabricPieces(false);
    }
  };

  // Fetch order status statistics for all statuses
  const fetchOrderStatusStatistics = async () => {
    setLoadingStatusStats(true);
    try {
      const statuses = [1, 2, 3, 4, 5, 6, 7, 8];
      const statusNames = {
        1: "بانتظار الطباعة",
        2: "في مرحلة الطباعة",
        3: "في مرحلة التحضير",
        4: "مكتمل",
        5: "ملغي",
        6: "الطلب مفتوح",
        7: "تم الإرسال لشركة التوصيل",
        8: "في مرحلة التغليف",
      };
      
      const promises = statuses.map(status => 
        ordersService.getOrderStatusStatistics(status).catch((err) => {
          console.error(`Error fetching status ${status}:`, err);
          return {
            status,
            statusNameAr: statusNames[status] || `حالة ${status}`,
            ordersCount: 0,
            totalAmount: 0,
            totalAmountWithoutDelivery: 0,
          };
        })
      );
      const results = await Promise.all(promises);
      // عرض جميع الحالات حتى لو كانت 0، وإزالة التكرارات
      const uniqueResults = results
        .filter(stat => stat !== null)
        .reduce((acc, stat) => {
          // التأكد من عدم وجود تكرارات لنفس الحالة
          const existing = acc.find(s => s.status === stat.status);
          if (!existing) {
            acc.push(stat);
          }
          return acc;
        }, []);
      setOrderStatusStats(uniqueResults);
    } catch (error) {
      console.error("Error fetching order status statistics:", error);
      setOrderStatusStats([]);
    } finally {
      setLoadingStatusStats(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [dateFilter, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchFabricTypeStatistics();
    fetchDeliveryOrdersStatistics();
  }, [dateFilter, selectedDate, selectedMonth, selectedYear, selectedDesigner]);

  useEffect(() => {
    fetchTodayShifts();
  }, [shiftsDate]);

  useEffect(() => {
    fetchFabricTypePiecesCount();
    fetchOrderStatusStatistics();
  }, []);

  const totalOrders = statistics.reduce((sum, item) => sum + (item.ordersCount || 0), 0);
  const totalAmount = statistics.reduce((sum, item) => sum + (item.totalAmountWithoutDelivery || 0), 0);
  const designersCount = statistics.length;

  // Prepare data for charts
  const ordersChartData = statistics
    .map((item) => ({
      name: item.designerName || `بائع ${item.designerId}`,
      orders: item.ordersCount || 0,
      amount: item.totalAmountWithoutDelivery || 0,
    }))
    .sort((a, b) => b.orders - a.orders);

  const revenueChartData = statistics
    .map((item) => ({
      name: item.designerName || `بائع ${item.designerId}`,
      revenue: item.totalAmountWithoutDelivery || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Prepare fabric type statistics data for chart
  const fabricTypeChartData = useMemo(() => {
    // If "all designers" is selected, use fabricTypeBreakdown from top level
    if (selectedDesigner === "all" && fabricTypeStatsFull?.fabricTypeBreakdown) {
      return fabricTypeStatsFull.fabricTypeBreakdown
        .map((fabric) => ({
          designerName: "جميع البائعين",
          fabricType: fabric.fabricTypeNameAr || `قماش ${fabric.fabricTypeId}`,
          quantity: fabric.quantity || 0,
        }))
        .filter((item) => item.quantity > 0);
    }
    
    // If specific designer is selected, use fabricTypeBreakdown from that designer
    return fabricTypeStats
      .flatMap((designer) =>
        designer.fabricTypeBreakdown?.map((fabric) => ({
          designerName: designer.designerName || `بائع ${designer.designerId}`,
          fabricType: fabric.fabricTypeNameAr || `قماش ${fabric.fabricTypeId}`,
          quantity: fabric.quantity || 0,
        })) || []
      )
      .filter((item) => item.quantity > 0);
  }, [fabricTypeStats, fabricTypeStatsFull, selectedDesigner]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          sx={{
            padding: 1.5,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {payload[0].payload.name}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name === "orders" && `الطلبات: ${entry.value}`}
              {entry.name === "amount" && `المبلغ: ${entry.value.toLocaleString()} ₪`}
              {entry.name === "revenue" && `الإيرادات: ${entry.value.toLocaleString()} ₪`}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ 
      padding: { xs: 2, sm: 3 },
      background: "transparent",
      minHeight: "100vh",
    }}>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }
          .fade-in {
            animation: fadeInUp 0.6s ease-out;
          }
          .pulse-animation {
            animation: pulse 2s ease-in-out infinite;
          }
          .recharts-pie-label-text {
            font-size: 12px !important;
            font-weight: 700 !important;
            fill: #2C1810 !important;
            font-family: 'Cairo', 'Tajawal', sans-serif !important;
            text-shadow: 0 1px 2px rgba(255,255,255,0.8) !important;
          }
          .recharts-label-line {
            stroke: #2C1810 !important;
            stroke-width: 1.5px !important;
            opacity: 0.6 !important;
          }
          .recharts-pie-label {
            pointer-events: none !important;
          }
        `}
      </style>
      {/* Welcome Header */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", marginBottom: 3 }}>
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)`,
            borderRadius: 3,
            padding: { xs: 2.5, sm: 3, md: 3.5 },
            boxShadow: "0 10px 30px rgba(107, 142, 127, 0.3)",
            position: "relative",
            overflow: "hidden",
            maxWidth: "fit-content",
            border: "2px solid rgba(255,255,255,0.2)",
            "&:hover": {
              boxShadow: "0 12px 35px rgba(107, 142, 127, 0.4)",
              transform: "translateY(-2px)",
              transition: "all 0.3s ease",
            },
            "&::before": {
              content: '""',
              position: "absolute",
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              background: "rgba(255,255,255,0.12)",
              borderRadius: "50%",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: -20,
              left: -20,
              width: 80,
              height: 80,
              background: "rgba(255,255,255,0.08)",
              borderRadius: "50%",
            },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              background: "rgba(255,255,255,0.25)",
              borderRadius: "50%",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              <Typography sx={{ fontSize: "28px" }}>👋</Typography>
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 0.5,
                  fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                  textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                مرحباً {user?.name || "الأدمن"}! 👨‍💼
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  fontWeight: 500,
                  textShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                تابع أداء البائعين وإحصائيات المبيعات
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Today's Shifts - Creative Display */}
      <Box sx={{ mb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)",
            borderRadius: 3,
            padding: 2.5,
            boxShadow: "0 8px 32px rgba(139, 69, 19, 0.12)",
            border: "1px solid rgba(139, 69, 19, 0.08)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  background: "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 100%)",
                  borderRadius: "50%",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(107, 142, 127, 0.3)",
                }}
              >
                <AccessTime sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary, fontSize: "1.1rem", mb: 0.25 }}>
                  دوام الموظفين
                </Typography>
              </Box>
            </Box>
            <TextField
              type="date"
              size="small"
              value={shiftsDate}
              onChange={(e) => setShiftsDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 180,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.95)",
                  },
                },
              }}
            />
          </Box>
          {loadingShifts ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} sx={{ color: "#6B8E7F" }} />
            </Box>
          ) : todayShifts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="body2" sx={{ color: calmPalette.textMuted, fontSize: "0.9rem" }}>
                لا توجد سجلات دوام للتاريخ المحدد
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
              {todayShifts.map((log, index) => {
                const employee = employees.find((emp) => emp.id === log.userId);
                const employeeName = employee?.name || `موظف #${log.userId}`;
                const shiftLabel = getShiftLabel(log.shiftTime);
                const shiftColor = shiftLabel ? SHIFT_COLORS[shiftLabel] : null;
                
                if (!shiftColor) return null;
                
                return (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      background: `linear-gradient(135deg, ${shiftColor.bg}20 0%, ${shiftColor.bg}10 100%)`,
                      border: `1.5px solid ${shiftColor.bg}40`,
                      borderRadius: 2,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "4px",
                        height: "100%",
                        background: shiftColor.bg,
                      },
                      "&:hover": {
                        transform: "translateY(-3px) scale(1.02)",
                        boxShadow: `0 6px 20px ${shiftColor.bg}35`,
                        borderColor: `${shiftColor.bg}60`,
                        background: `linear-gradient(135deg, ${shiftColor.bg}25 0%, ${shiftColor.bg}15 100%)`,
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: shiftColor.bg,
                        width: 32,
                        height: 32,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        boxShadow: `0 2px 8px ${shiftColor.bg}40`,
                        border: `2px solid ${shiftColor.bg}80`,
                      }}
                    >
                      {employeeName.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: calmPalette.textPrimary,
                          fontSize: "0.85rem",
                          mb: 0.25,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {employeeName}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "1rem",
                          }}
                        >
                          {shiftColor.icon}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: shiftColor.bg,
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {shiftColor.label}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Charts */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Orders Chart */}
          <Grid item xs={12} lg={12} sx={{ order: { xs: 0, lg: 1 } }}>
            <Paper
              elevation={0}
              sx={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)",
                borderRadius: 4,
                padding: { xs: 2, sm: 3, md: 4 },
                boxShadow: "0 8px 32px rgba(139, 69, 19, 0.15)",
                backdropFilter: "blur(10px)",
                height: 450,
                width:700,
                border: "1px solid rgba(139, 69, 19, 0.1)",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)",
                  borderRadius: "4px 4px 0 0",
                },
              }}
            >
              {/* Summary Stats */}
              <Box sx={{ 
                display: "flex", 
                gap: 2, 
                marginBottom: 3,
                flexWrap: "wrap",
                alignItems: "center",
              }}>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1.5,
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, rgba(107, 142, 127, 0.15) 0%, rgba(127, 179, 163, 0.12) 100%)",
                    borderRadius: 3,
                    border: "1px solid rgba(107, 142, 127, 0.3)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(107, 142, 127, 0.25)",
                      background: "linear-gradient(135deg, rgba(107, 142, 127, 0.2) 0%, rgba(127, 179, 163, 0.18) 100%)",
                    },
                  }}
                  className="fade-in"
                >
                  <Box sx={{
                    background: "linear-gradient(135deg, #6B8E7F 0%, #7FB3A3 100%)",
                    borderRadius: "50%",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(107, 142, 127, 0.4)",
                  }}>
                    <BarChart sx={{ fontSize: 20, color: "#ffffff" }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#5A7A6B", fontWeight: 600, fontSize: "0.75rem", display: "block" }}>
                      إجمالي الطلبات
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#5A7A6B", fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.2 }}>
                      {totalOrders}
                    </Typography>
                  </Box>
                </Box>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1.5,
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, rgba(139, 127, 168, 0.15) 0%, rgba(166, 124, 142, 0.12) 100%)",
                    borderRadius: 3,
                    border: "1px solid rgba(139, 127, 168, 0.3)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(139, 127, 168, 0.25)",
                      background: "linear-gradient(135deg, rgba(139, 127, 168, 0.2) 0%, rgba(166, 124, 142, 0.18) 100%)",
                    },
                  }}
                  className="fade-in"
                  style={{ animationDelay: "0.1s" }}
                >
                  <Box sx={{
                    background: "linear-gradient(135deg, #8B7FA8 0%, #A67C8E 100%)",
                    borderRadius: "50%",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(139, 127, 168, 0.4)",
                  }}>
                    <AttachMoney sx={{ fontSize: 20, color: "#ffffff" }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6B5F7A", fontWeight: 600, fontSize: "0.75rem", display: "block" }}>
                      إجمالي المبيعات
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#6B5F7A", fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.2 }}>
                      {totalAmount.toLocaleString()} ₪
                    </Typography>
                  </Box>
                </Box>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1.5,
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, rgba(212, 165, 116, 0.15) 0%, rgba(201, 154, 154, 0.12) 100%)",
                    borderRadius: 3,
                    border: "1px solid rgba(212, 165, 116, 0.3)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(212, 165, 116, 0.25)",
                      background: "linear-gradient(135deg, rgba(212, 165, 116, 0.2) 0%, rgba(201, 154, 154, 0.18) 100%)",
                    },
                  }}
                  className="fade-in"
                  style={{ animationDelay: "0.2s" }}
                >
                  <Box sx={{
                    background: "linear-gradient(135deg, #D4A574 0%, #C99A9A 100%)",
                    borderRadius: "50%",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(212, 165, 116, 0.4)",
                  }}>
                    <People sx={{ fontSize: 20, color: "#ffffff" }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#B8955F", fontWeight: 600, fontSize: "0.75rem", display: "block" }}>
                      عدد البائعين
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#B8955F", fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.2 }}>
                      {designersCount}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Header with Filter */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: 3,
                flexWrap: "wrap",
                gap: 2,
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BarChart sx={{ fontSize: 28, color: "#6B8E7F" }} />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700, 
                      color: "#2C1810",
                      fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                    }}
                  >
                    الطلبات لكل بائع
                  </Typography>
                </Box>
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 140,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontWeight: 600,
                    },
                  }}
                >
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#2C1810",
                    }}
                  >
                    <MenuItem value="today">اليوم</MenuItem>
                    <MenuItem value="yesterday">أمس</MenuItem>
                    <MenuItem value="month">هذا الشهر</MenuItem>
                    <MenuItem value="customMonth">شهر مخصص</MenuItem>
                    <MenuItem value="custom">تاريخ مخصص</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {dateFilter === "customMonth" && (
                <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 120,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>الشهر</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="الشهر"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      <MenuItem value={1}>يناير</MenuItem>
                      <MenuItem value={2}>فبراير</MenuItem>
                      <MenuItem value={3}>مارس</MenuItem>
                      <MenuItem value={4}>أبريل</MenuItem>
                      <MenuItem value={5}>مايو</MenuItem>
                      <MenuItem value={6}>يونيو</MenuItem>
                      <MenuItem value={7}>يوليو</MenuItem>
                      <MenuItem value={8}>أغسطس</MenuItem>
                      <MenuItem value={9}>سبتمبر</MenuItem>
                      <MenuItem value={10}>أكتوبر</MenuItem>
                      <MenuItem value={11}>نوفمبر</MenuItem>
                      <MenuItem value={12}>ديسمبر</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 100,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="السنة"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
              )}
              {dateFilter === "custom" && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
              <ResponsiveContainer width="100%" height={350}>
                <RechartsBarChart data={ordersChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 69, 19, 0.1)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }} 
                    label={{ value: "عدد الطلبات", angle: -90, position: "insideLeft", fill: "#2C1810", fontSize: 13, fontWeight: 600 }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(139, 69, 19, 0.1)" }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="url(#colorOrders)"
                    radius={[10, 10, 0, 0]}
                    name="عدد الطلبات"
                    paddingTop='50px'
                  >
                    <LabelList
                      dataKey="orders"
                      position="top"
                      style={{
                        fill: "#2C1810",
                        fontSize: "14px",
                        fontWeight: 700,
                        fontFamily: "Cairo, Tajawal, sans-serif",
                      }}
                    />
                  </Bar>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B8E7F" stopOpacity={1} />
                      <stop offset="50%" stopColor="#8B7FA8" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#D4A574" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Revenue Chart */}
          <Grid item xs={12} lg={5} sx={{ order: { xs: 1, lg: 3 } }}>
            <Paper
              elevation={0}
              className="fade-in"
              style={{ animationDelay: "0.3s" }}
              sx={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.95) 100%)",
                borderRadius: 4,
                padding: { xs: 2, sm: 3, md: 4 },
                boxShadow: "0 10px 40px rgba(139, 69, 19, 0.12), 0 2px 8px rgba(139, 69, 19, 0.08)",
                backdropFilter: "blur(10px)",
                height: 450,
                width:700,
                border: "1px solid rgba(139, 69, 19, 0.12)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 15px 50px rgba(139, 69, 19, 0.18), 0 4px 12px rgba(139, 69, 19, 0.12)",
                  transform: "translateY(-4px)",
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)",
                  borderRadius: "4px 4px 0 0",
                },
              }}
            >
              {/* Header */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center", 
                marginBottom: 3,
                gap: 2,
                flexWrap: "wrap",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PieChart sx={{ fontSize: 28, color: "#8B7FA8" }} />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700, 
                      color: "#2C1810",
                      fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                    }}
                  >
                    المبيعات لكل بائع
                  </Typography>
                </Box>
                
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 140,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontWeight: 600,
                    },
                  }}
                >
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#2C1810",
                    }}
                  >
                    <MenuItem value="today">اليوم</MenuItem>
                    <MenuItem value="yesterday">أمس</MenuItem>
                    <MenuItem value="month">هذا الشهر</MenuItem>
                    <MenuItem value="customMonth">شهر مخصص</MenuItem>
                    <MenuItem value="custom">تاريخ مخصص</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {dateFilter === "customMonth" && (
                <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 120,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>الشهر</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="الشهر"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString("ar-SA", { month: "long" })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 100,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="السنة"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
              )}
              {dateFilter === "custom" && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
              <ResponsiveContainer width="100%" height={400}>
                <RechartsPieChart margin={{ top: 20, right: 60, bottom: 40, left: 60 }}>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    label={({ name, percent }) => {
                      const percentage = (percent * 100).toFixed(0);
                      if (percentage < 8) return null; // فقط عرض labels للشرائح الكبيرة
                      return `${name} (${percentage}%)`;
                    }}
                    labelLine={{
                      stroke: "#2C1810",
                      strokeWidth: 1.5,
                      strokeLinecap: "round",
                      strokeDasharray: "0"
                    }}
                    outerRadius={110}
                    innerRadius={65}
                    fill="#8884d8"
                    dataKey="revenue"
                    paddingAngle={3}
                  >
                    {revenueChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  {revenueChartData.length === 0 ? (
                    <>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          fill: "#8B7FA8",
                          fontFamily: "Cairo, Tajawal, sans-serif",
                        }}
                      >
                        لا توجد بيانات
                      </text>
                      <text
                        x="50%"
                        y="60%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          fill: "#D4A574",
                          fontFamily: "Cairo, Tajawal, sans-serif",
                        }}
                      >
                        للفترة المحددة
                      </text>
                    </>
                  ) : (
                    <text
                      x="50%"
                      y="55%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: "22px",
                        fontWeight: 800,
                        fill: "#6B5F7A",
                        fontFamily: "Cairo, Tajawal, sans-serif",
                      }}
                    >
                    </text>
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Paper
                            sx={{
                              padding: 2,
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                              borderRadius: 3,
                              border: "2px solid #8B7FA8",
                            }}
                          >
                            <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5, color: "#2C1810", fontSize: "1rem" }}>
                              {payload[0].payload.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: payload[0].color, fontWeight: 600, fontSize: "0.95rem" }}>
                              المبلغ: {payload[0].value.toLocaleString()} ₪
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ 
                      color: "#2C1810", 
                      fontWeight: 700, 
                      fontSize: "0.8rem",
                      paddingBottom: "40px",
                    }}
                    formatter={(value, entry) => {
                      const data = revenueChartData.find(d => d.name === value);
                      if (data) {
                        const total = revenueChartData.reduce((sum, item) => sum + item.revenue, 0);
                        const percent = total > 0 ? ((data.revenue / total) * 100).toFixed(0) : 0;
                        return `${value}: ${data.revenue.toLocaleString()} ₪ (${percent}%)`;
                      }
                      return value;
                    }}
                    iconType="circle"
                    iconSize={18}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Fabric Type Statistics Chart */}
          <Grid item xs={12} sx={{ order: { xs: 2, lg: 2} }}>
            <Paper
              elevation={0}
              className="fade-in"
              style={{ animationDelay: "0.4s" }}
              sx={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.95) 100%)",
                borderRadius: 4,
                padding: { xs: 2, sm: 3, md: 4 },
                boxShadow: "0 10px 40px rgba(139, 69, 19, 0.12), 0 2px 8px rgba(139, 69, 19, 0.08)",
                backdropFilter: "blur(10px)",
                height: 450,
                width:700,
                border: "1px solid rgba(139, 69, 19, 0.12)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 15px 50px rgba(139, 69, 19, 0.18), 0 4px 12px rgba(139, 69, 19, 0.12)",
                  transform: "translateY(-4px)",
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #7FB3A3 0%, #C99A9A 50%, #B8A082 100%)",
                  borderRadius: "4px 4px 0 0",
                },
              }}
            >
              {/* Header */}
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: 3,
                gap: 1,
              }}>
                <BarChart sx={{ fontSize: 28, color: "#7FB3A3" }} />
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    color: "#2C1810",
                    fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                  }}
                >
                  إحصائيات أنواع القماش لكل بائع
                </Typography>
              </Box>

              {/* Filters */}
              <Box sx={{ 
                display: "flex", 
                gap: 2, 
                marginBottom: 3,
                flexWrap: "wrap",
              }}>
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 180,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontWeight: 600,
                    },
                  }}
                >
                  <InputLabel>اختر البائع</InputLabel>
                  <Select
                    value={selectedDesigner}
                    onChange={(e) => setSelectedDesigner(e.target.value)}
                    label="اختر البائع"
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#2C1810",
                    }}
                  >
                    <MenuItem value="all">جميع البائعين</MenuItem>
                    {statistics.map((designer) => (
                      <MenuItem key={designer.designerId} value={designer.designerId.toString()}>
                        {designer.designerName || `بائع ${designer.designerId}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 140,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontWeight: 600,
                    },
                  }}
                >
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#2C1810",
                    }}
                  >
                    <MenuItem value="today">اليوم</MenuItem>
                    <MenuItem value="yesterday">أمس</MenuItem>
                    <MenuItem value="month">هذا الشهر</MenuItem>
                    <MenuItem value="customMonth">شهر مخصص</MenuItem>
                    <MenuItem value="custom">تاريخ مخصص</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {dateFilter === "customMonth" && (
                <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 120,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>الشهر</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="الشهر"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      <MenuItem value={1}>يناير</MenuItem>
                      <MenuItem value={2}>فبراير</MenuItem>
                      <MenuItem value={3}>مارس</MenuItem>
                      <MenuItem value={4}>أبريل</MenuItem>
                      <MenuItem value={5}>مايو</MenuItem>
                      <MenuItem value={6}>يونيو</MenuItem>
                      <MenuItem value={7}>يوليو</MenuItem>
                      <MenuItem value={8}>أغسطس</MenuItem>
                      <MenuItem value={9}>سبتمبر</MenuItem>
                      <MenuItem value={10}>أكتوبر</MenuItem>
                      <MenuItem value={11}>نوفمبر</MenuItem>
                      <MenuItem value={12}>ديسمبر</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 100,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="السنة"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
              )}
              {dateFilter === "custom" && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}

              {loadingFabricStats ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}>
                  <CircularProgress size={40} sx={{ color: "#7FB3A3" }} />
                </Box>
              ) : fabricTypeChartData.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}>
                  <Typography variant="body1" sx={{ color: "#B8955F", fontWeight: 600 }}>
                    لا توجد بيانات لأنواع القماش في الفترة المحددة
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={450}>
                  <RechartsBarChart 
                    data={fabricTypeChartData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 69, 19, 0.1)" />
                    <XAxis
                      dataKey="fabricType"
                      tick={{ fill: "#2C1810", fontSize: 12, fontWeight: 600 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      dy={38}
                      dx={-35}
                    />
                    <YAxis 
                      tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }} 
                      label={{ 
                        value: "الكمية", 
                        angle: -90, 
                        position: "insideLeft", 
                        fill: "#2C1810", 
                        fontSize: 13, 
                        fontWeight: 600 
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <Paper
                              sx={{
                                padding: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                borderRadius: 3,
                                border: "2px solid #7FB3A3",
                              }}
                            >
                              <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5, color: "#2C1810" }}>
                                {payload[0].payload.designerName}
                              </Typography>
                              <Typography variant="body2" sx={{ color: "#7FB3A3", fontWeight: 600 }}>
                                {payload[0].payload.fabricType}: {payload[0].payload.quantity} قطعة
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                      cursor={{ fill: "rgba(139, 69, 19, 0.1)" }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        color: "#2C1810", 
                        fontWeight: 600, 
                        fontSize: "0.85rem",
                        paddingTop: "10px",
                      }}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="url(#colorFabric)"
                      radius={[8, 8, 0, 0]}
                      name="الكمية"
                    >
                      <LabelList
                        dataKey="quantity"
                        position="top"
                        style={{
                          fill: "#2C1810",
                          fontSize: "12px",
                          fontWeight: 700,
                          fontFamily: "Cairo, Tajawal, sans-serif",
                        }}
                      />
                      {fabricTypeChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} 
                        />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="colorFabric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7FB3A3" stopOpacity={1} />
                        <stop offset="50%" stopColor="#C99A9A" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#B8A082" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Delivery Orders Statistics Chart */}
          <Grid item xs={12} lg={8} sx={{ order: { xs: 3, lg: 0 } }}>
            <Paper
              elevation={0}
              className="fade-in"
              style={{ animationDelay: "0.5s" }}
              sx={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.95) 100%)",
                borderRadius: 4,
                padding: { xs: 2, sm: 3, md: 4 },
                boxShadow: "0 10px 40px rgba(139, 69, 19, 0.12), 0 2px 8px rgba(139, 69, 19, 0.08)",
                backdropFilter: "blur(10px)",
                height: 450,
                width:700,
                border: "1px solid rgba(139, 69, 19, 0.12)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 15px 50px rgba(139, 69, 19, 0.18), 0 4px 12px rgba(139, 69, 19, 0.12)",
                  transform: "translateY(-4px)",
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #6B9BC4 0%, #A67C8E 50%, #C4A882 100%)",
                  borderRadius: "4px 4px 0 0",
                },
              }}
            >
              {/* Header */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center", 
                marginBottom: 3,
                gap: 2,
                flexWrap: "wrap",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShowChart sx={{ fontSize: 28, color: "#6B9BC4" }} />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700, 
                      color: "#2C1810",
                      fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                    }}
                  >
                    إحصائيات طلبات التوصيل (آخر 7 أيام)
                  </Typography>
                </Box>
                
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: 140,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontWeight: 600,
                    },
                  }}
                >
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#2C1810",
                    }}
                  >
                    <MenuItem value="today">اليوم</MenuItem>
                    <MenuItem value="yesterday">أمس</MenuItem>
                    <MenuItem value="month">هذا الشهر</MenuItem>
                    <MenuItem value="customMonth">شهر مخصص</MenuItem>
                    <MenuItem value="custom">تاريخ مخصص</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {dateFilter === "customMonth" && (
                <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 120,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>الشهر</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="الشهر"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      <MenuItem value={1}>يناير</MenuItem>
                      <MenuItem value={2}>فبراير</MenuItem>
                      <MenuItem value={3}>مارس</MenuItem>
                      <MenuItem value={4}>أبريل</MenuItem>
                      <MenuItem value={5}>مايو</MenuItem>
                      <MenuItem value={6}>يونيو</MenuItem>
                      <MenuItem value={7}>يوليو</MenuItem>
                      <MenuItem value={8}>أغسطس</MenuItem>
                      <MenuItem value={9}>سبتمبر</MenuItem>
                      <MenuItem value={10}>أكتوبر</MenuItem>
                      <MenuItem value={11}>نوفمبر</MenuItem>
                      <MenuItem value={12}>ديسمبر</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 100,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="السنة"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#2C1810",
                      }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
              )}
              {dateFilter === "custom" && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}

              {loadingDeliveryStats ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}>
                  <CircularProgress size={40} sx={{ color: "#6B9BC4" }} />
                </Box>
              ) : deliveryStats.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}>
                  <Typography variant="body1" sx={{ color: "#B8955F", fontWeight: 600 }}>
                    لا توجد بيانات لطلبات التوصيل في الفترة المحددة
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart 
                    data={deliveryStats} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6B9BC4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6B9BC4" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A67C8E" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#A67C8E" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 69, 19, 0.1)" />
                    <XAxis
                      dataKey="dateFormatted"
                      tick={{ fill: "#2C1810", fontSize: 12, fontWeight: 600 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }} 
                      label={{ 
                        value: "عدد الطلبات", 
                        angle: -90, 
                        position: "insideLeft", 
                        fill: "#6B9BC4", 
                        fontSize: 13, 
                        fontWeight: 600 
                      }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }} 
                      label={{ 
                        value: "المبلغ (₪)", 
                        angle: 90, 
                        position: "insideRight", 
                        fill: "#A67C8E", 
                        fontSize: 13, 
                        fontWeight: 600 
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <Paper
                              sx={{
                                padding: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                borderRadius: 3,
                                border: "2px solid #6B9BC4",
                              }}
                            >
                              <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: "#2C1810" }}>
                                {payload[0].payload.dateFormatted}
                              </Typography>
                              {payload.map((entry, index) => (
                                <Typography key={index} variant="body2" sx={{ color: entry.color, fontWeight: 600 }}>
                                  {entry.name === "عدد الطلبات" && `الطلبات: ${entry.value}`}
                                  {entry.name === "المبلغ الإجمالي" && `المبلغ: ${entry.value.toLocaleString()} ₪`}
                                </Typography>
                              ))}
                            </Paper>
                          );
                        }
                        return null;
                      }}
                      cursor={{ fill: "rgba(139, 69, 19, 0.1)" }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        color: "#2C1810", 
                        fontWeight: 600, 
                        fontSize: "0.85rem",
                        paddingTop: "10px",
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="ordersCount"
                      fill="url(#colorOrders)"
                      stroke="#6B9BC4"
                      strokeWidth={3}
                      name="عدد الطلبات"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalAmount"
                      stroke="#A67C8E"
                      strokeWidth={3}
                      dot={{ fill: "#A67C8E", r: 5 }}
                      activeDot={{ r: 7 }}
                      name="المبلغ الإجمالي"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Fabric Type Pieces Count */}
      <Box sx={{ mt: 4 }}>
        <Paper
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)",
            borderRadius: 3,
            padding: { xs: 2, sm: 3 },
            boxShadow: "0 8px 32px rgba(139, 69, 19, 0.12)",
            border: "1px solid rgba(139, 69, 19, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  background: "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 100%)",
                  borderRadius: 2,
                  width: 56,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(107, 142, 127, 0.3)",
                }}
              >
                <Inventory sx={{ fontSize: 28, color: "#ffffff" }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: calmPalette.textPrimary,
                    fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                  }}
                >
                  عدد القطع لكل نوع قماش قبل الطباعة
                </Typography>
                {fabricTypePieces && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: calmPalette.textSecondary,
                      mt: 0.5,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    إجمالي القطع: {fabricTypePieces.totalPieces?.toLocaleString() || 0}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {loadingFabricPieces ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
              <CircularProgress sx={{ color: "#6B8E7F" }} />
            </Box>
          ) : fabricTypePieces && fabricTypePieces.fabricTypes && fabricTypePieces.fabricTypes.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 2,
                width: "100%",
              }}
            >
              {fabricTypePieces.fabricTypes.map((fabric, index) => {
                const colorIndex = index % COLORS.length;
                const color = COLORS[colorIndex];
                const percentage = fabricTypePieces.totalPieces > 0
                  ? ((fabric.totalPieces / fabricTypePieces.totalPieces) * 100).toFixed(1)
                  : 0;

                return (
                  <Card
                    key={fabric.fabricTypeId}
                    sx={{
                      flex: "1 1 0",
                      minWidth: 0,
                      height: "100%",
                      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                      borderRadius: 3,
                      border: `2px solid ${color}40`,
                      boxShadow: `0 4px 16px ${color}20`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: `0 8px 24px ${color}40`,
                        borderColor: `${color}80`,
                      },
                    }}
                  >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                          <Box
                            sx={{
                              background: color,
                              borderRadius: 2,
                              width: 48,
                              height: 48,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 4px 12px ${color}50`,
                            }}
                          >
                            <Typography sx={{ fontSize: 16, color: "#ffffff", fontWeight: 700 }}>
                              {percentage}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: calmPalette.textPrimary,
                            mb: 1,
                            fontSize: { xs: "0.95rem", sm: "1.1rem" },
                            minHeight: 40,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {fabric.fabricTypeNameAr || `نوع قماش ${fabric.fabricTypeId}`}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 1,
                            mt: 2,
                            pt: 2,
                            borderTop: `1px solid ${color}30`,
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 800,
                              color: color,
                              fontSize: { xs: "1.5rem", sm: "1.75rem" },
                            }}
                          >
                            {fabric.totalPieces?.toLocaleString() || 0}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: calmPalette.textSecondary,
                              fontWeight: 600,
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            قطعة
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="body1" sx={{ color: calmPalette.textSecondary }}>
                لا توجد بيانات لأنواع القماش
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Order Status Statistics - Creative Display */}
      {orderStatusStats.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)",
              borderRadius: 3,
              padding: { xs: 2, sm: 3 },
              boxShadow: "0 8px 32px rgba(139, 69, 19, 0.12)",
              border: "1px solid rgba(139, 69, 19, 0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    background: "linear-gradient(135deg, #A67C8E 0%, #6B8E7F 100%)",
                    borderRadius: 2,
                    width: 56,
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(166, 124, 142, 0.3)",
                  }}
                >
                  <Assignment sx={{ fontSize: 28, color: "#ffffff" }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: calmPalette.textPrimary,
                      fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                    }}
                  >
                    إحصائيات حالة الطلبات
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: calmPalette.textSecondary,
                      mt: 0.5,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    نظرة شاملة على جميع حالات الطلبات
                  </Typography>
                </Box>
              </Box>
            </Box>

            {loadingStatusStats ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
                <CircularProgress sx={{ color: "#A67C8E" }} />
              </Box>
            ) : orderStatusStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={[...orderStatusStats].sort((a, b) => a.status - b.status)}
                  margin={{ top: 5, right: 15, left: 5, bottom: 40 }}
                >
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B8E7F" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6B8E7F" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A67C8E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#A67C8E" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorAmountWithoutDelivery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B7FA8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8B7FA8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 69, 19, 0.1)" />
                  <XAxis
                    dataKey="statusNameAr"
                    tick={{ fill: "#2C1810", fontSize: 12, fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#2C1810", fontSize: 13, fontWeight: 600 }}
                    label={{
                      value: "عدد الطلبات",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#6B8E7F",
                    fontSize: 12,
                    fontWeight: 600,
                    }}
                    width={60}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#2C1810", fontSize: 12, fontWeight: 600 }}
                    width={70}
                    label={{
                      value: "المبلغ (₪)",
                      angle: 90,
                      position: "insideRight",
                      fill: "#A67C8E",
                      fontSize: 12,
                      fontWeight: 600,
                      offset: 5,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Paper
                            sx={{
                              padding: 2.5,
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                              borderRadius: 3,
                              border: "2px solid #A67C8E",
                              minWidth: 250,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                mb: 1.5,
                                color: "#2C1810",
                                fontSize: "1.1rem",
                                borderBottom: "2px solid #A67C8E",
                                pb: 1,
                              }}
                            >
                              {data.statusNameAr || `حالة ${data.status}`}
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 1,
                                  borderRadius: 1,
                                  backgroundColor: "rgba(107, 142, 127, 0.1)",
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#2C1810" }}>
                                  عدد الطلبات:
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: "#6B8E7F" }}>
                                  {data.ordersCount || 0}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 1,
                                  borderRadius: 1,
                                  backgroundColor: "rgba(166, 124, 142, 0.1)",
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#2C1810" }}>
                                  المبلغ الإجمالي:
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: "#A67C8E" }}>
                                  {data.totalAmount?.toLocaleString() || 0} ₪
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 1,
                                  borderRadius: 1,
                                  backgroundColor: "rgba(139, 127, 168, 0.1)",
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#2C1810" }}>
                                  بدون التوصيل:
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: "#8B7FA8" }}>
                                  {data.totalAmountWithoutDelivery?.toLocaleString() || 0} ₪
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: "rgba(139, 69, 19, 0.1)" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="ordersCount"
                    fill="url(#colorOrders)"
                    radius={[8, 8, 0, 0]}
                    name="عدد الطلبات"
                  >
                    <LabelList
                      dataKey="ordersCount"
                      position="top"
                      style={{
                        fill: "#2C1810",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "Cairo, Tajawal, sans-serif",
                      }}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#A67C8E"
                    strokeWidth={3}
                    dot={{ fill: "#A67C8E", r: 5 }}
                    activeDot={{ r: 7 }}
                    name="المبلغ الإجمالي"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalAmountWithoutDelivery"
                    stroke="#8B7FA8"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: "#8B7FA8", r: 5 }}
                    activeDot={{ r: 7 }}
                    name="بدون التوصيل"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body1" sx={{ color: calmPalette.textSecondary }}>
                  لا توجد بيانات لإحصائيات حالة الطلبات
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default WelcomeDashboard;

