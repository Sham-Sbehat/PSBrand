import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  Chip,
  IconButton,
  Card,
  CardMedia,
  CardActions,
} from '@mui/material';
import {
  Person,
  Phone,
  LocationOn,
  Description,
  Straighten,
  Palette,
  AttachMoney,
  CloudUpload,
  Delete,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';

const OrderForm = ({ onSuccess }) => {
  const { addOrder, user } = useApp();
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerLocation: '',
      customerDetails: '',
      size: '',
      color: '',
      price: '',
      orderDetails: '',
    },
  });

  // معالجة اختيار الصور
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);

    // إنشاء معاينات للصور
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // حذف صورة
  const handleDeleteImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // إرسال النموذج
  const onSubmit = (data) => {
    const orderData = {
      ...data,
      images: images.length,
      imagePreviews: imagePreviews,
      employeeName: user?.name || 'موظف',
      employeeId: user?.id || Date.now(),
    };

    addOrder(orderData);
    setSubmitSuccess(true);

    // إعادة تعيين النموذج
    setTimeout(() => {
      reset();
      setImages([]);
      setImagePreviews([]);
      setSubmitSuccess(false);
      if (onSuccess) onSuccess();
    }, 2000);
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, marginBottom: 3 }}
      >
        إنشاء طلب جديد
      </Typography>

      {submitSuccess && (
        <Alert severity="success" sx={{ marginBottom: 3 }}>
          تم إرسال الطلب بنجاح! ✓
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* معلومات الزبون */}
        <Box sx={{ marginBottom: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              marginBottom: 2,
            }}
          >
            معلومات الزبون
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="customerName"
                control={control}
                rules={{ required: 'الاسم مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="اسم الزبون"
                    error={!!errors.customerName}
                    helperText={errors.customerName?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="customerPhone"
                control={control}
                rules={{
                  required: 'رقم الهاتف مطلوب',
                  pattern: {
                    value: /^[0-9+\-\s()]+$/,
                    message: 'رقم هاتف غير صحيح',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="رقم الهاتف"
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="customerLocation"
                control={control}
                rules={{ required: 'الموقع مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الموقع"
                    error={!!errors.customerLocation}
                    helperText={errors.customerLocation?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="customerDetails"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تفاصيل إضافية عن الزبون"
                    multiline
                    rows={2}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Description />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>

        {/* تفاصيل الطلب */}
        <Box sx={{ marginBottom: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              marginBottom: 2,
            }}
          >
            تفاصيل الطلب
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Controller
                name="size"
                control={control}
                rules={{ required: 'المقاس مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المقاس"
                    placeholder="مثال: XL, L, M"
                    error={!!errors.size}
                    helperText={errors.size?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Straighten />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="color"
                control={control}
                rules={{ required: 'اللون مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="اللون"
                    error={!!errors.color}
                    helperText={errors.color?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Palette />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="price"
                control={control}
                rules={{
                  required: 'السعر مطلوب',
                  pattern: {
                    value: /^[0-9]+$/,
                    message: 'السعر يجب أن يكون رقماً',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="السعر"
                    type="number"
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="orderDetails"
                control={control}
                rules={{ required: 'تفاصيل الطلب مطلوبة' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تفاصيل الطلب"
                    multiline
                    rows={4}
                    error={!!errors.orderDetails}
                    helperText={errors.orderDetails?.message}
                    placeholder="اكتب تفاصيل التصميم والملاحظات الخاصة بالطلب"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>

        {/* رفع الصور */}
        <Box sx={{ marginBottom: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              marginBottom: 2,
            }}
          >
            صور التصميم
          </Typography>

          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            fullWidth
            sx={{ marginBottom: 2, padding: 2 }}
          >
            رفع صور التصميم
            <input
              type="file"
              hidden
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
          </Button>

          {imagePreviews.length > 0 && (
            <Grid container spacing={2}>
              {imagePreviews.map((preview, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="140"
                      image={preview}
                      alt={`صورة ${index + 1}`}
                    />
                    <CardActions sx={{ justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteImage(index)}
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {images.length > 0 && (
            <Box sx={{ marginTop: 2 }}>
              <Chip
                label={`تم اختيار ${images.length} صورة`}
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        {/* زر الإرسال */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{
            padding: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          إرسال الطلب
        </Button>
      </form>
    </Paper>
  );
};

export default OrderForm;


