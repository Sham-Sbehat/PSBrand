import { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Card,
  CardMedia,
  CardActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import {
  Person,
  Phone,
  LocationOn,
  Description,
  Straighten,
  AttachMoney,
  CloudUpload,
  Delete,
  Business,
  Assignment,
  Add,
  AddCircle,
  CheckCircle,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import { ordersService } from '../../services/api';
import { ORDER_STATUS, USER_ROLES, FABRIC_TYPES, SIZES } from '../../constants';
import { generateOrderNumber, calculateTotal, createImagePreview } from '../../utils';

const OrderForm = ({ onSuccess }) => {
  const { addOrder, user, loadUsersByRole } = useApp();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Customer data
  const [customerData, setCustomerData] = useState(null);
  
  // Orders data - array of order groups
  const [orders, setOrders] = useState([
    {
      id: 1,
      orderName: '',
      designImages: [],
      blouseImages: [],
      items: [
        {
          id: 1,
          fabricType: '',
          color: '',
          size: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }
      ]
    }
  ]);

  // State management
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [preparers, setPreparers] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedPreparer, setSelectedPreparer] = useState('');
  const [expandedOrders, setExpandedOrders] = useState([1]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'

  // Customer form
  const {
    control: customerControl,
    handleSubmit: handleCustomerSubmit,
    formState: { errors: customerErrors }
  } = useForm({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      country: '',
      province: '',
      district: '',
    }
  });

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, []);

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

  // Handle customer form submission
  const onCustomerSubmit = (data) => {
    setCustomerData(data);
    setCustomerDialogOpen(false);
  };

  // Update order name
  const updateOrderName = (orderId, value) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return { ...order, orderName: value };
      }
      return order;
    }));
  };

  // Update order item field
  const updateOrderItem = (orderId, itemId, field, value) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            const updated = { ...item, [field]: value };
            
            // Calculate total price
            if (field === 'quantity' || field === 'unitPrice') {
              updated.totalPrice = calculateTotal(updated.quantity, updated.unitPrice);
            }
            
            return updated;
          }
          return item;
        });
        return { ...order, items: updatedItems };
      }
      return order;
    }));
  };

  // Add item to existing order
  const addOrderItem = (orderId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const maxItemId = Math.max(...order.items.map(item => item.id), 0);
        const lastItem = order.items[order.items.length - 1];
        const newItem = {
          id: maxItemId + 1,
          fabricType: '',
          color: '',
          size: '',
          quantity: 1,
          unitPrice: lastItem?.unitPrice || 0,
          totalPrice: 0,
        };
        return { ...order, items: [...order.items, newItem] };
      }
      return order;
    }));
  };

  // Add new order
  const addNewOrder = () => {
    const maxOrderId = Math.max(...orders.map(o => o.id), 0);
    const newOrderId = maxOrderId + 1;
    const newOrder = {
      id: newOrderId,
      orderName: '',
      designImages: [],
      blouseImages: [],
      items: [
        {
          id: 1,
          fabricType: '',
          color: '',
          size: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }
      ]
    };
    setOrders(prev => [...prev, newOrder]);
    setExpandedOrders(prev => [...prev, newOrderId]);
  };

  // Handle accordion change
  const handleAccordionChange = (orderId, isExpanded) => {
    if (isExpanded) {
      setExpandedOrders(prev => [...prev, orderId]);
    } else {
      setExpandedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // Remove order item
  const removeOrderItem = (orderId, itemId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId && order.items.length > 1) {
        return { ...order, items: order.items.filter(item => item.id !== itemId) };
      }
      return order;
    }));
  };

  // Remove entire order
  const removeOrder = (orderId) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    setExpandedOrders(prev => prev.filter(id => id !== orderId));
  };

  // Handle image upload
  const handleImageUpload = async (event, orderId, type) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    try {
      const previews = await Promise.all(
        imageFiles.map(file => createImagePreview(file))
      );
      
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          if (type === 'design') {
            return { ...order, designImages: [...order.designImages, ...previews] };
          } else {
            return { ...order, blouseImages: [...order.blouseImages, ...previews] };
          }
        }
        return order;
      }));
    } catch (error) {
      console.error('خطأ في إنشاء معاينة الصور:', error);
    }
  };

  // Handle image deletion
  const handleDeleteImage = (orderId, type, index) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        if (type === 'design') {
          return { ...order, designImages: order.designImages.filter((_, i) => i !== index) };
        } else {
          return { ...order, blouseImages: order.blouseImages.filter((_, i) => i !== index) };
        }
      }
      return order;
    }));
  };

  // Handle final submission
  const onSubmit = async () => {
    // Check if customer data is available
    if (!customerData) {
      setSubmitError('يجب ملء معلومات العميل أولاً');
      return;
    }

    if (!selectedDesigner || !selectedPreparer) {
      setSubmitError('يجب اختيار المصمم والمعد');
      return;
    }

    // Validate all orders
    const hasInvalidOrders = orders.some(order => 
      !order.orderName || order.items.some(item => 
        !item.fabricType || !item.color || !item.size || 
        !item.quantity || !item.unitPrice
      )
    );

    if (hasInvalidOrders) {
      setSubmitError('يجب ملء جميع المعلومات لكل طلب');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Flatten orders to orderDesigns
      const allItems = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          allItems.push({
            id: 0,
            orderId: 0,
            orderName: order.orderName,
            mockupImageUrl: order.designImages[0] || 'placeholder_mockup.jpg',
            blouseImageUrl: order.blouseImages[0] || 'placeholder_blouse.jpg',
            printFileUrl: 'placeholder_print.pdf',
            fabricType: item.fabricType,
            color: item.color,
            size: item.size,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            totalPrice: item.totalPrice,
            createdAt: new Date().toISOString(),
          });
        });
      });

      const orderData = {
        id: 0,
        orderNumber: generateOrderNumber(),
        customerName: customerData.customerName,
        customerPhone: customerData.customerPhone,
        country: customerData.country,
        province: customerData.province,
        district: customerData.district,
        orderDate: new Date().toISOString(),
        totalAmount: allItems.reduce((sum, item) => sum + item.totalPrice, 0),
        status: ORDER_STATUS.PENDING,
        designerId: parseInt(selectedDesigner),
        preparerId: parseInt(selectedPreparer),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        orderDesigns: allItems
      };

      const response = await ordersService.createOrder(orderData);
      addOrder(response);

      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      setSubmitError(error.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
    <Box>
      {/* Add Customer Button - Outside the form */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Person />}
          onClick={() => setCustomerDialogOpen(true)}
          size="large"
        >
          إضافة عميل جديد
        </Button>
      </Box>

      <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
          إنشاء طلب جديد
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}

        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            تم إنشاء الطلب بنجاح!
          </Alert>
        )}

      <Grid container spacing={3}>
        {/* Customer Dialog */}
        <Dialog 
          open={customerDialogOpen} 
          onClose={() => setCustomerDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 600 }}>
            إضافة عميل جديد
          </DialogTitle>
          <form onSubmit={handleCustomerSubmit(onCustomerSubmit)}>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                  المعلومات الشخصية
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="customerName"
                    control={customerControl}
                    rules={{ required: 'اسم العميل مطلوب' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="اسم العميل"
                        error={!!customerErrors.customerName}
                        helperText={customerErrors.customerName?.message}
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

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="customerPhone"
                    control={customerControl}
                    rules={{ required: 'رقم الهاتف مطلوب' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="رقم الهاتف"
                        error={!!customerErrors.customerPhone}
                        helperText={customerErrors.customerPhone?.message}
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
              </Grid>

              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                  معلومات الموقع
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="country"
                    control={customerControl}
                    rules={{ required: 'البلد مطلوب' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="البلد"
                        error={!!customerErrors.country}
                        helperText={customerErrors.country?.message}
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

                <Grid item xs={12} sm={4}>
                  <Controller
                    name="province"
                    control={customerControl}
                    rules={{ required: 'المحافظة مطلوبة' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="المحافظة"
                        error={!!customerErrors.province}
                        helperText={customerErrors.province?.message}
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

                <Grid item xs={12} sm={4}>
                  <Controller
                    name="district"
                    control={customerControl}
                    rules={{ required: 'المنطقة مطلوبة' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="المنطقة"
                        error={!!customerErrors.district}
                        helperText={customerErrors.district?.message}
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
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button 
                onClick={() => setCustomerDialogOpen(false)}
                variant="outlined"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<CheckCircle />}
                sx={{ minWidth: 150 }}
              >
                إضافة العميل
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Customer Info Section in Form - Always visible */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              معلومات العميل والموقع
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="اسم العميل"
                  value={customerData?.customerName || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...(prev || {}), customerName: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={customerData?.customerPhone || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...(prev || {}), customerPhone: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="البلد"
                  value={customerData?.country || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...(prev || {}), country: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="المحافظة"
                  value={customerData?.province || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...(prev || {}), province: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="المنطقة"
                  value={customerData?.district || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...(prev || {}), district: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Orders Section */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              إضافة الطلبات
            </Typography>

          {orders.map((order, index) => (
            <Accordion 
              key={order.id} 
              expanded={expandedOrders.includes(order.id)}
              onChange={(e, isExpanded) => handleAccordionChange(order.id, isExpanded)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    {order.orderName || `طلب ${index + 1}`}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOrder(order.id);
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>

                {/* Order Name and Images */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="اسم الطلب"
                      value={order.orderName}
                      onChange={(e) => updateOrderName(order.id, e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Description />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id={`design-${order.id}`}
                        multiple
                        type="file"
                        onChange={(e) => handleImageUpload(e, order.id, 'design')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor={`design-${order.id}`}>
                        <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                          صور التصميم
                        </Button>
                      </label>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id={`blouse-${order.id}`}
                        multiple
                        type="file"
                        onChange={(e) => handleImageUpload(e, order.id, 'blouse')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor={`blouse-${order.id}`}>
                        <Button variant="outlined" component="span" startIcon={<CloudUpload />} sx={{ ml: 1 }}>
                          صور البلوزة
                        </Button>
                      </label>
                    </Box>
                  </Grid>

                  {/* Image Previews */}
                  {(order.designImages.length > 0 || order.blouseImages.length > 0) && (
                    <Grid item xs={12}>
                      {order.designImages.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Typography variant="caption">صور التصميم:</Typography>
                          {order.designImages.map((preview, idx) => (
                            <Card key={idx} sx={{ maxWidth: 100 }}>
                              <CardMedia component="img" height="80" image={preview} />
                              <CardActions sx={{ p: 0, justifyContent: 'center' }}>
                                <IconButton size="small" color="error" onClick={() => handleDeleteImage(order.id, 'design', idx)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </CardActions>
                            </Card>
                          ))}
                        </Box>
                      )}
                      {order.blouseImages.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="caption">صور البلوزة:</Typography>
                          {order.blouseImages.map((preview, idx) => (
                            <Card key={idx} sx={{ maxWidth: 100 }}>
                              <CardMedia component="img" height="80" image={preview} />
                              <CardActions sx={{ p: 0, justifyContent: 'center' }}>
                                <IconButton size="small" color="error" onClick={() => handleDeleteImage(order.id, 'blouse', idx)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </CardActions>
                            </Card>
                          ))}
                        </Box>
                      )}
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Order Items */}
                {order.items.map((item, itemIndex) => (
                  <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {itemIndex > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <IconButton size="small" color="error" onClick={() => removeOrderItem(order.id, item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="نوع القماش"
                          value={item.fabricType}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'fabricType', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="اللون"
                          value={item.color}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'color', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="المقاس"
                          value={item.size}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'size', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="الكمية"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="السعر"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">$</InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={1}>
                        <Typography variant="body2" sx={{ pt: 1, fontWeight: 600 }}>
                          {item.totalPrice}$
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                ))}

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => addOrderItem(order.id)}
                  sx={{ mt: 1 }}
                >
                  إضافة سطر جديد
                </Button>
              </AccordionDetails>
            </Accordion>
          ))}

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<AddCircle />}
                onClick={addNewOrder}
                fullWidth
                sx={{ py: 2 }}
              >
                إضافة طلب جديد
              </Button>
            </Grid>

            {/* Order Total Section */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  ملخص الطلب
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="سعر الطلب"
                      type="number"
                      disabled
                      value={orders.reduce((sum, order) => 
                        sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0
                      ).toFixed(2)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="نوع الخصم"
                      select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <MenuItem value="percentage">نسبة %</MenuItem>
                      <MenuItem value="fixed">مبلغ ثابت</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label={discountType === 'percentage' ? 'الخصم %' : 'مبلغ الخصم'}
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {discountType === 'percentage' ? '%' : '$'}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="سعر التوصيل"
                      type="number"
                      value={deliveryPrice}
                      onChange={(e) => setDeliveryPrice(parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="المجموع الكلي"
                      type="number"
                      disabled
                      value={(() => {
                        const orderTotal = orders.reduce((sum, order) => 
                          sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0
                        );
                        let discountAmount = 0;
                        if (discountType === 'percentage') {
                          discountAmount = (orderTotal * discount) / 100;
                        } else {
                          discountAmount = discount;
                        }
                        return (orderTotal - discountAmount + deliveryPrice).toFixed(2);
                      })()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: 'primary.light',
                          fontWeight: 600,
                          fontSize: '1.1rem'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onSubmit}
                  disabled={isSubmitting || loadingEmployees}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <Assignment />}
                  sx={{ minWidth: 200, py: 1.5 }}
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'إنشاء الطلب'}
                </Button>
              </Box>
            </Grid>
            </Paper>
          </Grid>
                </Grid>
      </Paper>
    </Box>
    );
  };

export default OrderForm;