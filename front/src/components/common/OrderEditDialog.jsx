import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import GlassDialog from "./GlassDialog";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "../../constants";

const formatDateForInput = (date) => {
  if (!date) return "";
  const current = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(current?.getTime?.())) return "";
  const offset = current.getTimezoneOffset();
  const localDate = new Date(current.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10); // yyyy-MM-dd
};

const OrderEditDialog = ({
  open,
  order,
  onClose,
  onSubmit,
  title = "تعديل الطلب",
  loading = false,
}) => {
  const initialFormState = useMemo(() => {
    if (!order) {
      return {
        orderNumber: "",
        country: "",
        province: "",
        district: "",
        subTotal: "",
        discountPercentage: "",
        discountAmount: "",
        deliveryFee: "",
        totalAmount: "",
        discountNotes: "",
        notes: "",
        status: ORDER_STATUS.PENDING_PRINTING,
        orderDate: "",
        needsPhotography: false,
      };
    }

    return {
      orderNumber: order.orderNumber || "",
      country: order.country || "",
      province: order.province || "",
      district: order.district || "",
      subTotal: order.subTotal ?? "",
      discountPercentage: order.discountPercentage ?? "",
      discountAmount: order.discountAmount ?? "",
      deliveryFee: order.deliveryFee ?? "",
      totalAmount: order.totalAmount ?? "",
      discountNotes: order.discountNotes || "",
      notes: order.notes || "",
      status:
        typeof order.status === "number"
          ? order.status
          : parseInt(order.status, 10) || ORDER_STATUS.PENDING_PRINTING,
      orderDate: formatDateForInput(order.orderDate),
      needsPhotography: order.needsPhotography || false,
    };
  }, [order]);

  const [formValues, setFormValues] = useState(initialFormState);

  useEffect(() => {
    setFormValues(initialFormState);
  }, [initialFormState, open]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormValues((prev) => ({
      ...prev,
      [field]:
        field === "discountPercentage" ||
        field === "discountAmount" ||
        field === "deliveryFee" ||
        field === "totalAmount" ||
        field === "subTotal"
          ? value === "" || value === null
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!order) return;

    const payload = {
      ...order,
      orderNumber: formValues.orderNumber,
      country: formValues.country,
      province: formValues.province,
      district: formValues.district,
      subTotal:
        formValues.subTotal === "" || Number.isNaN(Number(formValues.subTotal))
          ? 0
          : Number(formValues.subTotal),
      discountPercentage:
        formValues.discountPercentage === "" ||
        Number.isNaN(Number(formValues.discountPercentage))
          ? 0
          : Number(formValues.discountPercentage),
      discountAmount:
        formValues.discountAmount === "" ||
        Number.isNaN(Number(formValues.discountAmount))
          ? 0
          : Number(formValues.discountAmount),
      deliveryFee:
        formValues.deliveryFee === "" || Number.isNaN(Number(formValues.deliveryFee))
          ? 0
          : Number(formValues.deliveryFee),
      totalAmount:
        formValues.totalAmount === "" || Number.isNaN(Number(formValues.totalAmount))
          ? 0
          : Number(formValues.totalAmount),
      discountNotes: formValues.discountNotes,
      notes: formValues.notes,
      status:
        typeof formValues.status === "number"
          ? formValues.status
          : parseInt(formValues.status, 10),
      orderDate: formValues.orderDate ? new Date(formValues.orderDate).toISOString() : null,
      needsPhotography: formValues.needsPhotography || false,
    };

    onSubmit?.(payload);
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      title={title}
      actions={
        <Stack direction="row" spacing={2}>
          <Button onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </Stack>
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ padding: 3, display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          تفاصيل الطلب
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="رقم الطلب"
              fullWidth
              value={formValues.orderNumber}
              onChange={handleChange("orderNumber")}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="التاريخ"
              type="date"
              fullWidth
              value={formValues.orderDate}
              onChange={handleChange("orderDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="البلد"
              fullWidth
              value={formValues.country}
              onChange={handleChange("country")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="المحافظة"
              fullWidth
              value={formValues.province}
              onChange={handleChange("province")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="المنطقة"
              fullWidth
              value={formValues.district}
              onChange={handleChange("district")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="المجموع الفرعي"
              type="number"
              fullWidth
              value={formValues.subTotal}
              onChange={handleChange("subTotal")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="نسبة التخفيض %"
              type="number"
              fullWidth
              value={formValues.discountPercentage}
              onChange={handleChange("discountPercentage")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="قيمة التخفيض"
              type="number"
              fullWidth
              value={formValues.discountAmount}
              onChange={handleChange("discountAmount")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="رسوم التوصيل"
              type="number"
              fullWidth
              value={formValues.deliveryFee}
              onChange={handleChange("deliveryFee")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="الإجمالي الكلي"
              type="number"
              fullWidth
              value={formValues.totalAmount}
              onChange={handleChange("totalAmount")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="الحالة"
              select
              fullWidth
              value={formValues.status}
              onChange={handleChange("status")}
            >
              {Object.values(ORDER_STATUS).map((statusValue) => (
                <MenuItem key={statusValue} value={statusValue}>
                  {ORDER_STATUS_LABELS[statusValue]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formValues.needsPhotography || false}
                  onChange={(e) => handleChange("needsPhotography")({ target: { value: e.target.checked } })}
                  color="primary"
                />
              }
              label="يحتاج تصوير"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="ملاحظات التخفيض"
              fullWidth
              multiline
              rows={2}
              value={formValues.discountNotes}
              onChange={handleChange("discountNotes")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="ملاحظات عامة"
              fullWidth
              multiline
              rows={3}
              value={formValues.notes}
              onChange={handleChange("notes")}
            />
          </Grid>
        </Grid>
      </Box>
    </GlassDialog>
  );
};

export default OrderEditDialog;

