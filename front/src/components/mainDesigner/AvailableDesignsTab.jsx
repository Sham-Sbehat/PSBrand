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
  Card,
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import {
  Search,
  Clear,
  Refresh,
  Visibility,
  Download,
  Image as ImageIcon,
  Close,
} from "@mui/icons-material";
import { designRequestsService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import Swal from "sweetalert2";
import calmPalette from "../../theme/calmPalette";
import { CheckCircle } from "@mui/icons-material";
import DesignRequestDetailsDialog from "../common/DesignRequestDetailsDialog";

const AvailableDesignsTab = () => {
  const { user } = useApp();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [viewDesignDialogOpen, setViewDesignDialogOpen] = useState(false);
  const [assigningDesignId, setAssigningDesignId] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set()); // Track loaded images

  // Load design requests with status = 1 "في الانتظار" (using backend filter)
  // تحميل التصاميم المتاحة التي حالتها "في الانتظار" (status = 1) باستخدام فلتر الـ backend
  const loadDesigns = async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        pageSize: pageSize,
        status: 1, // فقط التصاميم التي حالتها "في الانتظار" - استخدام فلتر الـ backend
      };

      const response = await designRequestsService.getDesignRequests(params);
      
      // Handle response structure
      // معالجة الاستجابة
      let allDesigns = [];
      if (response && response.data) {
        allDesigns = response.data;
        setTotalCount(response.totalCount || 0);
      } else if (Array.isArray(response)) {
        allDesigns = response;
        setTotalCount(response.length);
      } else {
        allDesigns = [];
        setTotalCount(0);
      }

      // نعرض جميع التصاميم التي حالتها "في الانتظار" (status === 1)
      // الـ API رح يرجعها لنا بعد الفلترة
      setDesigns(allDesigns);
    } catch (error) {
      console.error("Error loading design requests:", error);
      setDesigns([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load designs when page or pageSize changes
  useEffect(() => {
    loadDesigns();
  }, [page, pageSize]);

  // Filter designs based on search query
  const getFilteredDesigns = () => {
    if (!searchQuery.trim()) return designs;

    const query = searchQuery.toLowerCase().trim();
    return designs.filter((design) => {
      const title = design.title || "";
      const description = design.description || "";
      const createdByName = design.createdByName || "";
      return (
        title.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        createdByName.toLowerCase().includes(query)
      );
    });
  };

  // Get status label and color
  const getStatusLabel = (status) => {
    const statusMap = {
      1: { label: "في الانتظار", color: "warning" },
      2: { label: "قيد التنفيذ", color: "info" },
      3: { label: "مكتمل", color: "success" },
      4: { label: "ملغي", color: "error" },
    };
    return statusMap[status] || { label: "غير محدد", color: "default" };
  };

  // Handle image click
  const handleImageClick = (image) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  // Handle view design
  const handleViewDesign = (design) => {
    setViewingDesign(design);
    setViewDesignDialogOpen(true);
  };

  // Handle download image
  const handleDownloadImage = (image) => {
    if (image.downloadUrl) {
      const link = document.createElement("a");
      link.href = image.downloadUrl;
      link.target = "_blank";
      link.download = image.fileKey?.split("/").pop() || "image";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  // Handle assign designer
  const handleAssignDesigner = async (designId) => {
    if (!user?.id) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "يجب تسجيل الدخول أولاً",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    const result = await Swal.fire({
      title: "تأكيد",
      text: "هل تريد أخذ هذا التصميم؟",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: calmPalette.primary,
      cancelButtonColor: "#dc3545",
      confirmButtonText: "نعم، أخذ التصميم",
      cancelButtonText: "إلغاء",
    });

    if (!result.isConfirmed) return;

    setAssigningDesignId(designId);
    try {
      // استدعاء الـ API لتعيين المصمم للتصميم
      await designRequestsService.assignDesigner(designId, user.id);
      
      // تغيير الحالة إلى "قيد التنفيذ" (InProgress = 2)
      await designRequestsService.setState(designId, 2);
      
      // إزالة التصميم من القائمة مباشرة (optimistic update)
      setDesigns((prevDesigns) => {
        return prevDesigns.filter((design) => design.id !== designId);
      });
      
      // تحديث العدد الإجمالي
      setTotalCount((prevCount) => Math.max(0, prevCount - 1));
      
      // Close view dialog if it's open for this design
      if (viewingDesign?.id === designId) {
        setViewDesignDialogOpen(false);
        setViewingDesign(null);
      }
      
      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم أخذ التصميم بنجاح. يمكنك رؤيته في تبويب 'تصاميمي المأخوذة'",
        confirmButtonColor: calmPalette.primary,
        timer: 3000,
      });
    } catch (error) {
      console.error("Error assigning designer:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في أخذ التصميم",
        confirmButtonColor: calmPalette.primary,
      });
      // Reload on error to ensure data consistency
      loadDesigns();
    } finally {
      setAssigningDesignId(null);
    }
  };

  const filteredDesigns = getFilteredDesigns();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          التصاميم المتاحة ({filteredDesigns.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadDesigns}
          disabled={loading}
          size="small"
        >
          تحديث
        </Button>
      </Box>

      {/* Search Field */}
      <Box sx={{ mb: 3,width:'450px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث في العنوان أو الوصف أو اسم المنشئ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 1,
                  color: searchQuery ? calmPalette.primary : "text.secondary",
                  transition: "color 0.3s ease",
                }}
              >
                <Search />
              </Box>
            ),
            endAdornment: searchQuery && (
              <IconButton
                size="small"
                onClick={() => setSearchQuery("")}
                sx={{ padding: 0.5 }}
              >
                <Clear fontSize="small" />
              </IconButton>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
        />
      </Box>


      {/* Designs Table */}
      {loading && designs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredDesigns.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            borderRadius: 2,
            border: "1px solid rgba(94, 78, 62, 0.1)",
          }}
        >
          <ImageIcon
            sx={{
              fontSize: 64,
              color: calmPalette.textSecondary,
              mb: 2,
              opacity: 0.5,
            }}
          />
          <Typography variant="h6" sx={{ color: calmPalette.textPrimary, mb: 1 }}>
            لا توجد تصاميم متاحة
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
            {searchQuery ? "لم يتم العثور على نتائج للبحث" : "لم يتم إرسال أي تصاميم بعد"}
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${calmPalette.primary}15`,
            boxShadow: "0 4px 20px rgba(94, 78, 62, 0.08)",
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background: `linear-gradient(135deg, ${calmPalette.primary}12 0%, ${calmPalette.primary}08 100%)`,
                  borderBottom: `2px solid ${calmPalette.primary}20`,
                }}
              >
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  الصور
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  العنوان
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  الوصف
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  المنشئ
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  الحالة
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  التاريخ
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDesigns.map((design, index) => {
                const status = getStatusLabel(design.status);
                return (
                  <TableRow
                    key={design.id}
                    sx={{
                      backgroundColor:
                        index % 2 === 0
                          ? "rgba(255, 255, 255, 0.5)"
                          : "rgba(250, 248, 245, 0.3)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(94, 78, 62, 0.08)",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(94, 78, 62, 0.1)",
                      },
                      "& td": {
                        borderBottom: `1px solid ${calmPalette.primary}08`,
                        py: 2,
                      },
                    }}
                  >
                    <TableCell>
                      {design.images && design.images.length > 0 ? (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {design.images.slice(0, 3).map((image, imgIndex) => {
                            const imageKey = `${design.id}-${imgIndex}`;
                            
                            return (
                              <Box
                                key={imgIndex}
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 2,
                                  overflow: "hidden",
                                  border: `2px solid ${calmPalette.primary}20`,
                                  cursor: "pointer",
                                  boxShadow: "0 2px 8px rgba(94, 78, 62, 0.15)",
                                  transition: "all 0.3s ease",
                                  position: "relative",
                                  backgroundColor: `${calmPalette.primary}08`,
                                  "&:hover": {
                                    transform: "scale(1.08)",
                                    boxShadow: "0 4px 12px rgba(94, 78, 62, 0.25)",
                                    borderColor: calmPalette.primary + "40",
                                  },
                                }}
                                onClick={() => {
                                  handleImageClick(image);
                                }}
                              >
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: `${calmPalette.primary}08`,
                                  }}
                                >
                                  <ImageIcon
                                    sx={{
                                      color: calmPalette.primary,
                                      fontSize: 28,
                                      opacity: 0.6,
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                          {design.images.length > 3 && (
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 2,
                                border: `2px dashed ${calmPalette.primary}30`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: `${calmPalette.primary}08`,
                                color: calmPalette.primary,
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                            >
                              +{design.images.length - 3}
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 2,
                            border: `2px dashed ${calmPalette.primary}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: `${calmPalette.primary}08`,
                          }}
                        >
                          <ImageIcon
                            sx={{
                              color: calmPalette.textSecondary,
                              fontSize: 28,
                              opacity: 0.5,
                            }}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: calmPalette.textPrimary }}
                      >
                        {design.title || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: calmPalette.textSecondary,
                          maxWidth: 300,
                          whiteSpace: "pre-line",
                        }}
                        title={design.description}
                      >
                        {design.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
                        {design.createdByName || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                        {design.createdAt
                          ? new Date(design.createdAt).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })
                          : "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                        <Tooltip title="عرض التفاصيل" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDesign(design)}
                            sx={{
                              color: calmPalette.primary,
                              backgroundColor: `${calmPalette.primary}10`,
                              border: `1px solid ${calmPalette.primary}30`,
                              "&:hover": {
                                backgroundColor: `${calmPalette.primary}20`,
                              },
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={assigningDesignId === design.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <CheckCircle fontSize="small" />
                          )}
                          onClick={() => handleAssignDesigner(design.id)}
                          disabled={assigningDesignId === design.id}
                          sx={{ 
                            minWidth: '120px',
                            fontSize: '0.8rem'
                          }}
                        >
                          {assigningDesignId === design.id ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CircularProgress size={14} color="inherit" />
                              جاري...
                            </Box>
                          ) : (
                            'أخذ التصميم'
                          )}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(event, newPage) => {
          setPage(newPage);
        }}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => {
          const newPageSize = parseInt(event.target.value, 10);
          setPageSize(newPageSize);
          setPage(0);
        }}
        labelRowsPerPage="عدد الصفوف في الصفحة:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
        }
        rowsPerPageOptions={[10, 20, 50, 100]}
      />

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "#ffffff",
            boxShadow: calmPalette.shadow,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6">عرض الصورة</Typography>
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            size="small"
            sx={{ color: calmPalette.textSecondary }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
            >
              <img
                src={selectedImage.downloadUrl || selectedImage}
                alt="صورة التصميم"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  borderRadius: 8,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Design Dialog */}
      <DesignRequestDetailsDialog
        open={viewDesignDialogOpen}
        onClose={() => setViewDesignDialogOpen(false)}
        design={viewingDesign}
        onImageClick={(image) => {
          setSelectedImage(image);
          setImageDialogOpen(true);
          setViewDesignDialogOpen(false);
        }}
        getStatusLabel={getStatusLabel}
      />
    </Box>
  );
};

export default AvailableDesignsTab;

