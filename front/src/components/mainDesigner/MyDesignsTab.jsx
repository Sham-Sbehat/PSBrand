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
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search,
  Clear,
  Refresh,
  Visibility,
  Download,
  Image as ImageIcon,
  Close,
  CheckCircle,
  Cancel,
  CloudUpload,
  Delete,
  Send,
} from "@mui/icons-material";
import { designRequestsService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";

const MyDesignsTab = () => {
  const { user } = useApp();
  const [designs, setDesigns] = useState([]);
  const [allDesigns, setAllDesigns] = useState([]); // Store all designs for counting
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [viewDesignDialogOpen, setViewDesignDialogOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set()); // Track loaded images
  const [statusTab, setStatusTab] = useState(2); // 2-6 = specific status (no pending status)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [designForReview, setDesignForReview] = useState(null);
  const [reviewImages, setReviewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    1: 0, // في الانتظار (for counting only, not displayed)
    2: 0, // قيد التنفيذ
    3: 0, // قيد المراجعة
    4: 0, // بحاجة لتعديل
    5: 0, // جاهز
    6: 0, // ملغي
  });

  // Load design requests assigned to current designer
  // تحميل التصاميم المعينة للمصمم الحالي
  const loadDesigns = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        pageSize: pageSize,
        mainDesignerId: user.id, // Filter by assigned designer
      };

      // Add status filter
      params.status = statusTab;

      const response = await designRequestsService.getDesignRequests(params);
      
      // Handle response structure
      let designsArray = [];
      if (response && response.data) {
        designsArray = response.data;
        setTotalCount(response.totalCount || 0);
      } else if (Array.isArray(response)) {
        designsArray = response;
        setTotalCount(response.length);
      } else {
        designsArray = [];
        setTotalCount(0);
      }

      // Store all designs for counting
      setAllDesigns(designsArray);
      
      // Load all designs to count statuses (for tabs)
      const allParams = {
        page: 1,
        pageSize: 5, // Large number to get all
        mainDesignerId: user.id,
      };
      const allResponse = await designRequestsService.getDesignRequests(allParams);
      let allDesignsForCount = [];
      if (allResponse && allResponse.data) {
        allDesignsForCount = allResponse.data;
      } else if (Array.isArray(allResponse)) {
        allDesignsForCount = allResponse;
      }
      
      // Count statuses
      const counts = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
      };
      allDesignsForCount.forEach((design) => {
        if (design.status && counts[design.status] !== undefined) {
          counts[design.status]++;
        }
      });
      setStatusCounts(counts);

      setDesigns(designsArray);
    } catch (error) {
      console.error("Error loading design requests:", error);
      setDesigns([]);
      setAllDesigns([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load designs when page, pageSize, statusTab, or user changes
  useEffect(() => {
    loadDesigns();
  }, [page, pageSize, statusTab, user?.id]);

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
      3: { label: "قيد المراجعة", color: "info" },
      4: { label: "بحاجة لتعديل", color: "warning" },
      5: { label: "جاهز", color: "success" },
      6: { label: "ملغي", color: "error" },
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

  // Handle send for review - open modal
  const handleSendForReview = (design) => {
    setDesignForReview(design);
    setReviewImages([]);
    setReviewModalOpen(true);
  };

  // Handle image selection for review
  const handleReviewImageSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setReviewImages((prev) => [...prev, ...files]);
    }
    // Reset input
    event.target.value = "";
  };

  // Remove image from review list
  const handleRemoveReviewImage = (index) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images and send for review
  const handleUploadImagesAndSendForReview = async () => {
    if (!designForReview) return;

    if (reviewImages.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "تحذير",
        text: "يرجى إضافة صور التصميم قبل الإرسال للمراجعة",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    setUpdatingStatusId(designForReview.id);
    setUploadingImages(true);

    try {
      // Step 1: Upload images first (same endpoint as creating new design)
      console.log("📤 Uploading images...");
      const uploadResponse = await designRequestsService.uploadImages(reviewImages);
      console.log("✅ Upload response:", uploadResponse);

      // Extract imageKeys from response
      // API can return: array of objects, single object, or array of strings
      let imageKeys = [];
      if (Array.isArray(uploadResponse)) {
        // If response is array, extract publicId from each item
        imageKeys = uploadResponse.map(item => {
          if (typeof item === 'string') {
            return item; // Already a string
          } else if (item && typeof item === 'object') {
            // Extract publicId, fileKey, or key from object
            return item.publicId || item.fileKey || item.key || item.url || String(item);
          }
          return String(item);
        });
      } else if (uploadResponse && typeof uploadResponse === 'object') {
        // If response is a single object (not array), extract publicId from it
        // This handles the case when API returns { url, publicId } directly
        const publicId = uploadResponse.publicId || uploadResponse.fileKey || uploadResponse.key;
        if (publicId) {
          imageKeys = [publicId];
        } else if (uploadResponse.url) {
          // If no publicId, try to extract from URL
          imageKeys = [uploadResponse.url];
        } else {
          // Fallback: try to find any string value in the object
          const values = Object.values(uploadResponse).filter(v => typeof v === 'string');
          imageKeys = values.length > 0 ? values : [];
        }
      } else if (uploadResponse?.imageKeys && Array.isArray(uploadResponse.imageKeys)) {
        imageKeys = uploadResponse.imageKeys.map(item => {
          if (typeof item === 'string') return item;
          return item?.publicId || item?.fileKey || item?.key || String(item);
        });
      } else if (uploadResponse?.data?.imageKeys && Array.isArray(uploadResponse.data.imageKeys)) {
        imageKeys = uploadResponse.data.imageKeys.map(item => {
          if (typeof item === 'string') return item;
          return item?.publicId || item?.fileKey || item?.key || String(item);
        });
      } else if (uploadResponse?.data && Array.isArray(uploadResponse.data)) {
        imageKeys = uploadResponse.data.map(item => {
          if (typeof item === 'string') return item;
          return item?.publicId || item?.fileKey || item?.key || String(item);
        });
      } else if (uploadResponse?.files && Array.isArray(uploadResponse.files)) {
        imageKeys = uploadResponse.files.map(file => file.publicId || file.fileKey || file.key || file.url);
      }

      // Ensure all keys are strings
      imageKeys = imageKeys.map(key => String(key)).filter(key => key && key !== 'undefined' && key !== 'null');

      console.log("🔑 Extracted imageKeys (strings):", imageKeys);

      if (!Array.isArray(imageKeys) || imageKeys.length === 0) {
        console.error("❌ Invalid imageKeys:", imageKeys);
        throw new Error("فشل في الحصول على مفاتيح الصور من الاستجابة");
      }

      // Step 2: Get existing design to preserve current data
      const existingDesign = designs.find(d => d.id === designForReview.id);
      
      // Step 3: Update design request with NEW imageKeys only (from upload API)
      // Use only the new imageKeys returned from upload API, not the old ones
      const newImageKeys = imageKeys; // Already strings
      
      console.log("📤 Updating design with NEW imageKeys only:", newImageKeys);
      
      // Update design with designImages (array of strings) - only new images
      // API expects dto wrapper and designImages as array of strings based on error message
      await designRequestsService.updateDesignRequest(designForReview.id, {
        dto: {
          title: existingDesign?.title || designForReview.title,
          description: existingDesign?.description || designForReview.description || "",
          designImages: newImageKeys, // Array of strings (fileKeys) - Only NEW images from upload API
          status: existingDesign?.status || designForReview.status,
          mainDesignerId: existingDesign?.mainDesignerId || designForReview.mainDesignerId || 0,
          note: existingDesign?.note || designForReview.note || "",
        }
      });
      
      // Step 4: Set status to "قيد المراجعة" (3)
      await designRequestsService.setState(designForReview.id, 3);

      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم رفع الصور وإرسال التصميم للمراجعة بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });

      // Close modal and refresh
      setReviewModalOpen(false);
      setDesignForReview(null);
      setReviewImages([]);
      loadDesigns();
    } catch (error) {
      console.error("Error uploading images and sending for review:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في رفع الصور وإرسال التصميم للمراجعة",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUpdatingStatusId(null);
      setUploadingImages(false);
    }
  };

  // Handle complete design (for status 3 and above)
  const handleCompleteDesign = async (designId) => {
    const result = await Swal.fire({
      title: "تأكيد",
      text: "هل تريد إتمام هذا التصميم؟",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: calmPalette.primary,
      cancelButtonColor: "#dc3545",
      confirmButtonText: "نعم، إتمام",
      cancelButtonText: "إلغاء",
    });

    if (!result.isConfirmed) return;

    setUpdatingStatusId(designId);
    try {
      await designRequestsService.setState(designId, 5); // Ready = 5
      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم إتمام التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
      loadDesigns(); // Refresh the list
    } catch (error) {
      console.error("Error completing design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في إتمام التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle cancel/return design
  const handleCancelDesign = async (designId) => {
    const result = await Swal.fire({
      title: "تأكيد",
      text: "هل تريد إرجاع هذا التصميم؟ سيتم إرجاعه إلى قائمة التصاميم المتاحة",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: calmPalette.primary,
      confirmButtonText: "نعم، إرجاع",
      cancelButtonText: "إلغاء",
    });

    if (!result.isConfirmed) return;

    setUpdatingStatusId(designId);
    try {
      // إرجاع الحالة إلى "في الانتظار" (Pending = 1) فقط
      await designRequestsService.setState(designId, 1);
      
      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم إرجاع التصميم بنجاح. سيظهر في قائمة التصاميم المتاحة",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
      loadDesigns(); // Refresh the list
    } catch (error) {
      console.error("Error cancelling design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في إرجاع التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredDesigns = getFilteredDesigns();

  return (
    <Box>
      {/* Status Tabs */}
      <Box
        sx={{
          mb: 3,
          backgroundColor: "#ffffff",
          borderRadius: 3,
          border: "1px solid rgba(94, 78, 62, 0.12)",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(94, 78, 62, 0.08)",
        }}
      >
        <Tabs
          value={statusTab - 2} // Convert status (2-6) to tab index (0-4)
          onChange={(e, newValue) => {
            setStatusTab(newValue + 2); // Convert tab index (0-4) to status (2-6)
            setPage(0); // Reset to first page when changing status
          }}
          TabIndicatorProps={{ style: { display: 'none' } }}
          variant="fullWidth"
          sx={{
            minHeight: 72,
            backgroundColor: "#fafafa",
            "& .MuiTabs-flexContainer": {
              gap: 1,
              px: 1.5,
              py: 1,
            },
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: calmPalette.textSecondary,
              px: 1.5,
              py: 1.5,
              borderRadius: 2,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              border: "1px solid transparent",
              flex: 1,
              "&:hover:not(.Mui-selected)": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                borderColor: "rgba(94, 78, 62, 0.15)",
              },
            },
            "& .MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          <Tab
            sx={{
              backgroundColor: statusTab === 2 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
                boxShadow: "0 6px 16px rgba(33, 150, 243, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  قيد التنفيذ
                </Typography>
                <Chip
                  label={statusCounts[2]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 2 ? "rgba(255, 255, 255, 0.25)" : "rgba(33, 150, 243, 0.12)",
                    color: statusTab === 2 ? "#ffffff" : "#2196f3",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 2 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(33, 150, 243, 0.2)",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 3 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
                boxShadow: "0 6px 16px rgba(156, 39, 176, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  قيد المراجعة
                </Typography>
                <Chip
                  label={statusCounts[3]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 3 ? "rgba(255, 255, 255, 0.25)" : "rgba(156, 39, 176, 0.12)",
                    color: statusTab === 3 ? "#ffffff" : "#9c27b0",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 3 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(156, 39, 176, 0.2)",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 4 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                boxShadow: "0 6px 16px rgba(255, 152, 0, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  بحاجة لتعديل
                </Typography>
                <Chip
                  label={statusCounts[4]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 4 ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 152, 0, 0.12)",
                    color: statusTab === 4 ? "#ffffff" : "#ff9800",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 4 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 152, 0, 0.2)",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 5 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #4caf50 0%, #43a047 100%)",
                boxShadow: "0 6px 16px rgba(76, 175, 80, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  جاهز
                </Typography>
                <Chip
                  label={statusCounts[5]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 5 ? "rgba(255, 255, 255, 0.25)" : "rgba(76, 175, 80, 0.12)",
                    color: statusTab === 5 ? "#ffffff" : "#4caf50",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 5 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(76, 175, 80, 0.2)",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 6 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #f44336 0%, #e53935 100%)",
                boxShadow: "0 6px 16px rgba(244, 67, 54, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  ملغي
                </Typography>
                <Chip
                  label={statusCounts[6]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 6 ? "rgba(255, 255, 255, 0.25)" : "rgba(244, 67, 54, 0.12)",
                    color: statusTab === 6 ? "#ffffff" : "#f44336",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 6 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(244, 67, 54, 0.2)",
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Search Field */}
      <Box sx={{ mb: 3, width: "450px" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث في العنوان أو الوصف أو اسم المنشئ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
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
            لا توجد تصاميم
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
            {searchQuery ? "لم يتم العثور على نتائج للبحث" : "لم تأخذ أي تصاميم بعد"}
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
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
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
                      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
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
                                transform: "scale(1.05)",
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <>
                          {design.status === 2 ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={updatingStatusId === design.id ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <Send fontSize="small" />
                              )}
                              onClick={() => handleSendForReview(design)}
                              disabled={updatingStatusId === design.id}
                              sx={{ 
                                minWidth: '140px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {updatingStatusId === design.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CircularProgress size={14} color="inherit" />
                                  جاري...
                                </Box>
                              ) : (
                                'إرسال للمراجعة'
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={updatingStatusId === design.id ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <CheckCircle fontSize="small" />
                              )}
                              onClick={() => handleCompleteDesign(design.id)}
                              disabled={updatingStatusId === design.id || design.status === 5}
                              sx={{ 
                                minWidth: '120px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {updatingStatusId === design.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CircularProgress size={14} color="inherit" />
                                  جاري...
                                </Box>
                              ) : (
                                'إتمام'
                              )}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={updatingStatusId === design.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <Cancel fontSize="small" />
                            )}
                            onClick={() => handleCancelDesign(design.id)}
                            disabled={updatingStatusId === design.id || design.status === 3}
                            sx={{ 
                              minWidth: '120px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {updatingStatusId === design.id ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CircularProgress size={14} color="inherit" />
                                جاري...
                              </Box>
                            ) : (
                              'إرجاع'
                            )}
                          </Button>
                        </>
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
            عرض الصورة
          </Typography>
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            size="small"
            sx={{ color: calmPalette.textSecondary }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedImage && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={selectedImage.downloadUrl}
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
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${calmPalette.primary}10` }}>
          {selectedImage && (
            <Button
              startIcon={<Download />}
              onClick={() => handleDownloadImage(selectedImage)}
              variant="contained"
              sx={{
                backgroundColor: calmPalette.primary,
                "&:hover": {
                  backgroundColor: calmPalette.primaryDark,
                },
              }}
            >
              تحميل الصورة
            </Button>
          )}
          <Button onClick={() => setImageDialogOpen(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Design Dialog */}
      <Dialog
        open={viewDesignDialogOpen}
        onClose={() => setViewDesignDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            border: "1px solid rgba(94, 78, 62, 0.1)",
            overflow: "hidden",
          },
        }}
      >
        {viewingDesign && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: `linear-gradient(135deg, ${calmPalette.primary}15 0%, ${calmPalette.primary}08 100%)`,
                borderBottom: `2px solid ${calmPalette.primary}20`,
                py: 2.5,
                px: 3,
              }}
            >
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    color: calmPalette.textPrimary,
                    mb: 0.5,
                  }}
                >
                  {viewingDesign.title}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: calmPalette.textSecondary,
                    fontSize: "0.75rem",
                  }}
                >
                  #{viewingDesign.id || "-"}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setViewDesignDialogOpen(false)}
                size="small"
                sx={{ 
                  color: calmPalette.textSecondary,
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.08)",
                    transform: "rotate(90deg)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 4, px: 3, pb: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
                {/* Description */}
                {viewingDesign.description && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      border: `1px solid ${calmPalette.primary}15`,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1.5, 
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 1,
                          background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primaryDark} 100%)`,
                        }}
                      />
                      الوصف
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: calmPalette.textSecondary,
                        lineHeight: 1.8,
                        pl: 2,
                      }}
                    >
                      {viewingDesign.description}
                    </Typography>
                  </Box>
                )}

                {/* Original Images (images) - صور النموذج */}
                {viewingDesign.images && viewingDesign.images.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ 
                        fontWeight: 700, 
                        mb: 2, 
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 1,
                          background: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`,
                        }}
                      />
                      صور النموذج
                      <Chip
                        label={viewingDesign.images.length}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          backgroundColor: "rgba(33, 150, 243, 0.1)",
                          color: "#2196f3",
                          fontWeight: 700,
                        }}
                      />
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: 2.5,
                      }}
                    >
                      {viewingDesign.images.map((image, index) => {
                        // Handle both object format {fileKey, downloadUrl} and string format
                        const imageUrl = image.downloadUrl || image.fileKey || image;
                        const imageKey = image.fileKey || image;
                        
                        return (
                          <Card
                            key={index}
                            sx={{
                              cursor: "pointer",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              borderRadius: 2.5,
                              overflow: "hidden",
                              border: "2px solid transparent",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                              "&:hover": {
                                transform: "translateY(-4px) scale(1.02)",
                                boxShadow: "0 8px 24px rgba(33, 150, 243, 0.25)",
                                borderColor: "#2196f3",
                              },
                            }}
                            onClick={() => {
                              setSelectedImage(typeof image === 'object' ? image : { downloadUrl: imageUrl, fileKey: imageKey });
                              setImageDialogOpen(true);
                              setViewDesignDialogOpen(false);
                            }}
                          >
                            <CardMedia
                              component="img"
                              image={imageUrl}
                              alt={`صورة نموذج ${index + 1}`}
                              sx={{
                                height: 180,
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
                {viewingDesign.designImages && viewingDesign.designImages.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ 
                        fontWeight: 700, 
                        mb: 2, 
                        color: calmPalette.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 1,
                          background: `linear-gradient(135deg, ${calmPalette.primary} 0%, ${calmPalette.primaryDark} 100%)`,
                        }}
                      />
                      صور التصميم
                      <Chip
                        label={viewingDesign.designImages.length}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          backgroundColor: `${calmPalette.primary}15`,
                          color: calmPalette.primary,
                          fontWeight: 700,
                        }}
                      />
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: 2.5,
                      }}
                    >
                      {viewingDesign.designImages.map((image, index) => {
                        // Handle both object format {fileKey, downloadUrl} and string format
                        const imageKey = image.fileKey || image;
                        let imageUrl = image.downloadUrl || image.fileKey || image;
                        
                        // Always construct Cloudinary URL from publicId if it's not a full URL
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
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              borderRadius: 2.5,
                              overflow: "hidden",
                              border: "2px solid transparent",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                              "&:hover": {
                                transform: "translateY(-4px) scale(1.02)",
                                boxShadow: `0 8px 24px ${calmPalette.primary}40`,
                                borderColor: calmPalette.primary,
                              },
                            }}
                            onClick={() => {
                              // Ensure selectedImage has the correct downloadUrl (full URL)
                              const imageObj = typeof image === 'object' 
                                ? { ...image, downloadUrl: finalUrl, fileKey: imageKey }
                                : { downloadUrl: finalUrl, fileKey: imageKey };
                              setSelectedImage(imageObj);
                              setImageDialogOpen(true);
                              setViewDesignDialogOpen(false);
                            }}
                          >
                            <Box
                              sx={{
                                width: "100%",
                                height: 180,
                                position: "relative",
                                backgroundColor: `${calmPalette.primary}08`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <img
                                src={finalUrl}
                                alt={`صورة تصميم ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  console.error(`❌ Failed to load design image ${index + 1}:`, finalUrl, image);
                                  e.target.style.display = "none";
                                }}
                                onLoad={() => {
                                  console.log(`✅ Successfully loaded design image ${index + 1}:`, finalUrl);
                                }}
                              />
                              <ImageIcon
                                sx={{
                                  position: "absolute",
                                  color: calmPalette.textSecondary,
                                  fontSize: 40,
                                  opacity: 0.3,
                                  display: "none",
                                }}
                                className="placeholder-icon"
                              />
                            </Box>
                          </Card>
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Note */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${calmPalette.primary}15`,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ 
                      fontWeight: 700, 
                      mb: 1.5, 
                      color: calmPalette.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 20,
                        borderRadius: 1,
                        background: `linear-gradient(135deg, #ff9800 0%, #f57c00 100%)`,
                      }}
                    />
                    الملاحظات
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: calmPalette.textSecondary,
                      lineHeight: 1.8,
                      pl: 2,
                      fontStyle: viewingDesign.note ? "normal" : "italic",
                    }}
                  >
                    {viewingDesign.note || "لا توجد ملاحظات"}
                  </Typography>
                </Box>

                {/* Status Info */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${calmPalette.primary}15`,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ 
                      fontWeight: 700, 
                      mb: 1.5, 
                      color: calmPalette.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 20,
                        borderRadius: 1,
                        background: `linear-gradient(135deg, ${getStatusLabel(viewingDesign.status).color === 'success' ? '#4caf50' : getStatusLabel(viewingDesign.status).color === 'error' ? '#f44336' : getStatusLabel(viewingDesign.status).color === 'warning' ? '#ff9800' : '#2196f3'} 0%, ${getStatusLabel(viewingDesign.status).color === 'success' ? '#43a047' : getStatusLabel(viewingDesign.status).color === 'error' ? '#e53935' : getStatusLabel(viewingDesign.status).color === 'warning' ? '#f57c00' : '#1976d2'} 100%)`,
                      }}
                    />
                    الحالة
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pl: 2 }}>
                    <Chip
                      label={viewingDesign.statusName || getStatusLabel(viewingDesign.status).label}
                      color={getStatusLabel(viewingDesign.status).color}
                      size="medium"
                      sx={{ 
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        height: 32,
                      }}
                    />
                    {viewingDesign.status && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: calmPalette.textSecondary,
                          fontSize: "0.75rem",
                        }}
                      >
                        (ID: {viewingDesign.status})
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Detailed Info Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2.5,
                    pt: 2,
                    borderTop: `2px solid ${calmPalette.primary}15`,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      border: `1px solid ${calmPalette.primary}10`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: calmPalette.textSecondary, 
                        display: "block", 
                        mb: 1,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      المنشئ
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: calmPalette.textPrimary, mb: 0.5 }}>
                      {viewingDesign.createdByName || "-"}
                    </Typography>
                    {viewingDesign.createdBy && (
                      <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.7rem" }}>
                        ID: {viewingDesign.createdBy}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      border: `1px solid ${calmPalette.primary}10`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: calmPalette.textSecondary, 
                        display: "block", 
                        mb: 1,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      المصمم المعين
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: calmPalette.textPrimary, mb: 0.5 }}>
                      {viewingDesign.mainDesignerName || "-"}
                    </Typography>
                    {viewingDesign.mainDesignerId && (
                      <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.7rem" }}>
                        ID: {viewingDesign.mainDesignerId}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      border: `1px solid ${calmPalette.primary}10`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: calmPalette.textSecondary, 
                        display: "block", 
                        mb: 1,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      تاريخ الإنشاء
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                      {viewingDesign.createdAt
                        ? new Date(viewingDesign.createdAt).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </Typography>
                  </Box>
                  {viewingDesign.updatedAt && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.6)",
                        border: `1px solid ${calmPalette.primary}10`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ 
                          color: calmPalette.textSecondary, 
                          display: "block", 
                          mb: 1,
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        آخر تحديث
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                        {new Date(viewingDesign.updatedAt).toLocaleDateString("ar-SA", {
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
            <DialogActions 
              sx={{ 
                borderTop: `2px solid ${calmPalette.primary}15`, 
                p: 2.5,
                background: "linear-gradient(to top, #fafafa 0%, #ffffff 100%)",
              }}
            >
              <Button
                onClick={() => setViewDesignDialogOpen(false)}
                variant="contained"
                sx={{
                  backgroundColor: calmPalette.primary,
                  borderRadius: 2,
                  px: 4,
                  py: 1,
                  fontWeight: 700,
                  textTransform: "none",
                  boxShadow: `0 4px 12px ${calmPalette.primary}40`,
                  "&:hover": {
                    backgroundColor: calmPalette.primaryDark,
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 16px ${calmPalette.primary}50`,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                إغلاق
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Review Modal - Upload Images and Send for Review */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => {
          if (!uploadingImages) {
            setReviewModalOpen(false);
            setDesignForReview(null);
            setReviewImages([]);
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: calmPalette.primary,
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">إرسال للمراجعة</Typography>
          <IconButton
            onClick={() => {
              if (!uploadingImages) {
                setReviewModalOpen(false);
                setDesignForReview(null);
                setReviewImages([]);
              }
            }}
            disabled={uploadingImages}
            sx={{ color: "#fff" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {designForReview && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Design Info */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  التصميم:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: calmPalette.primary }}>
                  {designForReview.title}
                </Typography>
                {designForReview.description && (
                  <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mt: 0.5 }}>
                    {designForReview.description}
                  </Typography>
                )}
              </Box>

              {/* Upload Images Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  رفع صور التصميم <span style={{ color: "red" }}>*</span>
                </Typography>
                
                {/* File Input */}
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="review-image-upload"
                  multiple
                  type="file"
                  onChange={handleReviewImageSelect}
                  disabled={uploadingImages}
                />
                <label htmlFor="review-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={uploadingImages}
                    sx={{
                      mb: 2,
                      borderColor: calmPalette.primary,
                      color: calmPalette.primary,
                      "&:hover": {
                        borderColor: calmPalette.primaryDark,
                        backgroundColor: `${calmPalette.primary}10`,
                      },
                    }}
                  >
                    اختر الصور
                  </Button>
                </label>

                {/* Preview Images */}
                {reviewImages.length > 0 && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    {reviewImages.map((file, index) => (
                      <Card
                        key={index}
                        sx={{
                          position: "relative",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          sx={{
                            height: 150,
                            objectFit: "cover",
                          }}
                        />
                        <IconButton
                          onClick={() => handleRemoveReviewImage(index)}
                          disabled={uploadingImages}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            color: "#f44336",
                            "&:hover": {
                              backgroundColor: "#fff",
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
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                            color: "#fff",
                            p: 0.5,
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}
                        >
                          {file.name}
                        </Box>
                      </Card>
                    ))}
                  </Box>
                )}

                {reviewImages.length === 0 && (
                  <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mt: 1 }}>
                    لم يتم اختيار أي صور بعد
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${calmPalette.primary}10`, p: 2 }}>
          <Button
            onClick={() => {
              if (!uploadingImages) {
                setReviewModalOpen(false);
                setDesignForReview(null);
                setReviewImages([]);
              }
            }}
            disabled={uploadingImages}
            sx={{ color: calmPalette.textSecondary }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleUploadImagesAndSendForReview}
            disabled={uploadingImages || reviewImages.length === 0}
            variant="contained"
            startIcon={
              uploadingImages ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Send />
              )
            }
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
              "&:disabled": {
                backgroundColor: calmPalette.textSecondary,
              },
            }}
          >
            {uploadingImages ? "جاري الإرسال..." : "إرسال للمراجعة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyDesignsTab;

