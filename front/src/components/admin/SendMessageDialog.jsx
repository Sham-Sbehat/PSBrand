import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Chip,
  CircularProgress,
  Divider,
  Switch,
  FormGroup,
} from "@mui/material";
import { Send, Close, CalendarToday } from "@mui/icons-material";
import { messagesService, employeesService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { USER_ROLES } from "../../constants";
import GlassDialog from "../common/GlassDialog";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";

const SendMessageDialog = ({ open, onClose, onMessageSent, editingMessage = null, onShowToast }) => {
  const { user, employees } = useApp();
  const [recipientType, setRecipientType] = useState("all"); // "all" or "specific"
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [hasExpiryDate, setHasExpiryDate] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [designersList, setDesignersList] = useState([]); // للمصممين عند فتح النافذة كبائع
  const [loadingDesigners, setLoadingDesigners] = useState(false);

  // عند فتح النافذة كبائع، جلب قائمة المصممين من الـ API
  useEffect(() => {
    if (!open || user?.role !== USER_ROLES.DESIGNER) return;
    let cancelled = false;
    setLoadingDesigners(true);
    employeesService
      .getUsersByRole(USER_ROLES.MAIN_DESIGNER)
      .then((data) => {
        if (!cancelled) setDesignersList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDesignersList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDesigners(false);
      });
    return () => { cancelled = true; };
  }, [open, user?.role]);

  // Initialize form when editingMessage changes
  useEffect(() => {
    if (editingMessage) {
      setTitle(editingMessage.title || "");
      setContent(editingMessage.content || "");
      setRecipientType(editingMessage.userId ? "specific" : "all");
      setSelectedEmployeeId(editingMessage.userId ? String(editingMessage.userId) : "");
      setIsActive(editingMessage.isActive !== undefined ? editingMessage.isActive : true);
      if (editingMessage.expiresAt) {
        setHasExpiryDate(true);
        // Convert ISO date to datetime-local format
        const date = new Date(editingMessage.expiresAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setHasExpiryDate(false);
        setExpiresAt("");
      }
    } else {
      // Reset form for new message
      setTitle("");
      setContent("");
      setRecipientType("all");
      setSelectedEmployeeId("");
      setIsActive(true);
      setHasExpiryDate(false);
      setExpiresAt("");
    }
  }, [editingMessage, open]);

  const handleSend = async () => {
    if (!content.trim()) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "الرجاء إدخال محتوى الرسالة",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    if (recipientType === "specific" && !selectedEmployeeId) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "الرجاء اختيار موظف",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    setSending(true);
    try {
      const messageData = {
        userId: recipientType === "all" ? null : parseInt(selectedEmployeeId), // null للكل، وليس 0
        title: title.trim() || (user?.role === USER_ROLES.DESIGNER ? "رسالة من البائع" : "رسالة من الإدمن"),
        content: content.trim(),
        isActive: isActive,
        expiresAt: hasExpiryDate && expiresAt ? new Date(expiresAt).toISOString() : null, // Convert to ISO string
      };

      let savedMessage = null;
      
      if (editingMessage) {
        // Update existing message
        savedMessage = await messagesService.updateMessage(editingMessage.id, messageData);
        // Use toast notification instead of SweetAlert for updates
        if (onShowToast) {
          onShowToast('تم تحديث الرسالة بنجاح', 'success');
        } else {
          Swal.fire({
            icon: "success",
            title: "تم التحديث بنجاح",
            text: "تم تحديث الرسالة بنجاح",
            confirmButtonColor: calmPalette.primary,
            timer: 2000,
          });
        }
      } else {
        // Create new message
        savedMessage = await messagesService.createMessage(messageData);
        Swal.fire({
          icon: "success",
          title: "تم الإرسال بنجاح",
          text:
            recipientType === "all"
              ? (user?.role === USER_ROLES.DESIGNER ? "تم إرسال الرسالة لجميع المصممين" : "تم إرسال الرسالة لجميع الموظفين")
              : (user?.role === USER_ROLES.DESIGNER ? "تم إرسال الرسالة للمصمم المحدد" : "تم إرسال الرسالة للموظف المحدد"),
          confirmButtonColor: calmPalette.primary,
          timer: 2000,
        });
      }

      // Reset form
      setTitle("");
      setContent("");
      setRecipientType("all");
      setSelectedEmployeeId("");
      setIsActive(true);
      setHasExpiryDate(false);
      setExpiresAt("");

      // Notify parent component with the saved message
      if (onMessageSent) {
        onMessageSent(savedMessage);
      }

      onClose();
    } catch (error) {
      
      // Extract error message from response
      let errorMessage = editingMessage ? "حدث خطأ أثناء تحديث الرسالة" : "حدث خطأ أثناء إرسال الرسالة";
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.details) {
          errorMessage = error.response.data.details;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Swal.fire({
        icon: "error",
        title: editingMessage ? "خطأ في التحديث" : "خطأ في الإرسال",
        text: errorMessage,
        confirmButtonColor: calmPalette.primary,
        footer: error.response?.data?.details ? 
          `<small>${error.response.data.details}</small>` : null
      });
    } finally {
      setSending(false);
    }
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      1: "إدمن",
      2: "بائع",
      3: "محضر طلبات",
      4: "مدير التصميم",
      5: "مغلف",
      6: "مصمم ",
    };
    return roleMap[role] || "موظف";
  };

  const getRoleColor = (role) => {
    const colorMap = {
      1: "error",
      2: "primary",
      3: "success",
      4: "warning",
      5: "info",
      6: "warning",
    };
    return colorMap[role] || "default";
  };

  // When sender is seller (بائع), only main designers (المصممين) - نستخدم القائمة المُحمّلة من API
  const isSeller = user?.role === USER_ROLES.DESIGNER;
  const isMainDesigner = (emp) => {
    const r = emp.role ?? emp.Role;
    return r === USER_ROLES.MAIN_DESIGNER || r === 6 ||
      (typeof r === "string" && (r === "MAIN_DESIGNER" || r.toLowerCase() === "maindesigner"));
  };
  const availableEmployees = isSeller
    ? designersList.length > 0
      ? designersList
      : (employees || []).filter(isMainDesigner)
    : (employees || []).filter((emp) => {
        const r = emp.role ?? emp.Role;
        return r !== USER_ROLES.ADMIN && r !== 1 && r !== "ADMIN" && r !== "admin";
      });

  const dialogTitle = editingMessage
    ? "تعديل الرسالة"
    : isSeller
      ? "إرسال رسالة للمصممين"
      : "إرسال رسالة/إشعار";

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      maxWidth="md"
      fullWidth
      actions={
        <Box sx={{ display: "flex", gap: 2, width: "100%", justifyContent: "flex-end" }}>
          <Button
            onClick={onClose}
            disabled={sending}
            sx={{
              color: calmPalette.textSecondary,
              "&:hover": {
                backgroundColor: "rgba(94, 78, 62, 0.1)",
              },
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sending || !content.trim()}
            startIcon={sending ? <CircularProgress size={20} /> : <Send />}
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
              "&:disabled": {
                backgroundColor: "rgba(94, 78, 62, 0.3)",
              },
            }}
          >
            {sending ? (editingMessage ? "جاري التحديث..." : "جاري الإرسال...") : (editingMessage ? "تحديث" : "إرسال")}
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Recipient Selection */}
        <FormControl component="fieldset">
          <FormLabel
            component="legend"
            sx={{
              color: calmPalette.textPrimary,
              fontWeight: 600,
              mb: 2,
            }}
          >
            نوع المستلم
          </FormLabel>
          <RadioGroup
            value={recipientType}
            onChange={(e) => {
              setRecipientType(e.target.value);
              if (e.target.value === "all") {
                setSelectedEmployeeId("");
              }
            }}
            row
          >
            <FormControlLabel
              value="all"
              control={<Radio sx={{ color: calmPalette.primary }} />}
              label={isSeller ? "جميع المصممين" : "جميع الموظفين"}
            />
            <FormControlLabel
              value="specific"
              control={<Radio sx={{ color: calmPalette.primary }} />}
              label={isSeller ? "مصمم محدد" : "موظف محدد"}
            />
          </RadioGroup>
        </FormControl>

        {/* Employee Selection (if specific) */}
        {recipientType === "specific" && (
          <FormControl fullWidth>
            <InputLabel>{isSeller ? "اختر المصمم" : "اختر الموظف"}</InputLabel>
            <Select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              label={isSeller ? "اختر المصمم" : "اختر الموظف"}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(94, 78, 62, 0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(94, 78, 62, 0.3)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: calmPalette.primary,
                },
              }}
            >
              {loadingDesigners && isSeller && (
                <MenuItem value="" disabled>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">جاري تحميل المصممين...</Typography>
                  </Box>
                </MenuItem>
              )}
              {!loadingDesigners && availableEmployees.length === 0 && (
                <MenuItem value="" disabled>
                  <Typography variant="body2" color="text.secondary">
                    {isSeller ? "لا يوجد مصممين مسجلين" : "لا يوجد موظفين"}
                  </Typography>
                </MenuItem>
              )}
              {availableEmployees.map((employee) => {
                const empId = employee.id ?? employee.Id;
                const empName = employee.name ?? employee.Name ?? "—";
                const empRole = employee.role ?? employee.Role;
                return (
                  <MenuItem key={empId} value={empId}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>{empName}</Typography>
                      {empRole != null && (
                        <Chip
                          label={getRoleLabel(empRole)}
                          size="small"
                          color={getRoleColor(empRole)}
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}

        <Divider />

        {/* Title Field */}
        <TextField
          fullWidth
          label="عنوان الرسالة (اختياري)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: إشعار مهم"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "rgba(94, 78, 62, 0.2)",
              },
              "&:hover fieldset": {
                borderColor: "rgba(94, 78, 62, 0.3)",
              },
              "&.Mui-focused fieldset": {
                borderColor: calmPalette.primary,
              },
            },
          }}
        />

        {/* Content Field */}
        <TextField
          fullWidth
          multiline
          rows={6}
          label="محتوى الرسالة *"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب رسالتك هنا..."
          required
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "rgba(94, 78, 62, 0.2)",
              },
              "&:hover fieldset": {
                borderColor: "rgba(94, 78, 62, 0.3)",
              },
              "&.Mui-focused fieldset": {
                borderColor: calmPalette.primary,
              },
            },
          }}
        />

        <Divider />

        {/* Expiry Date Section */}
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={hasExpiryDate}
                onChange={(e) => {
                  setHasExpiryDate(e.target.checked);
                  if (!e.target.checked) {
                    setExpiresAt("");
                  }
                }}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: calmPalette.primary,
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: calmPalette.primary,
                  },
                }}
              />
            }
            label={
              <Typography sx={{ color: calmPalette.textPrimary, fontWeight: 500 }}>
                تحديد تاريخ انتهاء للرسالة
              </Typography>
            }
          />
        </FormGroup>

        {hasExpiryDate && (
          <TextField
            fullWidth
            type="datetime-local"
            label="تاريخ انتهاء الرسالة"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              startAdornment: <CalendarToday sx={{ mr: 1, color: calmPalette.textSecondary }} />,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "rgba(94, 78, 62, 0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(94, 78, 62, 0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: calmPalette.primary,
                },
              },
            }}
            helperText="سيتم إخفاء الرسالة بعد هذا التاريخ"
          />
        )}

        {/* Active Toggle (only for editing) */}
        {editingMessage && (
          <>
            <Divider />
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: calmPalette.primary,
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: calmPalette.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: calmPalette.textPrimary, fontWeight: 500 }}>
                    نشط
                  </Typography>
                }
              />
            </FormGroup>
          </>
        )}

        {/* Info Box */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            borderRadius: 2,
            border: "1px solid rgba(25, 118, 210, 0.2)",
          }}
        >
          <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
            <strong>ملاحظة:</strong> سيتم إرسال الرسالة{" "}
            {recipientType === "all"
              ? (user?.role === USER_ROLES.DESIGNER ? "لجميع المصممين" : "لجميع الموظفين")
              : (user?.role === USER_ROLES.DESIGNER ? "للمصمم المحدد" : "للموظف المحدد")}{" "}
            وستظهر لهم فوراً في نظام المراسلة.
          </Typography>
        </Box>
      </Box>
    </GlassDialog>
  );
};

export default SendMessageDialog;

