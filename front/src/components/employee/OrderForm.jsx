import { useState, useEffect, useCallback, useId } from 'react';
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
  FormHelperText,
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
  Save,
  Search,
  InsertDriveFile,
  PictureAsPdf,
} from '@mui/icons-material';
import { Autocomplete } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { ordersService, clientsService, deliveryService, shipmentsService } from '../../services/api';
import { ORDER_STATUS, USER_ROLES, FABRIC_TYPE_ENUM, FABRIC_TYPE_LABELS, SIZE_ENUM, SIZE_LABELS, COLOR_ENUM, COLOR_LABELS, getSizeValueByLabel, getSizeLabelByValue } from '../../constants';
import { generateOrderNumber, calculateTotal, createImagePreview } from '../../utils';

const OrderForm = ({
  onSuccess,
  mode = 'create',
  initialOrder = null,
  onCancel,
  onUpdate,
}) => {
  const formInstanceId = useId();
  const isEditMode = mode === 'edit';
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
      serverId: null,
      orderName: '',
      designImages: [],
      blouseImages: [],
      items: [
        {
          id: 1,
          serverId: null,
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
  const [regionError, setRegionError] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Shipping company information
  const [shippingAddress, setShippingAddress] = useState('');
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  
  // Customer dialog shipping info (separate from main form)
  const [dialogShippingAddress, setDialogShippingAddress] = useState('');
  const [dialogCities, setDialogCities] = useState([]);
  const [dialogAreas, setDialogAreas] = useState([]);
  const [dialogSelectedCityId, setDialogSelectedCityId] = useState(null);
  const [dialogSelectedAreaId, setDialogSelectedAreaId] = useState(null);
  const [dialogLoadingCities, setDialogLoadingCities] = useState(false);
  const [dialogLoadingAreas, setDialogLoadingAreas] = useState(false);

  // Dirty state management to prevent duplicate submissions
  const [isDirty, setIsDirty] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState(null);

  // Get employee ID from URL
  const employeeIdFromUrl = searchParams.get('employeeId');

  // Customer form
  const {
    control: customerControl,
    handleSubmit: handleCustomerSubmit,
    setValue,
    formState: { errors: customerErrors }
  } = useForm({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      country: '',
      province: '',
      district: '',
      address: '',
      roadFnCityId: null,
      roadFnAreaId: null,
    }
  });

  // Load clients on component mount
  useEffect(() => {
    loadAllClients();
    loadCities();
    loadDialogCities(); // Load cities for dialog too
  }, []);
  
  // Load dialog cities
  const loadDialogCities = async () => {
    setDialogLoadingCities(true);
    try {
      const citiesData = await shipmentsService.getCities();
      setDialogCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Error loading dialog cities:', error);
      setDialogCities([]);
    } finally {
      setDialogLoadingCities(false);
    }
  };
  
  // Load dialog areas when city is selected
  useEffect(() => {
    if (dialogSelectedCityId) {
      loadDialogAreas(dialogSelectedCityId);
    } else {
      setDialogAreas([]);
      setDialogSelectedAreaId(null);
    }
  }, [dialogSelectedCityId]);
  
  // Load dialog areas from API
  const loadDialogAreas = async (cityId) => {
    if (!cityId) {
      setDialogAreas([]);
      return;
    }
    setDialogLoadingAreas(true);
    try {
      const areasData = await shipmentsService.getAreas(cityId);
      setDialogAreas(Array.isArray(areasData) ? areasData : []);
    } catch (error) {
      console.error('Error loading dialog areas:', error);
      setDialogAreas([]);
    } finally {
      setDialogLoadingAreas(false);
    }
  };

  // Load areas when city is selected
  useEffect(() => {
    if (selectedCityId) {
      loadAreas(selectedCityId);
    } else {
      setAreas([]);
      setSelectedAreaId(null);
    }
  }, [selectedCityId]);

  // Load cities from API
  const loadCities = async () => {
    setLoadingCities(true);
    try {
      const citiesData = await shipmentsService.getCities();
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  // Load areas from API based on selected city
  const loadAreas = async (cityId) => {
    if (!cityId) {
      setAreas([]);
      return;
    }
    setLoadingAreas(true);
    try {
      const areasData = await shipmentsService.getAreas(cityId);
      setAreas(Array.isArray(areasData) ? areasData : []);
    } catch (error) {
      console.error('Error loading areas:', error);
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  };

  // Track form changes to update dirty state
  useEffect(() => {
    checkIfFormIsDirty();
  }, [orders, clientId, deliveryPrice, discount, discountType, employeeIdFromUrl]);

  useEffect(() => {
    if (!isEditMode || !initialOrder) return;

    const getFabricLabel = (value) => {
      if (value === null || value === undefined) return '';
      return FABRIC_TYPE_LABELS[value] || value || '';
    };

    const getColorLabel = (value) => {
      if (value === null || value === undefined) return '';
      return COLOR_LABELS[value] || value || '';
    };

    const getSizeLabel = (value) => {
      if (value === null || value === undefined) return '';
      const label = getSizeLabelByValue(value);
      if (label && label !== 'Unknown') return label;
      if (SIZE_LABELS[value]) return SIZE_LABELS[value];
      return value || '';
    };

    const mappedOrders = (initialOrder.orderDesigns || []).map((design, index) => {
      const mappedItems = (design.orderDesignItems || []).map((item, itemIdx) => ({
        id: itemIdx + 1,
        serverId: item?.id || null,
        fabricType: getFabricLabel(item?.fabricType),
        color: getColorLabel(item?.color),
        size: getSizeLabel(item?.size),
        quantity: item?.quantity || 1,
        unitPrice: item?.unitPrice || 0,
        totalPrice:
          item?.totalPrice ||
          ((item?.quantity || 0) * (item?.unitPrice || 0)),
      }));

      return {
        id: index + 1,
        serverId: design?.id || null,
        orderName: design?.designName || '',
        designImages: (design?.printFileUrls || []).map((url) => ({ url })),
        blouseImages: (design?.mockupImageUrls || []).map((url) => url),
        items:
          mappedItems.length > 0
            ? mappedItems
            : [
                {
                  id: 1,
                  serverId: null,
                  fabricType: '',
                  color: '',
                  size: '',
                  quantity: 1,
                  unitPrice: 0,
                  totalPrice: 0,
                },
              ],
      };
    });

    const preparedOrders =
      mappedOrders.length > 0
        ? mappedOrders
        : [
            {
              id: 1,
              serverId: null,
              orderName: '',
              designImages: [],
              blouseImages: [],
              items: [
                {
                  id: 1,
                  serverId: null,
                  fabricType: '',
                  color: '',
                  size: '',
                  quantity: 1,
                  unitPrice: 0,
                  totalPrice: 0,
                },
              ],
            },
          ];

    setOrders(preparedOrders);
    setExpandedOrders(preparedOrders.map((order) => order.id));
    setCustomerData({
      customerName: initialOrder.client?.name || '',
      customerPhone: initialOrder.client?.phone || '',
      country: initialOrder.country || initialOrder.client?.country || '',
      province: initialOrder.province || initialOrder.client?.province || '',
      district: initialOrder.district || initialOrder.client?.district || '',
    });
    setClientId(initialOrder.clientId || initialOrder.client?.id || null);
    setDeliveryPrice(initialOrder.deliveryFee || 0);
    if (initialOrder.discountPercentage && initialOrder.discountPercentage > 0) {
      setDiscountType('percentage');
      setDiscount(initialOrder.discountPercentage);
    } else if (initialOrder.discountAmount && initialOrder.discountAmount > 0) {
      setDiscountType('fixed');
      setDiscount(initialOrder.discountAmount);
    } else {
      setDiscountType('percentage');
      setDiscount(0);
    }
    setNotes(initialOrder.notes || '');
    setSelectedRegion(initialOrder.district || '');
    setCustomerNotFound(false);
    
    // Load shipping company information if available
    if (initialOrder.client) {
      setShippingAddress(initialOrder.client.address || '');
      setSelectedCityId(initialOrder.client.roadFnCityId || null);
      setSelectedAreaId(initialOrder.client.roadFnAreaId || null);
    }
    setValue('customerName', initialOrder.client?.name || '');
    setValue('customerPhone', initialOrder.client?.phone || '');
    setValue('country', initialOrder.country || initialOrder.client?.country || '');
    setValue('province', initialOrder.province || initialOrder.client?.province || '');
    setValue('district', initialOrder.district || initialOrder.client?.district || '');
    const hashData = {
      orders: preparedOrders,
      clientId: initialOrder.clientId || initialOrder.client?.id || null,
      deliveryPrice: initialOrder.deliveryFee || 0,
      discount:
        initialOrder.discountPercentage && initialOrder.discountPercentage > 0
          ? initialOrder.discountPercentage
          : initialOrder.discountAmount || 0,
      discountType:
        initialOrder.discountPercentage && initialOrder.discountPercentage > 0
          ? 'percentage'
          : initialOrder.discountAmount && initialOrder.discountAmount > 0
          ? 'fixed'
          : 'percentage',
      designerId:
        initialOrder.designerId ||
        initialOrder.designer?.id ||
        (employeeIdFromUrl ? parseInt(employeeIdFromUrl) : 0),
    };
    setLastSubmittedData(generateFormHash(hashData));
    setIsDirty(false);
  }, [
    isEditMode,
    initialOrder,
    setValue,
    employeeIdFromUrl,
  ]);

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
        address: dialogShippingAddress || data.address || '',
        roadFnCityId: dialogSelectedCityId || data.roadFnCityId || null,
        roadFnAreaId: dialogSelectedAreaId || data.roadFnAreaId || null,
      };

      // Call API to create client
      const response = await clientsService.createClient(clientData);
      console.log('Client created:', response);

      // Reload clients list to include the new client
      await loadAllClients();

      // Update local state with client data
      setCustomerData({
        ...data,
        address: dialogShippingAddress,
      });
      setClientId(response.id);  // Store the new client ID
      
      // Update shipping info in main form
      setShippingAddress(dialogShippingAddress);
      setSelectedCityId(dialogSelectedCityId);
      setSelectedAreaId(dialogSelectedAreaId);
      
      // Reset dialog fields
      setDialogShippingAddress('');
      setDialogSelectedCityId(null);
      setDialogSelectedAreaId(null);
      setDialogAreas([]);
      
      setCustomerDialogOpen(false);
      setSubmitSuccess(true);
      
      // Auto-select the newly created client in the autocomplete
      const newClient = {
        id: response.id,
        name: data.customerName,
        phone: data.customerPhone,
        country: data.country,
        province: data.province,
        district: data.district,
        address: dialogShippingAddress,
        roadFnCityId: dialogSelectedCityId,
        roadFnAreaId: dialogSelectedAreaId,
      };
      handleCustomerSelect(newClient);
      
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
        address: client.address || '',
      });
      setClientId(client.id);
      setCustomerNotFound(false);
      
      // Update shipping company information from client
      setShippingAddress(client.address || '');
      setSelectedCityId(client.roadFnCityId || null);
      setSelectedAreaId(client.roadFnAreaId || null);
      
      // Load areas if city is selected
      if (client.roadFnCityId) {
        loadAreas(client.roadFnCityId);
      }
    } else {
      setCustomerData(null);
      setClientId(null);
      setCustomerNotFound(false);
      setShippingAddress('');
      setSelectedCityId(null);
      setSelectedAreaId(null);
      setAreas([]);
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
          serverId: null,
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
      serverId: null,
      orderName: '',
      designImages: [],
      blouseImages: [],
      items: [
        {
          id: 1,
          serverId: null,
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

  // Handle image upload - upload files immediately when selected
  const handleImageUpload = async (event, orderId, type) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    try {
      // For design files - upload everything (images + files) and store in printFileUrls
      if (type === 'design') {
        // Separate images and files for upload (but all go to printFileUrls)
        const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));
        const nonImageFiles = files.filter(file => !file.type || !file.type.startsWith('image/'));
        
        console.log('=== DESIGN FILES UPLOAD START ===');
        console.log('Total files:', files.length, 'Images:', imageFiles.length, 'Files:', nonImageFiles.length);
        
        const uploadedItems = [];
        
        // Upload images (first API call)
        if (imageFiles.length > 0) {
          try {
            console.log('🖼️ Uploading images to API...', imageFiles.map(f => f.name));
            const uploadResponse = await ordersService.uploadFiles(imageFiles);
            console.log('✅ Images upload response:', uploadResponse);
            
            if (uploadResponse && uploadResponse.success && uploadResponse.files) {
              for (let index = 0; index < uploadResponse.files.length; index++) {
                const uploadedFile = uploadResponse.files[index];
                const originalFile = imageFiles[index];
                const preview = await createImagePreview(originalFile);
                uploadedItems.push({
                  url: uploadedFile.url, // Server URL - goes to printFileUrls
                  previewUrl: preview, // Local preview for display
                  name: uploadedFile.fileName,
                  type: originalFile.type,
                  file: null
                });
              }
            }
          } catch (uploadError) {
            console.error('❌ Error uploading images:', uploadError);
            setSubmitError('فشل في رفع الصور. يرجى المحاولة مرة أخرى.');
            return;
          }
        }
        
        // Upload non-image files (second API call)
        if (nonImageFiles.length > 0) {
          try {
            console.log('📄 Uploading files to API...', nonImageFiles.map(f => f.name));
            const uploadResponse = await ordersService.uploadFiles(nonImageFiles);
            console.log('✅ Files upload response:', uploadResponse);
            
            if (uploadResponse && uploadResponse.success && uploadResponse.files) {
              uploadResponse.files.forEach((uploadedFile, index) => {
                const originalFile = nonImageFiles[index];
                uploadedItems.push({
                  url: uploadedFile.url, // Server URL - goes to printFileUrls
                  name: uploadedFile.fileName,
                  type: originalFile.type,
                  file: null
                });
              });
            }
          } catch (uploadError) {
            console.error('❌ Error uploading files:', uploadError);
            setSubmitError('فشل في رفع الملفات. يرجى المحاولة مرة أخرى.');
            return;
          }
        }
        
        console.log('=== DESIGN FILES UPLOAD END - Total:', uploadedItems.length, '===');
        
        // Add to designImages (all will go to printFileUrls in onSubmit)
        setOrders(prev => prev.map(order => {
          if (order.id === orderId) {
            return { ...order, designImages: [...order.designImages, ...uploadedItems] };
          }
          return order;
        }));
      } else if (type === 'blouse') {
        // For blouse images - upload images and store in mockupImageUrls
        const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) return;
        
        console.log('=== BLOUSE IMAGES UPLOAD START ===');
        console.log('Blouse images to upload:', imageFiles.length, imageFiles.map(f => f.name));
        
        try {
          console.log('🖼️ Uploading blouse images to API...', imageFiles.map(f => f.name));
          const uploadResponse = await ordersService.uploadFiles(imageFiles);
          console.log('✅ Blouse images upload response:', uploadResponse);
          
          if (uploadResponse && uploadResponse.success && uploadResponse.files) {
            const uploadedBlouseImages = [];
            for (let index = 0; index < uploadResponse.files.length; index++) {
              const uploadedFile = uploadResponse.files[index];
              const originalFile = imageFiles[index];
              const preview = await createImagePreview(originalFile);
              uploadedBlouseImages.push({
                url: uploadedFile.url, // Server URL - goes to mockupImageUrls
                previewUrl: preview, // Local preview for display
                name: uploadedFile.fileName,
                type: originalFile.type,
                file: null
              });
            }
            
            console.log('=== BLOUSE IMAGES UPLOAD END - Total:', uploadedBlouseImages.length, '===');
            
            // Add to blouseImages (will go to mockupImageUrls in onSubmit)
            setOrders(prev => prev.map(order => {
              if (order.id === orderId) {
                return { ...order, blouseImages: [...order.blouseImages, ...uploadedBlouseImages] };
              }
              return order;
            }));
          }
        } catch (uploadError) {
          console.error('❌ Error uploading blouse images:', uploadError);
          setSubmitError('فشل في رفع صور البلوزة. يرجى المحاولة مرة أخرى.');
          return;
        }
      }
    } catch (error) {
      console.error('خطأ في رفع الملفات:', error);
      setSubmitError('حدث خطأ أثناء رفع الملفات');
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

    // Validate selected region
    if (!selectedRegion || selectedRegion.trim() === '') {
      setRegionError('اسم المنطقة مطلوب');
      setSubmitError('يجب اختيار اسم المنطقة');
      setIsSubmitting(false);
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
    setRegionError(''); // Clear region error when starting submission
    setSubmitSuccess(false); // Clear any previous success message

    try {
      // Files are already uploaded when selected, so we just need to collect URLs
      const orderDesigns = orders.map((order) => {
        // designImages (from "ملفات التصميم") → all go to printFileUrls
        const printFileUrls = [];
        order.designImages.forEach((designImage) => {
          if (typeof designImage === 'string') {
            if (!designImage.startsWith('blob:')) {
              printFileUrls.push(designImage);
            }
            return;
          }
          if (designImage?.url && !designImage.url.startsWith('blob:')) {
            printFileUrls.push(designImage.url);
          }
        });
        
        // blouseImages (from "صور البلوزة") → all go to mockupImageUrls
        const mockupImageUrls = [];
        order.blouseImages.forEach((blouseImage) => {
          if (typeof blouseImage === 'string') {
            if (!blouseImage.startsWith('blob:')) {
              mockupImageUrls.push(blouseImage);
            }
            return;
          }
          if (blouseImage?.url && !blouseImage.url.startsWith('blob:')) {
            mockupImageUrls.push(blouseImage.url);
          }
        });
        
        const designPayload = {
          designName: order.orderName,
          mockupImageUrls: mockupImageUrls.length > 0 ? mockupImageUrls : [],
          printFileUrls: printFileUrls.length > 0 ? printFileUrls : [],
        };

        if (initialOrder?.id) {
          designPayload.orderId = initialOrder.id;
        }
 
         if (isEditMode && order?.serverId) {
           designPayload.id = order.serverId;
         }

        designPayload.orderDesignItems = order.items.map(item => {
          const itemPayload = {
            size: getSizeValueByLabel(item.size),
            color: getEnumValueFromLabel(item.color, COLOR_LABELS),
            fabricType: getEnumValueFromLabel(item.fabricType, FABRIC_TYPE_LABELS),
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0
          };

          if (isEditMode && item?.serverId) {
            itemPayload.id = item.serverId;
            itemPayload.orderDesignId = order?.serverId || 0;
          }

          return itemPayload;
        });

        return designPayload;
      });

      if (!clientId) {
        setSubmitError('يجب البحث عن العميل أو إضافة عميل جديد أولاً');
        setIsSubmitting(false);
        return;
      }

      const resolvedDesignerId = (() => {
        if (isEditMode) {
          return (
            initialOrder?.designerId ||
            initialOrder?.designer?.id ||
            (employeeIdFromUrl ? parseInt(employeeIdFromUrl) : 0) ||
            user?.id ||
            0
          );
        }
        if (employeeIdFromUrl) {
          return parseInt(employeeIdFromUrl);
        }
        return user?.id || 0;
      })();
      if (!resolvedDesignerId || resolvedDesignerId <= 0) {
        setSubmitError('يجب تحديد مصمم صحيح قبل إنشاء الطلب');
        setIsSubmitting(false);
        return;
      }

      // Format notes with timestamp and author if provided
      let formattedNotes = '';
      if (isEditMode) {
        formattedNotes = notes || '';
      } else if (notes && notes.trim()) {
        const currentDate = new Date();
        const dateTime = currentDate.toLocaleString("ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          calendar: "gregory"
        });
        const authorName = user?.name || "مستخدم غير معروف";
        formattedNotes = `[${dateTime}] ${authorName}: ${notes.trim()}`;
      }

      const computedDiscountNotes =
        discount > 0
          ? `خصم ${discountType === 'percentage' ? `${discount}%` : `${discount}$`}`
          : (isEditMode ? initialOrder?.discountNotes || '' : '');

      // Get current client data
      const currentClient = allClients.find(c => c.id === clientId);
      
      // Prepare client object with shipping company information
      const clientWithShippingInfo = currentClient ? {
        ...currentClient,
        name: customerData.customerName || currentClient.name,
        phone: customerData.customerPhone || currentClient.phone,
        country: customerData.country || currentClient.country,
        province: customerData.province || currentClient.province,
        district: customerData.district || currentClient.district,
        address: shippingAddress || currentClient.address || '',
        roadFnCityId: selectedCityId || currentClient.roadFnCityId || null,
        roadFnAreaId: selectedAreaId || currentClient.roadFnAreaId || null
      } : {
        id: clientId,
        name: customerData.customerName,
        phone: customerData.customerPhone,
        country: customerData.country,
        province: customerData.province,
        district: customerData.district,
        address: shippingAddress || '',
        roadFnCityId: selectedCityId || null,
        roadFnAreaId: selectedAreaId || null
      };

      const orderData = {
        clientId: clientId,
        country: customerData.country,
        province: customerData.province,
        district: customerData.district,
        designerId: resolvedDesignerId,
        preparerId: isEditMode ? (initialOrder?.preparerId ?? null) : null,
        discountPercentage: discountType === 'percentage' ? discount : 0,
        discountAmount: discountType === 'fixed' ? discount : (isEditMode ? initialOrder?.discountAmount || 0 : 0),
        deliveryFee: deliveryPrice,
        discountNotes: computedDiscountNotes,
        notes: formattedNotes,
        orderDesigns: orderDesigns,
        // Send client shipping company information in order payload
        clientAddress: shippingAddress || currentClient?.address || '',
        clientRoadFnCityId: selectedCityId ?? currentClient?.roadFnCityId ?? null,
        clientRoadFnAreaId: selectedAreaId ?? currentClient?.roadFnAreaId ?? null,
        clientPhone2: currentClient?.phone2 || null,
        // Send client object with shipping info directly in orderData
        client: clientWithShippingInfo
      };

      if (isEditMode) {
        const payload = {
          ...(initialOrder || {}),
          ...orderData,
          id: initialOrder?.id,
          status: initialOrder?.status ?? ORDER_STATUS.PENDING_PRINTING,
          orderNumber: initialOrder?.orderNumber || initialOrder?.id,
          orderDate: initialOrder?.orderDate || null,
          subTotal: initialOrder?.subTotal ?? 0,
          totalAmount: initialOrder?.totalAmount ?? 0,
        };

        if (payload.client) {
          payload.client = {
            ...payload.client,
            name: customerData.customerName || payload.client.name,
            phone: customerData.customerPhone || payload.client.phone,
            country: customerData.country || payload.client.country,
            province: customerData.province || payload.client.province,
            district: customerData.district || payload.client.district,
            address: shippingAddress || payload.client.address || '',
            roadFnCityId: selectedCityId || payload.client.roadFnCityId || null,
            roadFnAreaId: selectedAreaId || payload.client.roadFnAreaId || null,
          };
        }
        
        // Also add client shipping company information to main payload with correct field names
        payload.clientAddress = shippingAddress || payload.clientAddress || currentClient?.address || '';
        payload.clientRoadFnCityId = selectedCityId ?? payload.clientRoadFnCityId ?? currentClient?.roadFnCityId ?? null;
        payload.clientRoadFnAreaId = selectedAreaId ?? payload.clientRoadFnAreaId ?? currentClient?.roadFnAreaId ?? null;
        payload.clientPhone2 = payload.clientPhone2 ?? currentClient?.phone2 ?? null;

        payload.orderDesigns = orderDesigns;

        try {
          await onUpdate?.(payload);
          setSubmitSuccess(true);
          setTimeout(() => {
            setSubmitSuccess(false);
            if (onSuccess) onSuccess();
          }, 1500);
          setIsSubmitting(false);
          return;
        } catch (error) {
          console.error('خطأ في تحديث الطلب:', error);
          setSubmitError(error.message || 'حدث خطأ أثناء تحديث الطلب');
          setSubmitSuccess(false);
          setIsSubmitting(false);
          return;
        }
      }

      console.log('=== Order Data Being Sent ===');
      console.log('📦 Full Order Data:', JSON.stringify(orderData, null, 2));
      console.log('📍 Shipping Info Details:');
      console.log('  - shippingAddress:', shippingAddress);
      console.log('  - selectedCityId:', selectedCityId, '(type:', typeof selectedCityId, ')');
      console.log('  - selectedAreaId:', selectedAreaId, '(type:', typeof selectedAreaId, ')');
      console.log('  - currentClient?.roadFnCityId:', currentClient?.roadFnCityId);
      console.log('  - currentClient?.roadFnAreaId:', currentClient?.roadFnAreaId);
      console.log('📤 Final Payload Values:');
      console.log('  - clientAddress:', orderData.clientAddress);
      console.log('  - clientRoadFnCityId:', orderData.clientRoadFnCityId, '(type:', typeof orderData.clientRoadFnCityId, ')');
      console.log('  - clientRoadFnAreaId:', orderData.clientRoadFnAreaId, '(type:', typeof orderData.clientRoadFnAreaId, ')');
      console.log('  - clientPhone2:', orderData.clientPhone2);
      
      // Validate that values are being sent
      if (orderData.clientRoadFnCityId === null || orderData.clientRoadFnCityId === undefined) {
        console.warn('⚠️ WARNING: clientRoadFnCityId is null/undefined!');
      }
      if (orderData.clientRoadFnAreaId === null || orderData.clientRoadFnAreaId === undefined) {
        console.warn('⚠️ WARNING: clientRoadFnAreaId is null/undefined!');
      }
      
      const response = await ordersService.createOrder(orderData);
      console.log('Order created successfully:', response);
      console.log('Response client data:', response?.client);
      
      // Update client with shipping info AFTER creating order (in case backend didn't save it)
      if (clientId && (shippingAddress || selectedCityId || selectedAreaId)) {
        try {
          const clientUpdateData = {
            address: shippingAddress || '',
            roadFnCityId: selectedCityId || null,
            roadFnAreaId: selectedAreaId || null
          };
          
          // Only update if values are different from what's in response
          const responseClient = response?.client;
          const needsUpdate = 
            (shippingAddress && responseClient?.address !== shippingAddress) ||
            (selectedCityId && responseClient?.roadFnCityId !== selectedCityId) ||
            (selectedAreaId && responseClient?.roadFnAreaId !== selectedAreaId);
          
          if (needsUpdate) {
            console.log('Updating client shipping info after order creation:', clientUpdateData);
            await clientsService.updateClient(clientId, clientUpdateData);
            console.log('Client updated successfully after order creation');
            
            // Reload clients to get updated data
            await loadAllClients();
          }
        } catch (error) {
          console.error('Error updating client shipping info after order creation:', error);
          // Don't show error to user - order was created successfully
        }
      }
      
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
      setSelectedRegion('');
      setRegionError('');
      setDiscount(0);
      setDiscountType('percentage');
      setNotes('');
      setCustomerData(null);
      setClientId(null);
      setShippingAddress('');
      setSelectedCityId(null);
      setSelectedAreaId(null);
      setAreas([]);

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
    setRegionError(''); // Clear error when region is selected
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
      {!isEditMode && (
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
      )}

      <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
          {isEditMode ? 'تعديل الطلب' : 'إنشاء طلب جديد'}
        </Typography>
      
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}

        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {isEditMode ? 'تم تحديث الطلب بنجاح!' : 'تم إنشاء الطلب بنجاح!'}
          </Alert>
        )}

      <Grid container spacing={3}>
        {/* Customer Dialog */}
        <Dialog 
          open={customerDialogOpen} 
          onClose={() => {
            setCustomerDialogOpen(false);
            // Reset dialog fields when closing
            setDialogShippingAddress('');
            setDialogSelectedCityId(null);
            setDialogSelectedAreaId(null);
            setDialogAreas([]);
          }}
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

              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                  معلومات شركة التوصيل
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="العنوان"
                    value={dialogShippingAddress}
                    onChange={(e) => setDialogShippingAddress(e.target.value)}
                    placeholder="أدخل عنوان شركة التوصيل"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>المدينة</InputLabel>
                    <Select
                      value={dialogSelectedCityId || ''}
                      label="المدينة"
                      onChange={(e) => {
                        setDialogSelectedCityId(e.target.value);
                        setDialogSelectedAreaId(null); // Reset area when city changes
                      }}
                      disabled={dialogLoadingCities}
                    >
                      {dialogLoadingCities ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          جاري التحميل...
                        </MenuItem>
                      ) : dialogCities.length === 0 ? (
                        <MenuItem disabled>لا توجد مدن متاحة</MenuItem>
                      ) : (
                        dialogCities.map((city) => (
                          <MenuItem key={city.id || city.cityId} value={city.id || city.cityId}>
                            {city.name || city.cityName || `المدينة ${city.id || city.cityId}`}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {dialogLoadingCities && (
                      <FormHelperText>
                        <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
                        جاري تحميل المدن...
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>المنطقة</InputLabel>
                    <Select
                      value={dialogSelectedAreaId || ''}
                      label="المنطقة"
                      onChange={(e) => setDialogSelectedAreaId(e.target.value)}
                      disabled={!dialogSelectedCityId || dialogLoadingAreas}
                    >
                      {!dialogSelectedCityId ? (
                        <MenuItem disabled>يرجى اختيار المدينة أولاً</MenuItem>
                      ) : dialogLoadingAreas ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          جاري التحميل...
                        </MenuItem>
                      ) : dialogAreas.length === 0 ? (
                        <MenuItem disabled>لا توجد مناطق متاحة</MenuItem>
                      ) : (
                        dialogAreas.map((area) => (
                          <MenuItem key={area.id || area.areaId} value={area.id || area.areaId}>
                            {area.name || area.areaName || `المنطقة ${area.id || area.areaId}`}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {dialogLoadingAreas && (
                      <FormHelperText>
                        <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
                        جاري تحميل المناطق...
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button 
                onClick={() => {
                  setCustomerDialogOpen(false);
                  // Reset dialog fields when canceling
                  setDialogShippingAddress('');
                  setDialogSelectedCityId(null);
                  setDialogSelectedAreaId(null);
                  setDialogAreas([]);
                }}
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
                  getOptionLabel={(option) => option.phone?.toString() || ''}
                  loading={loadingClients}
                  value={allClients.find(client => client.id === clientId) || null}
                  onChange={(event, newValue) => handleCustomerSelect(newValue)}
                  filterOptions={(options, { inputValue }) => {
                    // Filter by phone number and name
                    const searchValue = inputValue.toLowerCase().trim();
                    if (!searchValue) return options;
                    return options.filter(option => 
                      (option.phone && option.phone.toString().toLowerCase().includes(searchValue)) ||
                      (option.name && option.name.toLowerCase().includes(searchValue))
                    );
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {option.phone || ''}
                          </Typography>
                        </Box>
                        {option.name && (
                          <Typography variant="body2" color="text.secondary">
                            {option.name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="رقم الهاتف"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                      helperText="ابحث بالاسم أو رقم الهاتف واختر العميل من القائمة"
                    />
                  )}
                  noOptionsText="لا توجد نتائج"
                  loadingText="جاري التحميل..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="اسم العميل"
                  value={customerData?.customerName || ''}
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
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

        {/* Shipping Company Information Section */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              معلومات شركة التوصيل
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="العنوان"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="أدخل عنوان شركة التوصيل"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>المدينة</InputLabel>
                  <Select
                    value={selectedCityId || ''}
                    label="المدينة"
                    onChange={(e) => {
                      setSelectedCityId(e.target.value);
                      setSelectedAreaId(null); // Reset area when city changes
                    }}
                    disabled={loadingCities}
                  >
                    {loadingCities ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        جاري التحميل...
                      </MenuItem>
                    ) : cities.length === 0 ? (
                      <MenuItem disabled>لا توجد مدن متاحة</MenuItem>
                    ) : (
                      cities.map((city) => (
                        <MenuItem key={city.id || city.cityId} value={city.id || city.cityId}>
                          {city.name || city.cityName || `المدينة ${city.id || city.cityId}`}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {loadingCities && (
                    <FormHelperText>
                      <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      جاري تحميل المدن...
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>المنطقة</InputLabel>
                  <Select
                    value={selectedAreaId || ''}
                    label="المنطقة"
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    disabled={!selectedCityId || loadingAreas}
                  >
                    {!selectedCityId ? (
                      <MenuItem disabled>يرجى اختيار المدينة أولاً</MenuItem>
                    ) : loadingAreas ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        جاري التحميل...
                      </MenuItem>
                    ) : areas.length === 0 ? (
                      <MenuItem disabled>لا توجد مناطق متاحة</MenuItem>
                    ) : (
                      areas.map((area) => (
                        <MenuItem key={area.id || area.areaId} value={area.id || area.areaId}>
                          {area.name || area.areaName || `المنطقة ${area.id || area.areaId}`}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {loadingAreas && (
                    <FormHelperText>
                      <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      جاري تحميل المناطق...
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Orders Section */}
        <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%' }}>
          <Paper elevation={2} sx={{ 
            p: 3, 
            width: '100%', 
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            '& > *': {
              width: '100%',
              maxWidth: '100%'
            }
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              إضافة الطلبات
            </Typography>

          {orders.map((order, index) => (
            <Accordion 
              key={order.id} 
              expanded={expandedOrders.includes(order.id)}
              onChange={(e, isExpanded) => handleAccordionChange(order.id, isExpanded)}
              sx={{ 
                mb: 2, 
                width: '100% !important', 
                maxWidth: '100% !important',
                minWidth: 0,
                boxSizing: 'border-box',
                overflow: 'visible',
                '& .MuiCollapse-root': {
                  width: '100% !important',
                  maxWidth: '100% !important'
                },
                '& .MuiAccordionDetails-root': { 
                  padding: '16px !important',
                  width: '100% !important',
                  maxWidth: '100% !important',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  margin: 0
                },
                '& .MuiAccordionSummary-root': {
                  width: '100% !important',
                  maxWidth: '100% !important',
                  minWidth: 0
                }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ width: '100%' }}>
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
              <AccordionDetails sx={{ 
                width: '100% !important', 
                maxWidth: '100% !important',
                minWidth: 0,
                padding: '16px !important', 
                boxSizing: 'border-box', 
                margin: '0 !important',
                overflow: 'visible',
                '& > *': { 
                  width: '100% !important',
                  maxWidth: '100% !important',
                  minWidth: 0
                } 
              }}>

                {/* Order Name and Images */}
                <Grid container spacing={2} sx={{ 
                  width: '100% !important', 
                  maxWidth: '100% !important',
                  minWidth: 0,
                  margin: '0 !important',
                  padding: 0,
                  boxSizing: 'border-box'
                }}>
                  <Grid item xs={12} md={6} >
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
                            accept="image/*,.pdf,.doc,.docx,.ai,.eps"
                            style={{ display: 'none' }}
                            id={`${formInstanceId}-design-${order.id}`}
                            multiple
                            type="file"
                            onChange={(e) => handleImageUpload(e, order.id, 'design')}
                            disabled={isSubmitting}
                          />
                          <label htmlFor={`${formInstanceId}-design-${order.id}`}>
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
                                  <img src={fileInfo.previewUrl || fileInfo.url} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
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
                            id={`${formInstanceId}-blouse-${order.id}`}
                            multiple
                            type="file"
                            onChange={(e) => handleImageUpload(e, order.id, 'blouse')}
                            disabled={isSubmitting}
                          />
                          <label htmlFor={`${formInstanceId}-blouse-${order.id}`}>
                            <IconButton color="primary" component="span">
                              <CloudUpload />
                            </IconButton>
                          </label>
                          <Typography variant="body2" fontWeight={600}> صور ال Mockup</Typography>
                          {order.blouseImages.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              ({order.blouseImages.length} صورة)
                            </Typography>
                          )}
                        </Box>
                        {order.blouseImages.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {order.blouseImages.map((blouseImage, idx) => {
                              // Handle both object (with previewUrl) and string (direct URL)
                              const imageUrl = typeof blouseImage === 'object' && blouseImage.previewUrl 
                                ? blouseImage.previewUrl 
                                : (typeof blouseImage === 'object' && blouseImage.url 
                                  ? blouseImage.url 
                                  : blouseImage);
                              return (
                                <Box key={idx} sx={{ position: 'relative', display: 'inline-block' }}>
                                  <Card sx={{ width: 80, height: 80 }}>
                                    <CardMedia 
                                      component="img" 
                                      height="80" 
                                      image={imageUrl}
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
                              );
                            })}
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
                    <Grid container spacing={2} sx={{ 
                      width: '100% !important', 
                      maxWidth: '100% !important',
                      minWidth: 0,
                      margin: '0 !important',
                      padding: 0,
                      boxSizing: 'border-box'
                    }}>
                      <Grid item xs={12} sm={4} md={4}>
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
                            <MenuItem value="ترنج">ترنج</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={3} md={3}>
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
                            <MenuItem value="أزرق">أزرق</MenuItem>
                            <MenuItem value="بني">بني</MenuItem>
                            <MenuItem value="بنفسجي">بنفسجي</MenuItem>
                            <MenuItem value="زهري">زهري</MenuItem>
                            <MenuItem value="بيج">بيج</MenuItem>
                            <MenuItem value="خمري">خمري</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={2} md={2}>
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
                      <Grid item xs={12} sm={1} md={1}>
                        <TextField
                          fullWidth
                          size="medium"
                          type="number"
                          label="الكمية"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(order.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2} md={2}>
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

            {/* Notes Section */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  الملاحظات
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="ملاحظات الطلب"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات خاصة بالطلب هنا..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Description />
                      </InputAdornment>
                    ),
                  }}
                />
              </Paper>
            </Grid>

            {/* Order Total Section */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  ملخص الطلب
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required error={!!regionError}>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2, flexWrap: 'wrap' }}>
                {isEditMode && onCancel && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    sx={{ minWidth: 160, py: 1.5 }}
                  >
                    إلغاء
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="large"
                  onClick={onSubmit}
                  disabled={isSubmitting || (!isEditMode && !isDirty)}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} />
                    ) : (
                      isEditMode ? <Save /> : <Assignment />
                    )
                  }
                  sx={{ minWidth: 200, py: 1.5 }}
                >
                  {isSubmitting
                    ? 'جاري الإرسال...'
                    : isEditMode
                    ? 'حفظ التعديلات'
                    : 'إنشاء الطلب'}
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