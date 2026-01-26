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
          borderBottom: `1px solid ${calmPalette.primary}20`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {displayTitle}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: calmPalette.textSecondary }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Description (for design requests) */}
          {design.description && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
              >
                الوصف:
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                {design.description}
              </Typography>
            </Box>
          )}

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
                  const imageUrl = image.downloadUrl || image.fileKey || image;
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
                      onClick={() => handleImageClick(image)}
                    >
                      <CardMedia
                        component="img"
                        image={imageUrl}
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
                  } else if (image && typeof image === 'object') {
                    // It's an object, check if downloadUrl/fileKey is a full URL
                    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                      // It's already a full URL, use it as is
                      finalUrl = imageUrl;
                    } else {
                      // It's a publicId, construct full Cloudinary URL
                      finalUrl = `https://res.cloudinary.com/dz5dobxsr/image/upload/${imageKey}`;
                    }
                  }

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
                      onClick={() => handleImageClick(image)}
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

          {/* Note (for design requests) */}
          {design.note && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
              >
                الملاحظات:
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                {design.note}
              </Typography>
            </Box>
          )}

          {/* Notes (for designs from designers) */}
          {design.notes && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
              >
                الملاحظات:
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                {design.notes}
              </Typography>
            </Box>
          )}

          {/* Info */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
              pt: 2,
              borderTop: `1px solid ${calmPalette.primary}10`,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
              >
                المنشئ:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {design.createdByName || "-"}
              </Typography>
            </Box>
            {design.mainDesignerName !== undefined && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
                >
                  المصمم المعين:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {design.mainDesignerName || "غير معين"}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography
                variant="caption"
                sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
              >
                الحالة:
              </Typography>
              {getStatusLabel && (
                <Chip
                  label={getStatusLabel(design.status).label}
                  color={getStatusLabel(design.status).color}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
              >
                تاريخ الإنشاء:
              </Typography>
              <Typography variant="body2">
                {design.createdAt
                  ? new Date(design.createdAt).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </Typography>
            </Box>
            {design.updatedAt && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
                >
                  آخر تحديث:
                </Typography>
                <Typography variant="body2">
                  {new Date(design.updatedAt).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ borderTop: `1px solid ${calmPalette.primary}10`, p: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: calmPalette.primary,
            "&:hover": {
              backgroundColor: calmPalette.primaryDark,
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

