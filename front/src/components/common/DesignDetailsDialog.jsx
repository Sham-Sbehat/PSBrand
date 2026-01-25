import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Grid,
  Box,
} from "@mui/material";
import { Visibility, Download, AttachFile } from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";

const DesignDetailsDialog = ({
  open,
  onClose,
  design,
  imageUrl,
  onViewImage,
  onDownloadImage,
  onDownloadFile,
  extractFileKeyFromUrl,
}) => {
  if (!design) return null;

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
          boxShadow: "0 8px 32px rgba(94, 78, 62, 0.12)",
          border: "none",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          fontWeight: 700,
          pb: 2,
          pt: 2.5,
          px: 3,
          background: "#ffffff",
          borderBottom: `1px solid ${calmPalette.primary}20`,
          fontSize: "1.1rem",
          color: calmPalette.textPrimary,
        }}
      >
        عرض التصميم
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, px: 3, pb: 2, backgroundColor: "#fafafa" }}>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: calmPalette.textSecondary, 
                display: "block", 
                mb: 0.5,
                fontSize: "0.75rem",
              }}
            >
              الرقم التسلسلي
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 600, 
                color: calmPalette.textPrimary,
                fontSize: "0.95rem",
              }}
            >
              {design.serialNumber || design.designName || "-"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: calmPalette.textSecondary, 
                display: "block", 
                mb: 0.5,
                fontSize: "0.75rem",
              }}
            >
              تاريخ التصميم
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 600, 
                color: calmPalette.textPrimary,
                fontSize: "0.95rem",
              }}
            >
              {design.createdAt
                ? new Date(design.createdAt).toLocaleDateString("ar-SA")
                : design.designDate
                ? new Date(design.designDate).toLocaleDateString("ar-SA")
                : "-"}
            </Typography>
          </Grid>
        </Grid>
        <Box sx={{ mb: 2.5 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5, 
              fontWeight: 600, 
              color: calmPalette.textPrimary,
              fontSize: "0.9rem",
            }}
          >
            صورة التصميم
          </Typography>
          {imageUrl || design.designImageUrl ? (
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-start" }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Visibility />}
                onClick={() => {
                  if (onViewImage) {
                    onViewImage(imageUrl || design.designImageUrl);
                  }
                }}
                sx={{
                  backgroundColor: calmPalette.primary,
                  color: "#ffffff",
                  px: 2,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontWeight: 500,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  "&:hover": {
                    backgroundColor: calmPalette.primary + "dd",
                  },
                }}
              >
                عرض الصورة
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Download />}
                onClick={async () => {
                  if (onDownloadImage) {
                    const fileKey = design.designImageKey || (extractFileKeyFromUrl ? extractFileKeyFromUrl(design.designImageUrl) : null);
                    await onDownloadImage(fileKey, `design_image_${design.serialNumber || design.id}`);
                  }
                }}
                sx={{ 
                  backgroundColor: calmPalette.primary,
                  color: "#ffffff",
                  px: 2,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontWeight: 500,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  "&:hover": {
                    backgroundColor: calmPalette.primary + "dd",
                  },
                }}
              >
                تحميل الصورة
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              لا توجد صورة
            </Typography>
          )}
        </Box>
        
        <Box>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5, 
              fontWeight: 600, 
              color: calmPalette.textPrimary,
              fontSize: "0.9rem",
            }}
          >
            ملفات التصميم
          </Typography>
          {design.designFileUrls && design.designFileUrls.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {design.designFileUrls.map((fileItem, index) => {
                let fileKey = null;
                let fileName = `الملف ${index + 1}`;
                let serialNumber = null;
                let downloadUrl = null;
                
                if (typeof fileItem === 'object' && fileItem !== null) {
                  fileKey = fileItem.fileKey;
                  fileName = fileItem.printFileName || fileName;
                  serialNumber = fileItem.serialNumber;
                  downloadUrl = fileItem.downloadUrl;
                } else if (typeof fileItem === 'string') {
                  fileKey = extractFileKeyFromUrl ? extractFileKeyFromUrl(fileItem) || fileItem : fileItem;
                  downloadUrl = fileItem;
                }
                
                return (
                  <Box
                    key={index}
                    sx={{
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      backgroundColor: "#ffffff",
                      borderRadius: 1.5,
                      border: `1px solid ${calmPalette.primary}20`,
                      "&:hover": {
                        borderColor: calmPalette.primary + "40",
                        boxShadow: "0 2px 4px rgba(94, 78, 62, 0.08)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <AttachFile sx={{ color: calmPalette.primary, fontSize: 20 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {serialNumber && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: calmPalette.textSecondary, 
                            display: "block", 
                            mb: 0.25,
                            fontSize: "0.7rem",
                          }}
                        >
                          الرقم: {serialNumber}
                        </Typography>
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500, 
                          color: calmPalette.textPrimary,
                          fontSize: "0.85rem",
                          wordBreak: "break-word",
                        }}
                      >
                        {fileName}
                      </Typography>
                    </Box>
                    <Button
                      startIcon={<Download />}
                      onClick={() => {
                        if (onDownloadFile) {
                          if (downloadUrl) {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = fileName;
                            link.target = '_blank';
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            setTimeout(() => {
                              document.body.removeChild(link);
                            }, 100);
                          } else if (fileKey) {
                            onDownloadFile(fileKey, fileName);
                          }
                        }
                      }}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 90,
                        borderColor: calmPalette.primary + "30",
                        color: calmPalette.primary,
                        backgroundColor: "#ffffff",
                        fontSize: "0.8rem",
                        textTransform: "none",
                        borderRadius: 1.5,
                        px: 1.5,
                        "&:hover": {
                          borderColor: calmPalette.primary,
                          backgroundColor: calmPalette.primary + "08",
                        },
                      }}
                    >
                      تحميل
                    </Button>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: "center" }}>
              لا توجد ملفات
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        px: 3, 
        py: 2, 
        borderTop: `1px solid ${calmPalette.primary}20`, 
        backgroundColor: "#ffffff",
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            color: calmPalette.textPrimary,
            borderColor: calmPalette.primary + "30",
            backgroundColor: "#ffffff",
            px: 2.5,
            py: 0.75,
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            fontSize: "0.875rem",
            "&:hover": {
              borderColor: calmPalette.primary,
              backgroundColor: calmPalette.primary + "08",
            },
          }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DesignDetailsDialog;

