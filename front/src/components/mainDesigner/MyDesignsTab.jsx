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
  const [statusTab, setStatusTab] = useState(1); // 1-6 = specific status
  const [statusCounts, setStatusCounts] = useState({
    1: 0, // في الانتظار
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

  // Handle complete design
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
      await designRequestsService.setState(designId, 3); // Completed = 3
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
          value={statusTab - 1} // Convert status (1-6) to tab index (0-5)
          onChange={(e, newValue) => {
            setStatusTab(newValue + 1); // Convert tab index (0-5) to status (1-6)
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
              backgroundColor: statusTab === 1 ? "transparent" : "rgba(255, 255, 255, 0.8)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)",
                boxShadow: "0 6px 16px rgba(245, 124, 0, 0.4)",
                border: "none",
                transform: "translateY(-2px)",
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.9rem" }}>
                  في الانتظار
                </Typography>
                <Chip
                  label={statusCounts[1]}
                  size="small"
                  sx={{
                    height: 26,
                    minWidth: 32,
                    fontSize: "0.8rem",
                    backgroundColor: statusTab === 1 ? "rgba(255, 255, 255, 0.25)" : "rgba(245, 124, 0, 0.12)",
                    color: statusTab === 1 ? "#ffffff" : "#f57c00",
                    fontWeight: 700,
                    borderRadius: "14px",
                    border: statusTab === 1 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(245, 124, 0, 0.2)",
                  }}
                />
              </Box>
            }
          />
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
                              'إتمام'
                            )}
                          </Button>
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
            borderRadius: 3,
            background: "#ffffff",
            boxShadow: calmPalette.shadow,
            border: "1px solid rgba(94, 78, 62, 0.15)",
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
                borderBottom: `1px solid ${calmPalette.primary}20`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {viewingDesign.title}
              </Typography>
              <IconButton
                onClick={() => setViewDesignDialogOpen(false)}
                size="small"
                sx={{ color: calmPalette.textSecondary }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Description */}
                {viewingDesign.description && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
                    >
                      الوصف:
                    </Typography>
                    <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                      {viewingDesign.description}
                    </Typography>
                  </Box>
                )}

                {/* Images */}
                {viewingDesign.images && viewingDesign.images.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 2, color: calmPalette.textPrimary }}
                    >
                      الصور ({viewingDesign.images.length}):
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: 2,
                      }}
                    >
                      {viewingDesign.images.map((image, index) => (
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
                          onClick={() => {
                            setSelectedImage(image);
                            setImageDialogOpen(true);
                            setViewDesignDialogOpen(false);
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={image.downloadUrl}
                            alt={`${viewingDesign.title} - ${index + 1}`}
                            sx={{
                              height: 150,
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Note */}
                {viewingDesign.note && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: calmPalette.textPrimary }}
                    >
                      الملاحظات:
                    </Typography>
                    <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                      {viewingDesign.note}
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
                      {viewingDesign.createdByName || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
                    >
                      الحالة:
                    </Typography>
                    <Chip
                      label={getStatusLabel(viewingDesign.status).label}
                      color={getStatusLabel(viewingDesign.status).color}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
                    >
                      تاريخ الإنشاء:
                    </Typography>
                    <Typography variant="body2">
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
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: calmPalette.textSecondary, display: "block", mb: 0.5 }}
                      >
                        آخر تحديث:
                      </Typography>
                      <Typography variant="body2">
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
            <DialogActions sx={{ borderTop: `1px solid ${calmPalette.primary}10`, p: 2 }}>
              <Button
                onClick={() => setViewDesignDialogOpen(false)}
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
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MyDesignsTab;

