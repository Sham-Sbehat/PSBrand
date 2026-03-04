import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Card,
  CardMedia,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Note,
  Create,
  Category,
  Palette,
  AddCircleOutline,
} from "@mui/icons-material";
import { designRequestsService, colorsService } from "../../services/api";
import Swal from "sweetalert2";
import calmPalette from "../../theme/calmPalette";

const CreateDesignForm = ({ onSuccess }) => {
  const [designImages, setDesignImages] = useState([]); // Array of { url, previewUrl, name, imageKey }
  const [uploadingImages, setUploadingImages] = useState(false);
  const [creatingDesign, setCreatingDesign] = useState(false);
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      designName: "",
      designTitle: "",
      product: "",
      designColors: "",
      designAdditions: "",
      notes: "",
    },
  });

  // Fetch colors for select
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const colorsData = await colorsService.getAllColors();
        if (!cancelled) setColors(Array.isArray(colorsData) ? colorsData : []);
      } catch {
        if (!cancelled) setColors([]);
      } finally {
        if (!cancelled) setLoadingColors(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Reset form when component mounts
  useEffect(() => {
    return () => {
      // Clean up preview URLs on unmount
      designImages.forEach((img) => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, []);

  // Handle image upload
  const handleImageUpload = async (event) => {
    console.log("🖼️ handleImageUpload called", event.target.files);
    const files = Array.from(event.target.files);
    console.log("📁 Files array:", files);
    
    if (files.length === 0) {
      console.warn("⚠️ No files selected");
      return;
    }

    setUploadingImages(true);
    try {
      const imageFiles = files.filter(
        (file) => file.type && file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "تحذير",
          text: "يرجى اختيار ملفات صور فقط",
          confirmButtonColor: calmPalette.primary,
        });
        setUploadingImages(false);
        return;
      }

      // Upload images using DesignRequests API
      console.log("📤 Uploading images to DesignRequests API...", imageFiles);
      const uploadResponse = await designRequestsService.uploadImages(imageFiles);
      console.log("✅ Upload response:", uploadResponse);

      // The API should return imageKeys array
      // Try different possible response structures
      let imageKeys = [];
      
      if (Array.isArray(uploadResponse)) {
        // If response is directly an array
        imageKeys = uploadResponse;
      } else if (uploadResponse?.imageKeys && Array.isArray(uploadResponse.imageKeys)) {
        // If response has imageKeys property
        imageKeys = uploadResponse.imageKeys;
      } else if (uploadResponse?.data?.imageKeys && Array.isArray(uploadResponse.data.imageKeys)) {
        // If response has data.imageKeys
        imageKeys = uploadResponse.data.imageKeys;
      } else if (uploadResponse?.data && Array.isArray(uploadResponse.data)) {
        // If response.data is an array
        imageKeys = uploadResponse.data;
      } else if (uploadResponse?.files && Array.isArray(uploadResponse.files)) {
        // If response has files array (similar to ordersService.uploadFiles)
        imageKeys = uploadResponse.files.map(file => file.fileKey || file.key || file.url);
      }
      
      console.log("🔑 Extracted imageKeys:", imageKeys);
      
      if (!Array.isArray(imageKeys) || imageKeys.length === 0) {
        console.error("❌ Invalid response structure:", uploadResponse);
        throw new Error("فشل في الحصول على مفاتيح الصور من الاستجابة. بنية الاستجابة: " + JSON.stringify(uploadResponse));
      }

      const uploadedImages = [];
      for (let index = 0; index < imageFiles.length; index++) {
        const originalFile = imageFiles[index];
        const imageKey = imageKeys[index];

        if (!imageKey) {
          console.warn(`No imageKey for file ${index}`);
          continue;
        }

        // Create preview URL
        const preview = URL.createObjectURL(originalFile);

        uploadedImages.push({
          imageKey: imageKey,
          previewUrl: preview,
          name: originalFile.name,
        });
      }

      if (uploadedImages.length > 0) {
        setDesignImages((prev) => [...prev, ...uploadedImages]);
      } else {
        throw new Error("لم يتم رفع أي صور");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في رفع الصور",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUploadingImages(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // Handle remove image
  const handleRemoveImage = (index) => {
    setDesignImages((prev) => {
      const newImages = [...prev];
      // Revoke preview URL to free memory
      if (newImages[index].previewUrl) {
        URL.revokeObjectURL(newImages[index].previewUrl);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Handle design submission
  const onSubmitDesign = async (data) => {
    setCreatingDesign(true);
    try {
      // Extract imageKeys from uploaded images - ensure they are strings
      const imageKeys = designImages
        .map((img) => {
          // Ensure imageKey is a string
          const key = img.imageKey;
          if (typeof key === 'string') {
            return key;
          } else if (key && typeof key === 'object') {
            // If it's an object, try to extract the key
            return key.key || key.fileKey || key.url || String(key);
          }
          return String(key || '');
        })
        .filter((key) => key && key.trim() !== ''); // Filter out empty strings

      console.log("🔑 Final imageKeys to send:", imageKeys);

      // Validate required fields before sending
      if (!data.designName || data.designName.trim() === '') {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "عنوان الطلب مطلوب",
          confirmButtonColor: calmPalette.primary,
        });
        setCreatingDesign(false);
        return;
      }
      if (!data.designTitle || data.designTitle.trim() === '') {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "عنوان التصميم مطلوب",
          confirmButtonColor: calmPalette.primary,
        });
        setCreatingDesign(false);
        return;
      }
      if (!data.product || data.product.trim() === '') {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "المنتج مطلوب",
          confirmButtonColor: calmPalette.primary,
        });
        setCreatingDesign(false);
        return;
      }
      if (!data.designColors || data.designColors.trim() === '') {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "اللون مطلوب",
          confirmButtonColor: calmPalette.primary,
        });
        setCreatingDesign(false);
        return;
      }
      if (!data.designAdditions || data.designAdditions.trim() === '') {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "إضافات على التصميم مطلوبة",
          confirmButtonColor: calmPalette.primary,
        });
        setCreatingDesign(false);
        return;
      }

      // API القديم: title + description فقط. نجمع كل تفاصيل الحقول في وصف واحد.
      const descriptionParts = [
        `عنوان التصميم: ${data.designTitle.trim()}`,
        `المنتج: ${data.product.trim()}`,
        `اللون: ${data.designColors.trim()}`,
        `إضافات على التصميم: ${data.designAdditions.trim()}`,
      ];
      const description = descriptionParts.join(' | ');

      const designRequestPayload = {
        title: String(data.designName.trim()),
        description,
        imageKeys: imageKeys.length > 0 ? imageKeys : [],
        status: 1,
        mainDesignerId: 0,
        note: String(data.notes?.trim() || ''),
      };

      await designRequestsService.createDesignRequest(designRequestPayload);

      Swal.fire({
        icon: "success",
        title: "تم الإنشاء بنجاح",
        text: "تم إنشاء طلب التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      reset();
      setDesignImages([]);

      // Clean up preview URLs
      designImages.forEach((img) => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    } catch (error) {
      console.error("Error creating design request:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text:
          error.response?.data?.message ||
          error.message ||
          "فشل في إنشاء طلب التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setCreatingDesign(false);
    }
  };

  const handleReset = () => {
    reset();
    // Clean up preview URLs
    designImages.forEach((img) => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setDesignImages([]);
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        p: { xs: 1.5, sm: 3 },
        mt: { xs: 1, sm: 3 },
        mb: { xs: 2, sm: 4 },
      }}
    >
      <Fade in timeout={600}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 4,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(94, 78, 62, 0.12), 0 2px 8px rgba(94, 78, 62, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 12px 40px rgba(94, 78, 62, 0.15), 0 4px 12px rgba(94, 78, 62, 0.1)",
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1.5, sm: 2 },
              mb: { xs: 2, sm: 4 },
              pb: 2,
              borderBottom: `2px solid ${calmPalette.primary}20`,
            }}
          >
            <Box
              sx={{
                width: { xs: 44, sm: 56 },
                height: { xs: 44, sm: 56 },
                borderRadius: 3,
                background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primary}dd 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${calmPalette.primary}40`,
              }}
            >
              <Create sx={{ fontSize: { xs: 22, sm: 28 }, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: calmPalette.textPrimary,
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                إنشاء تصميم جديد
              </Typography>
            </Box>
          </Box>

          <form onSubmit={handleSubmit(onSubmitDesign)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Design Name */}
              <Controller
                name="designName"
                control={control}
                rules={{ required: "عنوان الطلب مطلوب" }}
                render={({ field }) => (
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Create sx={{ fontSize: 20, color: calmPalette.primary }} />
                      عنوان الطلب
                      <Typography
                        component="span"
                        sx={{ color: "error.main", fontSize: "1.2rem" }}
                      >
                        *
                      </Typography>
                    </Typography>
                    <TextField
                      {...field}
                      placeholder="أدخل عنوان الطلب"
                      fullWidth
                      required
                      error={!!errors.designName}
                      helperText={errors.designName?.message}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 2px 8px ${calmPalette.primary}20`,
                          },
                          "&.Mui-focused": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                          },
                          "& fieldset": {
                            borderColor: `${calmPalette.primary}30`,
                            borderWidth: 2,
                          },
                          "&:hover fieldset": {
                            borderColor: `${calmPalette.primary}50`,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              />

              {/* عنوان التصميم (designTitle) */}
              <Controller
                name="designTitle"
                control={control}
                rules={{ required: "عنوان التصميم مطلوب" }}
                render={({ field }) => (
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Create sx={{ fontSize: 20, color: calmPalette.primary }} />
                      عنوان التصميم
                      <Typography component="span" sx={{ color: "error.main", fontSize: "1.2rem" }}>*</Typography>
                    </Typography>
                    <TextField
                      {...field}
                      placeholder="أدخل عنوان التصميم"
                      fullWidth
                      required
                      error={!!errors.designTitle}
                      helperText={errors.designTitle?.message}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 2px 8px ${calmPalette.primary}20`,
                          },
                          "&.Mui-focused": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                          },
                          "& fieldset": {
                            borderColor: `${calmPalette.primary}30`,
                            borderWidth: 2,
                          },
                          "&:hover fieldset": {
                            borderColor: `${calmPalette.primary}50`,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              />

              {/* Images Upload */}
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: calmPalette.textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <ImageIcon sx={{ fontSize: 20, color: calmPalette.primary }} />
                  صور التصميم
                  <Typography component="span" sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
                    (اختياري)
                  </Typography>
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="design-images-upload"
                  multiple
                  type="file"
                  onChange={handleImageUpload}
                  disabled={uploadingImages || creatingDesign}
                />
                <label htmlFor="design-images-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={
                      uploadingImages ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <CloudUpload />
                      )
                    }
                    disabled={uploadingImages || creatingDesign}
                    sx={{
                      mb: 3,
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primary}dd 100%)`,
                      boxShadow: `0 4px 12px ${calmPalette.primary}40`,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 600,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 16px ${calmPalette.primary}50`,
                        background: `linear-gradient(135deg, ${calmPalette.primary}dd 0%, ${calmPalette.primary} 100%)`,
                      },
                      "&:disabled": {
                        background: `${calmPalette.primary}60`,
                      },
                    }}
                  >
                    {uploadingImages ? "جاري الرفع..." : "رفع الصور"}
                  </Button>
                </label>

                {designImages.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2.5,
                      mt: 3,
                    }}
                  >
                    {designImages.map((img, index) => (
                      <Zoom
                        in
                        key={index}
                        style={{ transitionDelay: `${index * 100}ms` }}
                      >
                        <Card
                          sx={{
                            position: "relative",
                            width: { xs: 140, sm: 160 },
                            height: { xs: 140, sm: 160 },
                            borderRadius: 3,
                            overflow: "hidden",
                            boxShadow: "0 4px 12px rgba(94, 78, 62, 0.15)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "translateY(-4px) scale(1.02)",
                              boxShadow: "0 8px 20px rgba(94, 78, 62, 0.25)",
                            },
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={img.previewUrl || img.url}
                            alt={img.name || `صورة ${index + 1}`}
                            loading="lazy"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background:
                                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.1) 100%)",
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveImage(index)}
                            disabled={creatingDesign}
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              backdropFilter: "blur(10px)",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "#fff",
                                transform: "scale(1.1)",
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "rgba(0,0,0,0.6)",
                              backdropFilter: "blur(10px)",
                              p: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#fff",
                                fontSize: "0.7rem",
                                display: "block",
                                textAlign: "center",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {img.name || `صورة ${index + 1}`}
                            </Typography>
                          </Box>
                        </Card>
                      </Zoom>
                    ))}
                  </Box>
                )}
                {errors.images && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {errors.images.message}
                  </Typography>
                )}
              </Box>

              {/* المنتج واللون في صف واحد - فلكس يقسم المساحة */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 3,
                  "& > *": { flex: 1, minWidth: 0 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Controller
                    name="product"
                    control={control}
                    rules={{ required: "المنتج مطلوب" }}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            mb: 1.5,
                            color: calmPalette.textPrimary,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Category sx={{ fontSize: 20, color: calmPalette.primary }} />
                          المنتج
                          <Typography component="span" sx={{ color: "error.main", fontSize: "1.2rem" }}>*</Typography>
                        </Typography>
                        <TextField
                          {...field}
                          placeholder="أدخل المنتج"
                          fullWidth
                          required
                          error={!!errors.product}
                          helperText={errors.product?.message}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              borderRadius: 2,
                              transition: "all 0.3s ease",
                              "&:hover": {
                                backgroundColor: "rgba(255, 255, 255, 1)",
                                boxShadow: `0 2px 8px ${calmPalette.primary}20`,
                              },
                              "&.Mui-focused": {
                                backgroundColor: "rgba(255, 255, 255, 1)",
                                boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                              },
                              "& fieldset": {
                                borderColor: `${calmPalette.primary}30`,
                                borderWidth: 2,
                              },
                              "&:hover fieldset": {
                                borderColor: `${calmPalette.primary}50`,
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: calmPalette.primary,
                                borderWidth: 2,
                              },
                            },
                          }}
                        />
                      </Box>
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Controller
                    name="designColors"
                    control={control}
                    rules={{ required: "اللون مطلوب" }}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            mb: 1.5,
                            color: calmPalette.textPrimary,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Palette sx={{ fontSize: 20, color: calmPalette.primary }} />
                          اللون
                          <Typography component="span" sx={{ color: "error.main", fontSize: "1.2rem" }}>*</Typography>
                        </Typography>
                        <FormControl
                          fullWidth
                          error={!!errors.designColors}
                          disabled={loadingColors}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              borderRadius: 2,
                              "& fieldset": {
                                borderColor: `${calmPalette.primary}30`,
                                borderWidth: 2,
                              },
                              "&:hover fieldset": {
                                borderColor: `${calmPalette.primary}50`,
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: calmPalette.primary,
                                borderWidth: 2,
                              },
                            },
                          }}
                        >
                          <InputLabel>اختر اللون</InputLabel>
                          <Select
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            label="اختر اللون"
                          >
                            <MenuItem value="">
                              <em>اختر اللون</em>
                            </MenuItem>
                            {colors.length > 0 ? (
                              colors.map((color) => {
                                const colorValue = color.nameAr || color.name || "";
                                return (
                                  <MenuItem key={color.id} value={colorValue}>
                                    {colorValue}
                                  </MenuItem>
                                );
                              })
                            ) : (
                              <>
                                <MenuItem value="أسود">أسود</MenuItem>
                                <MenuItem value="أبيض">أبيض</MenuItem>
                                <MenuItem value="سكني">سكني</MenuItem>
                                <MenuItem value="أزرق">أزرق</MenuItem>
                                <MenuItem value="بني">بني</MenuItem>
                                <MenuItem value="بنفسجي">بنفسجي</MenuItem>
                                <MenuItem value="زهري">زهري</MenuItem>
                                <MenuItem value="بيج">بيج</MenuItem>
                                <MenuItem value="خمري">خمري</MenuItem>
                              </>
                            )}
                          </Select>
                          {errors.designColors && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                              {errors.designColors.message}
                            </Typography>
                          )}
                        </FormControl>
                      </Box>
                    )}
                  />
                </Box>
              </Box>

              {/* إضافات على التصميم */}
              <Controller
                name="designAdditions"
                control={control}
                rules={{ required: "إضافات على التصميم مطلوبة" }}
                render={({ field }) => (
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <AddCircleOutline sx={{ fontSize: 20, color: calmPalette.primary }} />
                      إضافات على التصميم
                      <Typography component="span" sx={{ color: "error.main", fontSize: "1.2rem" }}>*</Typography>
                    </Typography>
                    <TextField
                      {...field}
                      placeholder="أدخل إضافات على التصميم"
                      fullWidth
                      required
                      multiline
                      rows={3}
                      error={!!errors.designAdditions}
                      helperText={errors.designAdditions?.message}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 2px 8px ${calmPalette.primary}20`,
                          },
                          "&.Mui-focused": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                          },
                          "& fieldset": {
                            borderColor: `${calmPalette.primary}30`,
                            borderWidth: 2,
                          },
                          "&:hover fieldset": {
                            borderColor: `${calmPalette.primary}50`,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              />

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Note sx={{ fontSize: 20, color: calmPalette.primary }} />
                      الملاحظات
                    </Typography>
                    <TextField
                      {...field}
                      placeholder="أدخل الملاحظات (اختياري)..."
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 2px 8px ${calmPalette.primary}20`,
                          },
                          "&.Mui-focused": {
                            backgroundColor: "rgba(255, 255, 255, 1)",
                            boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                          },
                          "& fieldset": {
                            borderColor: `${calmPalette.primary}30`,
                            borderWidth: 2,
                          },
                          "&:hover fieldset": {
                            borderColor: `${calmPalette.primary}50`,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              />

              {/* Submit Button */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column-reverse", sm: "row" },
                  gap: 2,
                  justifyContent: "flex-end",
                  mt: 3,
                  pt: 3,
                  borderTop: `2px solid ${calmPalette.primary}15`,
                }}
              >
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleReset}
                  disabled={creatingDesign}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    px: { xs: 2, sm: 4 },
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: calmPalette.primary,
                    color: calmPalette.primary,
                    borderWidth: 2,
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      borderWidth: 2,
                      backgroundColor: `${calmPalette.primary}10`,
                      transform: "translateY(-2px)",
                      boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                    },
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={creatingDesign}
                  startIcon={
                    creatingDesign ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Create />
                    )
                  }
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    px: { xs: 2, sm: 4 },
                    py: 1.5,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primary}dd 100%)`,
                    boxShadow: `0 4px 12px ${calmPalette.primary}40`,
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: `0 6px 16px ${calmPalette.primary}50`,
                      background: `linear-gradient(135deg, ${calmPalette.primary}dd 0%, ${calmPalette.primary} 100%)`,
                    },
                    "&:disabled": {
                      background: `${calmPalette.primary}60`,
                      boxShadow: "none",
                    },
                  }}
                >
                  {creatingDesign ? "جاري الإنشاء..." : "إنشاء التصميم"}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Fade>
    </Box>
  );
};

export default CreateDesignForm;

