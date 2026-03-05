import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Card,
  CardMedia,
} from "@mui/material";
import { Close, Visibility } from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";
import { parseDesignDescription } from "../../utils";

const DesignRequestDetailsDialog = ({
  open,
  onClose,
  design,
  onImageClick,
  getStatusLabel,
  imageUrl, // For designs from designers (single image URL)
}) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!design) return null;

  const handleImageClick = (image) => {
    if (onImageClick) {
      onImageClick(image);
    } else {
      setSelectedImage(image);
    }
  };

  // Determine if this is a design request or a design from designer
  const isDesignRequest = design.images !== undefined;
  const isDesignFromDesigner = design.designImageUrl !== undefined || design.designImageKey !== undefined;

  // Get title/name
  const displayTitle = design.title || design.serialNumber || design.designName || "عرض التصميم";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "#ffffff",
          boxShadow: calmPalette.shadow,
          border: "1px solid rgba(94, 78, 62, 0.15)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, rgba(97, 79, 65, 0.98) 0%, rgba(73, 59, 48, 0.95) 100%)",
          color: "#fff",
          borderBottom: "2px solid rgba(0,0,0,0.12)",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "inherit" }}>
          {displayTitle}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "rgba(255,255,255,0.9)", "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.15)" } }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* التفاصيل: أعمدة مرتبة بدون جدول */}
          {design.description && (() => {
            const parsed = parseDesignDescription(design.description);
            if (parsed) {
              const statusLabel = getStatusLabel ? getStatusLabel(design.status) : null;
              const createdStr = design.createdAt
                ? new Date(design.createdAt).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-";
              const updatedStr = design.updatedAt
                ? new Date(design.updatedAt).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;
              const items = [
                { label: "عنوان التصميم", value: parsed.designTitle || "-" },
                { label: "المنتج", value: parsed.product || "-" },
                { label: "اللون", value: parsed.color || "-" },
                { label: "إضافات على التصميم", value: parsed.additions || "-", fullWidth: true },
                { label: "المنشئ", value: design.createdByName || "-" },
                ...(design.mainDesignerName !== undefined ? [{ label: "المصمم المعين", value: design.mainDesignerName || "غير معين" }] : []),
                { label: "الحالة", value: statusLabel ? <Chip label={statusLabel.label} color={statusLabel.color} size="small" sx={{ fontWeight: 600 }} /> : (design.status ?? "-") },
                { label: "تاريخ الإنشاء", value: createdStr },
                ...(updatedStr ? [{ label: "آخر تحديث", value: updatedStr }] : []),
              ];
              return (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: calmPalette.textPrimary, borderBottom: "2px solid rgba(94, 78, 62, 0.2)", pb: 1, mb: 2 }}>
                    التفاصيل
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      overflow: "hidden",
                      backgroundColor: "grey.50",
                    }}
                  >
                    {items.map((item, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: item.fullWidth ? "flex-start" : "center",
                          gap: 1.5,
                          px: 2,
                          py: 1.25,
                          borderBottom: i < items.length - 1 ? "1px solid" : "none",
                          borderColor: "divider",
                          backgroundColor: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                        }}
                      >
                        <Box
                          sx={{
                            width: "140px",
                            flexShrink: 0,
                            display: "flex",
                            justifyContent: "flex-end",
                            direction: "rtl",
                            textAlign: "right",
                            pt: item.fullWidth ? 0.25 : 0,
                          }}
                          dir="rtl"
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textSecondary, direction: "rtl", textAlign: "right" }} dir="rtl">
                            {item.label}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            justifyContent: "flex-end",
                            direction: "rtl",
                            textAlign: "right",
                          }}
                          dir="rtl"
                        >
                          {typeof item.value === "string" ? (
                            <Typography variant="body2" sx={{ color: calmPalette.textPrimary, whiteSpace: item.fullWidth ? "pre-line" : "normal", direction: "rtl", textAlign: "right" }} dir="rtl">
                              {item.value}
                            </Typography>
                          ) : (
                            <Box sx={{ marginRight: 0, marginLeft: "auto" }}>{item.value}</Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            }
            return (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}>
                  الوصف:
                </Typography>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, whiteSpace: "pre-line" }}>
                  {design.description}
                </Typography>
              </Box>
            );
          })()}

          {/* Images (for design requests) - صور النموذج */}
          {design.images && design.images.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, color: calmPalette.textPrimary }}
              >
                صور النموذج ({design.images.length}):
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 2,
                }}
              >
                {design.images.map((image, index) => {
                  const imageKey = image.fileKey || image;
                  let imageUrl = image.downloadUrl || image.fileKey || image;
                  
                  // Construct Cloudinary URL from publicId if it's not a full URL
                  let finalUrl = imageUrl;
                  if (typeof image === 'string') {
                    // It's a string (publicId), construct Cloudinary URL
                    finalUrl = `https://res.cloudinary.com/dz5dobxsr/image/upload/${imageKey}`;
                    if (!finalUrl.includes('.') && !finalUrl.endsWith('/')) {
                      finalUrl += '.png';
                    }
                  } else if (image && typeof image === 'object') {
                    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                      finalUrl = imageUrl;
                    } else {
                      finalUrl = `https://res.cloudinary.com/dz5dobxsr/image/upload/${imageKey}`;
                      if (!finalUrl.includes('.') && !finalUrl.endsWith('/')) {
                        finalUrl += '.png';
                      }
                    }
                  }

                  // Create image object with correct downloadUrl for onClick
                  const imageForClick = typeof image === 'object' 
                    ? { ...image, downloadUrl: finalUrl, fileKey: imageKey }
                    : { downloadUrl: finalUrl, fileKey: imageKey };

                  return (
                    <Card
                      key={index}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0 4px 12px rgba(94, 78, 62, 0.25)",
                        },
                      }}
                      onClick={() => handleImageClick(imageForClick)}
                    >
                      <CardMedia
                        component="img"
                        image={finalUrl}
                        alt={`${displayTitle} - ${index + 1}`}
                        sx={{
                          height: 150,
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Design Images (designImages) - صور التصميم */}
          {design.designImages && design.designImages.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, color: calmPalette.textPrimary }}
              >
                صور التصميم ({design.designImages.length}):
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 2,
                }}
              >
                {design.designImages.map((image, index) => {
                  // Handle both object format {fileKey, downloadUrl} and string format
                  const imageKey = image.fileKey || image;
                  let imageUrl = image.downloadUrl || image.fileKey || image;

                  // Construct Cloudinary URL from publicId if it's not a full URL
                  let finalUrl = imageUrl;
                  if (typeof image === 'string') {
                    // It's a string (publicId), construct Cloudinary URL
                    finalUrl = `https://res.cloudinary.com/dz5dobxsr/image/upload/${imageKey}`;
                    // Add .png extension if missing
                    if (!finalUrl.includes('.') && !finalUrl.endsWith('/')) {
                      finalUrl += '.png';
                    }
                  } else if (image && typeof image === 'object') {
                    // It's an object, check if downloadUrl/fileKey is a full URL
                    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                      // It's already a full URL, use it as is
                      finalUrl = imageUrl;
                    } else {
                      // It's a publicId, construct full Cloudinary URL
                      finalUrl = `https://res.cloudinary.com/dz5dobxsr/image/upload/${imageKey}`;
                      // Add .png extension if missing
                      if (!finalUrl.includes('.') && !finalUrl.endsWith('/')) {
                        finalUrl += '.png';
                      }
                    }
                  }

                  // Create image object with correct downloadUrl for onClick
                  const imageForClick = typeof image === 'object' 
                    ? { ...image, downloadUrl: finalUrl, fileKey: imageKey }
                    : { downloadUrl: finalUrl, fileKey: imageKey };

                  return (
                    <Card
                      key={index}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0 4px 12px rgba(94, 78, 62, 0.25)",
                        },
                      }}
                      onClick={() => handleImageClick(imageForClick)}
                    >
                      <CardMedia
                        component="img"
                        image={finalUrl}
                        alt={`صورة تصميم ${index + 1}`}
                        sx={{
                          height: 150,
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Single Image (for designs from designers) */}
          {imageUrl && isDesignFromDesigner && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, color: calmPalette.textPrimary }}
              >
                صورة التصميم:
              </Typography>
              <Box sx={{ textAlign: "center" }}>
                <img
                  src={imageUrl}
                  alt="صورة التصميم"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    borderRadius: 8,
                  }}
                  onError={(e) => {
                    e.target.src = "/placeholder.png";
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Note / Notes: API قد يرجع note (كائن { text, addedByName, addedAt }) أو notes (نص/مصفوفة) */}
          {(design.note || design.notes) && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
              >
                الملاحظات:
              </Typography>
              <Typography variant="body2" component="div" sx={{ color: calmPalette.textSecondary, whiteSpace: "pre-wrap" }}>
                {(() => {
                  const v = design.note ?? design.notes;
                  if (v == null) return null;
                  if (typeof v === "string") return v;
                  if (Array.isArray(v)) return v.map((n, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                      {typeof n === "object" && n !== null && "text" in n ? n.text : String(n)}
                      {typeof n === "object" && n !== null && (n.addedByName || n.addedAt) && (
                        <Typography component="span" variant="caption" display="block" sx={{ color: calmPalette.textSecondary, opacity: 0.9 }}>
                          {[n.addedByName, n.addedAt ? new Date(n.addedAt).toLocaleString("ar-SA") : null].filter(Boolean).join(" — ")}
                        </Typography>
                      )}
                    </Box>
                  ));
                  if (typeof v === "object" && v !== null && "text" in v) {
                    return (
                      <Box>
                        {v.text}
                        {(v.addedByName || v.addedAt) && (
                          <Typography variant="caption" display="block" sx={{ color: calmPalette.textSecondary, mt: 0.5 }}>
                            {[v.addedByName, v.addedAt ? new Date(v.addedAt).toLocaleString("ar-SA") : null].filter(Boolean).join(" — ")}
                          </Typography>
                        )}
                      </Box>
                    );
                  }
                  return String(v);
                })()}
              </Typography>
            </Box>
          )}

          {/* Info: يظهر فقط عندما لم نعرض التفاصيل الكامل (بدون وصف محلّل) */}
          {(!design.description || !parseDesignDescription(design.description)) && (() => {
            const infoRows = [
              { label: "المنشئ", value: design.createdByName || "-" },
              ...(design.mainDesignerName !== undefined ? [{ label: "المصمم المعين", value: design.mainDesignerName || "غير معين" }] : []),
              { label: "الحالة", value: getStatusLabel ? <Chip label={getStatusLabel(design.status).label} color={getStatusLabel(design.status).color} size="small" sx={{ fontWeight: 600 }} /> : "-" },
              { label: "تاريخ الإنشاء", value: design.createdAt ? new Date(design.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-" },
              ...(design.updatedAt ? [{ label: "آخر تحديث", value: new Date(design.updatedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }] : []),
            ];
            return (
              <Box sx={{ pt: 2, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: calmPalette.textPrimary, mb: 1.5 }}>
                  معلومات الطلب
                </Typography>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", backgroundColor: "grey.50" }}>
                  {infoRows.map((row, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 1.25,
                        borderBottom: i < infoRows.length - 1 ? "1px solid" : "none",
                        borderColor: "divider",
                        backgroundColor: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <Box
                        sx={{
                          width: "140px",
                          flexShrink: 0,
                          display: "flex",
                          justifyContent: "flex-end",
                          direction: "rtl",
                          textAlign: "right",
                        }}
                        dir="rtl"
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textSecondary, direction: "rtl", textAlign: "right" }} dir="rtl">
                          {row.label}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          justifyContent: "flex-end",
                          direction: "rtl",
                          textAlign: "right",
                        }}
                        dir="rtl"
                      >
                        {typeof row.value === "string" ? (
                          <Typography variant="body2" sx={{ color: calmPalette.textPrimary, direction: "rtl", textAlign: "right" }} dir="rtl">
                            {row.value}
                          </Typography>
                        ) : (
                          <Box sx={{ marginRight: 0, marginLeft: "auto" }}>{row.value}</Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}
        </Box>
      </DialogContent>
      <DialogActions sx={{ borderTop: "1px solid rgba(0,0,0,0.08)", p: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "#1976d2",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DesignRequestDetailsDialog;

