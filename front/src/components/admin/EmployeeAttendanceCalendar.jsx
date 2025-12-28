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

  // Get shift time label
  const getShiftLabel = useCallback((shiftTime) => {
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

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDate(null);
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

      if (formData.applyToAll) {
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: "linear-gradient(135deg, #6B8E7F 0%, #8B7FA8 50%, #D4A574 100%)",
          borderRadius: 3,
          color: "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CalendarMonth sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                متابعة دوام الموظفين
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                انقر على أي يوم لإضافة دوام لموظف أو لجميع الموظفين
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Today />}
            onClick={goToToday}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
          >
            اليوم
          </Button>
        </Box>
      </Paper>

      {/* Calendar Navigation */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton onClick={() => navigateMonth("prev")} sx={{ color: "#6B8E7F" }}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#2C1810" }}>
            {formatMonthYear(currentDate)}
          </Typography>
          <IconButton onClick={() => navigateMonth("next")} sx={{ color: "#6B8E7F" }}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>

      {loading || loadingEmployees ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          {/* Calendar Days Grid - Split into weeks */}
          {calendarWeeks.map((week, weekIndex) => (
            <Box key={weekIndex} sx={{ display: "flex", gap: 1, mb: 1, width: "100%" }}>
              {week.map((day, dayIndex) => {
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
                              color: "#2C1810",
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              borderRadius: 2,
                              fontSize: "0.85rem",
                              mb: 1,
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
                            minHeight: 120,
                            display: "flex",
                            flexDirection: "column",
                            cursor: "pointer",
                            borderRadius: 2,
                            border: isToday ? "3px solid #6B8E7F" : "2px solid",
                            borderColor: isToday
                              ? "#6B8E7F"
                              : alpha(theme.palette.divider, 0.3),
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: 4,
                              borderColor: "#6B8E7F",
                              bgcolor: alpha(theme.palette.primary.main, 0.05),
                            },
                          }}
                        >
                          {/* Day Number */}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: isToday ? 800 : 700,
                              color: isToday ? "#6B8E7F" : "#2C1810",
                              fontSize: "1rem",
                              mb: 1,
                            }}
                          >
                            {day}
                          </Typography>

                        {/* Logs for this day */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                                    label={`${employeeName.substring(0, 8)}: ${shiftTime}`}
                                    size="small"
                                    onClick={(e) => handleOpenDetailsDialog(log, e)}
                                    onDelete={(e) => handleDeleteLog(log, e)}
                                    deleteIcon={<Delete sx={{ fontSize: 14 }} />}
                                    sx={{
                                      bgcolor: shiftColor?.bg || "#9E9E9E",
                                      color: "#fff",
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                      height: 22,
                                      cursor: "pointer",
                                      "&:hover": {
                                        opacity: 0.9,
                                      },
                                      "& .MuiChip-deleteIcon": {
                                        color: "#fff",
                                        fontSize: "0.7rem",
                                      },
                                    }}
                                  />
                                </Tooltip>
                              );
                            })
                          ) : (
                            <Add sx={{ fontSize: 20, color: "#8B7FA8", opacity: 0.3, alignSelf: "center", mt: 1 }} />
                          )}
                          {dayLogs.length > 3 && (
                            <Typography variant="caption" sx={{ color: "#8B7FA8", fontSize: "0.65rem", mt: 0.5 }}>
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

      {/* Add Dialog */}
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
          إضافة دوام - {selectedDate && `${selectedDate}/${currentMonth + 1}/${currentYear}`}
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
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
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
                    label={SHIFT_COLORS[getShiftLabel(selectedLog.shiftTime)]?.label || "غير محدد"}
                    sx={{
                      bgcolor: SHIFT_COLORS[getShiftLabel(selectedLog.shiftTime)]?.bg || "#9E9E9E",
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDetailsDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeAttendanceCalendar;
