import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
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
  Search,
  InsertDriveFile,
  PictureAsPdf,
} from '@mui/icons-material';
import { Autocomplete } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { ordersService, clientsService, deliveryService } from '../../services/api';
import { ORDER_STATUS, USER_ROLES, FABRIC_TYPE_ENUM, FABRIC_TYPE_LABELS, SIZE_ENUM, SIZE_LABELS, COLOR_ENUM, COLOR_LABELS, getSizeValueByLabel } from '../../constants';
import { generateOrderNumber, calculateTotal, createImagePreview } from '../../utils';

const OrderForm = ({ onSuccess }) => {
  const { addOrder, user, loadUsersByRole } = useApp();
  const [searchParams] = useSearchParams();
  
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
  const [expandedOrders, setExpandedOrders] = useState([1]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryRegions, setDeliveryRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Dirty state management to prevent duplicate submissions
  const [isDirty, setIsDirty] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState(null);

  // Get employee ID from URL
  const employeeIdFromUrl = searchParams.get('employeeId');

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

  // Load clients on component mount
  useEffect(() => {
    loadAllClients();
  }, []);

  // Track form changes to update dirty state
  useEffect(() => {
    checkIfFormIsDirty();
  }, [orders, clientId, deliveryPrice, discount, discountType, employeeIdFromUrl]);

  const loadAllClients = async () => {
    setLoadingClients(true);
    try {
      const clients = await clientsService.getAllClients();
      setAllClients(clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Handle customer form submission
  const onCustomerSubmit = async (data) => {
    try {
      // Prepare client data according to API format
      const clientData = {
        name: data.customerName,
        phone: data.customerPhone,
        country: data.country,
        province: data.province,
        district: data.district,
      };

      // Call API to create client
      const response = await clientsService.createClient(clientData);
      console.log('Client created:', response);

      // Update local state with client data
      setCustomerData(data);
      setClientId(response.id);  // Store the new client ID
      setCustomerDialogOpen(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Error creating client:', error);
      setSubmitError('فشل في إنشاء العميل. يرجى المحاولة مرة أخرى.');
    }
  };

  // Handle customer selection from autocomplete
  const handleCustomerSelect = (client) => {
    if (client) {
      setCustomerData({
        customerName: client.name || '',
        customerPhone: client.phone || '',
        country: client.country || '',
        province: client.province || '',
        district: client.district || '',
      });
      setClientId(client.id);
      setCustomerNotFound(false);
    } else {
      setCustomerData(null);
      setClientId(null);
      setCustomerNotFound(false);
    }
  };

  // Helper function to generate a hash of current form data for comparison
  const generateFormHash = (formData) => {
    return JSON.stringify({
      orders: formData.orders,
      clientId: formData.clientId,
      deliveryPrice: formData.deliveryPrice,
      discount: formData.discount,
      discountType: formData.discountType,
      designerId: formData.designerId
    });
  };

  // Helper function to check if form data has changed
  const checkIfFormIsDirty = () => {
    const currentData = {
      orders,
      clientId,
      deliveryPrice,
      discount,
      discountType,
      designerId: employeeIdFromUrl ? parseInt(employeeIdFromUrl) : 0
    };
    
    const currentHash = generateFormHash(currentData);
    const isFormDirty = lastSubmittedData !== currentHash;
    setIsDirty(isFormDirty);
    return isFormDirty;
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
    
    if (files.length === 0) return;

    try {
      // For design files, store file objects with preview
      // For blouse images, create previews as before
      let previews;
      
      if (type === 'design') {
        // For design files (PDF, AI, etc.), create file info objects
        previews = await Promise.all(
          files.map(async file => {
            // Check if it's an image
            if (file.type.startsWith('image/')) {
              const preview = await createImagePreview(file);
              return { url: preview, name: file.name, type: file.type };
            } else {
              // For non-image files, create a data URL for icon/preview
              return { url: null, name: file.name, type: file.type, file: file };
            }
          })
        );
      } else {
        // For blouse, only accept images
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        previews = await Promise.all(
          imageFiles.map(file => createImagePreview(file))
        );
      }
      
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

  // Helper function to get enum value from label
  const getEnumValueFromLabel = (label, labelsObject) => {
    if (!label) return 0;
    const entry = Object.entries(labelsObject).find(([key, value]) => value === label);
    return entry ? parseInt(entry[0]) : 0;
  };

  // Handle final submission
  const onSubmit = async () => {
    // Check if customer data is available
    if (!customerData) {
      setSubmitError('يجب ملء معلومات العميل أولاً');
      return;
    }

    // Validate customer information
    if (!customerData.customerName || !customerData.customerPhone) {
      setSubmitError('يجب ملء اسم العميل ورقم الهاتف');
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
    setSubmitSuccess(false); // Clear any previous success message

    try {
      // Helper function to convert file to data URL
      const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
          if (!file) {
            reject(new Error('No file provided'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // Transform orders to match API structure
      const orderDesigns = await Promise.all(orders.map(async order => {
        // Get first image (PNG/JPG) for mockup and first PDF for print file
        const mockupImage = order.designImages.find(img => img.type && img.type.startsWith('image/'));
        const pdfFile = order.designImages.find(img => img.type === 'application/pdf');
        const otherFile = order.designImages.find(img => !img.type || (!img.type.startsWith('image/') && img.type !== 'application/pdf'));
        
        let printFileUrl = pdfFile?.url || otherFile?.url || mockupImage?.url || 'placeholder_print.pdf';
        
        // If printFileUrl is null/undefined but we have a file object, convert it
        if (!pdfFile?.url && pdfFile?.file) {
          try {
            printFileUrl = await fileToDataURL(pdfFile.file);
          } catch (error) {
            console.error('Error converting PDF file:', error);
          }
        } else if (!otherFile?.url && otherFile?.file) {
          try {
            printFileUrl = await fileToDataURL(otherFile.file);
          } catch (error) {
            console.error('Error converting file:', error);
          }
        }
        
        return {
          designName: order.orderName,  // This is the design name
          mockupImageUrl: mockupImage?.url || order.designImages[0]?.url || 'placeholder_mockup.jpg',
          printFileUrl: printFileUrl,
          orderDesignItems: order.items.map(item => ({
            size: getSizeValueByLabel(item.size),
            color: getEnumValueFromLabel(item.color, COLOR_LABELS),
            fabricType: getEnumValueFromLabel(item.fabricType, FABRIC_TYPE_LABELS),
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0
          }))
        };
      }));

      if (!clientId) {
        setSubmitError('يجب البحث عن العميل أو إضافة عميل جديد أولاً');
        setIsSubmitting(false);
        return;
      }

      const resolvedDesignerId = employeeIdFromUrl ? parseInt(employeeIdFromUrl) : (user?.id || 0);
      if (!resolvedDesignerId || resolvedDesignerId <= 0) {
        setSubmitError('يجب تحديد مصمم صحيح قبل إنشاء الطلب');
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        clientId: clientId,
        country: customerData.country,
        province: customerData.province,
        district: customerData.district,
        designerId: resolvedDesignerId,
        preparerId: null, // Set to 0 as requested
        discountPercentage: discountType === 'percentage' ? discount : 0,
        deliveryFee: deliveryPrice,
        discountNotes: discount > 0 ? `خصم ${discountType === 'percentage' ? discount + '%' : discount + '$'}` : '',
        orderDesigns: orderDesigns
      };

      console.log('Sending order data:', JSON.stringify(orderData, null, 2));
      console.log('Employee ID from URL:', employeeIdFromUrl);
      console.log('Designer ID being sent:', resolvedDesignerId);
      const response = await ordersService.createOrder(orderData);
      console.log('Order created successfully:', response);
      addOrder(response);

      // Mark form as clean after successful submission
      const currentData = {
        orders,
        clientId,
        deliveryPrice,
        discount,
        discountType,
        designerId: resolvedDesignerId
      };
      setLastSubmittedData(generateFormHash(currentData));
      setIsDirty(false);

      // Reset form data
      setOrders([{
        id: 1,
        orderName: '',
        designImages: [],
        blouseImages: [],
        items: [{
          id: 1,
          fabricType: '',
          color: '',
          size: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }]
      }]);
      setExpandedOrders([1]);
      setDeliveryPrice(0);
      setDiscount(0);
      setDiscountType('percentage');
      setCustomerData(null);
      setClientId(null);

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      setSubmitError(error.message || 'حدث خطأ أثناء إرسال الطلب');
      setSubmitSuccess(false); // Ensure success is cleared on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load delivery regions once
  useEffect(() => {
    (async () => {
      try {
        const regions = await deliveryService.getDeliveryRegions();
        setDeliveryRegions(Array.isArray(regions) ? regions : []);
      } catch (e) {
        console.error('Failed to load delivery regions', e);
        setDeliveryRegions([]);
      }
    })();
  }, []);

  const handleRegionChange = async (e) => {
    const region = e.target.value;
    setSelectedRegion(region);
    try {
      const fee = await deliveryService.getDeliveryFee(region);
      setDeliveryPrice(parseFloat(fee) || 0);
    } catch (err) {
      console.error('Failed to fetch delivery fee', err);
      setDeliveryPrice(0);
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
            {customerNotFound && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  العميل غير موجود. يرجى إضافة عميل جديد من زر "إضافة عميل جديد"
                </Alert>
              </Grid>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  fullWidth
                  options={allClients}
                  getOptionLabel={(option) => option.name || ''}
                  loading={loadingClients}
                  value={allClients.find(client => client.id === clientId) || null}
                  onChange={(event, newValue) => handleCustomerSelect(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اسم العميل"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                      helperText="ابحث واختر العميل من القائمة"
                    />
                  )}
                  noOptionsText="لا توجد نتائج"
                  loadingText="جاري التحميل..."
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Design Images Section */}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <input
                            accept=".pdf,.doc,.docx,.ai,.eps"
                            style={{ display: 'none' }}
                            id={`design-${order.id}`}
                            multiple
                            type="file"
                            onChange={(e) => handleImageUpload(e, order.id, 'design')}
                            disabled={isSubmitting}
                          />
                          <label htmlFor={`design-${order.id}`}>
                            <IconButton color="primary" component="span">
                              <CloudUpload />
                            </IconButton>
                          </label>
                          <Typography variant="body2" fontWeight={600}>ملفات التصميم</Typography>
                          {order.designImages.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              ({order.designImages.length} ملف)
                            </Typography>
                          )}
                        </Box>
                        {order.designImages.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {order.designImages.map((fileInfo, idx) => (
                              <Box key={idx} sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                p: 1, 
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'grey.300'
                              }}>
                                {fileInfo.type === 'image/png' || fileInfo.type === 'image/jpeg' ? (
                                  <img src={fileInfo.url} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                                ) : fileInfo.type === 'application/pdf' ? (
                                  <PictureAsPdf sx={{ color: 'error.main', fontSize: 40 }} />
                                ) : (
                                  <InsertDriveFile sx={{ color: 'primary.main', fontSize: 40 }} />
                                )}
                                <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {fileInfo.name || `ملف ${idx + 1}`}
                                </Typography>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteImage(order.id, 'design', idx)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Blouse Images Section */}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                            <IconButton color="primary" component="span">
                              <CloudUpload />
                            </IconButton>
                          </label>
                          <Typography variant="body2" fontWeight={600}>صور البلوزة</Typography>
                          {order.blouseImages.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              ({order.blouseImages.length} صورة)
                            </Typography>
                          )}
                        </Box>
                        {order.blouseImages.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {order.blouseImages.map((preview, idx) => (
                              <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                                <Card sx={{ width: 80, height: 80 }}>
                                  <CardMedia 
                                    component="img" 
                                    height="80" 
                                    image={preview}
                                    sx={{ objectFit: 'cover' }}
                                  />
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteImage(order.id, 'blouse', idx)}
                                    sx={{
                                      position: 'absolute',
                                      top: -8,
                                      right: -8,
                                      bgcolor: 'white',
                                      boxShadow: 2,
                                      '&:hover': { bgcolor: 'error.main', color: 'white' }
                                    }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Card>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
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
                        <FormControl fullWidth>
                          <InputLabel>نوع القماش</InputLabel>
                          <Select
                            value={item.fabricType}
                            label="نوع القماش"
                            onChange={(e) => updateOrderItem(order.id, item.id, 'fabricType', e.target.value)}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="قطن 200 غرام">قطن 200 غرام</MenuItem>
                            <MenuItem value="قطن 250 غرام">قطن 250 غرام</MenuItem>
                            <MenuItem value="100% قطن">100% قطن</MenuItem>
                            <MenuItem value="فرنشتيري">فرنشتيري</MenuItem>
                            <MenuItem value="كم خفيف">كم خفيف</MenuItem>
                            <MenuItem value="هودي فوتر مبطن">هودي فوتر مبطن</MenuItem>
                            <MenuItem value="هودي 280 غرام">هودي 280 غرام</MenuItem>
                            <MenuItem value="هودي 330 غرام">هودي 330 غرام</MenuItem>
                            <MenuItem value="هودي 400 غرام">هودي 400 غرام</MenuItem>
                            <MenuItem value="جكيت فوتر">جكيت فوتر</MenuItem>
                            <MenuItem value="سويت شيرت">سويت شيرت</MenuItem>
                            <MenuItem value="نص سحاب">نص سحاب</MenuItem>
                            <MenuItem value="ترنح انولع القماش">ترنح انولع القماش</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth>
                          <InputLabel>اللون</InputLabel>
                          <Select
                            value={item.color}
                            label="اللون"
                            onChange={(e) => updateOrderItem(order.id, item.id, 'color', e.target.value)}
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="أسود">أسود</MenuItem>
                            <MenuItem value="أبيض">أبيض</MenuItem>
                            <MenuItem value="سكني">سكني</MenuItem>
                            <MenuItem value="ازرق">أزرق</MenuItem>
                            <MenuItem value="بني">بني</MenuItem>
                            <MenuItem value="بنفسجي">بنفسجي</MenuItem>
                            <MenuItem value="زهري">زهري</MenuItem>
                            <MenuItem value="بيج">بيج</MenuItem>
                            <MenuItem value="خمري">خمري</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth>
                          <InputLabel>المقاس</InputLabel>
                          <Select
                            value={item.size}
                            label="المقاس"
                            onChange={(e) => updateOrderItem(order.id, item.id, 'size', e.target.value)}
                            sx={{ minWidth: 100 }}
                          >
                            <MenuItem value="2">2</MenuItem>
                            <MenuItem value="4">4</MenuItem>
                            <MenuItem value="6">6</MenuItem>
                            <MenuItem value="8">8</MenuItem>
                            <MenuItem value="10">10</MenuItem>
                            <MenuItem value="12">12</MenuItem>
                            <MenuItem value="14">14</MenuItem>
                            <MenuItem value="16">16</MenuItem>
                            <MenuItem value="18">18</MenuItem>
                            <MenuItem value="XS">XS</MenuItem>
                            <MenuItem value="S">S</MenuItem>
                            <MenuItem value="M">M</MenuItem>
                            <MenuItem value="L">L</MenuItem>
                            <MenuItem value="XL">XL</MenuItem>
                            <MenuItem value="XXL">XXL</MenuItem>
                            <MenuItem value="3XL">3XL</MenuItem>
                            <MenuItem value="4XL">4XL</MenuItem>
                            <MenuItem value="5XL">5XL</MenuItem>
                            <MenuItem value="6XL">6XL</MenuItem>
                            <MenuItem value="7XL">7XL</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="medium"
                          type="number"
                          label="الكمية"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="medium"
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
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth  >
                      <InputLabel id="region-select-label">اسم المنطقة</InputLabel>
                      <Select
                        labelId="region-select-label"
                        label="اسم المنطقة"
                        value={selectedRegion}
                        onChange={handleRegionChange}
                        sx={{ minWidth: 200 }}
                      >
                        {deliveryRegions.map((r, idx) => (
                          <MenuItem key={idx} value={r.name || r}>
                            {r.name || r}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <TextField
                      fullWidth
                      label="سعر التوصيل"
                      type="number"
                      value={deliveryPrice}
                      InputProps={{
                        readOnly: true,
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
                  <Grid item xs={12} sm={1}>
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
                </Grid>
                <Grid container spacing={2} sx={{ mt: 3 }}>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
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
                  disabled={isSubmitting || !isDirty}
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