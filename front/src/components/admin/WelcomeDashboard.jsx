import { useState, useEffect } from "react";
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
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  People,
  AttachMoney,
  BarChart,
  PieChart,
  CalendarToday,
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
} from "recharts";
import { ordersService } from "../../services/api";
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

const WelcomeDashboard = () => {
  const theme = useTheme();
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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
      console.error("Error fetching designers statistics:", error);
      setStatistics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [dateFilter, selectedDate]);

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
      background: "linear-gradient(180deg, #faf8f5 0%, #f5f3f0 100%)",
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
            font-size: 14px !important;
            font-weight: 700 !important;
            fill: #2C1810 !important;
            font-family: 'Cairo', 'Tajawal', sans-serif !important;
          }
          .recharts-label-line {
            stroke: #2C1810 !important;
            stroke-width: 2.5px !important;
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

      {/* Charts */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : statistics.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            background: calmPalette.surface,
            borderRadius: 3,
            padding: 6,
            textAlign: "center",
            boxShadow: calmPalette.shadow,
          }}
        >
          <Typography variant="h6" sx={{ color: calmPalette.textMuted }}>
            لا توجد بيانات للفترة المحددة
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Orders Chart */}
          <Grid item xs={12} lg={8}>
            <Paper
              elevation={0}
              sx={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)",
                borderRadius: 4,
                padding: { xs: 2, sm: 3, md: 4 },
                boxShadow: "0 8px 32px rgba(139, 69, 19, 0.15)",
                backdropFilter: "blur(10px)",
                height: "100%",
                border: "1px solid rgba(139, 69, 19, 0.1)",
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
                    <MenuItem value="custom">تاريخ مخصص</MenuItem>
                  </Select>
                </FormControl>
              </Box>
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
                  <Legend 
                    wrapperStyle={{ color: "#2C1810", fontWeight: 600, fontSize: "0.875rem" }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="url(#colorOrders)"
                    radius={[10, 10, 0, 0]}
                    name="عدد الطلبات"
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
          <Grid item xs={12} lg={5}>
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
                height: "100%",
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
                alignItems: "center", 
                marginBottom: 3,
                gap: 1,
              }}>
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
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    label={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="revenue"
                    paddingAngle={4}
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
                      paddingTop: "20px",
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
        </Grid>
      )}
    </Box>
  );
};

export default WelcomeDashboard;

