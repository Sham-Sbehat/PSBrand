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
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
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
  Message,
} from "@mui/icons-material";
import { designRequestsService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import DesignRequestDetailsDialog from "../common/DesignRequestDetailsDialog";
import { parseDesignDescription } from "../../utils";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";
import { parseNoteConversation, formatNoteConversationEntry } from "../../utils";

const MyDesignsTab = ({ designRequestsRefreshKey = 0, designRequestIdToOpen, onDesignRequestOpened }) => {
  const { user } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [statusTab, setStatusTab] = useState(2); // 2,3,4,5,7,6 = specific status (no pending)
  const STATUS_TAB_VALUES = [2, 3, 4, 5, 7, 6]; // قيد التنفيذ، قيد المراجعة، بحاجة لتعديل، جاهز، تم رفع التصميم، ملغي
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [designForReview, setDesignForReview] = useState(null);
  const [reviewImages, setReviewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [designUploadedModalOpen, setDesignUploadedModalOpen] = useState(false);
  const [designForUpload, setDesignForUpload] = useState(null);
  const [uploadedDesignImages, setUploadedDesignImages] = useState([]);
  const [noteToSellerOpen, setNoteToSellerOpen] = useState(false);
  const [designForNote, setDesignForNote] = useState(null);
  const [noteToSellerText, setNoteToSellerText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [statusCounts, setStatusCounts] = useState({
    1: 0, // في الانتظار (for counting only, not displayed)
    2: 0, // قيد التنفيذ
    3: 0, // قيد المراجعة
    4: 0, // بحاجة لتعديل
    5: 0, // جاهز
    6: 0, // ملغي
    7: 0, // تم رفع التصميم
  });

  // التمرير لموقع طلب التصميم في الجدول عند النقر على الإشعار (بدون فتح المودال)
  const designRowRefs = useRef({});
  useEffect(() => {
    if (!designRequestIdToOpen || !onDesignRequestOpened) return;
    let cancelled = false;
    (async () => {
      try {
        const design = await designRequestsService.getDesignRequestById(designRequestIdToOpen);
        if (!cancelled && design != null && design.status != null) {
          setStatusTab(design.status);
        }
      } catch (e) {
        console.error("Error opening design request from notification:", e);
        if (!cancelled) onDesignRequestOpened();
      }
    })();
    return () => { cancelled = true; };
  }, [designRequestIdToOpen, onDesignRequestOpened]);

  useEffect(() => {
    if (!designRequestIdToOpen || !onDesignRequestOpened || loading || designs.length === 0) return;
    const hasRow = designs.some((d) => d.id === designRequestIdToOpen);
    if (!hasRow) return;
    const el = designRowRefs.current[designRequestIdToOpen];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    onDesignRequestOpened();
  }, [designRequestIdToOpen, onDesignRequestOpened, loading, designs]);

  // Load counts for all statuses (2-7 + 6) so tab badges show correct numbers
  const loadStatusCounts = async () => {
    if (!user?.id) return;
    const statuses = [2, 3, 4, 5, 7, 6];
    try {
      const results = await Promise.all(
        statuses.map((status) =>
          designRequestsService.getDesignRequests({
            page: 1,
            pageSize: 1,
            mainDesignerId: user.id,
            status,
          })
        )
      );
      setStatusCounts((prev) => {
        const next = { ...prev };
        results.forEach((response, index) => {
          const status = statuses[index];
          let total = 0;
          if (response && typeof response.totalCount === "number") total = response.totalCount;
          else if (response?.data && Array.isArray(response.data)) total = response.totalCount ?? response.data.length;
          else if (Array.isArray(response)) total = response.length;
          next[status] = total;
        });
        return next;
      });
    } catch (err) {
      console.error("Error loading status counts:", err);
    }
  };

  // Load design requests assigned to current designer — يُرجع القائمة لاستخدامها في التحديث الريال تايم
  const loadDesigns = async () => {
    if (!user?.id) return [];

    setLoading(true);
    try {
      const params = {
        page: page + 1,
        pageSize: pageSize,
        mainDesignerId: user.id,
      };
      params.status = statusTab;

      const response = await designRequestsService.getDesignRequests(params);

      let designsArray = [];
      let totalCountValue = 0;

      if (response && response.data) {
        designsArray = Array.isArray(response.data) ? response.data : [];
        totalCountValue = response.totalCount !== undefined ? response.totalCount : (Array.isArray(response.data) ? response.data.length : 0);
      } else if (Array.isArray(response)) {
        designsArray = response;
        totalCountValue = response.length;
      } else {
        designsArray = [];
        totalCountValue = 0;
      }

      setTotalCount(totalCountValue);
      setAllDesigns(designsArray);
      setStatusCounts((prevCounts) => {
        const updatedCounts = { ...prevCounts };
        updatedCounts[statusTab] = totalCountValue;
        return updatedCounts;
      });
      setDesigns(designsArray);
      return designsArray;
    } catch (error) {
      console.error("Error loading design requests:", error);
      setDesigns([]);
      setAllDesigns([]);
      setTotalCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load status counts for all tabs on mount (so badges show correct numbers)
  useEffect(() => {
    loadStatusCounts();
  }, [user?.id]);

  // Load designs when page, pageSize, statusTab, or user changes
  useEffect(() => {
    loadDesigns();
  }, [page, pageSize, statusTab, user?.id]);

  // Real-time: عند وصول إشعار SignalR (DesignRequestUpdated / DesignRequestsListChanged) نحدّث القائمة والعدادات
  // لو نافذة الملاحظة مفتوحة نحدّث designForNote من القائمة الجديدة
  useEffect(() => {
    if (designRequestsRefreshKey <= 0) return;
    loadStatusCounts();
    loadDesigns().then((list) => {
      if (list && list.length && noteToSellerOpen && designForNote) {
        const updated = list.find((d) => d.id === designForNote.id);
        if (updated) setDesignForNote(updated);
      }
    });
  }, [designRequestsRefreshKey]);

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
      7: { label: "تم رفع التصميم", color: "success" },
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

      // Step 3: Update design images using the dedicated endpoint
      await designRequestsService.setDesignImages(designForReview.id, newImageKeys);

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
      loadStatusCounts();
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

  // ملاحظة للبائع (بدون تغيير الحالة) — PATCH /api/DesignRequests/{id}/note
  const handleOpenNoteToSeller = (design) => {
    setDesignForNote(design);
    setNoteToSellerText(""); // حقل الإضافة فقط — الموجود يعرض للقراءة
    setNoteToSellerOpen(true);
  };

  const handleSaveNoteToSeller = async () => {
    if (!designForNote?.id) return;
    const existingNote = designForNote?.note != null
      ? (typeof designForNote.note === "object" && designForNote.note !== null && "text" in designForNote.note ? designForNote.note.text : String(designForNote.note))
      : (typeof designForNote?.notes === "string" ? designForNote.notes : "");
    const newPart = noteToSellerText.trim();
    if (!newPart) return;
    const newEntry = formatNoteConversationEntry("المصمم", newPart);
    const updatedNote = existingNote ? `${existingNote}\n\n${newEntry}` : newEntry;
    setSavingNoteId(designForNote.id);
    try {
      await designRequestsService.updateNote(designForNote.id, updatedNote);
      Swal.fire({
        icon: "success",
        title: "تم الحفظ",
        text: "تم إرسال الملاحظة للبائع",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
      setNoteToSellerOpen(false);
      setDesignForNote(null);
      setNoteToSellerText("");
      loadDesigns();
      loadStatusCounts();
    } catch (err) {
      console.error("Error saving note to seller:", err);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: err.response?.data?.message || err.message || "فشل في حفظ الملاحظة",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setSavingNoteId(null);
    }
  };

  // تغيير الحالة إلى «تم رفع التصميم» (7) بتأكيد فقط — بدون مودال
  const handleSetDesignUploaded = async (design) => {
    const result = await Swal.fire({
      icon: "question",
      title: "تأكيد",
      text: `تحديث حالة «${design.title || "طلب التصميم"}» إلى «تم رفع التصميم»؟`,
      showCancelButton: true,
      confirmButtonText: "نعم، تأكيد",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#00897b",
      cancelButtonColor: calmPalette.textSecondary,
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setUpdatingStatusId(design.id);
    try {
      await designRequestsService.setState(design.id, 7);
      Swal.fire({
        icon: "success",
        title: "تم",
        text: "تم تحديث الحالة إلى «تم رفع التصميم»",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
      loadDesigns();
      loadStatusCounts();
    } catch (err) {
      console.error("Error setting design uploaded:", err);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: err.response?.data?.message || err.message || "فشل في تحديث الحالة",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // فتح مودال "تم رفع التصميم" (الحالة 7) — استخدم فقط إن احتجت رفع صور مع الحالة
  const handleOpenDesignUploadedModal = (design) => {
    setDesignForUpload(design);
    setUploadedDesignImages([]);
    setDesignUploadedModalOpen(true);
  };

  const handleUploadedDesignImageSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) setUploadedDesignImages((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const handleRemoveUploadedDesignImage = (index) => {
    setUploadedDesignImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmDesignUploaded = async () => {
    if (!designForUpload) return;
    setUpdatingStatusId(designForUpload.id);
    setUploadingImages(true);
    try {
      if (uploadedDesignImages.length > 0) {
        const uploadResponse = await designRequestsService.uploadImages(uploadedDesignImages);
        let imageKeys = [];
        if (Array.isArray(uploadResponse)) {
          imageKeys = uploadResponse.map((item) =>
            typeof item === "string" ? item : item?.publicId || item?.fileKey || item?.key || item?.url || String(item)
          );
        } else if (uploadResponse?.publicId) {
          imageKeys = [uploadResponse.publicId];
        } else if (uploadResponse?.url) {
          imageKeys = [uploadResponse.url];
        } else if (uploadResponse?.data && Array.isArray(uploadResponse.data)) {
          imageKeys = uploadResponse.data.map((item) => item?.publicId || item?.fileKey || item?.url);
        }
        imageKeys = imageKeys.map(String).filter(Boolean);
        if (imageKeys.length) await designRequestsService.setDesignImages(designForUpload.id, imageKeys);
      }
      await designRequestsService.setState(designForUpload.id, 7);
      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم تحديث الحالة إلى «تم رفع التصميم»",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
      setDesignUploadedModalOpen(false);
      setDesignForUpload(null);
      setUploadedDesignImages([]);
      loadDesigns();
      loadStatusCounts();
    } catch (error) {
      console.error("Error setting design uploaded:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في تحديث الحالة",
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
      loadDesigns();
      loadStatusCounts();
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
      loadDesigns();
      loadStatusCounts();
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
          value={STATUS_TAB_VALUES.indexOf(statusTab) >= 0 ? STATUS_TAB_VALUES.indexOf(statusTab) : 0}
          onChange={(e, newValue) => {
            setStatusTab(STATUS_TAB_VALUES[newValue] ?? 2);
            setPage(0);
          }}
          TabIndicatorProps={{ style: { display: 'none' } }}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 56, sm: 72 },
            backgroundColor: "#fafafa",
            "& .MuiTabs-flexContainer": {
              gap: 1,
              px: 1.5,
              py: 1,
            },
            "& .MuiTab-root": {
              minHeight: { xs: 48, sm: 64 },
              minWidth: { xs: "auto", sm: undefined },
              textTransform: "none",
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              fontWeight: 600,
              color: calmPalette.textSecondary,
              px: { xs: 1, sm: 1.5 },
              py: 1.5,
              borderRadius: 2,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              border: "1px solid transparent",
              flex: isMobile ? undefined : 1,
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {isMobile ? "التنفيذ" : "قيد التنفيذ"}
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {isMobile ? "المراجعة" : "قيد المراجعة"}
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {isMobile ? "لتعديل" : "بحاجة لتعديل"}
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
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
              backgroundColor: statusTab === 7 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #00897b 0%, #00695c 100%)",
                boxShadow: "0 6px 16px rgba(0, 137, 123, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {isMobile ? "تم الرفع" : "تم رفع التصميم"}
                </Typography>
                <Chip
                  label={statusCounts[7]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 7 ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 137, 123, 0.12)",
                    color: statusTab === 7 ? "#ffffff" : "#00897b",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 7 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 137, 123, 0.2)",
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.75, sm: 1.5 } }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
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
      <Box sx={{ mb: 3, width: { xs: "100%", sm: "450px" } }}>
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
            p: { xs: 3, sm: 4 },
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
            overflowX: { xs: "auto", sm: "hidden" },
          }}
        >
          <Table sx={{ minWidth: { xs: 800, sm: undefined } }}>
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
                  عنوان الطلب
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  عنوان التصميم
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  المنتج
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  اللون
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>
                  إضافات
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
                const isDesignToScroll = designRequestIdToOpen === design.id;
                return (
                  <TableRow
                    key={design.id}
                    ref={(el) => { if (el && isDesignToScroll) designRowRefs.current[design.id] = el; }}
                    sx={{
                      backgroundColor: isDesignToScroll
                        ? "rgba(25, 118, 210, 0.12)"
                        : index % 2 === 0
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
                    {(() => {
                      const parsed = parseDesignDescription(design.description || "");
                      return (
                        <>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
                              {parsed ? parsed.designTitle : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
                              {parsed ? parsed.product : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
                              {parsed ? parsed.color : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ color: calmPalette.textSecondary, maxWidth: 220, whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                              title={parsed ? parsed.additions : design.description}
                            >
                              {parsed ? parsed.additions : (design.description || "-")}
                            </Typography>
                          </TableCell>
                        </>
                      );
                    })()}
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
                      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap", alignItems: "center", ...(isMobile && { "& .MuiIconButton-root": { minWidth: 44, minHeight: 44 } }) }}>
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
                        <Tooltip title="ملاحظة للبائع" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenNoteToSeller(design)}
                            sx={{
                              color: "#5e35b1",
                              backgroundColor: "rgba(94, 53, 177, 0.1)",
                              border: "1px solid rgba(94, 53, 177, 0.3)",
                              "&:hover": {
                                backgroundColor: "rgba(94, 53, 177, 0.2)",
                                transform: "scale(1.05)",
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Message fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <>
                          {(design.status === 2 || design.status === 4) ? (
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
                          ) : design.status === 5 ? (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{
                                minWidth: "140px",
                                fontSize: "0.8rem",
                                borderColor: "#00897b",
                                color: "#00897b",
                                "&:hover": { borderColor: "#00695c", backgroundColor: "rgba(0, 137, 123, 0.08)" },
                              }}
                              startIcon={
                                updatingStatusId === design.id ? (
                                  <CircularProgress size={14} color="inherit" />
                                ) : (
                                  <CloudUpload fontSize="small" />
                                )
                              }
                              onClick={() => handleSetDesignUploaded(design)}
                              disabled={updatingStatusId === design.id}
                            >
                              {updatingStatusId === design.id ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <CircularProgress size={14} color="inherit" />
                                  جاري...
                                </Box>
                              ) : (
                                "تم رفع التصميم"
                              )}
                            </Button>
                          ) : (
                            design.status !== 3 && design.status !== 5 && design.status !== 6 && design.status !== 7 && (
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
                            )
                          )}
                          {design.status !== 3 && design.status !== 5 && design.status !== 6 && design.status !== 7 && (
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
                          )}
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
      <DesignRequestDetailsDialog
        open={viewDesignDialogOpen}
        onClose={() => {
          setViewDesignDialogOpen(false);
          setViewingDesign(null);
        }}
        design={viewingDesign}
        getStatusLabel={getStatusLabel}
        onImageClick={(image) => {
          const imageUrl = image.downloadUrl || image.fileKey || image;
          const imageKey = image.fileKey || image;
          setSelectedImage(typeof image === 'object' ? image : { downloadUrl: imageUrl, fileKey: imageKey });
          setImageDialogOpen(true);
        }}
      />

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
                  <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mt: 0.5, whiteSpace: "pre-line" }}>
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

      {/* مودال تم رفع التصميم (الحالة 7) - اختياري: رفع صور ثم تأكيد */}
      <Dialog
        open={designUploadedModalOpen}
        onClose={() => {
          if (!uploadingImages) {
            setDesignUploadedModalOpen(false);
            setDesignForUpload(null);
            setUploadedDesignImages([]);
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
            backgroundColor: "#00897b",
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">تم رفع التصميم</Typography>
          <IconButton
            onClick={() => {
              if (!uploadingImages) {
                setDesignUploadedModalOpen(false);
                setDesignForUpload(null);
                setUploadedDesignImages([]);
              }
            }}
            disabled={uploadingImages}
            sx={{ color: "#fff" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {designForUpload && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  التصميم:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: calmPalette.primary }}>
                  {designForUpload.title}
                </Typography>
                {designForUpload.description && (
                  <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mt: 0.5, whiteSpace: "pre-line" }}>
                    {designForUpload.description}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  رفع صور التصميم النهائي (اختياري)
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="design-uploaded-image-upload"
                  multiple
                  type="file"
                  onChange={handleUploadedDesignImageSelect}
                  disabled={uploadingImages}
                />
                <label htmlFor="design-uploaded-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={uploadingImages}
                    sx={{
                      mb: 2,
                      borderColor: "#00897b",
                      color: "#00897b",
                      "&:hover": { borderColor: "#00695c", backgroundColor: "rgba(0, 137, 123, 0.08)" },
                    }}
                  >
                    اختر الصور
                  </Button>
                </label>
                {uploadedDesignImages.length > 0 && (
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 2, mt: 2 }}>
                    {uploadedDesignImages.map((file, index) => (
                      <Card key={index} sx={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
                        <CardMedia
                          component="img"
                          image={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          sx={{ height: 150, objectFit: "cover" }}
                        />
                        <IconButton
                          onClick={() => handleRemoveUploadedDesignImage(index)}
                          disabled={uploadingImages}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            color: "#f44336",
                            "&:hover": { backgroundColor: "#fff" },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Card>
                    ))}
                  </Box>
                )}
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mt: 1 }}>
                  يمكنك رفع صور التصميم النهائي أو تأكيد الحالة مباشرة.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid rgba(0,0,0,0.08)", p: 2 }}>
          <Button
            onClick={() => {
              if (!uploadingImages) {
                setDesignUploadedModalOpen(false);
                setDesignForUpload(null);
                setUploadedDesignImages([]);
              }
            }}
            disabled={uploadingImages}
            sx={{ color: calmPalette.textSecondary }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDesignUploaded}
            disabled={uploadingImages}
            variant="contained"
            startIcon={
              uploadingImages ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CheckCircle />
              )
            }
            sx={{
              backgroundColor: "#00897b",
              "&:hover": { backgroundColor: "#00695c" },
            }}
          >
            {uploadingImages ? "جاري التحديث..." : "تأكيد — تم رفع التصميم"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* مودال ملاحظة للبائع — بدون تغيير الحالة */}
      <Dialog
        open={noteToSellerOpen}
        onClose={() => {
          if (!savingNoteId) {
            setNoteToSellerOpen(false);
            setDesignForNote(null);
            setNoteToSellerText("");
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">ملاحظة للبائع</Typography>
          <IconButton size="small" onClick={() => !savingNoteId && setNoteToSellerOpen(false)} disabled={!!savingNoteId}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {designForNote && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
                طلب: {designForNote.title || `#${designForNote.id}`}
              </Typography>
              {(() => {
                const existingVal = designForNote?.note != null
                  ? (typeof designForNote.note === "object" && designForNote.note !== null && "text" in designForNote.note ? designForNote.note.text : String(designForNote.note))
                  : (typeof designForNote?.notes === "string" ? designForNote.notes : "");
                const entries = parseNoteConversation(existingVal);
                return (
                  <>
                    {entries.length > 0 ? (
                      <Box
                        sx={{
                          mb: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "grey.50",
                          border: "1px solid",
                          borderColor: "divider",
                          maxHeight: 280,
                          overflowY: "auto",
                        }}
                      >
                        <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary", fontWeight: 600 }}>
                          المحادثة (للقراءة فقط)
                        </Typography>
                        {entries.map((entry, idx) => {
                          const fromDesigner = entry.role === "المصمم";
                          const isLegacy = entry.role === "ملاحظة";
                          return (
                            <Box
                              key={idx}
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: fromDesigner ? "flex-start" : "flex-end",
                                mb: 1.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: fromDesigner ? "#5e35b1" : isLegacy ? "text.secondary" : "#00897b",
                                  mb: 0.25,
                                }}
                              >
                                {entry.senderName}
                                {entry.datetime ? ` · ${entry.datetime}` : ""}
                              </Typography>
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 1,
                                  borderRadius: 2,
                                  maxWidth: "90%",
                                  bgcolor: fromDesigner ? "rgba(94, 53, 177, 0.12)" : isLegacy ? "grey.200" : "rgba(0, 137, 123, 0.12)",
                                  border: "1px solid",
                                  borderColor: fromDesigner ? "rgba(94, 53, 177, 0.3)" : isLegacy ? "divider" : "rgba(0, 137, 123, 0.3)",
                                }}
                              >
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                  {entry.text}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : null}
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      maxRows={8}
                      label="أضف ملاحظة جديدة للبائع"
                      placeholder="اكتب ملاحظتك الإضافية هنا..."
                      value={noteToSellerText}
                      onChange={(e) => setNoteToSellerText(e.target.value)}
                      disabled={!!savingNoteId}
                      sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "rgba(255,255,255,0.9)" } }}
                    />
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid", borderColor: "divider", p: 2 }}>
          <Button onClick={() => !savingNoteId && setNoteToSellerOpen(false)} disabled={!!savingNoteId} sx={{ color: "text.secondary" }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveNoteToSeller}
            disabled={!!savingNoteId || !noteToSellerText.trim()}
            startIcon={savingNoteId ? <CircularProgress size={16} color="inherit" /> : <Message />}
            sx={{ backgroundColor: "#5e35b1", "&:hover": { backgroundColor: "#4527a0" } }}
          >
            {savingNoteId ? "جاري الحفظ..." : "حفظ الملاحظة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyDesignsTab;

