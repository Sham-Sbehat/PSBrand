import { useState, useEffect } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Business,
  Assignment,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import { ordersService, employeesService } from '../../services/api';

const OrderForm = ({ onSuccess }) => {
  const { addOrder, user, employees, loadUsersByRole } = useApp();
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [preparers, setPreparers] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      country: '',
      province: '',
      district: '',
      totalAmount: '',
      designerId: '',
      preparerId: '',
      fabricType: '',
      size: '',
      quantity: '',
      unitPrice: '',
    },
  });

  // تحميل المصممين والمعدين عند تحميل المكون
  useEffect(() => {
    const loadEmployeesData = async () => {
      setLoadingEmployees(true);
      try {
        // جلب المصممين (الدور 2)
        const designersData = await loadUsersByRole(2);
        setDesigners(designersData);

        // جلب المعدين (الدور 3)
        const preparersData = await loadUsersByRole(3);
        setPreparers(preparersData);
      } catch (error) {
        console.error('خطأ في تحميل الموظفين:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployeesData();
  }, [loadUsersByRole]);

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
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // التحقق من الحقول المطلوبة
      if (!data.designerId || data.designerId === '') {
        setSubmitError('يجب اختيار مصمم');
        setIsSubmitting(false);
        return;
      }

      if (!data.preparerId || data.preparerId === '') {
        setSubmitError('يجب اختيار معد');
        setIsSubmitting(false);
        return;
      }

      // تحضير بيانات الطلب حسب API الجديد
    const orderData = {
        id: 0,
        orderNumber: data.orderNumber || `ORD-${Date.now()}`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        country: data.country,
        province: data.province,
        district: data.district,
        orderDate: new Date().toISOString(),
        totalAmount: parseFloat(data.totalAmount) || 0,
        status: 1, // حالة جديدة
        designerId: parseInt(data.designerId),
        preparerId: parseInt(data.preparerId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        designer: {
          id: parseInt(data.designerId),
          name: designers.find(d => d.id === parseInt(data.designerId))?.name || '',
          username: designers.find(d => d.id === parseInt(data.designerId))?.username || '',
          password: designers.find(d => d.id === parseInt(data.designerId))?.password || 'defaultpassword',
          phone: designers.find(d => d.id === parseInt(data.designerId))?.phone || '',
          role: 2, // Designer role
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orders: []
        },
        preparer: {
          id: parseInt(data.preparerId),
          name: preparers.find(p => p.id === parseInt(data.preparerId))?.name || '',
          username: preparers.find(p => p.id === parseInt(data.preparerId))?.username || '',
          password: preparers.find(p => p.id === parseInt(data.preparerId))?.password || 'defaultpassword',
          phone: preparers.find(p => p.id === parseInt(data.preparerId))?.phone || '',
          role: 3, // Preparer role
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orders: []
        },
        orderDesigns: [
          {
            id: 0,
            orderId: 0,
            mockupImageUrl: 'placeholder_mockup.jpg', // قيمة مؤقتة حتى يتم رفع الصور
            printFileUrl: 'placeholder_print.pdf', // قيمة مؤقتة حتى يتم رفع الملفات
            fabricType: data.fabricType,
            size: data.size,
            quantity: parseInt(data.quantity) || 1,
            unitPrice: parseFloat(data.unitPrice) || 0,
            totalPrice: parseFloat(data.unitPrice) * (parseInt(data.quantity) || 1),
            createdAt: new Date().toISOString(),
            order: {
              id: 0,
              orderNumber: data.orderNumber || `ORD-${Date.now()}`,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              country: data.country,
              province: data.province,
              district: data.district,
              orderDate: new Date().toISOString(),
              totalAmount: parseFloat(data.totalAmount) || 0,
              status: 1,
              designerId: parseInt(data.designerId),
              preparerId: parseInt(data.preparerId),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              designer: {
                id: parseInt(data.designerId),
                name: designers.find(d => d.id === parseInt(data.designerId))?.name || '',
                username: designers.find(d => d.id === parseInt(data.designerId))?.username || '',
                password: designers.find(d => d.id === parseInt(data.designerId))?.password || 'defaultpassword',
                phone: designers.find(d => d.id === parseInt(data.designerId))?.phone || '',
                role: 2,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                orders: []
              },
              preparer: {
                id: parseInt(data.preparerId),
                name: preparers.find(p => p.id === parseInt(data.preparerId))?.name || '',
                username: preparers.find(p => p.id === parseInt(data.preparerId))?.username || '',
                password: preparers.find(p => p.id === parseInt(data.preparerId))?.password || 'defaultpassword',
                phone: preparers.find(p => p.id === parseInt(data.preparerId))?.phone || '',
                role: 3,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                orders: []
              },
              orderDesigns: []
            }
          }
        ]
      };

      // طباعة البيانات المرسلة للتشخيص
      console.log('بيانات الطلب المرسلة:', orderData);
      
      // إرسال الطلب إلى API
      const response = await ordersService.createOrder(orderData);
      
      // إذا كان هناك صور، قم برفعها
      if (images.length > 0 && response.id) {
        await ordersService.uploadDesignImages(response.id, images);
      }

      // إضافة الطلب إلى السياق المحلي
      addOrder(response);
    setSubmitSuccess(true);

    // إعادة تعيين النموذج
    setTimeout(() => {
      reset();
      setImages([]);
      setImagePreviews([]);
      setSubmitSuccess(false);
      if (onSuccess) onSuccess();
    }, 2000);

    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      setSubmitError(error.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
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

      {submitError && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {submitError}
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
                name="orderNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="رقم الطلب (اختياري)"
                    placeholder="سيتم توليده تلقائياً إذا ترك فارغاً"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Assignment />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

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

            <Grid item xs={12} md={4}>
              <Controller
                name="country"
                control={control}
                rules={{ required: 'البلد مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="البلد"
                    error={!!errors.country}
                    helperText={errors.country?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="province"
                control={control}
                rules={{ required: 'المحافظة مطلوبة' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المحافظة"
                    error={!!errors.province}
                    helperText={errors.province?.message}
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

            <Grid item xs={12} md={4}>
              <Controller
                name="district"
                control={control}
                rules={{ required: 'المديرية مطلوبة' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المديرية"
                    error={!!errors.district}
                    helperText={errors.district?.message}
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

          {loadingEmployees && (
            <Alert severity="info" sx={{ marginBottom: 2 }}>
              جاري تحميل قائمة الموظفين...
            </Alert>
          )}

          {!loadingEmployees && (designers.length === 0 || preparers.length === 0) && (
            <Alert 
              severity="warning" 
              sx={{ marginBottom: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => window.location.reload()}
                >
                  إعادة تحميل
                </Button>
              }
            >
              تحذير: لم يتم تحميل قائمة الموظفين. تأكد من الاتصال بالإنترنت.
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.designerId}>
                <InputLabel>المصمم</InputLabel>
                <Controller
                  name="designerId"
                  control={control}
                  rules={{ required: 'المصمم مطلوب' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="المصمم"
                      value={field.value || ''}
                      disabled={loadingEmployees || designers.length === 0}
                    >
                      {loadingEmployees ? (
                        <MenuItem disabled>
                          جاري التحميل...
                        </MenuItem>
                      ) : designers.length > 0 ? (
                        designers.map((designer) => (
                          <MenuItem key={designer.id} value={designer.id}>
                            {designer.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          لا يوجد مصممون متاحون
                        </MenuItem>
                      )}
                    </Select>
                  )}
                />
                {errors.designerId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.designerId.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.preparerId}>
                <InputLabel>المعد</InputLabel>
                <Controller
                  name="preparerId"
                  control={control}
                  rules={{ required: 'المعد مطلوب' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="المعد"
                      value={field.value || ''}
                      disabled={loadingEmployees || preparers.length === 0}
                    >
                      {loadingEmployees ? (
                        <MenuItem disabled>
                          جاري التحميل...
                        </MenuItem>
                      ) : preparers.length > 0 ? (
                        preparers.map((preparer) => (
                          <MenuItem key={preparer.id} value={preparer.id}>
                            {preparer.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          لا يوجد معدون متاحون
                        </MenuItem>
                      )}
                    </Select>
                  )}
                />
                {errors.preparerId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.preparerId.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="fabricType"
                control={control}
                rules={{ required: 'نوع القماش مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="نوع القماش"
                    placeholder="مثال: قطن، بوليستر"
                    error={!!errors.fabricType}
                    helperText={errors.fabricType?.message}
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
                name="quantity"
                control={control}
                rules={{
                  required: 'الكمية مطلوبة',
                  min: { value: 1, message: 'الكمية يجب أن تكون أكبر من 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الكمية"
                    type="number"
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
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

            <Grid item xs={12} md={6}>
              <Controller
                name="unitPrice"
                control={control}
                rules={{
                  required: 'سعر الوحدة مطلوب',
                  min: { value: 0, message: 'السعر يجب أن يكون أكبر من أو يساوي 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="سعر الوحدة"
                    type="number"
                    error={!!errors.unitPrice}
                    helperText={errors.unitPrice?.message}
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

            <Grid item xs={12} md={6}>
              <Controller
                name="totalAmount"
                control={control}
                rules={{
                  required: 'المبلغ الإجمالي مطلوب',
                  min: { value: 0, message: 'المبلغ يجب أن يكون أكبر من أو يساوي 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ الإجمالي"
                    type="number"
                    error={!!errors.totalAmount}
                    helperText={errors.totalAmount?.message}
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
          disabled={isSubmitting}
          sx={{
            padding: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </Button>
      </form>
    </Paper>
  );
};

export default OrderForm;


