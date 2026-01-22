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
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Note,
  Create,
} from "@mui/icons-material";
import { ordersService, mainDesignerService } from "../../services/api";
import Swal from "sweetalert2";
import calmPalette from "../../theme/calmPalette";

const CreateDesignForm = () => {
  const [designImages, setDesignImages] = useState([]); // Array of { url, previewUrl, name }
  const [uploadingImages, setUploadingImages] = useState(false);
  const [creatingDesign, setCreatingDesign] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      designName: "",
      notes: "",
    },
  });

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

  // Extract fileKey from URL
  const extractFileKeyFromUrl = (url) => {
    if (!url) return null;

    if (typeof url !== "string") {
      return null;
    }

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter((p) => p);
      if (pathParts.length > 1) {
        return pathParts.slice(1).join("/");
      }
      return pathParts[0] || null;
    } catch (e) {
      if (typeof url === "string" && url.startsWith("designs/")) {
        return url;
      }
      return null;
    }
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

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

      const uploadResponse = await ordersService.uploadFiles(imageFiles);

      if (
        uploadResponse &&
        uploadResponse.success &&
        uploadResponse.files
      ) {
        const uploadedImages = [];
        for (let index = 0; index < uploadResponse.files.length; index++) {
          const uploadedFile = uploadResponse.files[index];
          const originalFile = imageFiles[index];

          // Create preview URL
          const preview = URL.createObjectURL(originalFile);

          uploadedImages.push({
            url: uploadedFile.url,
            previewUrl: preview,
            name: uploadedFile.fileName || originalFile.name,
          });
        }

        setDesignImages((prev) => [...prev, ...uploadedImages]);
      } else {
        throw new Error("فشل في رفع الصور");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || "فشل في رفع الصور",
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
    if (designImages.length === 0) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "يرجى رفع صورة واحدة على الأقل",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    setCreatingDesign(true);
    try {
      // Extract fileKeys from URLs
      const fileKeys = designImages.map((img) => {
        const fileKey = extractFileKeyFromUrl(img.url);
        return {
          url: img.url,
          fileKey: fileKey || img.url,
          name: img.name,
        };
      });

      if (fileKeys.length === 0 || !fileKeys[0].fileKey) {
        throw new Error("فشل في استخراج مفاتيح الملفات");
      }

      // Use first image as designImageKey
      const designImageKey = fileKeys[0].fileKey;

      // Use remaining images as designFileKeys (if any)
      const designFileKeys = fileKeys.slice(1).map((file, index) => ({
        serialNumber: `${data.designName}_${index + 1}`,
        printFileName: file.name || `صورة_${index + 2}`,
        fileKey: file.fileKey,
      }));

      // Create design payload according to API spec
      const designPayload = {
        serialNumber: data.designName,
        designDate: new Date().toISOString().split("T")[0],
        designImageKey: designImageKey,
        designFileKeys: designFileKeys,
        notes: data.notes || "",
      };

      await mainDesignerService.createDesign(designPayload);

      Swal.fire({
        icon: "success",
        title: "تم الإنشاء بنجاح",
        text: "تم إنشاء التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

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
      console.error("Error creating design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text:
          error.response?.data?.message ||
          error.message ||
          "فشل في إنشاء التصميم",
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
        maxWidth: 900,
        mx: "auto",
        p: 3,
        mt: 3,
        mb: 4,
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
              gap: 2,
              mb: 4,
              pb: 2,
              borderBottom: `2px solid ${calmPalette.primary}20`,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primary}dd 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${calmPalette.primary}40`,
              }}
            >
              <Create sx={{ fontSize: 28, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: calmPalette.textPrimary,
                  mb: 0.5,
                }}
              >
                إنشاء تصميم جديد
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: calmPalette.textSecondary }}
              >
                أضف التصميمات الجديدة بسهولة
              </Typography>
            </Box>
          </Box>

          <form onSubmit={handleSubmit(onSubmitDesign)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Design Name */}
              <Controller
                name="designName"
                control={control}
                rules={{ required: "اسم التصميم مطلوب" }}
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
                      اسم التصميم
                      <Typography
                        component="span"
                        sx={{ color: "error.main", fontSize: "1.2rem" }}
                      >
                        *
                      </Typography>
                    </Typography>
                    <TextField
                      {...field}
                      placeholder="أدخل اسم التصميم"
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
                  <Typography
                    component="span"
                    sx={{ color: "error.main", fontSize: "1.2rem" }}
                  >
                    *
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
                    {uploadingImages ? "جاري الرفع..." : "رفع صور"}
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

              {/* Notes */}
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
                  ملاحظات
                </Typography>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder="أضف أي ملاحظات إضافية..."
                      fullWidth
                      multiline
                      rows={5}
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
                  )}
                />
              </Box>

              {/* Submit Button */}
              <Box
                sx={{
                  display: "flex",
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
                    px: 4,
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
                  disabled={creatingDesign || designImages.length === 0}
                  startIcon={
                    creatingDesign ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Create />
                    )
                  }
                  sx={{
                    px: 4,
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

