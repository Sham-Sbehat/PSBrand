import { useState } from "react";
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
import { messagesService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import GlassDialog from "../common/GlassDialog";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";

const SendMessageDialog = ({ open, onClose, onMessageSent }) => {
  const { user, employees } = useApp();
  const [recipientType, setRecipientType] = useState("all"); // "all" or "specific"
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [hasExpiryDate, setHasExpiryDate] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

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
        title: title.trim() || "رسالة من الإدمن",
        content: content.trim(),
        isActive: true,
        expiresAt: hasExpiryDate && expiresAt ? expiresAt : null, // فقط إذا تم تحديد تاريخ
      };

      await messagesService.createMessage(messageData);

      Swal.fire({
        icon: "success",
        title: "تم الإرسال بنجاح",
        text:
          recipientType === "all"
            ? "تم إرسال الرسالة لجميع الموظفين"
            : `تم إرسال الرسالة للموظف المحدد`,
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

      // Reset form
      setTitle("");
      setContent("");
      setRecipientType("all");
      setSelectedEmployeeId("");
      setHasExpiryDate(false);
      setExpiresAt("");

      // Notify parent component
      if (onMessageSent) {
        onMessageSent();
      }

      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Extract error message from response
      let errorMessage = "حدث خطأ أثناء إرسال الرسالة";
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
        title: "خطأ في الإرسال",
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
      2: "مصمم",
      3: "مجهز",
      4: "مدير التصميم",
      5: "مغلف",
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
    };
    return colorMap[role] || "default";
  };

  // Filter out admin from employees list
  const availableEmployees = employees.filter((emp) => emp.role !== 1);

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      title="إرسال رسالة/إشعار"
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
            {sending ? "جاري الإرسال..." : "إرسال"}
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
              label="جميع الموظفين"
            />
            <FormControlLabel
              value="specific"
              control={<Radio sx={{ color: calmPalette.primary }} />}
              label="موظف محدد"
            />
          </RadioGroup>
        </FormControl>

        {/* Employee Selection (if specific) */}
        {recipientType === "specific" && (
          <FormControl fullWidth>
            <InputLabel>اختر الموظف</InputLabel>
            <Select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              label="اختر الموظف"
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
              {availableEmployees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography>{employee.name}</Typography>
                    {employee.role && (
                      <Chip
                        label={getRoleLabel(employee.role)}
                        size="small"
                        color={getRoleColor(employee.role)}
                        sx={{ height: 20, fontSize: "0.65rem" }}
                      />
                    )}
                  </Box>
                </MenuItem>
              ))}
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
              ? "لجميع الموظفين"
              : `للموظف المحدد`}{" "}
            وستظهر لهم فوراً في نظام المراسلة.
          </Typography>
        </Box>
      </Box>
    </GlassDialog>
  );
};

export default SendMessageDialog;

