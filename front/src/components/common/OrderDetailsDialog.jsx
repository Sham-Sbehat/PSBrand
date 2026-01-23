import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Image as ImageIcon,
  PictureAsPdf,
  CameraAlt,
} from "@mui/icons-material";
import GlassDialog from "./GlassDialog";
import calmPalette from "../../theme/calmPalette";

// Helper component for info items
const InfoItem = ({ label, value }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 0.5,
      py: 0.5,
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box sx={{ typography: "body1", fontWeight: 600, color: "text.primary" }}>
      {value ?? "-"}
    </Box>
  </Box>
);

const OrderDetailsDialog = ({
  open,
  onClose,
  order,
  // Helper functions as props
  getStatusText,
  getStatusChipColor,
  formatDateTime,
  formatCurrency,
  getFabricLabel,
  getColorLabel,
  getSizeLabel,
  getFullUrl,
  // Image handling
  handleImageClick,
  loadingImage,
  imageCache,
  // File handling
  openFile,
  // Custom actions (buttons) - can be passed as React nodes
  customActions,
  // Custom content to add after designs section
  customContentAfterDesigns,
  // WhatsApp handler (optional)
  onWhatsAppClick,
  // Additional sections to show/hide
  showEmployeeSection = true,
  showDesignsSection = true,
  showNotesSection = true,
  // Max width
  maxWidth = "lg",
}) => {
  if (!order) return null;

  // Calculate total order quantity
  const totalOrderQuantity = order.orderDesigns?.reduce((sum, design) => {
    const designItems = design?.orderDesignItems || [];
    const designQuantity = designItems.reduce(
      (itemSum, item) => itemSum + (item?.quantity || 0),
      0
    );
    return sum + designQuantity;
  }, 0) || 0;

  // Calculate discount display
  const discountDisplay = (() => {
    if (order.discountPercentage && order.discountPercentage > 0) {
      return `${order.discountPercentage}%`;
    }
    if (order.discountAmount && order.discountAmount > 0) {
      return formatCurrency ? formatCurrency(order.discountAmount) : `${order.discountAmount} ₪`;
    }
    return "-";
  })();

  // Get order notes
  const orderNotes = order.notes || order.orderNotes || null;

  // Get discount notes
  const discountNotes = order.discountNotes || null;

  // Get order designs
  const orderDesigns = order.orderDesigns || [];

  // Get mockup images helper
  const getMockupImages = (design) => {
    if (!design) return [];
    const images = [];
    if (Array.isArray(design.mockupImageUrls)) {
      images.push(...design.mockupImageUrls);
    }
    if (design.mockupImageUrl) {
      images.push(design.mockupImageUrl);
    }
    return images.filter((url) => url && url !== "placeholder_mockup.jpg");
  };

  // Get print files helper
  const getPrintFiles = (design) => {
    if (!design) return [];
    const files = [];
    if (Array.isArray(design.printFileUrls)) {
      files.push(...design.printFileUrls);
    }
    if (design.printFileUrl) {
      files.push(design.printFileUrl);
    }
    return files.filter((url) => url && url !== "placeholder_print.pdf");
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      title="تفاصيل الطلب"
      subtitle={order.orderNumber}
      contentSx={{ padding: 3, maxHeight: "85vh", overflowY: "auto" }}
      actions={
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {customActions}
          <Button onClick={onClose} variant="contained">
            إغلاق
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Order Information */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            معلومات الطلب
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="رقم الطلب"
                value={order.orderNumber || `#${order.id}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="الحالة"
                value={
                  <Chip
                    label={getStatusText ? getStatusText(order.status) : order.status}
                    color={getStatusChipColor ? getStatusChipColor(order.status) : "default"}
                    size="small"
                  />
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="التاريخ"
                value={formatDateTime ? formatDateTime(order.orderDate || order.createdAt) : (order.orderDate || order.createdAt)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="إجمالي الكمية"
                value={totalOrderQuantity || totalOrderQuantity === 0 ? totalOrderQuantity : "-"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="المجموع الفرعي"
                value={formatCurrency ? formatCurrency(order.subTotal) : `${order.subTotal || 0} ₪`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem label="التخفيض" value={discountDisplay} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="رسوم التوصيل"
                value={formatCurrency ? formatCurrency(order.deliveryFee ?? order.deliveryPrice) : `${order.deliveryFee ?? order.deliveryPrice ?? 0} ₪`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="المبلغ الإجمالي"
                value={formatCurrency ? formatCurrency(order.totalAmount) : `${order.totalAmount || 0} ₪`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="يحتاج تصوير"
                value={
                  order.needsPhotography ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CameraAlt sx={{ color: "primary.main" }} />
                      <Typography variant="body2">نعم</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا
                    </Typography>
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem
                label="مصدر الطلب"
                value={
                  order.orderSource === 1 ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        component="svg"
                        sx={{
                          width: 20,
                          height: 20,
                          fill: "#000000",
                        }}
                        viewBox="0 0 24 24"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </Box>
                      <Typography variant="body2">تيك توك</Typography>
                    </Box>
                  ) : order.orderSource === 2 ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        component="svg"
                        sx={{
                          width: 20,
                          height: 20,
                          fill: "#E4405F",
                        }}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </Box>
                      <Typography variant="body2">انستجرام</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )
                }
              />
            </Grid>
          </Grid>
          {discountNotes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ملاحظات التخفيض
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {discountNotes}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Client Information */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            معلومات العميل
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem label="الاسم" value={order.client?.name || "-"} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem 
                label="الهاتف" 
                value={
                  order.client?.phone ? (
                    onWhatsAppClick ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{order.client.phone}</Typography>
                        <Tooltip title="انقر للتواصل مع الزبون عبر الواتساب">
                          <IconButton
                            size="small"
                            onClick={() => onWhatsAppClick(order.client.phone)}
                            sx={{
                              color: '#25D366',
                              '&:hover': {
                                backgroundColor: 'rgba(37, 211, 102, 0.1)',
                              },
                            }}
                          >
                            <Box
                              component="svg"
                              sx={{
                                width: 20,
                                height: 20,
                                fill: '#25D366',
                              }}
                              viewBox="0 0 24 24"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </Box>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      order.client.phone
                    )
                  ) : (
                    "-"
                  )
                } 
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem label="المدينة" value={order.province || "-"} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem label="المنطقة" value={order.district || "-"} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoItem label="البلد" value={order.country || "-"} />
            </Grid>
          </Grid>
        </Box>

        {showEmployeeSection && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="البائع" value={order.designer?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="المعد" value={order.preparer?.name || "غير محدد"} />
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        {showNotesSection && orderNotes && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                ملاحظات الطلب
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orderNotes}
              </Typography>
            </Box>
          </>
        )}

        {showDesignsSection && orderDesigns.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                التصاميم ({orderDesigns.length})
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {orderDesigns.map((design, index) => {
                  const designItems = design?.orderDesignItems || [];
                  const designQuantity = designItems.reduce(
                    (sum, item) => sum + (item?.quantity || 0),
                    0
                  ) || 0;
                  const orderId = order?.id || 0;
                  const designId = design?.id || index;
                  const mockupImages = getMockupImages(design);
                  const printFiles = getPrintFiles(design);

                  return (
                    <Box
                      key={designId}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        padding: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {design.designName || `تصميم ${index + 1}`}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Chip
                            label={`الكمية: ${designQuantity}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {design.totalPrice !== undefined && design.totalPrice !== null && (
                            <Chip
                              label={`قيمة التصميم: ${formatCurrency ? formatCurrency(design.totalPrice) : `${design.totalPrice} ₪`}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>

                      {designItems.length > 0 && (
                        <TableContainer
                          sx={{
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>نوع القماش</TableCell>
                                <TableCell>اللون</TableCell>
                                <TableCell align="center">المقاس</TableCell>
                                <TableCell align="center">الكمية</TableCell>
                                <TableCell align="center">السعر الفردي</TableCell>
                                <TableCell align="center">الإجمالي</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {designItems.map((item, idx) => (
                                <TableRow key={item?.id || idx}>
                                  <TableCell>
                                    {getFabricLabel ? getFabricLabel(item) : (item.fabricType || "-")}
                                  </TableCell>
                                  <TableCell>
                                    {getColorLabel ? getColorLabel(item) : (item.color || "-")}
                                  </TableCell>
                                  <TableCell align="center">
                                    {getSizeLabel ? getSizeLabel(item) : (item.size || "-")}
                                  </TableCell>
                                  <TableCell align="center">{item?.quantity ?? "-"}</TableCell>
                                  <TableCell align="center">
                                    {formatCurrency ? formatCurrency(item?.unitPrice) : `${item?.unitPrice || 0} ₪`}
                                  </TableCell>
                                  <TableCell align="center">
                                    {formatCurrency ? formatCurrency(item?.totalPrice) : `${item?.totalPrice || 0} ₪`}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      {mockupImages.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            الصور ({mockupImages.length})
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {mockupImages.map((imageUrl, idx) => {
                              const imageKey = `image-${orderId}-${designId}`;
                              const isLoading = loadingImage === imageKey;
                              const cachedImage = imageCache?.[imageKey];

                              if (imageUrl === "image_data_excluded") {
                                return (
                                  <Button
                                    key={idx}
                                    variant="outlined"
                                    size="small"
                                    startIcon={isLoading ? <CircularProgress size={16} /> : <ImageIcon />}
                                    onClick={() => {
                                      if (handleImageClick) {
                                        handleImageClick(imageUrl, orderId, designId);
                                      }
                                    }}
                                    disabled={isLoading}
                                  >
                                    عرض الصورة {idx + 1}
                                  </Button>
                                );
                              }

                              const fullUrl = getFullUrl ? getFullUrl(imageUrl) : imageUrl;
                              return (
                                <Box
                                  key={idx}
                                  onClick={() => {
                                    if (handleImageClick) {
                                      handleImageClick(fullUrl, orderId, designId);
                                    }
                                  }}
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 1,
                                    overflow: "hidden",
                                    border: `2px solid ${calmPalette.primary}30`,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    "&:hover": {
                                      transform: "scale(1.05)",
                                      borderColor: calmPalette.primary,
                                    },
                                  }}
                                >
                                  <img
                                    src={fullUrl}
                                    alt={`تصميم ${index + 1} - صورة ${idx + 1}`}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      )}

                      {printFiles.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            ملفات الطباعة ({printFiles.length})
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                              {printFiles.map((fileUrl, idx) => {
                              const fileKey = `file-${orderId}-${designId}`;
                              const isLoading = loadingImage === fileKey;
                              const fullUrl = getFullUrl ? getFullUrl(fileUrl) : fileUrl;
                              
                              if (fileUrl === "image_data_excluded") {
                                return (
                                  <Button
                                    key={idx}
                                    variant="outlined"
                                    size="small"
                                    startIcon={isLoading ? <CircularProgress size={16} /> : <PictureAsPdf />}
                                    onClick={() => {
                                      if (openFile) {
                                        openFile(fileUrl, orderId, designId);
                                      }
                                    }}
                                    disabled={isLoading}
                                  >
                                    تحميل الملف {idx + 1}
                                  </Button>
                                );
                              }
                              
                              return (
                                <Button
                                  key={idx}
                                  variant="outlined"
                                  size="small"
                                  startIcon={<PictureAsPdf />}
                                  onClick={() => {
                                    if (openFile) {
                                      openFile(fullUrl, orderId, designId);
                                    } else {
                                      window.open(fullUrl, "_blank");
                                    }
                                  }}
                                >
                                  ملف الطباعة {idx + 1}
                                </Button>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </>
        )}

        {customContentAfterDesigns}
      </Box>
    </GlassDialog>
  );
};

export default OrderDetailsDialog;

