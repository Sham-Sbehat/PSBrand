import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import { Close, ArrowBack, ArrowForward } from "@mui/icons-material";

/**
 * Shared dialog for previewing one or multiple images.
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Callback when dialog closes
 * @param {string | string[] | null} image - Single image URL, array of URLs, or null
 */
const ImagePreviewDialog = ({ open, onClose, image }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = Array.isArray(image) ? image : image ? [image] : [];
  const currentImage = images[currentIndex];

  // Reset index when dialog opens or image changes
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open, image]);

  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">
          {images.length > 1
            ? `معاينة الصور (${currentIndex + 1} / ${images.length})`
            : "معاينة الصورة"}
        </Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: 2 }}>
        {!currentImage || currentImage === "image_data_excluded" ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              color: "text.secondary",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              الصورة غير متوفرة
            </Typography>
            <Typography variant="body2">
              لم يتم تضمين بيانات الصورة في قائمة الطلبات لتقليل حجم البيانات
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
            }}
          >
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={goPrev}
                  sx={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: "rgba(0, 0, 0, 0.5)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
                    zIndex: 1,
                  }}
                >
                  <ArrowBack />
                </IconButton>
                <IconButton
                  onClick={goNext}
                  sx={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: "rgba(0, 0, 0, 0.5)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
                    zIndex: 1,
                  }}
                >
                  <ArrowForward />
                </IconButton>
              </>
            )}
            <img
              src={currentImage}
              alt={`معاينة الصورة ${currentIndex + 1}`}
              onError={(e) => {
                e.target.style.display = "none";
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = "flex";
                }
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
            <Box
              sx={{
                display: "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "400px",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                لا يمكن عرض الصورة
              </Typography>
              <Typography variant="body2">الصورة غير متوفرة في قائمة الطلبات</Typography>
            </Box>
            {images.length > 1 && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 1,
                  bgcolor: "rgba(0, 0, 0, 0.5)",
                  borderRadius: 2,
                  padding: "4px 8px",
                }}
              >
                {images.map((_, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: idx === currentIndex ? "white" : "rgba(255, 255, 255, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.8)" },
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;
