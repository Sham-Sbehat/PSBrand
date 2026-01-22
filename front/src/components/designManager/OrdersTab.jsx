import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  TablePagination,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Visibility,
  Note,
  CameraAlt,
  History,
} from "@mui/icons-material";
import { ORDER_STATUS } from "../../constants";
import calmPalette from "../../theme/calmPalette";

const OrdersTab = ({ 
  orders, 
  loading, 
  onViewOrder, 
  onStatusUpdate, 
  onNotesClick,
  updatingOrderId,
  searchQuery,
  onSearchChange,
  getStatusLabel,
  getFullUrl,
  handleImageClick,
  imageCache,
  loadingImage,
  setSelectedImage,
  setCurrentImageIndex,
  setImageDialogOpen,
  orderStatus, // ORDER_STATUS.PENDING_PRINTING or ORDER_STATUS.IN_PRINTING
  actionButtonText, // "بدء الطباعة" or "إرسال للتحضير"
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter orders based on search query
  const getFilteredOrders = () => {
    if (!searchQuery.trim()) return orders;
    
    return orders.filter((order) => {
      const clientName = order.client?.name || "";
      const clientPhone = order.client?.phone || "";
      const orderNumber = order.orderNumber || `#${order.id}` || "";
      const query = searchQuery.toLowerCase().trim();
      return (
        clientName.toLowerCase().includes(query) ||
        clientPhone.includes(query) ||
        orderNumber.toLowerCase().includes(query)
      );
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate total rows (each design counts as a row)
  const totalRows = filteredOrders.reduce((total, order) => {
    const designs = order.orderDesigns || [];
    return total + (designs.length > 0 ? designs.length : 1);
  }, 0);

  // Flatten orders to rows for pagination
  const flattenedRows = filteredOrders.flatMap((order) => {
    const designs = order.orderDesigns || [];
    if (designs.length === 0) {
      return [{ order, design: null, isFirstRow: true }];
    }
    return designs.map((design, index) => ({
      order,
      design,
      isFirstRow: index === 0
    }));
  });

  // Apply pagination
  const paginatedRows = flattenedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  return (
    <>
      {/* Search Field */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
        <Box sx={{ flex: '0 0 auto', width: '50%', position: 'relative' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: 1,
                    color: searchQuery ? calmPalette.primary : 'text.secondary',
                    transition: 'color 0.3s ease',
                  }}
                >
                  <Search />
                </Box>
              ),
            }}
            sx={{
              backgroundColor: "rgba(255,255,255,0.85)",
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(94, 78, 62, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 6px 25px rgba(94, 78, 62, 0.15)',
                backgroundColor: "rgba(255,255,255,0.95)",
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                paddingLeft: 1,
                '& fieldset': {
                  borderColor: 'rgba(94, 78, 62, 0.2)',
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                },
                '&:hover fieldset': {
                  borderColor: calmPalette.primary + '80',
                  borderWidth: 2,
                },
                '&.Mui-focused fieldset': {
                  borderColor: calmPalette.primary,
                  borderWidth: 2,
                  boxShadow: `0 0 0 3px ${calmPalette.primary}20`,
                },
                '& input': {
                  padding: '10px 14px',
                  fontSize: '0.95rem',
                },
              },
            }}
          />
        </Box>
        {searchQuery && (
          <Box
            sx={{
              marginTop: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: calmPalette.primary + '15',
              padding: '6px 16px',
              borderRadius: 2,
              width: 'fit-content',
              border: `1px solid ${calmPalette.primary}30`,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: calmPalette.primary + '25',
                transform: 'translateX(4px)',
              },
            }}
          >
            <Search sx={{ fontSize: 18, color: calmPalette.primary }} />
            <Typography
              variant="body2"
              sx={{
                color: calmPalette.primary,
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {(() => {
                const filteredCount = filteredOrders.length;
                return `تم العثور على ${filteredCount} ${filteredCount === 1 ? 'نتيجة' : 'نتائج'}`;
              })()}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Orders Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: calmPalette.surfaceHover }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الطلب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اسم الطلب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اسم العميل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>البائع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ملف التصميم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>الملاحظات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      <Box sx={{ padding: 4 }}>
                        <Typography variant="h6" color="text.secondary">
                          لا توجد طلبات حالياً
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map(({ order, design, isFirstRow }) => {
                    const status = getStatusLabel(order.status);
                    const designs = order.orderDesigns || [];
                    
                    if (!design) {
                      return (
                        <TableRow
                          key={`order-${order.id}`}
                          hover
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell>{order.orderNumber || `#${order.id}`}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{order.client?.name || "-"}</TableCell>
                          <TableCell>
                            {order.designer?.name || "غير محدد"}
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                              />
                              {order.needsPhotography && (
                                <Tooltip title="يحتاج تصوير">
                                  <CameraAlt sx={{ color: 'primary.main', fontSize: 20 }} />
                                </Tooltip>
                              )}
                              {order.isModified && (
                                <Tooltip title="تم تعديل الطلب">
                                  <History sx={{ color: 'warning.main', fontSize: 20 }} />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {order.createdAt 
                              ? new Date(order.createdAt).toLocaleDateString("en-GB", { 
                                  year: "numeric", 
                                  month: "2-digit", 
                                  day: "2-digit"
                                })
                              : "-"
                            }
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => onNotesClick(order)}
                              sx={{
                                color: order.notes ? 'primary.main' : 'action.disabled',
                                '&:hover': {
                                  bgcolor: 'action.hover'
                                }
                              }}
                              title={order.notes ? 'عرض/تعديل الملاحظات' : 'إضافة ملاحظات'}
                            >
                              <Note />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => onViewOrder(order)}
                                sx={{ minWidth: 90, flexShrink: 0 }}
                              >
                                عرض
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => onStatusUpdate(order.id, order.status)}
                                disabled={
                                  order.status !== orderStatus ||
                                  updatingOrderId === order.id
                                }
                                sx={{ minWidth: 90, flexShrink: 0 }}
                              >
                                {updatingOrderId === order.id ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} color="inherit" />
                                    جاري التحميل...
                                  </Box>
                                ) : (
                                  actionButtonText
                                )}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    const visibleDesignsInOrder = paginatedRows.filter(row => row.order.id === order.id);
                    const rowCount = visibleDesignsInOrder.length;
                      
                    return (
                      <TableRow
                        key={`order-${order.id}-design-${design.id || Math.random()}`}
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        {isFirstRow && (
                          <>
                            <TableCell rowSpan={rowCount}>
                              {order.orderNumber || `#${order.id}`}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{design?.designName || "-"}</TableCell>
                        {isFirstRow && (
                          <>
                            <TableCell rowSpan={rowCount}>
                              {order.client?.name || "-"}
                            </TableCell>
                            <TableCell rowSpan={rowCount}>
                              {order.designer?.name || "غير محدد"}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          {(() => {
                            const imageUrls = design?.mockupImageUrls || (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
                            const validImages = imageUrls.filter(url => url && url !== 'placeholder_mockup.jpg');
                            
                            if (validImages.length === 0) return "-";
                            
                            const firstImage = validImages[0];
                            const cacheKey = `${order.id}-${design.id}`;
                            const isExcluded = firstImage === 'image_data_excluded';
                            const cachedImage = imageCache[cacheKey];
                            const isLoading = loadingImage === `image-${order.id}-${design.id}`;
                            const displayImage = getFullUrl(isExcluded ? cachedImage : firstImage);
                            
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box 
                                  sx={{ 
                                    width: 60, 
                                    height: 60, 
                                    position: 'relative',
                                    cursor: 'pointer',
                                    bgcolor: isExcluded && !cachedImage ? calmPalette.surface : 'transparent',
                                    borderRadius: "4px",
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isExcluded && !cachedImage ? '1px solid rgba(34, 28, 24, 0.1)' : 'none',
                                    flexShrink: 0,
                                    '&:hover': { opacity: 0.85 }
                                  }}
                                  onClick={() => handleImageClick(firstImage, order.id, design.id)}
                                >
                                  {isLoading ? (
                                    <CircularProgress size={20} />
                                  ) : displayImage ? (
                                    <img 
                                      src={displayImage} 
                                      alt={design.designName}
                                      loading="lazy"
                                      onClick={() => {
                                        if (displayImage && displayImage !== 'image_data_excluded') {
                                          setSelectedImage(displayImage);
                                          setCurrentImageIndex(0);
                                          setImageDialogOpen(true);
                                        }
                                      }}
                                      style={{ 
                                        width: "100%", 
                                        height: "100%", 
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                        cursor: displayImage && displayImage !== 'image_data_excluded' ? 'pointer' : 'default'
                                      }}
                                    />
                                  ) : (
                                    <Box sx={{ fontSize: 12, color: 'text.secondary' }}>-</Box>
                                  )}
                                </Box>
                              </Box>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {design?.printFileUrl ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                if (design.printFileUrl) {
                                  window.open(design.printFileUrl, '_blank');
                                }
                              }}
                            >
                              تحميل
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        {isFirstRow && (
                          <>
                            <TableCell rowSpan={rowCount}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={status.label}
                                  color={status.color}
                                  size="small"
                                />
                                {order.needsPhotography && (
                                  <Tooltip title="يحتاج تصوير">
                                    <CameraAlt sx={{ color: 'primary.main', fontSize: 20 }} />
                                  </Tooltip>
                                )}
                                {order.isModified && (
                                  <Tooltip title="تم تعديل الطلب">
                                    <History sx={{ color: 'warning.main', fontSize: 20 }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell rowSpan={rowCount}>
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleDateString("en-GB", { 
                                    year: "numeric", 
                                    month: "2-digit", 
                                    day: "2-digit"
                                  })
                                : "-"
                              }
                            </TableCell>
                            <TableCell rowSpan={rowCount} sx={{ textAlign: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => onNotesClick(order)}
                                sx={{
                                  color: order.notes ? 'primary.main' : 'action.disabled',
                                  '&:hover': {
                                    bgcolor: 'action.hover'
                                  }
                                }}
                                title={order.notes ? 'عرض/تعديل الملاحظات' : 'إضافة ملاحظات'}
                              >
                                <Note />
                              </IconButton>
                            </TableCell>
                            <TableCell rowSpan={rowCount}>
                              <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Visibility />}
                                  onClick={() => onViewOrder(order)}
                                  sx={{ minWidth: 90, flexShrink: 0 }}
                                >
                                  عرض
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => onStatusUpdate(order.id, order.status)}
                                  disabled={
                                    order.status !== orderStatus ||
                                    updatingOrderId === order.id
                                  }
                                  sx={{ minWidth: 90, flexShrink: 0 }}
                                >
                                  {updatingOrderId === order.id ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CircularProgress size={16} color="inherit" />
                                      جاري التحميل...
                                    </Box>
                                  ) : (
                                    actionButtonText
                                  )}
                                </Button>
                              </Box>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalRows}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="عدد الصفوف في الصفحة:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
            }
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </>
      )}
    </>
  );
};

export default OrdersTab;

