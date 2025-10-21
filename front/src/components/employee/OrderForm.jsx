import { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
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
import { ordersService } from '../../services/api';
import { ORDER_STATUS, USER_ROLES, FABRIC_TYPES, SIZES, VALIDATION_RULES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';
import { generateOrderNumber, calculateTotal, createImagePreview } from '../../utils';

const OrderForm = ({ onSuccess }) => {
  const { addOrder, user, loadUsersByRole } = useApp();
  
  // State management
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [preparers, setPreparers] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form configuration
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      country: '',
      province: '',
      district: '',
      designerId: '',
      preparerId: '',
      fabricType: '',
      size: '',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
    }
  });

  // Watch for quantity and unitPrice changes to calculate total
  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  // Calculate total amount when quantity or unitPrice changes
  useEffect(() => {
    const total = calculateTotal(quantity, unitPrice);
    setValue('totalAmount', total);
  }, [quantity, unitPrice, setValue]);

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, []);

  // Memoized function to load employees
  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const [designersData, preparersData] = await Promise.all([
        loadUsersByRole(USER_ROLES.DESIGNER),
        loadUsersByRole(USER_ROLES.PREPARER),
      ]);
      setDesigners(designersData || []);
      setPreparers(preparersData || []);
    } catch (error) {
      console.error('خطأ في تحميل الموظفين:', error);
      setSubmitError('خطأ في تحميل قائمة الموظفين');
    } finally {
      setLoadingEmployees(false);
    }
  }, [loadUsersByRole]);

  // Handle image upload
  const handleImageUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    setImages(prev => [...prev, ...imageFiles]);
    
    // Create previews using utility function
    try {
      const previews = await Promise.all(
        imageFiles.map(file => createImagePreview(file))
      );
      setImagePreviews(prev => [...prev, ...previews]);
    } catch (error) {
      console.error('خطأ في إنشاء معاينة الصور:', error);
    }
  }, []);

  // Handle image deletion
  const handleDeleteImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Validate required fields
  const validateRequiredFields = useCallback((data) => {
    if (!data.designerId || data.designerId === '') {
      throw new Error('يجب اختيار مصمم');
    }
    if (!data.preparerId || data.preparerId === '') {
      throw new Error('يجب اختيار معد');
    }
  }, []);

  // Prepare order data
  const prepareOrderData = useCallback((data) => {
    return {
      id: 0,
      orderNumber: data.orderNumber || generateOrderNumber(),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      country: data.country,
      province: data.province,
      district: data.district,
      orderDate: new Date().toISOString(),
      totalAmount: parseFloat(data.totalAmount) || 0,
      status: ORDER_STATUS.PENDING,
      designerId: parseInt(data.designerId),
      preparerId: parseInt(data.preparerId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderDesigns: [
        {
          id: 0,
          orderId: 0,
          mockupImageUrl: 'placeholder_mockup.jpg',
          printFileUrl: 'placeholder_print.pdf',
          fabricType: data.fabricType,
          size: data.size,
          quantity: parseInt(data.quantity) || 1,
          unitPrice: parseFloat(data.unitPrice) || 0,
          totalPrice: calculateTotal(data.quantity, data.unitPrice),
          createdAt: new Date().toISOString(),
        }
      ]
    };
  }, []);

  // Handle form submission
  const onSubmit = useCallback(async (data) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Validate required fields
      validateRequiredFields(data);

      // Prepare order data
      const orderData = prepareOrderData(data);

      console.log('بيانات الطلب المرسلة:', orderData);

      // Submit order
      const response = await ordersService.createOrder(orderData);

      // Upload images if any
      if (images.length > 0 && response.id) {
        await ordersService.uploadDesignImages(response.id, images);
      }

      // Add order to context
      addOrder(response);
    setSubmitSuccess(true);

      // Reset form after success
    setTimeout(() => {
      reset();
      setImages([]);
      setImagePreviews([]);
      setSubmitSuccess(false);
      if (onSuccess) onSuccess();
    }, 2000);

    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      setSubmitError(error.message || error.response?.data?.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateRequiredFields, prepareOrderData, images, addOrder, reset, onSuccess]);

  // Memoized form fields
  const formFields = useMemo(() => [
    {
      name: 'customerName',
      label: 'اسم العميل',
      icon: <Person />,
      required: true,
      xs: 12,
      sm: 6,
    },
    {
      name: 'customerPhone',
      label: 'رقم الهاتف',
      icon: <Phone />,
      required: true,
      xs: 12,
      sm: 6,
    },
    {
      name: 'country',
      label: 'البلد',
      icon: <LocationOn />,
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'province',
      label: 'المحافظة',
      icon: <Business />,
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'district',
      label: 'المنطقة',
      icon: <LocationOn />,
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'fabricType',
      label: 'نوع القماش',
      icon: <Description />,
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'size',
      label: 'المقاس',
      icon: <Straighten />,
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'quantity',
      label: 'الكمية',
      type: 'number',
      required: true,
      xs: 12,
      sm: 4,
    },
    {
      name: 'unitPrice',
      label: 'سعر الوحدة',
      icon: <AttachMoney />,
      type: 'number',
      required: true,
      xs: 12,
      sm: 6,
    },
    {
      name: 'totalAmount',
      label: 'المبلغ الإجمالي',
      icon: <AttachMoney />,
      type: 'number',
      disabled: true,
      xs: 12,
      sm: 6,
    },
  ], []);

  return (
    <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
        إنشاء طلب جديد
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {SUCCESS_MESSAGES.ORDER_CREATED}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
          {/* Form Fields */}
          {formFields.map((field) => (
            <Grid item xs={field.xs} sm={field.sm} key={field.name}>
              <Controller
                name={field.name}
                control={control}
                rules={{ required: field.required ? 'هذا الحقل مطلوب' : false }}
                render={({ field: controllerField }) => (
                  <TextField
                    {...controllerField}
                    fullWidth
                    label={field.label}
                    type={field.type || 'text'}
                    disabled={field.disabled || isSubmitting}
                    error={!!errors[field.name]}
                    helperText={errors[field.name]?.message}
                    InputProps={{
                      startAdornment: field.icon && (
                        <InputAdornment position="start">
                          {field.icon}
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          ))}

          {/* Designer Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.designerId}>
              <InputLabel>المصمم</InputLabel>
              <Controller
                name="designerId"
                control={control}
                rules={{ required: 'يجب اختيار مصمم' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="المصمم"
                    disabled={isSubmitting || loadingEmployees}
                  >
                    {designers.map((designer) => (
                      <MenuItem key={designer.id} value={designer.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Palette sx={{ mr: 1 }} />
                          {designer.name}
                        </Box>
                      </MenuItem>
                    ))}
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

          {/* Preparer Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.preparerId}>
              <InputLabel>المعد</InputLabel>
              <Controller
                name="preparerId"
                control={control}
                rules={{ required: 'يجب اختيار معد' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="المعد"
                    disabled={isSubmitting || loadingEmployees}
                  >
                    {preparers.map((preparer) => (
                      <MenuItem key={preparer.id} value={preparer.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1 }} />
                          {preparer.name}
                        </Box>
                      </MenuItem>
                    ))}
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

          {/* Image Upload */}
            <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                multiple
                type="file"
                onChange={handleImageUpload}
                disabled={isSubmitting}
              />
              <label htmlFor="image-upload">
          <Button
            variant="outlined"
                  component="span"
            startIcon={<CloudUpload />}
                  disabled={isSubmitting}
          >
            رفع صور التصميم
          </Button>
              </label>
            </Box>

            {/* Image Previews */}
          {imagePreviews.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {imagePreviews.map((preview, index) => (
                  <Card key={index} sx={{ maxWidth: 200 }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={preview}
                      alt={`تصميم ${index + 1}`}
                    />
                    <CardActions>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteImage(index)}
                        disabled={isSubmitting}
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))}
            </Box>
          )}
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
                disabled={isSubmitting || loadingEmployees}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <Assignment />}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إنشاء الطلب'}
        </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default OrderForm;