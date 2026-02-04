import { useState, useEffect, useRef } from "react";
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
  CardContent,
  Grid,
  InputAdornment,
  Dialog,
  DialogContent,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import {
  Search,
  Close,
  Image as ImageIcon,
  Edit,
  Delete,
  RateReview,
  Visibility,
  CloudUpload,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { designRequestsService } from "../../services/api";
import CreateDesignForm from "./CreateDesignForm";
import GlassDialog from "../common/GlassDialog";
import DesignRequestDetailsDialog from "../common/DesignRequestDetailsDialog";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";
import { useForm, Controller } from "react-hook-form";

const CreateDesignTab = ({ user, setSelectedImage, setImageDialogOpen, designRequestsRefreshKey = 0 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // State for designs
  const [openDesignsModal, setOpenDesignsModal] = useState(false);
  const [designsList, setDesignsList] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsCount, setDesignsCount] = useState(0);
  const [designsPage, setDesignsPage] = useState(0);
  const [designsPageSize, setDesignsPageSize] = useState(20);
  const [designsTotalCount, setDesignsTotalCount] = useState(0);
  const [designsSearchQuery, setDesignsSearchQuery] = useState("");
  const [editingDesign, setEditingDesign] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingDesignId, setDeletingDesignId] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set()); // Track loaded images
  const [updatingStatusId, setUpdatingStatusId] = useState(null); // Track which design is updating status
  const [reviewDesignsCount, setReviewDesignsCount] = useState(0); // Count of designs under review
  const [statusFilter, setStatusFilter] = useState(null); // Filter by status (null = all, 3 = under review)
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false); // Dialog for status change
  const [pendingStatusChange, setPendingStatusChange] = useState({ designId: null, newStatus: null }); // Pending status change
  const [statusChangeNote, setStatusChangeNote] = useState(""); // Note for status change
  const [statusChangeImages, setStatusChangeImages] = useState([]); // Optional images when returning to "بحاجة لتعديل" (array of File)
  const [statusChangeImagePreviews, setStatusChangeImagePreviews] = useState([]); // Preview URLs for display
  const [uploadingStatusChangeImages, setUploadingStatusChangeImages] = useState(false);
  const [viewingDesign, setViewingDesign] = useState(null); // Design to view in modal
  const [viewDesignDialogOpen, setViewDesignDialogOpen] = useState(false); // View design dialog state

  // Fetch my designs count
  const fetchMyDesignsCount = async () => {
    try {
      if (user?.id) {
        const response = await designRequestsService.getDesignRequests({
          createdBy: user.id,
          page: 1,
          pageSize: 1,
        });
        setDesignsCount(response?.totalCount || 0);
      }
    } catch (error) {
      console.error("Error fetching designs count:", error);
      setDesignsCount(0);
    }
  };

  // Fetch designs under review count
  const fetchReviewDesignsCount = async () => {
    try {
      if (user?.id) {
        const response = await designRequestsService.getDesignRequests({
          createdBy: user.id,
          status: 3, // قيد المراجعة
          page: 1,
          pageSize: 1,
        });
        setReviewDesignsCount(response?.totalCount || 0);
      }
    } catch (error) {
      console.error("Error fetching review designs count:", error);
      setReviewDesignsCount(0);
    }
  };

  // Load my designs
  const loadMyDesigns = async (filterStatus = null) => {
    if (!user?.id) return;
    setLoadingDesigns(true);
    try {
      const params = {
        createdBy: user.id,
        page: designsPage + 1,
        pageSize: designsPageSize,
      };
      
      // Add status filter if provided
      if (filterStatus !== null) {
        params.status = filterStatus;
      }
      
      const response = await designRequestsService.getDesignRequests(params);
      
      if (response && response.data) {
        setDesignsList(response.data);
        setDesignsTotalCount(response.totalCount || 0);
      } else if (Array.isArray(response)) {
        setDesignsList(response);
        setDesignsTotalCount(response.length);
      } else {
        setDesignsList([]);
        setDesignsTotalCount(0);
      }
    } catch (error) {
      console.error("Error loading designs:", error);
      setDesignsList([]);
      setDesignsTotalCount(0);
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Load designs count on mount
  useEffect(() => {
    if (user?.id) {
      fetchMyDesignsCount();
      fetchReviewDesignsCount();
    }
  }, [user?.id]);

  // Load designs when page changes in modal
  useEffect(() => {
    if (openDesignsModal && user?.id) {
      loadMyDesigns(statusFilter);
    }
  }, [designsPage, designsPageSize, openDesignsModal, user?.id, statusFilter]);

  // Real-time: لما يوصل حدث SignalR نزيد الرقم 1 فوراً ثم نصحّيه من الـ API
  const prevRefreshKeyRef = useRef(0);
  useEffect(() => {
    if (designRequestsRefreshKey <= 0) return;
    const keyIncreased = designRequestsRefreshKey > prevRefreshKeyRef.current;
    prevRefreshKeyRef.current = designRequestsRefreshKey;
    if (keyIncreased) setReviewDesignsCount((prev) => prev + 1);
    fetchMyDesignsCount();
    fetchReviewDesignsCount();
    if (openDesignsModal) loadMyDesigns(statusFilter);
  }, [designRequestsRefreshKey]);

  // Refresh count when form is submitted successfully
  const handleDesignCreated = () => {
    fetchMyDesignsCount();
    fetchReviewDesignsCount();
    if (openDesignsModal) {
      loadMyDesigns(statusFilter);
    }
  };

  // Handle edit design
  const handleEditDesign = (design) => {
    setEditingDesign(design);
    setEditDialogOpen(true);
  };

  // Handle view design
  const handleViewDesign = (design) => {
    setViewingDesign(design);
    setViewDesignDialogOpen(true);
  };

  // Get status label function
  const getStatusLabel = (status) => {
    const statusMap = {
      1: { label: "في الانتظار", color: "warning" },
      2: { label: "قيد التنفيذ", color: "info" },
      3: { label: "قيد المراجعة", color: "info" },
      4: { label: "بحاجة لتعديل", color: "warning" },
      5: { label: "جاهز", color: "success" },
      6: { label: "ملغي", color: "error" },
      7: { label: "تم رفع التصميم", color: "success" },
    };
    return statusMap[status] || { label: "غير محدد", color: "default" };
  };

  // Handle delete design
  const handleDeleteDesign = async (designId) => {
    const result = await Swal.fire({
      title: "تأكيد الحذف",
      text: "هل أنت متأكد من حذف هذا التصميم؟ لا يمكن التراجع عن هذا الإجراء.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: calmPalette.primary,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
    });

    if (!result.isConfirmed) return;

    setDeletingDesignId(designId);
    try {
      await designRequestsService.deleteDesignRequest(designId);
      
      // Remove from list immediately
      setDesignsList((prev) => prev.filter((d) => d.id !== designId));
      setDesignsTotalCount((prev) => Math.max(0, prev - 1));
      fetchMyDesignsCount();
      fetchReviewDesignsCount();
      
      Swal.fire({
        icon: "success",
        title: "تم الحذف",
        text: "تم حذف التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
    } catch (error) {
      console.error("Error deleting design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في حذف التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setDeletingDesignId(null);
    }
  };

  // Handle update design
  const handleUpdateDesign = async (data) => {
    if (!editingDesign) return;

    try {
      const updateData = {
        title: data.title.trim(),
        description: data.description.trim(),
        imageKeys: editingDesign.images?.map((img) => img.fileKey) || [],
        status: editingDesign.status,
        mainDesignerId: editingDesign.mainDesignerId || 0,
        clearMainDesignerId: false,
        note: data.description.trim(),
      };

      await designRequestsService.updateDesignRequest(editingDesign.id, updateData);
      
      Swal.fire({
        icon: "success",
        title: "تم التحديث",
        text: "تم تحديث التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

      setEditDialogOpen(false);
      setEditingDesign(null);
      loadMyDesigns(statusFilter);
      fetchMyDesignsCount();
      fetchReviewDesignsCount();
    } catch (error) {
      console.error("Error updating design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في تحديث التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    }
  };

  // Handle status change - open dialog first
  const handleStatusChange = (designId, newStatus) => {
    setPendingStatusChange({ designId, newStatus });
    setStatusChangeNote("");
    setStatusChangeImages([]);
    setStatusChangeImagePreviews([]);
    setStatusChangeDialogOpen(true);
  };

  // Clear preview URLs when status change images are cleared
  const clearStatusChangeImagePreviews = () => {
    statusChangeImagePreviews.forEach((url) => {
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setStatusChangeImagePreviews([]);
  };

  // Confirm status change with note and optional images (when returning to "بحاجة لتعديل")
  const handleConfirmStatusChange = async () => {
    const { designId, newStatus } = pendingStatusChange;
    if (!designId || !newStatus) return;

    setUpdatingStatusId(designId);
    try {
      let imageKeys = [];
      if (newStatus === 4 && statusChangeImages.length > 0) {
        setUploadingStatusChangeImages(true);
        try {
          const uploadResponse = await designRequestsService.uploadImages(statusChangeImages);
          const list = Array.isArray(uploadResponse) ? uploadResponse : uploadResponse?.data || [];
          imageKeys = list.map((item) => item.url || item.Url).filter(Boolean);
        } finally {
          setUploadingStatusChangeImages(false);
        }
      }

      await designRequestsService.setState(designId, newStatus, {
        note: statusChangeNote.trim() || undefined,
        ...(imageKeys.length > 0 && { imageKeys }),
      });

      // Update local state immediately
      setDesignsList((prev) =>
        prev.map((design) =>
          design.id === designId ? { ...design, status: newStatus, note: statusChangeNote.trim() || design.note } : design
        )
      );

      Swal.fire({
        icon: "success",
        title: "تم التحديث",
        text: "تم تغيير حالة التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

      // Close dialog and clear
      setStatusChangeDialogOpen(false);
      setPendingStatusChange({ designId: null, newStatus: null });
      setStatusChangeNote("");
      setStatusChangeImages([]);
      clearStatusChangeImagePreviews();

      // Reload to get updated data
      loadMyDesigns(statusFilter);
      fetchMyDesignsCount();
      fetchReviewDesignsCount();
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في تغيير الحالة",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <>
      {/* Designs Count Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ marginBottom: { xs: 3, sm: 4 } }}>
        {/* Total Designs Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            onClick={async () => {
              setStatusFilter(null);
              await loadMyDesigns(null);
              setOpenDesignsModal(true);
            }}
            sx={{
              position: "relative",
              background: calmPalette.statCards[2]?.background || calmPalette.statCards[0]?.background,
              color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight,
              borderRadius: 4,
              boxShadow: calmPalette.shadow,
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 55%)",
                pointerEvents: "none",
              },
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: "0 28px 50px rgba(46, 38, 31, 0.22)",
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight }}
                  >
                    {designsCount}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      marginTop: 1,
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    إجمالي التصاميم
                  </Typography>
                </Box>
                <ImageIcon sx={{ fontSize: 56, color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Under Review Designs Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            onClick={async () => {
              setStatusFilter(3);
              await loadMyDesigns(3);
              setOpenDesignsModal(true);
            }}
            sx={{
              position: "relative",
              background: "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
              color: "#ffffff",
              borderRadius: 4,
              boxShadow: "0 8px 24px rgba(156, 39, 176, 0.3)",
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0) 55%)",
                pointerEvents: "none",
              },
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: "0 28px 50px rgba(156, 39, 176, 0.4)",
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: "#ffffff" }}
                  >
                    {reviewDesignsCount}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      marginTop: 1,
                      color: "rgba(255, 255, 255, 0.9)",
                    }}
                  >
                    قيد المراجعة
                  </Typography>
                </Box>
                <RateReview sx={{ fontSize: 56, color: "#ffffff", opacity: 0.9 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Design Form */}
      <CreateDesignForm onSuccess={handleDesignCreated} />

      {/* My Designs Modal */}
      <GlassDialog
        open={openDesignsModal}
        onClose={() => {
          setOpenDesignsModal(false);
          setDesignsSearchQuery("");
          setDesignsPage(0);
          setStatusFilter(null);
        }}
        maxWidth="xl"
        fullScreen={isMobile}
        title={statusFilter === 3 ? "الطلبات قيد المراجعة" : "تصاميمي"}
        actions={
          <Button onClick={() => {
            setOpenDesignsModal(false);
            setDesignsSearchQuery("");
            setDesignsPage(0);
            setStatusFilter(null);
          }} variant="contained">
            إغلاق
          </Button>
        }
      >
        <Box sx={{ p: 3 }}>
          {/* Search Field */}
          <Box sx={{ mb: 3, width: { xs: "100%", sm: 450 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث في العنوان أو الوصف..."
              value={designsSearchQuery}
              onChange={(e) => setDesignsSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: designsSearchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setDesignsSearchQuery("")}
                    sx={{ padding: 0.5 }}
                  >
                    <Close fontSize="small" />
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
          {loadingDesigns && designsList.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>جاري التحميل...</Typography>
            </Box>
          ) : designsList.length === 0 ? (
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
                لا توجد تصاميم
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                {designsSearchQuery ? "لم يتم العثور على نتائج للبحث" : "لم تقم بإنشاء أي تصاميم بعد"}
              </Typography>
            </Paper>
          ) : (
            <>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${calmPalette.primary}15`,
                  boxShadow: "0 4px 20px rgba(94, 78, 62, 0.08)",
                  overflow: "auto",
                  overflowX: "auto",
                  maxWidth: "100%",
                  mb: 2,
                }}
              >
                <Table sx={{ minWidth: 500 }}>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: `linear-gradient(135deg, ${calmPalette.primary}12 0%, ${calmPalette.primary}08 100%)`,
                        "& th": { whiteSpace: "nowrap" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الصور</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>تاريخ الإنشاء</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      let filteredDesigns = designsList;
                      
                      // Apply search filter
                      if (designsSearchQuery.trim()) {
                        const query = designsSearchQuery.toLowerCase().trim();
                        filteredDesigns = designsList.filter((design) => {
                          const title = design.title || "";
                          const description = design.description || "";
                          return (
                            title.toLowerCase().includes(query) ||
                            description.toLowerCase().includes(query)
                          );
                        });
                      }

                      if (filteredDesigns.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Box sx={{ padding: 4 }}>
                                <Typography variant="body1" color="text.secondary">
                                  {designsSearchQuery.trim() ? "لا توجد نتائج للبحث" : "لا توجد تصاميم"}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // Get status label and color function
                      const getStatusLabel = (status) => {
                        const statusMap = {
                          1: { label: "في الانتظار", color: "warning" },
                          2: { label: "قيد التنفيذ", color: "info" },
                          3: { label: "قيد المراجعة", color: "info" },
                          4: { label: "بحاجة لتعديل", color: "warning" },
                          5: { label: "جاهز", color: "success" },
                          6: { label: "ملغي", color: "error" },
                          7: { label: "تم رفع التصميم", color: "success" },
                        };
                        return statusMap[status] || { label: "غير محدد", color: "default" };
                      };

                      return filteredDesigns.map((design) => {
                        const statusInfo = getStatusLabel(design.status);

                        return (
                          <TableRow
                            key={design.id}
                            hover
                            sx={{
                              "&:nth-of-type(even)": {
                                backgroundColor: "rgba(255,255,255,0.3)",
                              },
                            }}
                          >
                            <TableCell>{design.title || "-"}</TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 300,
                                  whiteSpace: "pre-line",
                                }}
                              >
                                {design.description || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {/* Current Status Chip */}
                                <Chip
                                  label={statusInfo.label}
                                  color={statusInfo.color}
                                  size="small"
                                  sx={{ 
                                    fontWeight: 600,
                                    width: "fit-content",
                                  }}
                                />
                                
                                {/* Status Change Dropdown */}
                                <FormControl
                                  size="small"
                                  sx={{
                                    minWidth: { xs: 140, sm: 180 },
                                    "& .MuiOutlinedInput-root": {
                                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                                      borderRadius: 1.5,
                                      "&:hover": {
                                        backgroundColor: "rgba(255, 255, 255, 1)",
                                      },
                                    },
                                  }}
                                >
                                  <Select
                                    value=""
                                    onChange={(e) => {
                                      const newStatus = parseInt(e.target.value);
                                      if (newStatus === 4 || newStatus === 5 || newStatus === 6) {
                                        handleStatusChange(design.id, newStatus);
                                      }
                                    }}
                                    disabled={updatingStatusId === design.id}
                                    displayEmpty
                                    sx={{
                                      fontSize: "0.8rem",
                                      height: 36,
                                      "& .MuiSelect-select": {
                                        py: 1,
                                      },
                                    }}
                                  >
                                    <MenuItem value="" disabled>
                                      <em style={{ fontSize: "0.8rem", color: calmPalette.textSecondary }}>
                                        تغيير الحالة
                                      </em>
                                    </MenuItem>
                                    <MenuItem 
                                      value={4} 
                                      disabled={design.status === 4}
                                      sx={{
                                        py: 1.5,
                                        "&:hover": {
                                          backgroundColor: "rgba(255, 152, 0, 0.08)",
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                                        <Chip
                                          label="بحاجة لتعديل"
                                          color="warning"
                                          size="small"
                                          sx={{ 
                                            height: 22, 
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                          }}
                                        />
                                      </Box>
                                    </MenuItem>
                                    <MenuItem 
                                      value={5} 
                                      disabled={design.status === 5}
                                      sx={{
                                        py: 1.5,
                                        "&:hover": {
                                          backgroundColor: "rgba(76, 175, 80, 0.08)",
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                                        <Chip
                                          label="جاهز"
                                          color="success"
                                          size="small"
                                          sx={{ 
                                            height: 22, 
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                          }}
                                        />
                                      </Box>
                                    </MenuItem>
                                    <MenuItem 
                                      value={6} 
                                      disabled={design.status === 6}
                                      sx={{
                                        py: 1.5,
                                        "&:hover": {
                                          backgroundColor: "rgba(244, 67, 54, 0.08)",
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                                        <Chip
                                          label="ملغي"
                                          color="error"
                                          size="small"
                                          sx={{ 
                                            height: 22, 
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                          }}
                                        />
                                      </Box>
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                                
                                {/* Loading Indicator */}
                                {updatingStatusId === design.id && (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <CircularProgress size={14} />
                                    <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.7rem" }}>
                                      جاري التحديث...
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                {design.images && design.images.length > 0 ? (
                                  design.images.slice(0, 3).map((image, idx) => {
                                    const imageKey = `${design.id}-${idx}`;
                                    
                                    return (
                                      <Tooltip key={idx} title="انقر للمعاينة">
                                        <Box
                                          onClick={() => {
                                            setSelectedImage(image.downloadUrl);
                                            setImageDialogOpen(true);
                                          }}
                                          sx={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 1,
                                            overflow: "hidden",
                                            cursor: "pointer",
                                            border: `2px solid ${calmPalette.primary}30`,
                                            transition: "all 0.2s",
                                            backgroundColor: `${calmPalette.primary}08`,
                                            "&:hover": {
                                              transform: "scale(1.1)",
                                              borderColor: calmPalette.primary,
                                            },
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
                                                fontSize: 20,
                                                opacity: 0.6,
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      </Tooltip>
                                    );
                                  })
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    لا توجد صور
                                  </Typography>
                                )}
                                {design.images && design.images.length > 3 && (
                                  <Chip
                                    label={`+${design.images.length - 3}`}
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {design.createdAt
                                ? new Date(design.createdAt).toLocaleDateString("ar", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                                <Tooltip title="عرض">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewDesign(design)}
                                    sx={{
                                      color: calmPalette.primary,
                                      backgroundColor: `${calmPalette.primary}10`,
                                      "&:hover": {
                                        backgroundColor: `${calmPalette.primary}20`,
                                      },
                                    }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="تعديل">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditDesign(design)}
                                    sx={{
                                      color: calmPalette.primary,
                                      backgroundColor: `${calmPalette.primary}10`,
                                      "&:hover": {
                                        backgroundColor: `${calmPalette.primary}20`,
                                      },
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteDesign(design.id)}
                                    disabled={deletingDesignId === design.id}
                                    sx={{
                                      color: "#dc3545",
                                      backgroundColor: "#dc354510",
                                      "&:hover": {
                                        backgroundColor: "#dc354520",
                                      },
                                      "&:disabled": {
                                        opacity: 0.5,
                                      },
                                    }}
                                  >
                                    {deletingDesignId === design.id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <Delete fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={designsTotalCount}
                page={designsPage}
                onPageChange={(event, newPage) => setDesignsPage(newPage)}
                rowsPerPage={designsPageSize}
                onRowsPerPageChange={(event) => {
                  setDesignsPageSize(parseInt(event.target.value, 10));
                  setDesignsPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="عدد الصفوف في الصفحة:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
                }
              />
            </>
          )}
        </Box>
      </GlassDialog>

      {/* Edit Design Dialog */}
      {editingDesign && (
        <EditDesignDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingDesign(null);
          }}
          design={editingDesign}
          onUpdate={handleUpdateDesign}
        />
      )}

      {/* Status Change Dialog with Note */}
      <GlassDialog
        open={statusChangeDialogOpen}
        onClose={() => {
          if (updatingStatusId === null) {
            setStatusChangeDialogOpen(false);
            setPendingStatusChange({ designId: null, newStatus: null });
            setStatusChangeNote("");
            setStatusChangeImages([]);
            clearStatusChangeImagePreviews();
          }
        }}
        maxWidth="sm"
        title="تغيير الحالة"
        actions={
          <>
            <Button 
              onClick={() => {
                setStatusChangeDialogOpen(false);
                setPendingStatusChange({ designId: null, newStatus: null });
                setStatusChangeNote("");
                setStatusChangeImages([]);
                clearStatusChangeImagePreviews();
              }} 
              variant="outlined"
              disabled={updatingStatusId !== null}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleConfirmStatusChange} 
              variant="contained"
              disabled={updatingStatusId !== null}
            >
              {updatingStatusId !== null ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  جاري التحديث...
                </Box>
              ) : (
                "تأكيد"
              )}
            </Button>
          </>
        }
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Current Status Info */}
            {pendingStatusChange.newStatus && (
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: calmPalette.textPrimary,
                  }}
                >
                  الحالة الجديدة:
                </Typography>
                <Chip
                  label={
                    pendingStatusChange.newStatus === 4
                      ? "بحاجة لتعديل"
                      : pendingStatusChange.newStatus === 5
                      ? "جاهز"
                      : pendingStatusChange.newStatus === 6
                      ? "ملغي"
                      : "غير محدد"
                  }
                  color={
                    pendingStatusChange.newStatus === 4
                      ? "warning"
                      : pendingStatusChange.newStatus === 5
                      ? "success"
                      : pendingStatusChange.newStatus === 6
                      ? "error"
                      : "default"
                  }
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            )}

            {/* Optional image when returning to "بحاجة لتعديل" */}
            {pendingStatusChange.newStatus === 4 && (
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    color: calmPalette.textPrimary,
                  }}
                >
                  صورة توضيحية (اختياري)
                </Typography>
                <input
                  accept="image/*,.pdf"
                  type="file"
                  multiple
                  id="status-change-image-upload"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (files.length === 0) return;
                    setStatusChangeImages((prev) => [...prev, ...files]);
                    setStatusChangeImagePreviews((prev) => [
                      ...prev,
                      ...files.map((f) => URL.createObjectURL(f)),
                    ]);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="status-change-image-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={uploadingStatusChangeImages ? <CircularProgress size={18} /> : <CloudUpload />}
                    disabled={updatingStatusId !== null || uploadingStatusChangeImages}
                    size="small"
                    sx={{ textTransform: "none" }}
                  >
                    رفع صورة
                  </Button>
                </label>
                {statusChangeImagePreviews.length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                    {statusChangeImagePreviews.map((preview, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          position: "relative",
                          width: 72,
                          height: 72,
                          borderRadius: 1,
                          overflow: "hidden",
                          border: `1px solid ${calmPalette.primary}30`,
                        }}
                      >
                        <img
                          src={preview}
                          alt={`معاينة ${idx + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            setStatusChangeImages((p) => p.filter((_, i) => i !== idx));
                            setStatusChangeImagePreviews((p) => {
                              const next = p.filter((_, i) => i !== idx);
                              if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                              return next;
                            });
                          }}
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bgcolor: "rgba(0,0,0,0.5)",
                            color: "#fff",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: calmPalette.textSecondary, mt: 1, display: "block" }}>
                  يمكنك إرفاق صورة توضح التعديل المطلوب (اختياري)
                </Typography>
              </Box>
            )}

            {/* Note Input */}
            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  mb: 1.5,
                  color: calmPalette.textPrimary,
                }}
              >
                الملاحظة (اختياري)
              </Typography>
              <TextField
                value={statusChangeNote}
                onChange={(e) => setStatusChangeNote(e.target.value)}
                placeholder="أدخل ملاحظة لتغيير الحالة (اختياري)..."
                fullWidth
                multiline
                rows={4}
                disabled={updatingStatusId !== null}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: 2,
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: calmPalette.textSecondary, mt: 1, display: "block" }}
              >
                يمكنك إضافة ملاحظة توضح سبب تغيير الحالة (اختياري)
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassDialog>

      {/* View Design Dialog */}
      <DesignRequestDetailsDialog
        open={viewDesignDialogOpen}
        onClose={() => {
          setViewDesignDialogOpen(false);
          setViewingDesign(null);
        }}
        design={viewingDesign}
        getStatusLabel={getStatusLabel}
        onImageClick={(image) => {
          setSelectedImage(image.downloadUrl || image);
          setImageDialogOpen(true);
        }}
      />
    </>
  );
};

// Edit Design Dialog Component
const EditDesignDialog = ({ open, onClose, design, onUpdate }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      title: design?.title || "",
      description: design?.description || "",
    },
  });

  useEffect(() => {
    if (design) {
      reset({
        title: design.title || "",
        description: design.description || "",
      });
    }
  }, [design, reset]);

  const onSubmit = (data) => {
    onUpdate(data);
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      title="تعديل التصميم"
      actions={
        <>
          <Button onClick={onClose} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleSubmit(onSubmit)} variant="contained">
            حفظ التغييرات
          </Button>
        </>
      }
    >
      <Box sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Title */}
            <Controller
              name="title"
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
                    }}
                  >
                    اسم التصميم
                    <Typography
                      component="span"
                      sx={{ color: "error.main", fontSize: "1.2rem", ml: 0.5 }}
                    >
                      *
                    </Typography>
                  </Typography>
                  <TextField
                    {...field}
                    placeholder="أدخل اسم التصميم"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              rules={{ required: "الوصف مطلوب" }}
              render={({ field }) => (
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      mb: 1.5,
                      color: calmPalette.textPrimary,
                    }}
                  >
                    الوصف
                    <Typography
                      component="span"
                      sx={{ color: "error.main", fontSize: "1.2rem", ml: 0.5 }}
                    >
                      *
                    </Typography>
                  </Typography>
                  <TextField
                    {...field}
                    placeholder="أدخل وصف التصميم"
                    fullWidth
                    required
                    multiline
                    rows={5}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
            />

            {/* Images Info */}
            {design?.images && design.images.length > 0 && (
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    color: calmPalette.textPrimary,
                  }}
                >
                  الصور ({design.images.length})
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {design.images.map((image, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: `2px solid ${calmPalette.primary}30`,
                      }}
                    >
                      <img
                        src={image.downloadUrl}
                        alt={`صورة ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ color: calmPalette.textSecondary, mt: 1, display: "block" }}>
                  لا يمكن تعديل الصور حالياً
                </Typography>
              </Box>
            )}
          </Box>
        </form>
      </Box>
    </GlassDialog>
  );
};

export default CreateDesignTab;

