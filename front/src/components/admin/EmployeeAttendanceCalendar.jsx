import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Button,
  Chip,
  Avatar,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  useTheme,
  alpha,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  Delete,
  AccessTime,
  Person,
  CalendarMonth,
  People,
  FilterList,
  TableChart,
  Edit,
} from "@mui/icons-material";
import { designInventoryLogsService, SHIFT_TIME_VALUES, SHIFT_TIME_ENUM } from "../../services/api";
import { useApp } from "../../context/AppContext";
import Swal from "sweetalert2";

// Shift time colors
const SHIFT_COLORS = {
  A: { bg: "#4CAF50", text: "#fff", label: "دوام A", icon: "🌅" },
  B: { bg: "#2196F3", text: "#fff", label: "دوام B", icon: "🌆" },
  "A+B": { bg: "#FF9800", text: "#fff", label: "دوام A+B", icon: "⏰" },
  OFF: { bg: "#9E9E9E", text: "#fff", label: "إجازة", icon: "🏖️" },
};

const EmployeeAttendanceCalendar = () => {
  const theme = useTheme();
  const { employees, loadEmployees } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [currentView, setCurrentView] = useState(0); // 0 = Calendar, 1 = Filter
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterShiftTime, setFilterShiftTime] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    shiftTime: "",
    notes: "",
    designsCount: "",
    approvedDesignsCount: "",
    printFileSize: "",
    applyToAll: false,
  });

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Adjust for RTL (Arabic week starts on Saturday = 6)
  const adjustedStartingDay = (startingDayOfWeek + 1) % 7;

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < adjustedStartingDay; i++) {
      days.push(null);
    }
    
    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  }, [currentMonth, currentYear, adjustedStartingDay, daysInMonth]);

  // Split calendar days into weeks (7 days per week)
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  // Week days in Arabic
  const weekDays = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

  // Load employees - only once
  useEffect(() => {
    const fetchEmployees = async () => {
      if (loadEmployees && employees.length === 0) {
        setLoadingEmployees(true);
        try {
          await loadEmployees();
        } catch (error) {
          console.error("Error loading employees:", error);
        } finally {
          setLoadingEmployees(false);
        }
      }
    };
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load logs for current month
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      const lastDay = new Date(year, month + 1, 0).getDate();
      
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const data = await designInventoryLogsService.getAllLogs({
        startDate,
        endDate,
      });
      
      const logsArray = Array.isArray(data) ? data : (data?.data || []);
      setLogs(logsArray);
    } catch (error) {
      console.error("Error loading logs:", error);
      Swal.fire({
        title: "خطأ!",
        text: "حدث خطأ أثناء جلب بيانات الدوام",
        icon: "error",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Memoize today's date
  const todayDate = useMemo(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    };
  }, []);

  // Get logs for specific date - memoized
  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log.date) {
        const dateKey = log.date.split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push(log);
      }
    });
    return map;
  }, [logs]);

  const getLogsForDate = useCallback((day) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return logsByDate.get(dateStr) || [];
  }, [currentYear, currentMonth, logsByDate]);

  // Get shift time label - handles both enum numbers and strings from API
  const getShiftLabel = useCallback((shiftTime) => {
    // Handle string values from API
    if (typeof shiftTime === 'string') {
      if (shiftTime === "A" || shiftTime === "A+B" || shiftTime === "B" || shiftTime === "OFF") {
        return shiftTime;
      }
      return "";
    }
    // Handle enum numbers
    if (shiftTime === SHIFT_TIME_ENUM.A) return "A";
    if (shiftTime === SHIFT_TIME_ENUM.B) return "B";
    if (shiftTime === SHIFT_TIME_ENUM.APlusB) return "A+B";
    if (shiftTime === SHIFT_TIME_ENUM.OFF) return "OFF";
    return "";
  }, []);

  // Get employee name by ID - memoized
  const employeesMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      map.set(emp.id, emp.name || "غير محدد");
    });
    return map;
  }, [employees]);

  const getEmployeeName = useCallback((employeeId) => {
    return employeesMap.get(employeeId) || "غير محدد";
  }, [employeesMap]);

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Open dialog to add log
  const handleOpenDialog = (day) => {
    if (!day) return;
    
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSelectedDate(day);
    setEditingLogId(null);
    setFormData({
      userId: "",
      date: dateStr,
      shiftTime: "",
      notes: "",
      designsCount: "",
      approvedDesignsCount: "",
      printFileSize: "",
      applyToAll: false,
    });
    
    setOpenDialog(true);
  };

  // Open dialog to edit log
  const handleEditLog = (log, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log("handleEditLog called with log:", log);
    
    const dateObj = new Date(log.date);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Convert shiftTime string to enum number
    let shiftTimeEnum = "";
    if (log.shiftTime === "A") shiftTimeEnum = SHIFT_TIME_ENUM.A.toString();
    else if (log.shiftTime === "B") shiftTimeEnum = SHIFT_TIME_ENUM.B.toString();
    else if (log.shiftTime === "A+B") shiftTimeEnum = SHIFT_TIME_ENUM.APlusB.toString();
    else if (log.shiftTime === "OFF") shiftTimeEnum = SHIFT_TIME_ENUM.OFF.toString();
    
    console.log("Setting form data, shiftTimeEnum:", shiftTimeEnum);
    
    setEditingLogId(log.id);
    setSelectedDate(dateObj.getDate());
    setFormData({
      userId: log.userId.toString(),
      date: dateStr,
      shiftTime: shiftTimeEnum,
      notes: log.notes || "",
      designsCount: log.designsCount?.toString() || "",
      approvedDesignsCount: log.approvedDesignsCount?.toString() || "",
      printFileSize: log.printFileSize || "",
      applyToAll: false,
    });
    
    // Close details dialog if open
    setOpenDetailsDialog(false);
    setSelectedLog(null);
    
    // Open edit dialog
    console.log("Opening dialog...");
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDate(null);
    setEditingLogId(null);
    setFormData({
      userId: "",
      date: "",
      shiftTime: "",
      notes: "",
      designsCount: "",
      approvedDesignsCount: "",
      printFileSize: "",
      applyToAll: false,
    });
  };

  // Convert shiftTime enum to string
  const getShiftTimeString = (shiftTimeEnum) => {
    if (shiftTimeEnum === SHIFT_TIME_ENUM.A) return "A";
    if (shiftTimeEnum === SHIFT_TIME_ENUM.B) return "B";
    if (shiftTimeEnum === SHIFT_TIME_ENUM.APlusB) return "A+B";
    if (shiftTimeEnum === SHIFT_TIME_ENUM.OFF) return "OFF";
    return "";
  };

  // Save log
  const handleSaveLog = async () => {
    if (!formData.shiftTime) {
      Swal.fire({
        title: "تحذير!",
        text: "يرجى اختيار نوع الدوام",
        icon: "warning",
        confirmButtonText: "حسناً",
      });
      return;
    }

    if (!formData.applyToAll && !formData.userId) {
      Swal.fire({
        title: "تحذير!",
        text: "يرجى اختيار الموظف أو تفعيل 'تطبيق على الجميع'",
        icon: "warning",
        confirmButtonText: "حسناً",
      });
      return;
    }

    try {
      // Convert date to ISO 8601 format with time
      const dateObj = new Date(formData.date);
      const isoDate = dateObj.toISOString();
      
      const logData = {
        date: isoDate,
        shiftTime: getShiftTimeString(Number(formData.shiftTime)),
        notes: formData.notes || "",
        designsCount: formData.designsCount ? Number(formData.designsCount) : 0,
        approvedDesignsCount: formData.approvedDesignsCount ? Number(formData.approvedDesignsCount) : 0,
        printFileSize: formData.printFileSize || "",
      };

      if (editingLogId) {
        // Update existing log
        await designInventoryLogsService.updateLog(editingLogId, {
          ...logData,
          userId: Number(formData.userId),
        });
        Swal.fire({
          title: "نجح!",
          text: "تم تحديث الدوام بنجاح",
          icon: "success",
          confirmButtonText: "حسناً",
        });
      } else if (formData.applyToAll) {
        // Apply to all employees
        const promises = employees.map((employee) =>
          designInventoryLogsService.createLog({
            ...logData,
            userId: Number(employee.id),
          })
        );
        await Promise.all(promises);
        Swal.fire({
          title: "نجح!",
          text: `تم إضافة الدوام لجميع الموظفين (${employees.length}) بنجاح`,
          icon: "success",
          confirmButtonText: "حسناً",
        });
      } else {
        // Apply to selected employee
        await designInventoryLogsService.createLog({
          ...logData,
          userId: Number(formData.userId),
        });
        Swal.fire({
          title: "نجح!",
          text: "تم إضافة الدوام بنجاح",
          icon: "success",
          confirmButtonText: "حسناً",
        });
      }

      handleCloseDialog();
      loadLogs();
    } catch (error) {
      console.error("Error saving log:", error);
      Swal.fire({
        title: "خطأ!",
        text: error.response?.data?.message || "حدث خطأ أثناء حفظ الدوام",
        icon: "error",
        confirmButtonText: "حسناً",
      });
    }
  };

  // Open details dialog
  const handleOpenDetailsDialog = (log, e) => {
    e.stopPropagation();
    setSelectedLog(log);
    setOpenDetailsDialog(true);
  };

  // Close details dialog
  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedLog(null);
  };

  // Delete log
  const handleDeleteLog = async (log, e) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: "هل أنت متأكد؟",
      text: `هل أنت متأكد من حذف دوام ${getEmployeeName(log.userId)}؟`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "نعم، احذفه!",
      cancelButtonText: "إلغاء",
    });

    if (result.isConfirmed) {
      try {
        await designInventoryLogsService.deleteLog(log.id);
        Swal.fire({
          title: "تم الحذف!",
          text: "تم حذف الدوام بنجاح",
          icon: "success",
          confirmButtonText: "حسناً",
        });
        loadLogs();
      } catch (error) {
        console.error("Error deleting log:", error);
        Swal.fire({
          title: "خطأ!",
          text: "حدث خطأ أثناء حذف الدوام",
          icon: "error",
          confirmButtonText: "حسناً",
        });
      }
    }
  };

  // Format date for display
  const formatMonthYear = (date) => {
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Filter logs based on selected filters
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    
    if (filterEmployee) {
      filtered = filtered.filter(log => log.userId === Number(filterEmployee));
    }
    
    if (filterShiftTime) {
      filtered = filtered.filter(log => {
        const shiftLabel = getShiftLabel(log.shiftTime);
        return shiftLabel === filterShiftTime;
      });
    }
    
    if (filterDate) {
      filtered = filtered.filter(log => {
        if (!log.date) return false;
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === filterDate;
      });
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Newest first
    });
  }, [logs, filterEmployee, filterShiftTime, filterDate, getShiftLabel]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          background: "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)",
          borderRadius: 3,
          color: "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CalendarMonth sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
                متابعة دوام الموظفين
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.85rem" }}>
                انقر على أي يوم لإضافة دوام لموظف أو لجميع الموظفين
              </Typography>
            </Box>
          </Box>
          <Tooltip title="انقر هنا للعودة لليوم الحالي">
            <Button
              variant="contained"
              startIcon={<Today />}
              onClick={goToToday}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              اليوم
            </Button>
          </Tooltip>
        </Box>
        
        {/* Calendar Navigation */}
        <Box 
          sx={{ 
            mt: 2.5,
            pt: 2,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between" 
          }}
        >
          <IconButton 
            onClick={() => navigateMonth("prev")} 
            sx={{ 
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.2)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.3)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              color: "#fff",
            }}
          >
            {formatMonthYear(currentDate)}
          </Typography>
          <IconButton 
            onClick={() => navigateMonth("next")} 
            sx={{ 
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.2)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.3)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>

      {/* Tabs for View Selection */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={currentView}
          onChange={(e, newValue) => setCurrentView(newValue)}
          sx={{
            borderBottom: "1px solid rgba(107, 142, 127, 0.15)",
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minHeight: 48,
            },
          }}
          TabIndicatorProps={{
            sx: {
              height: '3px',
              borderRadius: '3px 3px 0 0',
              background: 'linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 100%)',
            },
          }}
        >
          <Tab
            label="التقويم"
            icon={<CalendarMonth />}
            iconPosition="start"
            sx={{
              color: currentView === 0 ? '#5A7A6B' : '#7A9A8B',
              '&.Mui-selected': {
                color: '#5A7A6B',
                fontWeight: 700,
              },
            }}
          />
          <Tab
            label="فلترة وعرض"
            icon={<FilterList />}
            iconPosition="start"
            sx={{
              color: currentView === 1 ? '#5A7A6B' : '#7A9A8B',
              '&.Mui-selected': {
                color: '#5A7A6B',
                fontWeight: 700,
              },
            }}
          />
        </Tabs>
      </Paper>

      {currentView === 0 ? (
        <>
      {loading || loadingEmployees ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 3,
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(107, 142, 127, 0.15)",
            boxShadow: "0 4px 20px rgba(107, 142, 127, 0.1)",
          }}
        >
          {/* Calendar Days Grid - Split into weeks */}
          {calendarWeeks.map((week, weekIndex) => (
            <Box key={weekIndex} sx={{ display: "flex", gap: 1, mb: 1, width: "100%" }}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return null;
                }
                
                const dayLogs = getLogsForDate(day);
                const isToday =
                  day &&
                  currentYear === todayDate.year &&
                  currentMonth === todayDate.month &&
                  day === todayDate.day;

                // Calculate the actual day of week for this day
                let actualDayOfWeek = null;
                if (day) {
                  const dateObj = new Date(currentYear, currentMonth, day);
                  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
                  // Convert to Arabic week index: Saturday = 0, Sunday = 1, etc.
                  actualDayOfWeek = (dayOfWeek + 1) % 7;
                }

                return (
                  <Box key={`${weekIndex}-${dayIndex}`} sx={{ flex: "1 1 0", minWidth: 0 }}>
                    {day ? (
                      <Box>
                        {/* Day Name Header - Show actual day of week */}
                        {actualDayOfWeek !== null && (
                           <Box
                             sx={{
                               p: 1,
                               textAlign: "center",
                               fontWeight: 700,
                               color: "#fff",
                               background: isToday 
                                 ? "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 100%)"
                                 : "linear-gradient(135deg, rgba(107, 142, 127, 0.6) 0%, rgba(139, 127, 168, 0.6) 100%)",
                               borderRadius: 2,
                               fontSize: "0.8rem",
                               mb: 1,
                               boxShadow: isToday ? "0 2px 8px rgba(107, 142, 127, 0.4)" : "0 1px 4px rgba(107, 142, 127, 0.3)",
                             }}
                           >
                             {weekDays[actualDayOfWeek]}
                           </Box>
                        )}
                         <Card
                           onClick={() => handleOpenDialog(day)}
                           elevation={0}
                           sx={{
                             p: 1.5,
                             minHeight: 130,
                             display: "flex",
                             flexDirection: "column",
                             cursor: "pointer",
                             borderRadius: 3,
                             border: isToday ? "3px solid #6B8E7F" : "2px solid",
                             borderColor: isToday
                               ? "#6B8E7F"
                               : alpha(theme.palette.divider, 0.3),
                             bgcolor: isToday 
                               ? "rgba(107, 142, 127, 0.12)"
                               : "#ffffff",
                             backdropFilter: "blur(10px)",
                             transition: "all 0.3s ease",
                             position: "relative",
                             overflow: "hidden",
                             boxShadow: isToday 
                               ? "0 4px 12px rgba(107, 142, 127, 0.25)"
                               : "0 2px 8px rgba(0, 0, 0, 0.1)",
                             "&::before": {
                               content: '""',
                               position: "absolute",
                               top: 0,
                               right: 0,
                               width: "100%",
                               height: "100%",
                               background: isToday
                                 ? "linear-gradient(135deg, rgba(107, 142, 127, 0.15) 0%, rgba(139, 127, 168, 0.15) 100%)"
                                 : "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
                               pointerEvents: "none",
                             },
                             "&:hover": {
                               transform: "translateY(-4px) scale(1.02)",
                               boxShadow: "0 8px 24px rgba(107, 142, 127, 0.3)",
                               borderColor: "#6B8E7F",
                               bgcolor: isToday 
                                 ? "rgba(107, 142, 127, 0.18)"
                                 : "#ffffff",
                             },
                           }}
                         >
                          {/* Day Number */}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: isToday ? 800 : 700,
                              color: isToday ? "#6B8E7F" : "#2C1810",
                              fontSize: "1.1rem",
                              mb: 1,
                              position: "relative",
                              zIndex: 1,
                              textAlign: "right",
                            }}
                          >
                            {day}
                          </Typography>

                          {/* Logs for this day */}
                          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5, position: "relative", zIndex: 1 }}>
                            {dayLogs.length > 0 ? (
                              dayLogs.slice(0, 3).map((log) => {
                                const shiftTime = getShiftLabel(log.shiftTime);
                                const shiftColor = shiftTime ? SHIFT_COLORS[shiftTime] : null;
                                const employeeName = getEmployeeName(log.userId);
                                
                                return (
                                  <Tooltip
                                    key={log.id}
                                    title={`انقر لعرض التفاصيل - ${employeeName} - ${shiftColor?.label || ""}`}
                                  >
                                    <Chip
                                      icon={<span style={{ fontSize: "0.7rem" }}>{shiftColor?.icon || "⏰"}</span>}
                                      label={`${employeeName.substring(0, 7)}: ${shiftTime}`}
                                      size="small"
                                      onClick={(e) => handleOpenDetailsDialog(log, e)}
                                      onDelete={(e) => handleDeleteLog(log, e)}
                                      deleteIcon={<Delete sx={{ fontSize: 12 }} />}
                                      sx={{
                                        bgcolor: shiftColor?.bg || "#9E9E9E",
                                        color: "#fff",
                                        fontWeight: 600,
                                        fontSize: "0.7rem",
                                        height: 24,
                                        cursor: "pointer",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                          opacity: 0.9,
                                          transform: "scale(1.05)",
                                        },
                                        "& .MuiChip-deleteIcon": {
                                          color: "#fff",
                                          fontSize: "0.7rem",
                                          "&:hover": {
                                            color: "#ffebee",
                                          },
                                        },
                                      }}
                                    />
                                  </Tooltip>
                                );
                              })
                            ) : (
                              <Box sx={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                flex: 1,
                                opacity: 0.7,
                              }}>
                                <Add sx={{ fontSize: 24, color: "#8B7FA8", mb: 0.5 }} />
                                <Typography variant="caption" sx={{ color: "#8B7FA8", fontSize: "0.65rem", fontWeight: 600 }}>
                                  إضافة
                                </Typography>
                              </Box>
                            )}
                            {dayLogs.length > 3 && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: "#6B8E7F", 
                                  fontSize: "0.65rem", 
                                  mt: 0.5,
                                  fontWeight: 700,
                                  textAlign: "center",
                                }}
                              >
                                +{dayLogs.length - 3} أكثر
                              </Typography>
                            )}
                          </Box>
                    </Card>
                      </Box>
                    ) : (
                      <Box>
                        <Box sx={{ mb: 1 }} />
                        <Box sx={{ minHeight: 120 }} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Paper>
      )}
      </>
      ) : (
        <Box>
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 100%)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {filteredLogs.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إجمالي السجلات
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {filteredLogs.filter(log => {
                    const shiftLabel = getShiftLabel(log.shiftTime);
                    return shiftLabel === "A";
                  }).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  دوام A
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {filteredLogs.filter(log => {
                    const shiftLabel = getShiftLabel(log.shiftTime);
                    return shiftLabel === "B";
                  }).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  دوام B
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {filteredLogs.filter(log => {
                    const shiftLabel = getShiftLabel(log.shiftTime);
                    return shiftLabel === "A+B";
                  }).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  دوام A+B
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
            {/* Filters */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "flex-end" }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>فلترة حسب الموظف</InputLabel>
              <Select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                label="فلترة حسب الموظف"
              >
                <MenuItem value="">
                  <em>جميع الموظفين</em>
                </MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: "#6B8E7F", fontSize: "0.75rem" }}>
                        {employee.name?.charAt(0) || "?"}
                      </Avatar>
                      <Typography>{employee.name || "غير محدد"}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>فلترة حسب نوع الدوام</InputLabel>
              <Select
                value={filterShiftTime}
                onChange={(e) => setFilterShiftTime(e.target.value)}
                label="فلترة حسب نوع الدوام"
              >
                <MenuItem value="">
                  <em>جميع أنواع الدوام</em>
                </MenuItem>
                <MenuItem value="A">🌅 دوام A</MenuItem>
                <MenuItem value="B">🌆 دوام B</MenuItem>
                <MenuItem value="A+B">⏰ دوام A+B</MenuItem>
                <MenuItem value="OFF">🏖️ إجازة</MenuItem>
              </Select>
            </FormControl>

            <TextField
              type="date"
              label="فلترة حسب التاريخ"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="outlined"
              onClick={() => {
                setFilterEmployee("");
                setFilterShiftTime("");
                setFilterDate("");
              }}
            >
              إعادة تعيين
            </Button>
          </Box>

          {/* Results Table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography variant="h6" color="text.secondary">
                لا توجد نتائج للفلترة المحددة
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نوع الدوام</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>عدد التصاميم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>عدد التصاميم المعتمدة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>حجم ملف الطباعة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const shiftLabel = getShiftLabel(log.shiftTime);
                    const shiftColor = shiftLabel ? SHIFT_COLORS[shiftLabel] : null;
                    
                    return (
                      <TableRow
                        key={log.id}
                        sx={{
                          '&:hover': { backgroundColor: 'rgba(107, 142, 127, 0.05)' },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: "#6B8E7F", fontSize: "0.875rem" }}>
                              {getEmployeeName(log.userId)?.charAt(0) || "?"}
                            </Avatar>
                            <Typography>{getEmployeeName(log.userId)}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {log.date ? new Date(log.date).toLocaleDateString('ar-SA') : "غير محدد"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={shiftLabel ? (SHIFT_COLORS[shiftLabel]?.label || shiftLabel) : "غير محدد"}
                            sx={{
                              bgcolor: shiftColor?.bg || "#9E9E9E",
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>{log.designsCount ?? 0}</TableCell>
                        <TableCell>{log.approvedDesignsCount ?? 0}</TableCell>
                        <TableCell>{log.printFileSize || "غير محدد"}</TableCell>
                        <TableCell>{log.notes || "-"}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                            <Tooltip title="عرض التفاصيل">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setOpenDetailsDialog(true);
                                }}
                                sx={{ 
                                  color: "#6B8E7F",
                                  "&:hover": {
                                    bgcolor: "rgba(107, 142, 127, 0.1)",
                                  },
                                }}
                              >
                                <AccessTime />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                onClick={(e) => handleEditLog(log, e)}
                                sx={{ 
                                  color: "#2196F3",
                                  "&:hover": {
                                    bgcolor: "rgba(33, 150, 243, 0.1)",
                                  },
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={(e) => handleDeleteLog(log, e)}
                                sx={{ 
                                  color: "#d32f2f",
                                  "&:hover": {
                                    bgcolor: "rgba(211, 47, 47, 0.1)",
                                  },
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          </Paper>
        </Box>
      )}

      {/* Add Dialog - Outside conditional rendering so it works in both tabs */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: "#6B8E7F", color: "#fff" }}>
          {editingLogId ? "تعديل دوام" : "إضافة دوام"} - {selectedDate && `${selectedDate}/${currentMonth + 1}/${currentYear}`}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="التاريخ"
              value={formData.date}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.applyToAll}
                  disabled={!!editingLogId}
                  onChange={(e) => {
                    setFormData({ ...formData, applyToAll: e.target.checked, userId: "" });
                  }}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <People sx={{ color: "#6B8E7F" }} />
                  <Typography>تطبيق على جميع الموظفين</Typography>
                </Box>
              }
            />

            {!formData.applyToAll && (
              <FormControl fullWidth required>
                <InputLabel>اختر الموظف</InputLabel>
                <Select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  label="اختر الموظف"
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "#6B8E7F", fontSize: "0.875rem" }}>
                          {employee.name?.charAt(0) || "?"}
                        </Avatar>
                        <Typography>{employee.name || "غير محدد"}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth required>
              <InputLabel>نوع الدوام</InputLabel>
              <Select
                value={formData.shiftTime}
                onChange={(e) => setFormData({ ...formData, shiftTime: e.target.value })}
                label="نوع الدوام"
              >
                <MenuItem value={SHIFT_TIME_ENUM.A.toString()}>
                  🌅 دوام A
                </MenuItem>
                <MenuItem value={SHIFT_TIME_ENUM.B.toString()}>
                  🌆 دوام B
                </MenuItem>
                <MenuItem value={SHIFT_TIME_ENUM.APlusB.toString()}>
                  ⏰ دوام A+B
                </MenuItem>
                <MenuItem value={SHIFT_TIME_ENUM.OFF.toString()}>
                  🏖️ إجازة
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="عدد التصاميم"
                type="number"
                value={formData.designsCount}
                onChange={(e) => setFormData({ ...formData, designsCount: e.target.value })}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="عدد التصاميم المعتمدة"
                type="number"
                value={formData.approvedDesignsCount}
                onChange={(e) => setFormData({ ...formData, approvedDesignsCount: e.target.value })}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Box>

            <TextField
              label="حجم ملف الطباعة"
              value={formData.printFileSize}
              onChange={(e) => setFormData({ ...formData, printFileSize: e.target.value })}
              fullWidth
              placeholder="مثال: 2.5 MB"
            />
            
            <TextField
              label="ملاحظات"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            onClick={handleSaveLog}
            variant="contained"
            sx={{ bgcolor: "#6B8E7F" }}
          >
            {editingLogId ? "تحديث" : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog - Outside conditional rendering so it works in both tabs */}
      <Dialog
        open={openDetailsDialog}
        onClose={handleCloseDetailsDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: "#6B8E7F", color: "#fff" }}>
          تفاصيل الدوام
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedLog && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: "#6B8E7F" }}>
                  {getEmployeeName(selectedLog.userId)?.charAt(0) || "?"}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {getEmployeeName(selectedLog.userId)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {selectedLog.date ? new Date(selectedLog.date).toLocaleDateString('ar-SA') : "غير محدد"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    نوع الدوام
                  </Typography>
                  <Chip
                    label={(() => {
                      const shiftLabel = getShiftLabel(selectedLog.shiftTime);
                      return shiftLabel ? (SHIFT_COLORS[shiftLabel]?.label || shiftLabel) : "غير محدد";
                    })()}
                    sx={{
                      bgcolor: (() => {
                        const shiftLabel = getShiftLabel(selectedLog.shiftTime);
                        return shiftLabel ? (SHIFT_COLORS[shiftLabel]?.bg || "#9E9E9E") : "#9E9E9E";
                      })(),
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    عدد التصاميم
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedLog.designsCount ?? 0}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    عدد التصاميم المعتمدة
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedLog.approvedDesignsCount ?? 0}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    حجم ملف الطباعة
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedLog.printFileSize || "غير محدد"}
                  </Typography>
                </Box>
              </Box>

              {selectedLog.notes && (
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                    الملاحظات
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            variant="contained" 
            startIcon={<Edit />}
            onClick={(e) => handleEditLog(selectedLog, e)}
            sx={{ bgcolor: "#6B8E7F", "&:hover": { bgcolor: "#5A7A6B" } }}
          >
            تعديل
          </Button>
          <Button onClick={handleCloseDetailsDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeAttendanceCalendar;
