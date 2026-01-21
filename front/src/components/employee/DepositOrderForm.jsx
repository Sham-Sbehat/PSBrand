import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  CircularProgress,
  Autocomplete,
  Divider,
  Paper,
  Card,
  CardContent,
  InputAdornment,
} from "@mui/material";
import {
  Person,
  Phone,
  LocationOn,
  AttachMoney,
  Save,
  Cancel,
  Business,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import {
  depositOrdersService,
  clientsService,
  shipmentsService,
  deliveryService,
} from "../../services/api";

const DepositOrderForm = ({ onSuccess, onCancel, initialDepositOrder = null }) => {
  const { user } = useApp();
  const isEditMode = !!initialDepositOrder;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [deliveryRegions, setDeliveryRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionError, setRegionError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: initialDepositOrder || {
      clientId: "",
      country: "",
      province: "",
      district: "",
      designerId: user?.id || 0,
      totalAmount: 0,
      deliveryFee: 0,
      notes: "",
      shippingNotes: "",
      clientAddress: "",
      clientRoadFnCityId: null,
      clientRoadFnAreaId: null,
      clientPhone2: "",
      createdAt: new Date().toISOString(),
    },
  });

  const watchedCityId = watch("clientRoadFnCityId");

  // Load clients
  useEffect(() => {
    loadAllClients();
    loadCities();
  }, []);

  // Load areas when city changes
  useEffect(() => {
    if (watchedCityId) {
      loadAreas(watchedCityId);
    } else {
      setAreas([]);
      setValue("clientRoadFnAreaId", null);
    }
  }, [watchedCityId, setValue]);

  // Load delivery regions once
  useEffect(() => {
    (async () => {
      try {
        const regions = await deliveryService.getDeliveryRegions();
        setDeliveryRegions(Array.isArray(regions) ? regions : []);
      } catch (e) {
        setDeliveryRegions([]);
      }
    })();
  }, []);

  const handleRegionChange = async (e) => {
    const region = e.target.value;
    setSelectedRegion(region);
    setRegionError(""); // Clear error when region is selected
    try {
      const fee = await deliveryService.getDeliveryFee(region);
      setValue("deliveryFee", parseFloat(fee) || 0);
    } catch (err) {
      setValue("deliveryFee", 0);
    }
  };

  // Set initial values if editing
  useEffect(() => {
    if (initialDepositOrder) {
      reset({
        clientId: initialDepositOrder.clientId || "",
        country: initialDepositOrder.country || "",
        province: initialDepositOrder.province || "",
        district: initialDepositOrder.district || "",
        designerId: initialDepositOrder.designerId || user?.id || 0,
        totalAmount: initialDepositOrder.totalAmount || 0,
        deliveryFee: initialDepositOrder.deliveryFee || 0,
        notes: initialDepositOrder.notes || "",
        shippingNotes: initialDepositOrder.shippingNotes || "",
        clientAddress: initialDepositOrder.clientAddress || "",
        clientRoadFnCityId: initialDepositOrder.clientRoadFnCityId || null,
        clientRoadFnAreaId: initialDepositOrder.clientRoadFnAreaId || null,
        clientPhone2: initialDepositOrder.clientPhone2 || "",
        createdAt: initialDepositOrder.createdAt || new Date().toISOString(),
      });
      
      if (initialDepositOrder.clientRoadFnCityId) {
        loadAreas(initialDepositOrder.clientRoadFnCityId);
      }
      
      // Set selected region if district exists
      if (initialDepositOrder.district) {
        setSelectedRegion(initialDepositOrder.district);
      }
    }
  }, [initialDepositOrder, user, reset]);

  const loadAllClients = async () => {
    setLoadingClients(true);
    try {
      const response = await clientsService.getAllClients();
      let clients = [];
      if (Array.isArray(response)) {
        clients = response;
      } else if (response && Array.isArray(response.clients)) {
        clients = response.clients;
      } else if (response && Array.isArray(response.data)) {
        clients = response.data;
      }
      setAllClients(clients);
    } catch (error) {
      setAllClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadCities = async () => {
    setLoadingCities(true);
    try {
      const citiesData = await shipmentsService.getCities();
      const citiesArray = Array.isArray(citiesData) ? citiesData : [];
      setCities(citiesArray);
    } catch (error) {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadAreas = async (cityId) => {
    if (!cityId) {
      setAreas([]);
      return;
    }
    setLoadingAreas(true);
    try {
      const areasData = await shipmentsService.getAreas(cityId);
      const areasArray = Array.isArray(areasData) ? areasData : [];
      setAreas(areasArray);
    } catch (error) {
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get current date/time in local timezone and convert to ISO string
      const now = new Date();
      // Format as YYYY-MM-DDTHH:mm:ss (local time, no timezone)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      
      const depositOrderData = {
        ...data,
        clientId: Number(data.clientId),
        designerId: Number(data.designerId) || user?.id || 0,
        totalAmount: Number(data.totalAmount) || 0,
        deliveryFee: Number(data.deliveryFee) || 0,
        clientRoadFnCityId: data.clientRoadFnCityId ? Number(data.clientRoadFnCityId) : null,
        clientRoadFnAreaId: data.clientRoadFnAreaId ? Number(data.clientRoadFnAreaId) : null,
        createdAt: isEditMode ? data.createdAt : localDateTime,
      };

      if (isEditMode) {
        await depositOrdersService.updateDepositOrder(initialDepositOrder.id, depositOrderData);
        setSuccess("تم تحديث طلب العربون بنجاح!");
      } else {
        await depositOrdersService.createDepositOrder(depositOrderData);
        setSuccess("تم إنشاء طلب العربون بنجاح!");
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "حدث خطأ أثناء حفظ طلب العربون"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = allClients.find((c) => c.id === Number(watch("clientId")));

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Customer Info Section in Form - Always visible */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, bgcolor: "grey.50" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                معلومات العميل والموقع
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="clientId"
                    control={control}
                    rules={{ required: "يجب اختيار العميل" }}
                    render={({ field }) => {
                      const selectedClient = allClients.find(c => c.id === field.value) || null;
                      return (
                        <Autocomplete
                          fullWidth
                          options={Array.isArray(allClients) ? allClients : []}
                          getOptionLabel={(option) => option.phone?.toString() || ""}
                          isOptionEqualToValue={(option, value) =>
                            option.id === value?.id
                          }
                          loading={loadingClients}
                          value={selectedClient}
                          onChange={(event, newValue) => {
                            field.onChange(newValue?.id || "");
                            if (newValue) {
                              // تعبئة جميع معلومات العميل تلقائياً
                              setValue("clientAddress", newValue.address || "");
                              setValue("clientPhone2", newValue.phone2 || "");
                              setValue("country", newValue.country || "");
                              setValue("province", newValue.province || "");
                              setValue("district", newValue.district || "");
                              setValue("clientRoadFnCityId", newValue.roadFnCityId || null);
                              setValue("clientRoadFnAreaId", newValue.roadFnAreaId || null);
                              
                              // تحميل المناطق إذا تم اختيار مدينة
                              if (newValue.roadFnCityId) {
                                loadAreas(newValue.roadFnCityId);
                              } else {
                                setAreas([]);
                                setValue("clientRoadFnAreaId", null);
                              }
                            } else {
                              // مسح الحقول عند إلغاء الاختيار
                              setValue("clientAddress", "");
                              setValue("clientPhone2", "");
                              setValue("country", "");
                              setValue("province", "");
                              setValue("district", "");
                              setValue("clientRoadFnCityId", null);
                              setValue("clientRoadFnAreaId", null);
                              setAreas([]);
                            }
                          }}
                          filterOptions={(options, { inputValue }) => {
                            // Filter by phone number and name
                            const searchValue = inputValue.toLowerCase().trim();
                            if (!searchValue) return options;
                            return options.filter(
                              (option) =>
                                (option.phone &&
                                  option.phone
                                    .toString()
                                    .toLowerCase()
                                    .includes(searchValue)) ||
                                (option.name &&
                                  option.name.toLowerCase().includes(searchValue))
                            );
                          }}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              key={option.id || option.phone}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Phone fontSize="small" color="action" />
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {option.phone || ""}
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
                              error={!!errors.clientId}
                              helperText={errors.clientId?.message || "ابحث بالاسم أو رقم الهاتف واختر العميل من القائمة"}
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Phone />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                          noOptionsText="لا توجد نتائج"
                          loadingText="جاري التحميل..."
                          ListboxProps={{
                            style: {
                              maxHeight: '400px',
                            }
                          }}
                          PaperComponent={({ children, ...other }) => (
                            <Paper 
                              {...other} 
                              sx={{ 
                                minWidth: 400, 
                                maxWidth: '90vw',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                border: '1px solid #e0e0e0',
                                borderRadius: 2,
                                mt: 1,
                              }}
                            >
                              {children}
                            </Paper>
                          )}
                        />
                      );
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم العميل"
                    value={selectedClient?.name || ""}
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
                    {...register("country")}
                    value={watch("country") || selectedClient?.country || ""}
                    onChange={(e) => setValue("country", e.target.value)}
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
                    {...register("province")}
                    value={watch("province") || selectedClient?.province || ""}
                    onChange={(e) => setValue("province", e.target.value)}
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
                    {...register("district")}
                    value={watch("district") || selectedClient?.district || ""}
                    onChange={(e) => setValue("district", e.target.value)}
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
                    multiline
                    rows={1}
                    label="العنوان الكامل"
                    {...register("clientAddress")}
                    value={watch("clientAddress") || selectedClient?.address || ""}
                    onChange={(e) => setValue("clientAddress", e.target.value)}
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
          <Grid item xs={12} sx={{ width: "100%" }}>
            <Paper
              elevation={2}
              sx={{ p: 3, bgcolor: "grey.50", width: "100%" }}
            >
              <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                معلومات شركة التوصيل
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    sx={{ minWidth: "250px" }}
                    fullWidth
                    label="العنوان *"
                    {...register("clientAddress", {
                      required: "يجب إدخال العنوان",
                    })}
                    value={watch("clientAddress") || selectedClient?.address || ""}
                    onChange={(e) => setValue("clientAddress", e.target.value)}
                    placeholder="أدخل عنوان شركة التوصيل"
                    error={!!errors.clientAddress}
                    helperText={errors.clientAddress?.message}
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
                  <Controller
                    name="clientRoadFnCityId"
                    control={control}
                    rules={{ required: "يجب اختيار المدينة" }}
                    render={({ field, fieldState: { error } }) => {
                      const selectedCity = cities.find(c => (c.id || c.Id || c.cityId) === field.value) || null;
                      return (
                        <Autocomplete
                          fullWidth
                          sx={{ minWidth: "200px" }}
                          options={cities}
                          getOptionLabel={(option) =>
                            option.arabicCityName ||
                            option.cityName ||
                            option.name ||
                            option.Name ||
                            `المدينة ${option.id || option.Id || option.cityId}`
                          }
                          value={selectedCity}
                          onChange={(event, newValue) => {
                            const cityId = newValue ? (newValue.id || newValue.Id || newValue.cityId) : null;
                            field.onChange(cityId);
                            setSelectedCityId(cityId);
                            setValue("clientRoadFnAreaId", null);
                          }}
                          loading={loadingCities}
                          disabled={loadingCities}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="المدينة *"
                              placeholder="ابحث عن المدينة..."
                              variant="outlined"
                              error={!!error}
                              helperText={error?.message}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: "#f5f5f5",
                                  "&:hover": {
                                    backgroundColor: "#eeeeee",
                                  },
                                  "&.Mui-focused": {
                                    backgroundColor: "#ffffff",
                                  },
                                  "& fieldset": {
                                    borderColor: "#e0e0e0",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: "#bdbdbd",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: "#1976d2",
                                    borderWidth: "2px",
                                  },
                                },
                                "& .MuiInputLabel-root": {
                                  color: "#616161",
                                  "&.Mui-focused": {
                                    color: "#1976d2",
                                  },
                                },
                              }}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {loadingCities ? (
                                      <CircularProgress size={20} />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              sx={{
                                padding: "14px 20px",
                                fontSize: "1rem",
                                minHeight: "48px",
                                display: "flex",
                                alignItems: "center",
                                "&:hover": {
                                  backgroundColor: "#f5f5f5",
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: "#e3f2fd",
                                },
                              }}
                            >
                              {option.arabicCityName ||
                                option.cityName ||
                                option.name ||
                                option.Name ||
                                `المدينة ${option.id || option.Id || option.cityId}`}
                            </Box>
                          )}
                          ListboxProps={{
                            style: {
                              maxHeight: "350px",
                              padding: "8px 0",
                            },
                          }}
                          PaperComponent={({ children, ...other }) => (
                            <Paper
                              {...other}
                              sx={{
                                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                                borderRadius: "4px",
                                marginTop: "4px",
                                border: "1px solid #e0e0e0",
                                "& .MuiAutocomplete-listbox": {
                                  padding: 0,
                                },
                              }}
                            >
                              {children}
                            </Paper>
                          )}
                          noOptionsText="لا توجد مدن متاحة"
                          loadingText="جاري التحميل..."
                        />
                      );
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="clientRoadFnAreaId"
                    control={control}
                    rules={{ required: "يجب اختيار المنطقة" }}
                    render={({ field, fieldState: { error } }) => {
                      const selectedArea = areas.find(a => {
                        const areaId = a?.id || a?.Id || a?.areaId;
                        return areaId === field.value;
                      }) || null;
                      return (
                        <Autocomplete
                          fullWidth
                          sx={{ minWidth: "270px" }}
                          options={areas}
                          getOptionLabel={(option) =>
                            option.name ||
                            option.Name ||
                            option.areaName ||
                            `المنطقة ${option.id || option.Id || option.areaId}`
                          }
                          value={selectedArea}
                          onChange={(event, newValue) => {
                            const areaId = newValue ? (newValue.id || newValue.Id || newValue.areaId) : null;
                            field.onChange(areaId);
                          }}
                          loading={loadingAreas}
                          disabled={!watchedCityId || loadingAreas}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="المنطقة *"
                              placeholder={
                                !watchedCityId
                                  ? "يرجى اختيار المدينة أولاً"
                                  : "ابحث عن المنطقة..."
                              }
                              variant="outlined"
                              error={!!error}
                              helperText={error?.message}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: "#f5f5f5",
                                  "&:hover": {
                                    backgroundColor: "#eeeeee",
                                  },
                                  "&.Mui-focused": {
                                    backgroundColor: "#ffffff",
                                  },
                                  "& fieldset": {
                                    borderColor: "#e0e0e0",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: "#bdbdbd",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: "#1976d2",
                                    borderWidth: "2px",
                                  },
                                },
                                "& .MuiInputLabel-root": {
                                  color: "#616161",
                                  "&.Mui-focused": {
                                    color: "#1976d2",
                                  },
                                },
                              }}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {loadingAreas ? (
                                      <CircularProgress size={20} />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              sx={{
                                padding: "14px 20px",
                                fontSize: "1rem",
                                minHeight: "48px",
                                display: "flex",
                                alignItems: "center",
                                "&:hover": {
                                  backgroundColor: "#f5f5f5",
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: "#e3f2fd",
                                },
                              }}
                            >
                              {option.name ||
                                option.Name ||
                                option.areaName ||
                                `المنطقة ${option.id || option.Id || option.areaId}`}
                            </Box>
                          )}
                          ListboxProps={{
                            style: {
                              maxHeight: "350px",
                              padding: "8px 0",
                            },
                          }}
                          PaperComponent={({ children, ...other }) => (
                            <Paper
                              {...other}
                              sx={{
                                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                                borderRadius: "4px",
                                marginTop: "4px",
                                border: "1px solid #e0e0e0",
                                "& .MuiAutocomplete-listbox": {
                                  padding: 0,
                                },
                              }}
                            >
                              {children}
                            </Paper>
                          )}
                          noOptionsText={
                            !watchedCityId
                              ? "يرجى اختيار المدينة أولاً"
                              : "لا توجد مناطق متاحة"
                          }
                          loadingText="جاري التحميل..."
                        />
                      );
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* المعلومات المالية */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2.5, bgcolor: "background.paper", borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "primary.main" }}>
                المعلومات المالية
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="مبلغ العربون *"
                    {...register("totalAmount", {
                      required: "يجب إدخال مبلغ العربون",
                      min: { value: 0.01, message: "يجب أن يكون المبلغ أكبر من صفر" },
                      valueAsNumber: true,
                    })}
                    error={!!errors.totalAmount}
                    helperText={errors.totalAmount?.message}
                    InputProps={{
                      startAdornment: <AttachMoney sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!regionError}>
                    <InputLabel id="region-select-label">
                      اسم المنطقة
                    </InputLabel>
                    <Select
                      labelId="region-select-label"
                      label="اسم المنطقة"
                      value={selectedRegion}
                      onChange={handleRegionChange}
                      sx={{ minWidth: 295 }}
                    >
                      {deliveryRegions.map((r, idx) => (
                        <MenuItem key={idx} value={r.name || r}>
                          {r.name || r}
                        </MenuItem>
                      ))}
                    </Select>
                    {regionError && (
                      <FormHelperText>{regionError}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="سعر التوصيل"
                    type="number"
                    value={watch("deliveryFee") || 0}
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
              </Grid>
            </Paper>
          </Grid>

          {/* الملاحظات */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2.5, bgcolor: "background.paper", borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "primary.main" }}>
                الملاحظات
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="ملاحظات عامة"
                    {...register("notes")}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="ملاحظات شركة التوصيل"
                    {...register("shippingNotes")}
                    placeholder="ملاحظات خاصة بشركة التوصيل..."
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* أزرار الإجراءات */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 15 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
                startIcon={<Cancel />}
                sx={{ minWidth: 120 }}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{
                  minWidth: 120,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
                  },
                }}
              >
                {loading ? "جاري الحفظ..." : isEditMode ? "تحديث" : "إنشاء"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default DepositOrderForm;

