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
  Tabs,
  Tab,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Search,
  Clear,
  Refresh,
  AttachFile,
  CheckCircle,
  Cancel,
  ArrowUpward,
  ArrowDownward,
  UnfoldMore,
  FilterList,
  Download,
  Undo,
  Edit,
  Delete,
  Visibility,
  Note,
  Image as ImageIcon,
  Close,
} from "@mui/icons-material";
import { mainDesignerService, employeesService } from "../../services/api";
import { USER_ROLES } from "../../constants";
import calmPalette from "../../theme/calmPalette";
import Swal from "sweetalert2";

const DesignsFromDesignersTab = ({ 
  onShowNotification, // Callback to show notifications
  setSelectedImage, // For image dialog
  setImageDialogOpen, // For image dialog
}) => {
  // State
  const [designs, setDesigns] = useState([]);
  const [allDesigns, setAllDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsPage, setDesignsPage] = useState(0);
  const [designsPageSize, setDesignsPageSize] = useState(5);
  const [designsTotalCount, setDesignsTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    1: 0, // في الانتظار
    2: 0, // معتمد
    3: 0, // غير معتمد
    4: 0  // مرتجع
  });
  const [statusTab, setStatusTab] = useState(0);
  const [dateFilter, setDateFilter] = useState("");
  const [designerFilter, setDesignerFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [usersMap, setUsersMap] = useState({});
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDesignForStatus, setSelectedDesignForStatus] = useState(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingDesignStatus, setUpdatingDesignStatus] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedDesignForMenu, setSelectedDesignForMenu] = useState(null);
  const [designNotesDialogOpen, setDesignNotesDialogOpen] = useState(false);
  const [selectedDesignForNotes, setSelectedDesignForNotes] = useState(null);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageViewDialogOpen, setImageViewDialogOpen] = useState(false);

  // Load users for mapping IDs to names
  const loadUsers = async () => {
    try {
      const users = await employeesService.getUsersByRole(USER_ROLES.MAIN_DESIGNER);
      const mapping = {};
      if (Array.isArray(users)) {
        users.forEach((user) => {
          if (user.id && (user.role === USER_ROLES.MAIN_DESIGNER || user.role === 6)) {
            const id = user.id;
            mapping[id] = user.name || "";
            mapping[String(id)] = user.name || "";
            mapping[Number(id)] = user.name || "";
          }
        });
      }
      setUsersMap(mapping);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsersMap({});
    }
  };

  // Load total counts for each status
  const loadStatusCounts = async () => {
    try {
      if (dateFilter || designerFilter !== "all" || searchTerm) {
        return;
      }

      const statuses = [1, 2, 3, 4];
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

      await Promise.all(
        statuses.map(async (status) => {
          try {
            const params = {
              page: 1,
              pageSize: 1,
              status: status
            };
            const response = await mainDesignerService.getDesigns(params);
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              counts[status] = response.totalCount || 0;
            }
          } catch (error) {
            console.error(`Error loading count for status ${status}:`, error);
            counts[status] = 0;
          }
        })
      );

      setStatusCounts(counts);
    } catch (error) {
      console.error("Error loading status counts:", error);
    }
  };

  // Load designs
  const loadDesigns = async (page = designsPage, pageSize = designsPageSize) => {
    setLoadingDesigns(true);
    try {
      await loadUsers();
      
      const statusMap = {
        0: 1,    // في الانتظار
        1: 2,    // معتمد
        2: 3,    // غير معتمد
        3: 4     // مرتجع
      };
      
      const status = statusMap[statusTab];
      
      const params = {
        page: page + 1,
        pageSize: pageSize,
        status: status
      };
      
      if (dateFilter) {
        params.date = dateFilter;
      }
      
      if (designerFilter !== "all") {
        params.createdBy = designerFilter;
      }
      
      let response;
      if (searchTerm && searchTerm.trim()) {
        const { search, ...restParams } = params;
        response = await mainDesignerService.searchDesigns(searchTerm.trim(), restParams);
      } else {
        response = await mainDesignerService.getDesigns(params);
      }
      
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        let designsArray = [];
        let totalCount = 0;
        
        if (Array.isArray(response.data)) {
          designsArray = response.data;
        } else if (Array.isArray(response.designs)) {
          designsArray = response.designs;
        } else if (Array.isArray(response.items)) {
          designsArray = response.items;
        } else if (Array.isArray(response)) {
          designsArray = response.filter(item => item && typeof item === 'object' && item.id);
        }
        
        totalCount = response.totalCount || designsArray.length;
        
        setDesigns(designsArray);
        setDesignsTotalCount(totalCount);
        setAllDesigns(designsArray);
        
        if (status && totalCount !== undefined) {
          setStatusCounts(prev => ({
            ...prev,
            [status]: totalCount
          }));
        }
      } else if (Array.isArray(response)) {
        setDesigns(response);
        setAllDesigns(response);
        setDesignsTotalCount(response.length);
      } else {
        setDesigns([]);
        setAllDesigns([]);
        setDesignsTotalCount(0);
      }
    } catch (error) {
      console.error("Error loading designs:", error);
      setDesigns([]);
      setAllDesigns([]);
      setDesignsTotalCount(0);
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Get designer name from ID
  const getDesignerName = (design) => {
    const designerId = design.creatorId || design.createdBy || design.userId || design.mainDesignerId || 
                       design.creator?.id || design.mainDesigner?.id || 
                       design.creator?.userId || design.mainDesigner?.userId;
    
    if (!designerId) {
      return "-";
    }
    
    const name = usersMap[designerId] || 
                 usersMap[String(designerId)] || 
                 usersMap[Number(designerId)] ||
                 (design.creator?.name) ||
                 (design.mainDesigner?.name) ||
                 (design.creatorName);
    
    if (name) {
      return name;
    }
    
    return `ID: ${designerId}`;
  };

  // Extract fileKey from URL
  const extractFileKeyFromUrl = (url) => {
    if (!url) return null;
    
    if (typeof url === 'object' && url !== null) {
      return url.fileKey || null;
    }
    
    if (typeof url !== 'string') {
      return null;
    }
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/');
      }
      return pathParts[0] || null;
    } catch (e) {
      if (typeof url === 'string' && url.startsWith('designs/')) {
        return url;
      }
      return null;
    }
  };

  // Handle download file
  const handleDownloadFile = async (fileItemOrKey, fileName) => {
    try {
      let fileKey;
      let downloadFileName;
      
      if (fileName !== undefined) {
        fileKey = fileItemOrKey;
        downloadFileName = fileName;
      } else {
        const fileItem = fileItemOrKey;
        if (typeof fileItem === 'string') {
          if (fileItem.startsWith('http')) {
            fileKey = extractFileKeyFromUrl(fileItem);
            if (!fileKey) {
              const urlParts = fileItem.split('/');
              fileKey = urlParts[urlParts.length - 1];
            }
          } else {
            fileKey = fileItem;
          }
        } else if (fileItem?.fileKey) {
          fileKey = fileItem.fileKey;
        } else if (fileItem?.key) {
          fileKey = fileItem.key;
        } else {
          throw new Error("لا يمكن العثور على مفتاح الملف");
        }
        downloadFileName = fileItem?.printFileName || fileItem?.fileName || fileKey.split('/').pop() || 'file';
      }

      if (!fileKey) {
        throw new Error("FileKey غير متوفر");
      }

      let cleanFileKey = fileKey;
      if (typeof fileKey === 'string' && fileKey.startsWith('http')) {
        cleanFileKey = extractFileKeyFromUrl(fileKey);
        if (!cleanFileKey) {
          throw new Error("لا يمكن استخراج مفتاح الملف من الرابط");
        }
      }

      const downloadData = await mainDesignerService.generateDownloadUrl(cleanFileKey);
      
      if (downloadData.downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadData.downloadUrl;
        link.target = '_blank';
        link.download = downloadFileName || cleanFileKey.split('/').pop() || 'file';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } else {
        throw new Error("فشل في توليد رابط التحميل");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (onShowNotification) {
        onShowNotification("error", error.response?.data?.message || error.message || "فشل في تحميل الملف");
      }
    }
  };

  // Handle download all files
  const handleDownloadAllFiles = async (design) => {
    if (!design.designFileUrls || design.designFileUrls.length === 0) {
      if (onShowNotification) {
        onShowNotification("info", "لا توجد ملفات للتحميل");
      }
      return;
    }

    try {
      for (let i = 0; i < design.designFileUrls.length; i++) {
        await handleDownloadFile(design.designFileUrls[i]);
        if (i < design.designFileUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Error downloading all files:", error);
    }
  };

  // Get filtered and sorted designs
  const getFilteredAndSortedDesigns = () => {
    let filtered = [...designs];

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case "serialNumber":
            aValue = a.serialNumber || "";
            bValue = b.serialNumber || "";
            break;
          case "date":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case "status":
            aValue = a.status || 0;
            bValue = b.status || 0;
            break;
          case "designer":
            aValue = getDesignerName(a).toLowerCase();
            bValue = getDesignerName(b).toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <UnfoldMore sx={{ fontSize: 16, opacity: 0.5 }} />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpward sx={{ fontSize: 16 }} />
    ) : (
      <ArrowDownward sx={{ fontSize: 16 }} />
    );
  };

  // Handle status change
  const handleStatusChange = async (newStatus, design = null, notes = "") => {
    const targetDesign = design || selectedDesignForStatus;
    if (!targetDesign) return;

    setUpdatingDesignStatus(true);
    try {
      await mainDesignerService.updateDesignStatus(
        targetDesign.id,
        newStatus,
        notes || statusNotes
      );
      
      setAllDesigns((prevDesigns) =>
        prevDesigns.map((d) =>
          d.id === targetDesign.id
            ? { ...d, status: newStatus }
            : d
        )
      );
      
      const statusMap = { 0: 1, 1: 2, 2: 3, 3: 4 };
      const currentStatus = statusMap[statusTab];
      setDesigns((prevDesigns) => {
        const updated = prevDesigns.map((d) =>
          d.id === targetDesign.id
            ? { ...d, status: newStatus }
            : d
        );
        return updated.filter(d => d.status === currentStatus);
      });

      setStatusDialogOpen(false);
      setSelectedDesignForStatus(null);
      setStatusNotes("");
      setStatusMenuAnchor(null);
      setSelectedDesignForMenu(null);
      
      const oldStatus = targetDesign.status;
      if (oldStatus && oldStatus !== newStatus) {
        setStatusCounts(prev => ({
          ...prev,
          [oldStatus]: Math.max(0, (prev[oldStatus] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1
        }));
      }
      
      if (!dateFilter && designerFilter === "all" && !searchTerm) {
        loadStatusCounts();
      }
      
      if (onShowNotification) {
        const statusMessages = {
          1: "تم تحديث الحالة إلى في الانتظار بنجاح",
          2: "تم اعتماد التصميم بنجاح",
          3: "تم رفض اعتماد التصميم بنجاح",
          4: "تم إرجاع التصميم بنجاح"
        };
        onShowNotification("success", statusMessages[newStatus] || "تم تحديث حالة التصميم بنجاح");
      }
    } catch (error) {
      console.error("Error updating design status:", error);
      if (onShowNotification) {
        onShowNotification("error", "حدث خطأ أثناء تحديث حالة التصميم");
      }
    } finally {
      setUpdatingDesignStatus(false);
    }
  };

  // Handle delete design
  const handleDeleteDesign = async (design) => {
    if (!design) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "تأكيد الحذف",
      text: `هل أنت متأكد من حذف التصميم برقم: ${design.serialNumber || design.id}؟`,
      showCancelButton: true,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#d32f2f",
      cancelButtonColor: calmPalette.primary,
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setLoadingDesigns(true);
      await mainDesignerService.deleteDesign(design.id);
      
      setAllDesigns((prevDesigns) => prevDesigns.filter((d) => d.id !== design.id));
      setDesigns((prevDesigns) => prevDesigns.filter((d) => d.id !== design.id));

      Swal.fire({
        icon: "success",
        title: "تم الحذف بنجاح",
        text: "تم حذف التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
    } catch (error) {
      console.error("Error deleting design:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ في الحذف",
        text: error.response?.data?.message || "حدث خطأ أثناء حذف التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Handle status menu click
  const handleStatusMenuClick = (event, design) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedDesignForMenu(design);
  };

  // Handle status menu close
  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setSelectedDesignForMenu(null);
  };

  // Handle status select
  const handleStatusSelect = (newStatus) => {
    if (!selectedDesignForMenu) return;
    
    if (selectedDesignForMenu.status === newStatus) {
      handleStatusMenuClose();
      return;
    }

    if (newStatus === 2 || newStatus === 3 || newStatus === 4) {
      setSelectedDesignForStatus({ ...selectedDesignForMenu, actionType: newStatus === 2 ? "approve" : newStatus === 3 ? "reject" : "return" });
      setStatusNotes("");
      setStatusDialogOpen(true);
      handleStatusMenuClose();
    } else {
      handleStatusChange(newStatus, selectedDesignForMenu, "");
      handleStatusMenuClose();
    }
  };

  // Load status counts when component mounts or filters change
  useEffect(() => {
    if (!dateFilter && designerFilter === "all" && !searchTerm) {
      loadStatusCounts();
    }
  }, [dateFilter, designerFilter, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setDesignsPage(0);
  }, [statusTab, dateFilter, designerFilter, searchTerm]);

  // Load designs when filters change
  useEffect(() => {
    loadDesigns(designsPage, designsPageSize);
  }, [designsPage, designsPageSize, statusTab, dateFilter, designerFilter, searchTerm]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          التصاميم الواردة من المصممين ({getFilteredAndSortedDesigns().length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => loadDesigns(designsPage, designsPageSize)}
          disabled={loadingDesigns}
          size="small"
        >
          تحديث
        </Button>
      </Box>

      {/* Status Tabs */}
      <Box
        sx={{
          mb: 3,
          backgroundColor: "#ffffff",
          borderRadius: 2,
          border: "1px solid rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <Tabs
          value={statusTab}
          onChange={(e, newValue) => setStatusTab(newValue)}
          variant="fullWidth"
          sx={{
            minHeight: 64,
            backgroundColor: "#f5f5f5",
            "& .MuiTabs-flexContainer": {
              gap: 0.75,
              px: 0.75,
              py: 0.75,
            },
            "& .MuiTab-root": {
              minHeight: 56,
              textTransform: "none",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: calmPalette.textSecondary,
              px: 2,
              py: 1.25,
              borderRadius: 1.5,
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              "&:hover:not(.Mui-selected)": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                transform: "translateY(-1px)",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              },
            },
            "& .MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          <Tab
            sx={{
              backgroundColor: statusTab === 0 ? "transparent" : "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)",
                boxShadow: "0 4px 12px rgba(245, 124, 0, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #ef6c00 0%, #e65100 100%)",
                },
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, flexDirection: "row" }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.875rem" }}>
                  في الانتظار
                </Typography>
                <Chip
                  label={statusCounts[1]}
                  size="small"
                  sx={{
                    height: 24,
                    minWidth: 28,
                    fontSize: "0.75rem",
                    backgroundColor: statusTab === 0 ? "rgba(255, 255, 255, 0.3)" : "rgba(245, 124, 0, 0.15)",
                    color: statusTab === 0 ? "#ffffff" : "#f57c00",
                    fontWeight: 700,
                    borderRadius: "12px",
                    transition: "all 0.25s ease",
                    border: statusTab !== 0 ? "1px solid rgba(245, 124, 0, 0.3)" : "none",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 1 ? "transparent" : "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #4caf50 0%, #43a047 100%)",
                boxShadow: "0 4px 12px rgba(76, 175, 80, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #43a047 0%, #388e3c 100%)",
                },
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, flexDirection: "row" }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.875rem" }}>
                  معتمد
                </Typography>
                <Chip
                  label={statusCounts[2]}
                  size="small"
                  sx={{
                    height: 24,
                    minWidth: 28,
                    fontSize: "0.75rem",
                    backgroundColor: statusTab === 1 ? "rgba(255, 255, 255, 0.3)" : "rgba(76, 175, 80, 0.15)",
                    color: statusTab === 1 ? "#ffffff" : "#4caf50",
                    fontWeight: 700,
                    borderRadius: "12px",
                    transition: "all 0.25s ease",
                    border: statusTab !== 1 ? "1px solid rgba(76, 175, 80, 0.3)" : "none",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 2 ? "transparent" : "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #f44336 0%, #e53935 100%)",
                boxShadow: "0 4px 12px rgba(244, 67, 54, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #e53935 0%, #d32f2f 100%)",
                },
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, flexDirection: "row" }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.875rem" }}>
                  غير معتمد
                </Typography>
                <Chip
                  label={statusCounts[3]}
                  size="small"
                  sx={{
                    height: 24,
                    minWidth: 28,
                    fontSize: "0.75rem",
                    backgroundColor: statusTab === 2 ? "rgba(255, 255, 255, 0.3)" : "rgba(244, 67, 54, 0.15)",
                    color: statusTab === 2 ? "#ffffff" : "#f44336",
                    fontWeight: 700,
                    borderRadius: "12px",
                    transition: "all 0.25s ease",
                    border: statusTab !== 2 ? "1px solid rgba(244, 67, 54, 0.3)" : "none",
                  }}
                />
              </Box>
            }
          />
          <Tab
            sx={{
              backgroundColor: statusTab === 3 ? "transparent" : "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #2196f3 0%, #1e88e5 100%)",
                boxShadow: "0 4px 12px rgba(33, 150, 243, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #1e88e5 0%, #1976d2 100%)",
                },
              },
            }}
            label={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, flexDirection: "row" }}>
                <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "0.875rem" }}>
                  مرتجع
                </Typography>
                <Chip
                  label={statusCounts[4]}
                  size="small"
                  sx={{
                    height: 24,
                    minWidth: 28,
                    fontSize: "0.75rem",
                    backgroundColor: statusTab === 3 ? "rgba(255, 255, 255, 0.3)" : "rgba(33, 150, 243, 0.15)",
                    color: statusTab === 3 ? "#ffffff" : "#2196f3",
                    fontWeight: 700,
                    borderRadius: "12px",
                    transition: "all 0.25s ease",
                    border: statusTab !== 3 ? "1px solid rgba(33, 150, 243, 0.3)" : "none",
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Search Field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث في التصاميم باستخدام الرقم التسلسلي.."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: 1,
                  color: searchTerm ? calmPalette.primary : 'text.secondary',
                  transition: 'color 0.3s ease',
                }}
              >
                <Search />
              </Box>
            ),
            endAdornment: searchTerm && (
              <IconButton
                size="small"
                onClick={() => setSearchTerm("")}
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

      {/* Date and Designer Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList sx={{ color: calmPalette.textSecondary }} />
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontWeight: 600 }}>
            فلترة إضافية:
          </Typography>
        </Box>
        <TextField
          type="date"
          label="التاريخ"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          size="small"
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            minWidth: 180,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
        />
        <TextField
          select
          label="اسم المصمم"
          value={designerFilter}
          onChange={(e) => setDesignerFilter(e.target.value)}
          size="small"
          sx={{
            minWidth: 180,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
        >
          <MenuItem value="all">الكل</MenuItem>
          {Object.entries(usersMap)
            .filter(([id, name]) => name && name.trim() !== "")
            .map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
        </TextField>
        {(dateFilter || designerFilter !== "all" || searchTerm) && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setDateFilter("");
              setDesignerFilter("all");
              setSearchTerm("");
            }}
            sx={{ color: calmPalette.textSecondary }}
          >
            إلغاء الفلترة
          </Button>
        )}
      </Box>

      {/* Designs Table */}
      {loadingDesigns && designs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : designs.length === 0 ? (
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
            لم يتم إرسال أي تصاميم بعد
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
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>الصورة</TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: "0.95rem", 
                    py: 2,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: `${calmPalette.primary}15` },
                  }}
                  onClick={() => handleSort("serialNumber")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    الرقم التسلسلي
                    {getSortIcon("serialNumber")}
                  </Box>
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: "0.95rem", 
                    py: 2,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: `${calmPalette.primary}15` },
                  }}
                  onClick={() => handleSort("designer")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    اسم المصمم
                    {getSortIcon("designer")}
                  </Box>
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: "0.95rem", 
                    py: 2,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: `${calmPalette.primary}15` },
                  }}
                  onClick={() => handleSort("date")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    تاريخ التصميم
                    {getSortIcon("date")}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }}>الملفات</TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: "0.95rem", 
                    py: 2,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: `${calmPalette.primary}15` },
                  }}
                  onClick={() => handleSort("status")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    الحالة
                    {getSortIcon("status")}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.95rem", py: 2 }} align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAndSortedDesigns().map((design, index) => (
                <TableRow
                  key={design.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "rgba(255, 255, 255, 0.5)" : "rgba(250, 248, 245, 0.3)",
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
                    {design.designImageUrl ? (
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          borderRadius: 2,
                          overflow: "hidden",
                          border: `2px solid ${calmPalette.primary}20`,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(94, 78, 62, 0.15)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "scale(1.08)",
                            boxShadow: "0 4px 12px rgba(94, 78, 62, 0.25)",
                            borderColor: calmPalette.primary + "40",
                          },
                        }}
                        onClick={() => {
                          if (setSelectedImage && setImageDialogOpen) {
                            setSelectedImage(design.designImageUrl);
                            setImageDialogOpen(true);
                          }
                        }}
                      >
                        <img
                          src={design.designImageUrl}
                          alt={design.designName}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          borderRadius: 2,
                          border: `2px dashed ${calmPalette.primary}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: `${calmPalette.primary}08`,
                        }}
                      >
                        <ImageIcon sx={{ color: calmPalette.textSecondary, fontSize: 28, opacity: 0.5 }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                      {design.serialNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: calmPalette.textPrimary, fontWeight: 500 }}>
                      {getDesignerName(design)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                      {design.createdAt
                        ? new Date(design.createdAt).toLocaleDateString("ar-SA")
                        : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {design.designFileUrls && design.designFileUrls.length > 0 ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          icon={<AttachFile sx={{ fontSize: 16 }} />}
                          label={`${design.designFileUrls.length} ملف`}
                          size="small"
                          sx={{
                            backgroundColor: `${calmPalette.primary}15`,
                            color: calmPalette.primary,
                            fontWeight: 600,
                            border: `1px solid ${calmPalette.primary}30`,
                            "& .MuiChip-icon": {
                              color: calmPalette.primary,
                            },
                          }}
                        />
                        <Tooltip title="تحميل جميع الملفات" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadAllFiles(design)}
                            sx={{
                              color: calmPalette.primary,
                              backgroundColor: `${calmPalette.primary}10`,
                              border: `1px solid ${calmPalette.primary}30`,
                              width: 32,
                              height: 32,
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              "&:hover": {
                                backgroundColor: `${calmPalette.primary}20`,
                                transform: "scale(1.1) translateY(-2px)",
                                boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                              },
                              "&:active": {
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            <Download sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontStyle: "italic" }}>
                        لا توجد ملفات
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Chip
                        label={
                          design.status === 1
                            ? "في الانتظار"
                            : design.status === 2
                            ? "معتمد"
                            : design.status === 3
                            ? "غير معتمد"
                            : design.status === 4
                            ? "مرتجع"
                            : design.statusName || "في الانتظار"
                        }
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          ...(design.status === 2
                            ? {
                                backgroundColor: "#e8f5e9",
                                color: "#2e7d32",
                                border: "1px solid #4caf50",
                              }
                            : design.status === 3
                            ? {
                                backgroundColor: "#ffebee",
                                color: "#d32f2f",
                                border: "1px solid #f44336",
                              }
                            : design.status === 4
                            ? {
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                border: "1px solid #2196f3",
                              }
                            : {
                                backgroundColor: "#fff3e0",
                                color: "#f57c00",
                                border: "1px solid #ff9800",
                              }),
                        }}
                      />
                      <Tooltip title="تغيير الحالة" arrow placement="top">
                        <IconButton
                          size="small"
                          onClick={(e) => handleStatusMenuClick(e, design)}
                          sx={{
                            color: calmPalette.textSecondary,
                            padding: 0.5,
                            "&:hover": {
                              backgroundColor: "rgba(94, 78, 62, 0.08)",
                              color: calmPalette.primary,
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                      <Tooltip title="عرض التصميم" arrow>
                        <IconButton
                          size="medium"
                          onClick={async () => {
                            try {
                              const fullDesign = await mainDesignerService.getDesignById(design.id);
                              setViewingDesign(fullDesign);
                              
                              if (fullDesign.designImageKey || fullDesign.designImageUrl) {
                                try {
                                  const fileKey = fullDesign.designImageKey || extractFileKeyFromUrl(fullDesign.designImageUrl);
                                  if (fileKey && typeof fileKey === 'string' && !fileKey.startsWith('http')) {
                                    const downloadData = await mainDesignerService.generateDownloadUrl(fileKey);
                                    if (downloadData.downloadUrl) {
                                      setImageUrl(downloadData.downloadUrl);
                                    } else {
                                      setImageUrl(fullDesign.designImageUrl);
                                    }
                                  } else {
                                    setImageUrl(fullDesign.designImageUrl);
                                  }
                                } catch (error) {
                                  console.error("Error generating image URL:", error);
                                  setImageUrl(fullDesign.designImageUrl);
                                }
                              } else {
                                setImageUrl(null);
                              }
                            } catch (error) {
                              console.error("Error loading design:", error);
                            }
                          }}
                          sx={{ 
                            color: calmPalette.primary,
                            backgroundColor: `${calmPalette.primary}10`,
                            border: `1px solid ${calmPalette.primary}30`,
                            width: 40,
                            height: 40,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: `${calmPalette.primary}20`,
                              transform: "scale(1.1) translateY(-2px)",
                              boxShadow: `0 4px 12px ${calmPalette.primary}30`,
                            },
                            "&:active": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={design.notes && design.notes.trim() ? "عرض الملاحظات" : "لا توجد ملاحظات"} arrow>
                        <IconButton
                          size="medium"
                          disabled={!design.notes || !design.notes.trim()}
                          onClick={() => {
                            if (design.notes && design.notes.trim()) {
                              setSelectedDesignForNotes(design);
                              setDesignNotesDialogOpen(true);
                            }
                          }}
                          sx={{ 
                            color: design.notes && design.notes.trim() ? "#8b4513" : "#9e9e9e",
                            backgroundColor: design.notes && design.notes.trim() ? "rgba(139, 69, 19, 0.15)" : "transparent",
                            border: design.notes && design.notes.trim() ? "1px solid rgba(139, 69, 19, 0.3)" : "1px solid transparent",
                            width: 40,
                            height: 40,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: design.notes && design.notes.trim() ? "rgba(139, 69, 19, 0.25)" : "rgba(0, 0, 0, 0.04)",
                              transform: design.notes && design.notes.trim() ? "scale(1.1) translateY(-2px)" : "none",
                              boxShadow: design.notes && design.notes.trim() ? "0 4px 12px rgba(139, 69, 19, 0.3)" : "none",
                            },
                            "&:active": {
                              transform: design.notes && design.notes.trim() ? "scale(1.05)" : "none",
                            },
                            "&.Mui-disabled": {
                              backgroundColor: "transparent",
                              color: "#9e9e9e",
                              border: "1px solid transparent",
                              cursor: "default",
                            },
                          }}
                        >
                          <Note fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircle />}
                        disabled={design.status !== 1}
                        onClick={() => {
                          if (design.status === 1) {
                            setSelectedDesignForStatus({ ...design, actionType: "approve" });
                            setStatusNotes("");
                            setStatusDialogOpen(true);
                          }
                        }}
                        sx={{
                          minWidth: 100,
                          height: 38,
                          background: design.status === 1 
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                            : "#e5e7eb",
                          color: design.status === 1 ? "#ffffff" : "#9ca3af",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          borderRadius: "8px",
                          textTransform: "none",
                          boxShadow: design.status === 1 
                            ? "0 4px 14px 0 rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" 
                            : "none",
                          border: design.status === 1 ? "none" : "1px solid #d1d5db",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            background: design.status === 1 
                              ? "linear-gradient(135deg, #059669 0%, #047857 100%)" 
                              : "#e5e7eb",
                            boxShadow: design.status === 1 
                              ? "0 6px 20px 0 rgba(16, 185, 129, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15)" 
                              : "none",
                            transform: design.status === 1 ? "translateY(-2px) scale(1.02)" : "none",
                          },
                          "&:active": {
                            transform: design.status === 1 ? "translateY(0) scale(0.98)" : "none",
                            boxShadow: design.status === 1 
                              ? "0 2px 8px 0 rgba(16, 185, 129, 0.3)" 
                              : "none",
                          },
                          "&.Mui-disabled": {
                            background: "#e5e7eb",
                            color: "#9ca3af",
                            border: "1px solid #d1d5db",
                            cursor: "not-allowed",
                          },
                          "& .MuiButton-startIcon": {
                            marginRight: 0.5,
                            "& svg": {
                              fontSize: 20,
                            },
                          },
                        }}
                      >
                        معتمد 
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Cancel />}
                        disabled={design.status !== 1}
                        onClick={() => {
                          if (design.status === 1) {
                            setSelectedDesignForStatus({ ...design, actionType: "reject" });
                            setStatusNotes("");
                            setStatusDialogOpen(true);
                          }
                        }}
                        sx={{
                          minWidth: 100,
                          height: 38,
                          background: design.status === 1 
                            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" 
                            : "#e5e7eb",
                          color: design.status === 1 ? "#ffffff" : "#9ca3af",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          borderRadius: "8px",
                          textTransform: "none",
                          boxShadow: design.status === 1 
                            ? "0 4px 14px 0 rgba(239, 68, 68, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" 
                            : "none",
                          border: design.status === 1 ? "none" : "1px solid #d1d5db",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            background: design.status === 1 
                              ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" 
                              : "#e5e7eb",
                            boxShadow: design.status === 1 
                              ? "0 6px 20px 0 rgba(239, 68, 68, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15)" 
                              : "none",
                            transform: design.status === 1 ? "translateY(-2px) scale(1.02)" : "none",
                          },
                          "&:active": {
                            transform: design.status === 1 ? "translateY(0) scale(0.98)" : "none",
                            boxShadow: design.status === 1 
                              ? "0 2px 8px 0 rgba(239, 68, 68, 0.3)" 
                              : "none",
                          },
                          "&.Mui-disabled": {
                            background: "#e5e7eb",
                            color: "#9ca3af",
                            border: "1px solid #d1d5db",
                            cursor: "not-allowed",
                          },
                          "& .MuiButton-startIcon": {
                            marginRight: 0.5,
                            "& svg": {
                              fontSize: 20,
                            },
                          },
                        }}
                      >
                         غير معتمد
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Undo />}
                        disabled={design.status !== 1}
                        onClick={() => {
                          if (design.status === 1) {
                            setSelectedDesignForStatus({ ...design, actionType: "return" });
                            setStatusNotes("");
                            setStatusDialogOpen(true);
                          }
                        }}
                        sx={{
                          minWidth: 100,
                          height: 38,
                          background: design.status === 1 
                            ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
                            : "#e5e7eb",
                          color: design.status === 1 ? "#ffffff" : "#9ca3af",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          borderRadius: "8px",
                          textTransform: "none",
                          boxShadow: design.status === 1 
                            ? "0 4px 14px 0 rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)" 
                            : "none",
                          border: design.status === 1 ? "none" : "1px solid #d1d5db",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            background: design.status === 1 
                              ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" 
                              : "#e5e7eb",
                            boxShadow: design.status === 1 
                              ? "0 6px 20px 0 rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15)" 
                              : "none",
                            transform: design.status === 1 ? "translateY(-2px) scale(1.02)" : "none",
                          },
                          "&:active": {
                            transform: design.status === 1 ? "translateY(0) scale(0.98)" : "none",
                            boxShadow: design.status === 1 
                              ? "0 2px 8px 0 rgba(59, 130, 246, 0.3)" 
                              : "none",
                          },
                          "&.Mui-disabled": {
                            background: "#e5e7eb",
                            color: "#9ca3af",
                            border: "1px solid #d1d5db",
                            cursor: "not-allowed",
                          },
                          "& .MuiButton-startIcon": {
                            marginRight: 0.5,
                            "& svg": {
                              fontSize: 20,
                            },
                          },
                        }}
                      >
                        مرتجع
                      </Button>
                      <Tooltip title="حذف التصميم" arrow>
                        <IconButton
                          size="medium"
                          onClick={() => handleDeleteDesign(design)}
                          disabled={loadingDesigns}
                          sx={{ 
                            color: "#d32f2f",
                            backgroundColor: "rgba(211, 47, 47, 0.1)",
                            border: "1px solid rgba(211, 47, 47, 0.3)",
                            width: 40,
                            height: 40,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: "rgba(211, 47, 47, 0.2)",
                              transform: "scale(1.1) translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(211, 47, 47, 0.3)",
                            },
                            "&:active": {
                              transform: "scale(1.05)",
                            },
                            "&.Mui-disabled": {
                              backgroundColor: "rgba(0, 0, 0, 0.05)",
                              color: "#9e9e9e",
                              border: "1px solid transparent",
                              cursor: "default",
                            },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Pagination */}
      <TablePagination
        component="div"
        count={designsTotalCount}
        page={designsPage}
        onPageChange={(event, newPage) => {
          setDesignsPage(newPage);
        }}
        rowsPerPage={designsPageSize}
        onRowsPerPageChange={(event) => {
          const newPageSize = parseInt(event.target.value, 10);
          setDesignsPageSize(newPageSize);
          setDesignsPage(0);
        }}
        labelRowsPerPage="عدد الصفوف في الصفحة:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
        }
        rowsPerPageOptions={[10, 20, 50, 100]}
      />

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => {
          if (!updatingDesignStatus) {
            setStatusDialogOpen(false);
            setSelectedDesignForStatus(null);
            setStatusNotes("");
          }
        }}
        maxWidth="sm"
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
            backgroundColor: calmPalette.primary + "10",
            borderBottom: `1px solid ${calmPalette.primary}20`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            py: 2,
          }}
        >
          {selectedDesignForStatus?.actionType === "approve" ? (
            <CheckCircle sx={{ color: "#2e7d32", fontSize: 28 }} />
          ) : selectedDesignForStatus?.actionType === "return" ? (
            <Undo sx={{ color: "#1976d2", fontSize: 28 }} />
          ) : (
            <Cancel sx={{ color: "#d32f2f", fontSize: 28 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
            {selectedDesignForStatus?.actionType === "approve"
              ? "اعتماد التصميم"
              : selectedDesignForStatus?.actionType === "return"
              ? "إرجاع التصميم"
              : "رفض اعتماد التصميم"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDesignForStatus && (
            <Box>
              <Box sx={{ mb: 2, p: 2, backgroundColor: calmPalette.primary + "05", borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 0.5 }}>
                  الرقم التسلسلي:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                  {selectedDesignForStatus.serialNumber}
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="ملاحظات (اختياري)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#ffffff",
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${calmPalette.primary}10` }}>
          <Button
            onClick={() => {
              setStatusDialogOpen(false);
              setSelectedDesignForStatus(null);
              setStatusNotes("");
            }}
            disabled={updatingDesignStatus}
            sx={{
              color: calmPalette.textSecondary,
              "&:hover": {
                backgroundColor: "rgba(94, 78, 62, 0.08)",
              },
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={() => {
              let newStatus;
              if (selectedDesignForStatus?.actionType === "approve") {
                newStatus = 2;
              } else if (selectedDesignForStatus?.actionType === "return") {
                newStatus = 4;
              } else {
                newStatus = 3;
              }
              handleStatusChange(newStatus);
            }}
            disabled={updatingDesignStatus}
            variant="contained"
            startIcon={
              updatingDesignStatus ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : selectedDesignForStatus?.actionType === "approve" ? (
                <CheckCircle />
              ) : selectedDesignForStatus?.actionType === "return" ? (
                <Undo />
              ) : (
                <Cancel />
              )
            }
            sx={{
              backgroundColor:
                selectedDesignForStatus?.actionType === "approve" 
                  ? "#2e7d32" 
                  : selectedDesignForStatus?.actionType === "return"
                  ? "#1976d2"
                  : "#d32f2f",
              "&:hover": {
                backgroundColor:
                  selectedDesignForStatus?.actionType === "approve" 
                    ? "#1b5e20" 
                    : selectedDesignForStatus?.actionType === "return"
                    ? "#1565c0"
                    : "#b71c1c",
              },
            }}
          >
            {updatingDesignStatus
              ? "جاري المعالجة..."
              : selectedDesignForStatus?.actionType === "approve"
              ? "اعتماد"
              : selectedDesignForStatus?.actionType === "return"
              ? "إرجاع"
              : "غير معتمد"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            borderRadius: 2,
            border: "1px solid rgba(94, 78, 62, 0.1)",
          },
        }}
      >
        <MenuItem
          onClick={() => handleStatusSelect(1)}
          selected={selectedDesignForMenu?.status === 1}
          sx={{
            py: 1.5,
            "&.Mui-selected": {
              backgroundColor: "rgba(255, 152, 0, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(255, 152, 0, 0.15)",
              },
            },
          }}
        >
          <ListItemIcon>
            <Chip
              label="في الانتظار"
              size="small"
              sx={{
                backgroundColor: "#fff3e0",
                color: "#f57c00",
                border: "1px solid #ff9800",
                fontWeight: 600,
                fontSize: "0.75rem",
                height: 24,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="في الانتظار" />
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusSelect(2)}
          selected={selectedDesignForMenu?.status === 2}
          sx={{
            py: 1.5,
            "&.Mui-selected": {
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(76, 175, 80, 0.15)",
              },
            },
          }}
        >
          <ListItemIcon>
            <Chip
              label="معتمد"
              size="small"
              sx={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                border: "1px solid #4caf50",
                fontWeight: 600,
                fontSize: "0.75rem",
                height: 24,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="معتمد" />
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusSelect(3)}
          selected={selectedDesignForMenu?.status === 3}
          sx={{
            py: 1.5,
            "&.Mui-selected": {
              backgroundColor: "rgba(244, 67, 54, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(244, 67, 54, 0.15)",
              },
            },
          }}
        >
          <ListItemIcon>
            <Chip
              label="غير معتمد"
              size="small"
              sx={{
                backgroundColor: "#ffebee",
                color: "#d32f2f",
                border: "1px solid #f44336",
                fontWeight: 600,
                fontSize: "0.75rem",
                height: 24,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="غير معتمد" />
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusSelect(4)}
          selected={selectedDesignForMenu?.status === 4}
          sx={{
            py: 1.5,
            "&.Mui-selected": {
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(33, 150, 243, 0.15)",
              },
            },
          }}
        >
          <ListItemIcon>
            <Chip
              label="مرتجع"
              size="small"
              sx={{
                backgroundColor: "#e3f2fd",
                color: "#1976d2",
                border: "1px solid #2196f3",
                fontWeight: 600,
                fontSize: "0.75rem",
                height: 24,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="مرتجع" />
        </MenuItem>
      </Menu>

      {/* Design Notes Dialog */}
      <Dialog
        open={designNotesDialogOpen}
        onClose={() => {
          setDesignNotesDialogOpen(false);
          setSelectedDesignForNotes(null);
        }}
        maxWidth="sm"
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
            backgroundColor: calmPalette.primary + "10",
            borderBottom: `1px solid ${calmPalette.primary}20`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            py: 2,
          }}
        >
          <Note sx={{ color: calmPalette.primary, fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
            ملاحظات التصميم
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDesignForNotes && (
            <Box>
              <Box sx={{ mb: 2, p: 2, backgroundColor: calmPalette.primary + "05", borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 0.5 }}>
                  الرقم التسلسلي:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                  {selectedDesignForNotes.serialNumber}
                </Typography>
                {selectedDesignForNotes.statusName && (
                  <>
                    <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 0.5, mt: 1 }}>
                      الحالة:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                      {selectedDesignForNotes.statusName}
                    </Typography>
                  </>
                )}
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 1, fontWeight: 600 }}>
                  الملاحظات:
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: "#ffffff",
                    border: `1px solid ${calmPalette.primary}20`,
                    borderRadius: 2,
                    minHeight: 100,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: calmPalette.textPrimary,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.8,
                    }}
                  >
                    {selectedDesignForNotes.notes}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${calmPalette.primary}10` }}>
          <Button
            onClick={() => {
              setDesignNotesDialogOpen(false);
              setSelectedDesignForNotes(null);
            }}
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

      {/* View Design Dialog */}
      <Dialog
        open={Boolean(viewingDesign)}
        onClose={() => {
          setViewingDesign(null);
          setImageUrl(null);
        }}
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
                fontWeight: 700,
                pb: 1.5,
                pt: 2,
                px: 2.5,
                background: "#ffffff",
                borderBottom: `1px solid ${calmPalette.primary}20`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {viewingDesign.serialNumber || viewingDesign.designName || "عرض التصميم"}
              </Typography>
              <IconButton
                onClick={() => {
                  setViewingDesign(null);
                  setImageUrl(null);
                }}
                size="small"
                sx={{
                  color: calmPalette.textSecondary,
                }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, px: 2.5, pb: 2, backgroundColor: "#ffffff" }}>
              {imageUrl && (
                <Box sx={{ textAlign: "center", mb: 2 }}>
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
              )}
              {viewingDesign.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    الملاحظات:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewingDesign.notes}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ 
              px: 3, 
              py: 2, 
              borderTop: `1px solid ${calmPalette.primary}20`, 
              backgroundColor: "#ffffff",
            }}>
              <Button 
                onClick={() => {
                  setViewingDesign(null);
                  setImageUrl(null);
                }}
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
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DesignsFromDesignersTab;

