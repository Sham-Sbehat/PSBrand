import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Grid,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Popover,
  Snackbar,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Close,
  Note,
  Schedule,
  Print,
  ArrowBack,
  ArrowForward,
  Visibility,
  History,
  AccessTime,
  Message as MessageIcon,
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
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, colorsService, sizesService, fabricTypesService, messagesService, mainDesignerService, employeesService } from "../services/api";
import { Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { subscribeToOrderUpdates, subscribeToMessages, subscribeToDesigns } from "../services/realtime";
import MessagesTab from "../components/common/MessagesTab";
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, USER_ROLES, SIZE_LABELS, FABRIC_TYPE_LABELS, COLOR_LABELS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import OrderDetailsDialog from "../components/common/OrderDetailsDialog";
import EmployeeAttendanceCalendar from "../components/admin/EmployeeAttendanceCalendar";
import WelcomePage from "../components/common/WelcomePage";
import calmPalette from "../theme/calmPalette";
import Swal from "sweetalert2";
import { useCitiesAndAreas } from "../hooks/useCitiesAndAreas";
import DashboardLayout from "../components/common/DashboardLayout";
import { getFullUrl } from "../utils";
import OrdersTab from "../components/designManager/OrdersTab";
import DesignsFromDesignersTab from "../components/designManager/DesignsFromDesignersTab";
import DesignRequestsTab from "../components/designManager/DesignRequestsTab";
import ImagePreviewDialog from "../components/common/ImagePreviewDialog";

const DesignManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [newMessageReceived, setNewMessageReceived] = useState(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMessageNotification, setShowMessageNotification] = useState(false);
  const [newMessageData, setNewMessageData] = useState(null);
  const [publicMessages, setPublicMessages] = useState([]); // Messages sent to all users (userId === null)
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]); // IDs of messages hidden by user
  const [pendingPrintingOrders, setPendingPrintingOrders] = useState([]); // Tab 1: Status 1 (PENDING_PRINTING)
  const [inPrintingOrders, setInPrintingOrders] = useState([]); // Tab 2: Status 2 (IN_PRINTING)
  const [designs, setDesigns] = useState([]); // Tab 4: Designs from Main Designers
  const [allDesigns, setAllDesigns] = useState([]); // Keep all designs for count display
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  // Pagination state for designs
  const [designsPage, setDesignsPage] = useState(0);
  const [designsPageSize, setDesignsPageSize] = useState(5);
  const [designsTotalCount, setDesignsTotalCount] = useState(0);
  const [designsTotalPages, setDesignsTotalPages] = useState(0);
  // Real-time: يحدّث قائمة طلبات التصميم عند أي تغيير من SignalR
  const [designRequestsRefreshKey, setDesignRequestsRefreshKey] = useState(0);
  const currentTabRef = useRef(currentTab);
  const unsubscribeOrdersRef = useRef(null);
  const unsubscribeDesignsRef = useRef(null);
  const effectCancelledRef = useRef(false);
  currentTabRef.current = currentTab;
  // Total counts for each status (for tab badges)
  const [statusCounts, setStatusCounts] = useState({
    1: 0, // في الانتظار
    2: 0, // معتمد
    3: 0, //  معتمد
    4: 0  // مرتجع
  });
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDesignForStatus, setSelectedDesignForStatus] = useState(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingDesignStatus, setUpdatingDesignStatus] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedDesignForMenu, setSelectedDesignForMenu] = useState(null);
  const [designNotesDialogOpen, setDesignNotesDialogOpen] = useState(false);
  const [selectedDesignForNotes, setSelectedDesignForNotes] = useState(null);
  // Filtering and sorting states
  const [statusTab, setStatusTab] = useState(0); // 0 = waiting (1), 1 = accepted (2), 2 = rejected (3), 3 = returned (4)
  const [dateFilter, setDateFilter] = useState(""); // Date string or empty
  const [designerFilter, setDesignerFilter] = useState("all"); // "all" or designerId
  const [searchTerm, setSearchTerm] = useState(""); // Search term for filtering designs
  const [sortField, setSortField] = useState(null); // null, "serialNumber", "date", "status", "designer"
  const [sortDirection, setSortDirection] = useState("asc"); // "asc", "desc"
  // Users mapping for designer names
  const [usersMap, setUsersMap] = useState({}); // { userId: userName }
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Can be string or array
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedImageForView, setSelectedImageForView] = useState(null);
  const [imageViewDialogOpen, setImageViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryInPrinting, setSearchQueryInPrinting] = useState('');
  const { cities, areas } = useCitiesAndAreas();
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const activeImageLoads = useRef(new Set()); // Track active image loads to prevent duplicates
  const MAX_CONCURRENT_LOADS = 3; // Maximum concurrent image loads
  const [page, setPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Number of rows per page
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loadingFabricTypes, setLoadingFabricTypes] = useState(false);

  // Fetch pending printing orders (Status 1: PENDING_PRINTING) - Tab 0
  const fetchPendingPrintingOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const orders = await ordersService.getOrdersByStatus(ORDER_STATUS.PENDING_PRINTING);
      setPendingPrintingOrders(orders || []);
    } catch (error) {
      setPendingPrintingOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch in printing orders (Status 2: IN_PRINTING) - Tab 1
  const fetchInPrintingOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const orders = await ordersService.getOrdersByStatus(ORDER_STATUS.IN_PRINTING);
      setInPrintingOrders(orders || []);
    } catch (error) {
      setInPrintingOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Load users for mapping IDs to names (only Main Designers)
  const loadUsers = async () => {
    try {
      // Load only Main Designers (role = 6)
      const users = await employeesService.getUsersByRole(USER_ROLES.MAIN_DESIGNER);
      const mapping = {};
      if (Array.isArray(users)) {
        users.forEach((user) => {
          // Double check: only include users with role = 6 (Main Designer)
          if (user.id && (user.role === USER_ROLES.MAIN_DESIGNER || user.role === 6)) {
            // Map both string and number IDs
            const id = user.id;
            mapping[id] = user.name || "";
            mapping[String(id)] = user.name || "";
            mapping[Number(id)] = user.name || "";
          }
        });
      }
      setUsersMap(mapping);
    } catch (error) {
      setUsersMap({});
    }
  };

  // Load total counts for each status (for tab badges)
  const loadStatusCounts = async () => {
    try {
      // Only load counts if no filters are applied (to show accurate totals)
      if (dateFilter || designerFilter !== "all" || searchTerm) {
        // If filters are applied, don't update counts (they would be filtered counts, not totals)
        return;
      }

      const statuses = [1, 2, 3, 4]; // في الانتظار، معتمد، غير معتمد، مرتجع
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

      // Fetch count for each status (only first page to get totalCount)
      await Promise.all(
        statuses.map(async (status) => {
          try {
            const params = {
              page: 1,
              pageSize: 1, // Only need totalCount, so 1 item is enough
              status: status
            };
            const response = await mainDesignerService.getDesigns(params);
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              counts[status] = response.totalCount || 0;
            }
          } catch (error) {
            counts[status] = 0;
          }
        })
      );

      setStatusCounts(counts);
    } catch (error) {
    }
  };

  // Load designs from Main Designers
  const loadDesigns = async (page = designsPage, pageSize = designsPageSize) => {
    setLoadingDesigns(true);
    try {
      // Load users first to ensure mapping is ready
      await loadUsers();
      
      // Map tab index to status: 0 = waiting (1), 1 = accepted (2), 2 = rejected (3), 3 = returned (4)
      const statusMap = {
        0: 1,    // في الانتظار
        1: 2,    // معتمد
        2: 3,    // غير معتمد
        3: 4     // مرتجع
      };
      
      const status = statusMap[statusTab];
      
      // Build params for API call
      const params = {
        page: page + 1, // API uses 1-based page numbers
        pageSize: pageSize,
        status: status
      };
      
      // Add date filter if set
      if (dateFilter) {
        params.date = dateFilter;
      }
      
      // Add designer filter if set
      if (designerFilter !== "all") {
        params.createdBy = designerFilter;
      }
      
      // Use SearchDesigns API if searchTerm is provided, otherwise use GetDesigns
      let response;
      if (searchTerm && searchTerm.trim()) {
        // Remove search from params as it will be passed as first argument
        const { search, ...restParams } = params;
        response = await mainDesignerService.searchDesigns(searchTerm.trim(), restParams);
      } else {
        response = await mainDesignerService.getDesigns(params);
      }
      
      // Handle paginated response
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        // Response has pagination structure
        // Check if data is in nested property or if response itself is the array with pagination props
        let designsArray = [];
        let totalCount = 0;
        let totalPages = 1;
        let responsePageSize = pageSize;
        
        // Try to find the designs array
        if (Array.isArray(response.data)) {
          designsArray = response.data;
        } else if (Array.isArray(response.designs)) {
          designsArray = response.designs;
        } else if (Array.isArray(response.items)) {
          designsArray = response.items;
        } else if (Array.isArray(response)) {
          // Response might be array with pagination props mixed in
          designsArray = response.filter(item => item && typeof item === 'object' && item.id);
        }
        
        // Get pagination info
        totalCount = response.totalCount || designsArray.length;
        totalPages = response.totalPages || Math.ceil(totalCount / pageSize) || 1;
        responsePageSize = response.pageSize || pageSize;
        
        setDesigns(designsArray);
        setDesignsTotalCount(totalCount);
        setDesignsTotalPages(totalPages);
        setDesignsPageSize(responsePageSize);
        setAllDesigns(designsArray); // For now, just use current page
        
        // Update status count for current status
        if (status && totalCount !== undefined) {
          setStatusCounts(prev => ({
            ...prev,
            [status]: totalCount
          }));
        }
      } else if (Array.isArray(response)) {
        // Fallback: if response is array (old format without pagination)
        setDesigns(response);
        setAllDesigns(response);
        setDesignsTotalCount(response.length);
        setDesignsTotalPages(1);
        setDesignsPageSize(pageSize);
      } else {
        // Empty or invalid response
        setDesigns([]);
        setAllDesigns([]);
        setDesignsTotalCount(0);
        setDesignsTotalPages(0);
        setDesignsPageSize(pageSize);
      }
    } catch (error) {
      setDesigns([]);
      setAllDesigns([]);
      setDesignsTotalCount(0);
      setDesignsTotalPages(0);
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Get designer name from ID
  const getDesignerName = (design) => {
    // Try multiple possible fields for designer ID
    const designerId = design.creatorId || design.createdBy || design.userId || design.mainDesignerId || 
                       design.creator?.id || design.mainDesigner?.id || design.creatorId || 
                       design.creator?.userId || design.mainDesigner?.userId;
    
    if (!designerId) {
      return "-";
    }
    
    // Try to find name in mapping with different ID formats
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

  // Handle file download - supports both fileItem (object/string) and (fileKey, fileName) formats
  const handleDownloadFile = async (fileItemOrKey, fileName) => {
    try {
      let fileKey;
      let downloadFileName;
      
      // If called with (fileKey, fileName) format
      if (fileName !== undefined) {
        fileKey = fileItemOrKey;
        downloadFileName = fileName;
      } else {
        // If called with fileItem (object or string) format
        const fileItem = fileItemOrKey;
        if (typeof fileItem === 'string') {
          if (fileItem.startsWith('http')) {
            fileKey = extractFileKeyFromUrl(fileItem);
            if (!fileKey) {
              // Fallback: extract from URL path
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

      // Clean fileKey - remove any full URLs
      let cleanFileKey = fileKey;
      if (typeof fileKey === 'string' && fileKey.startsWith('http')) {
        cleanFileKey = extractFileKeyFromUrl(fileKey);
        if (!cleanFileKey) {
          throw new Error("لا يمكن استخراج مفتاح الملف من الرابط");
        }
      }

      // Generate download URL
      const downloadData = await mainDesignerService.generateDownloadUrl(cleanFileKey);
      
      if (downloadData.downloadUrl) {
        // Create a temporary link and trigger download
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
      setShowMessageNotification(true);
      setNewMessageData({
        type: "error",
        message: error.response?.data?.message || error.message || "فشل في تحميل الملف",
      });
    }
  };

  // Handle download all files
  const handleDownloadAllFiles = async (design) => {
    if (!design.designFileUrls || design.designFileUrls.length === 0) {
      setShowMessageNotification(true);
      setNewMessageData({
        type: "info",
        message: "لا توجد ملفات للتحميل",
      });
      return;
    }

    try {
      // Download files one by one with a small delay
      for (let i = 0; i < design.designFileUrls.length; i++) {
        await handleDownloadFile(design.designFileUrls[i]);
        // Small delay between downloads to avoid browser blocking
        if (i < design.designFileUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
    }
  };

  // Sort designs (filtering is now handled by API in loadDesigns)
  const getFilteredAndSortedDesigns = () => {
    let filtered = [...designs];

    // All filtering (status, date, designer) is now handled by API in loadDesigns
    // Only apply client-side sorting here

    // Apply sorting
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

  // Handle sort column click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column
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

  // Handle design status change
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
      
      // Update the design in both lists
      setAllDesigns((prevDesigns) =>
        prevDesigns.map((d) =>
          d.id === targetDesign.id
            ? { ...d, status: newStatus }
            : d
        )
      );
      
      // Filter designs based on current statusTab
      const statusMap = { 0: 1, 1: 2, 2: 3, 3: 4 };
      const currentStatus = statusMap[statusTab];
      setDesigns((prevDesigns) => {
        const updated = prevDesigns.map((d) =>
          d.id === targetDesign.id
            ? { ...d, status: newStatus }
            : d
        );
        // If the updated design no longer matches the current filter, remove it
        return updated.filter(d => d.status === currentStatus);
      });

      setStatusDialogOpen(false);
      setSelectedDesignForStatus(null);
      setStatusNotes("");
      setStatusMenuAnchor(null);
      setSelectedDesignForMenu(null);
      
      // Update status counts
      const oldStatus = targetDesign.status;
      if (oldStatus && oldStatus !== newStatus) {
        setStatusCounts(prev => ({
          ...prev,
          [oldStatus]: Math.max(0, (prev[oldStatus] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1
        }));
      }
      
      // Reload status counts to ensure accuracy
      if (!dateFilter && designerFilter === "all" && !searchTerm) {
        loadStatusCounts();
      }
      
      // Show success message
      setShowMessageNotification(true);
      const statusMessages = {
        1: "تم تحديث الحالة إلى في الانتظار بنجاح",
        2: "تم اعتماد التصميم بنجاح",
        3: "تم رفض اعتماد التصميم بنجاح",
        4: "تم إرجاع التصميم بنجاح"
      };
      setNewMessageData({
        type: "success",
        message: statusMessages[newStatus] || "تم تحديث حالة التصميم بنجاح",
      });
    } catch (error) {
      setShowMessageNotification(true);
      setNewMessageData({
        type: "error",
        message: "حدث خطأ أثناء تحديث حالة التصميم",
      });
    } finally {
      setUpdatingDesignStatus(false);
    }
  };

  // Handle design deletion
  const handleDeleteDesign = async (design) => {
    if (!design) return;

    // Show confirmation dialog
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
      
      // Remove the design from both lists
      setAllDesigns((prevDesigns) => prevDesigns.filter((d) => d.id !== design.id));
      setDesigns((prevDesigns) => prevDesigns.filter((d) => d.id !== design.id));

      // Show success message
      Swal.fire({
        icon: "success",
        title: "تم الحذف بنجاح",
        text: "تم حذف التصميم بنجاح",
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
    } catch (error) {
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

  // Handle status selection from menu
  const handleStatusSelect = (newStatus) => {
    if (!selectedDesignForMenu) return;
    
    // If changing to same status, just close menu
    if (selectedDesignForMenu.status === newStatus) {
      handleStatusMenuClose();
      return;
    }

    // For status changes that might need notes, open dialog
    // Otherwise, change directly
    if (newStatus === 2 || newStatus === 3 || newStatus === 4) {
      setSelectedDesignForStatus({ ...selectedDesignForMenu, actionType: newStatus === 2 ? "approve" : newStatus === 3 ? "reject" : "return" });
      setStatusNotes("");
      setStatusDialogOpen(true);
      handleStatusMenuClose();
    } else {
      // Direct change for pending status
      handleStatusChange(newStatus, selectedDesignForMenu, "");
      handleStatusMenuClose();
    }
  };

  const fetchOrders = async (showLoading = false) => {
    await Promise.all([
      fetchPendingPrintingOrders(showLoading),
      fetchInPrintingOrders(false) // Don't show loading for second call
    ]);
  };

  // Load colors, sizes, and fabric types on component mount
  useEffect(() => {
    loadColors();
    loadSizes();
    loadFabricTypes();
  }, []);

  // Load status counts when Tab 4 is opened (only if no filters)
  useEffect(() => {
    if (currentTab === 4 && !dateFilter && designerFilter === "all" && !searchTerm) {
      loadStatusCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, dateFilter, designerFilter, searchTerm]);
  
  // Load designs when Tab 4 is opened or when statusTab, dateFilter, designerFilter, or searchTerm changes
  useEffect(() => {
    if (currentTab === 4) {
      setDesignsPage(0); // Reset to first page when filters change
    }
  }, [currentTab, statusTab, dateFilter, designerFilter, searchTerm]);
  
  // Load designs when page, pageSize, or filters change
  useEffect(() => {
    if (currentTab === 4) {
      loadDesigns(designsPage, designsPageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, designsPage, designsPageSize, statusTab, dateFilter, designerFilter, searchTerm]);

  useEffect(() => {
    effectCancelledRef.current = false;
    fetchOrders(true);

    (async () => {
      try {
        const unsub = await subscribeToOrderUpdates({
          onOrderCreated: () => fetchOrders(false),
          onOrderStatusChanged: () => fetchOrders(false).catch(() => {}),
        });
        if (!effectCancelledRef.current) unsubscribeOrdersRef.current = unsub;
        else if (typeof unsub === 'function') unsub();
      } catch (err) {
        console.error('Failed to connect to order updates hub:', err);
      }
    })();

    (async () => {
      try {
        const unsub = await subscribeToDesigns({
          onDesignCreated: () => { if (currentTabRef.current === 4) loadDesigns(); },
          onDesignUpdated: () => { if (currentTabRef.current === 4) loadDesigns(); },
          onDesignStatusChanged: () => { if (currentTabRef.current === 4) loadDesigns(); },
          onDesignRequestsListChanged: () => setDesignRequestsRefreshKey((k) => k + 1),
          onDesignRequestUpdated: () => setDesignRequestsRefreshKey((k) => k + 1),
        });
        if (!effectCancelledRef.current) unsubscribeDesignsRef.current = unsub;
        else if (typeof unsub === 'function') unsub();
      } catch (err) {
        console.error('Failed to connect to designs hub:', err);
      }
    })();

    return () => {
      effectCancelledRef.current = true;
      const o = unsubscribeOrdersRef.current;
      const d = unsubscribeDesignsRef.current;
      unsubscribeOrdersRef.current = null;
      unsubscribeDesignsRef.current = null;
      if (typeof o === 'function') o();
      if (typeof d === 'function') d();
    };
  }, []);

  // Play message sound
  const playMessageSound = () => {
    console.log("🔔 Attempting to play message sound...");
    try {
      let audioContext = window.messageAudioContext;
      if (!audioContext) {
        console.log("Creating new audio context...");
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.messageAudioContext = audioContext;
      }
      
      console.log("Audio context state:", audioContext.state);
      
      const playAudio = () => {
        if (audioContext.state === 'suspended') {
          console.log("Resuming suspended audio context...");
          audioContext.resume().then(() => {
            console.log("Audio context resumed, playing sound...");
            playSound(audioContext);
          }).catch((error) => {
            console.error("Could not resume audio context:", error);
            try {
              playSound(audioContext);
            } catch (e) {
              console.error("Failed to play sound:", e);
            }
          });
        } else {
          console.log("Audio context active, playing sound...");
          playSound(audioContext);
        }
      };
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playAudio();
        }).catch(() => {
          playAudio();
        });
      } else {
        playAudio();
      }
    } catch (error) {
      console.error("Audio error:", error);
    }
  };

  const playSound = (audioContext) => {
    try {
      const baseTime = audioContext.currentTime;
      const frequencies = [523.25, 659.25, 783.99]; // C, E, G
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = baseTime + (index * 0.08);
        const duration = 0.25;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
      console.log("✅ Sound played successfully");
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Load messages count
  const loadMessagesCount = async () => {
    try {
      const allMessages = await messagesService.getMessagesToUser(user?.id);
      const now = new Date();
      const activeMessages = (allMessages || []).filter((msg) => {
        if (!msg.isActive) return false;
        if (msg.expiresAt) {
          const expiresDate = new Date(msg.expiresAt);
          return expiresDate > now;
        }
        return true;
      });
      
      const newMessages = activeMessages.filter((msg) => {
        if (!msg.createdAt) return false;
        const messageDate = new Date(msg.createdAt);
        const hoursSinceCreation = (now - messageDate) / (1000 * 60 * 60);
        return hoursSinceCreation < 24;
      });
      
      setUnreadMessagesCount(newMessages.length);
    } catch (error) {
      console.error("Error loading messages count:", error);
    }
  };

  // Load public messages (sent to all users - userId === null)
  const loadPublicMessages = async () => {
    try {
      // Get hidden messages from localStorage first (per user)
      let hiddenIds = [];
      try {
        const storageKey = user?.id ? `hiddenPublicMessages_${user.id}` : 'hiddenPublicMessages';
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          hiddenIds = JSON.parse(saved);
        }
      } catch (e) {
        console.error("Error reading hidden messages from localStorage:", e);
      }

      // Get all messages and filter for public ones (userId === null)
      const allMessages = await messagesService.getMessagesToUser(user?.id);
      const now = new Date();
      const publicMsgs = (allMessages || []).filter((msg) => {
        // Only messages sent to all users (userId === null)
        if (msg.userId !== null && msg.userId !== undefined) return false;
        // Must be active
        if (!msg.isActive) return false;
        // Must not be expired
        if (msg.expiresAt) {
          const expiresDate = new Date(msg.expiresAt);
          return expiresDate > now;
        }
        return true;
      });
      
      // Filter out hidden messages using localStorage data
      const visibleMessages = publicMsgs.filter(msg => !hiddenIds.includes(msg.id));
      
      // Sort by date (newest first)
      visibleMessages.sort(
        (a, b) =>
          new Date(b.createdAt || b.sentAt || 0) -
          new Date(a.createdAt || a.sentAt || 0)
      );
      
      setPublicMessages(visibleMessages);
      // Update state to match localStorage
      if (hiddenIds.length > 0) {
        setHiddenMessageIds(hiddenIds);
      }
    } catch (error) {
      console.error("Error loading public messages:", error);
    }
  };

  // Hide a specific message
  const handleHideMessage = (messageId) => {
    setHiddenMessageIds(prev => {
      const updated = [...prev, messageId];
      // Save to localStorage (per user)
      const storageKey = user?.id ? `hiddenPublicMessages_${user.id}` : 'hiddenPublicMessages';
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    // Remove from visible messages immediately
    setPublicMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // Initialize audio context on user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!window.messageAudioContext) {
        try {
          window.messageAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
          console.error("Failed to initialize audio context:", error);
        }
      }
    };
    
    // Initialize on first user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initAudio);
      });
    };
  }, []);

  // Load messages count on mount
  useEffect(() => {
    if (user?.id) {
      loadMessagesCount();
    }
}, [user?.id]);

  // Load hidden message IDs from localStorage on mount (per user)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const storageKey = `hiddenPublicMessages_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const hiddenIds = JSON.parse(saved);
        setHiddenMessageIds(hiddenIds);
      }
    } catch (e) {
      console.error("Error reading hidden messages from localStorage:", e);
    }
  }, [user?.id]);

  // Load public messages after hiddenMessageIds is loaded
  useEffect(() => {
    if (user?.id) {
      // Small delay to ensure hiddenMessageIds is set
      const timer = setTimeout(() => {
        loadPublicMessages();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user?.id, hiddenMessageIds.length]);

  // Subscribe to messages
  useEffect(() => {
    let unsubscribeMessages;
    (async () => {
      try {
        unsubscribeMessages = await subscribeToMessages({
          onNewMessage: (message) => {
            console.log("💬💬💬 New message received in DesignManagerDashboard from messagesHub:", message);
            console.log("💬 Setting notification state...");
            setNewMessageReceived(message);
            setNewMessageData(message);
            setShowMessageNotification(true);
            console.log("💬 Notification state set to true");
            loadMessagesCount();
            console.log("💬 Playing sound...");
            playMessageSound();
          },
          onMessageUpdated: (message) => {
            console.log("💬 Message updated:", message);
            loadMessagesCount();
          },
          onMessageRemoved: (data) => {
            console.log("💬 Message removed:", data);
            loadMessagesCount();
            loadPublicMessages();
          },
        });
      } catch (err) {
        console.error('Failed to connect to messages hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribeMessages === 'function') unsubscribeMessages();
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOrder(null);
  };

  // Load image for display (lazy loading with queue)
  const loadImageForDisplay = async (orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    const loadingKey = `image-${orderId}-${designId}`;
    
    // Check cache first
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    // Don't load if already loading
    if (activeImageLoads.current.has(loadingKey)) {
      return null;
    }
    
    // Check if we're at max concurrent loads - wait a bit
    if (activeImageLoads.current.size >= MAX_CONCURRENT_LOADS) {
      // Queue this load by retrying after a short delay
      setTimeout(() => {
        loadImageForDisplay(orderId, designId);
      }, 500);
      return null;
    }
    
    // Start loading
    activeImageLoads.current.add(loadingKey);
    setLoadingImage(loadingKey);
    
    try {
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find(d => d.id === designId);
      if (design?.mockupImageUrl && design.mockupImageUrl !== 'image_data_excluded') {
        // Save to cache
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: design.mockupImageUrl
        }));
        return design.mockupImageUrl;
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      activeImageLoads.current.delete(loadingKey);
      setLoadingImage(null);
    }
    return null;
  };

  // Use Intersection Observer for lazy loading images
  useEffect(() => {
    let observer = null;
    
    // Wait a bit for DOM to render
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const { orderId, designId } = entry.target.dataset;
              if (orderId && designId) {
                const key = `${orderId}-${designId}`;
                
                // Check if already loaded or loading
                setImageCache(prevCache => {
                  const loadingKey = `image-${orderId}-${designId}`;
                  if (!prevCache[key] && !activeImageLoads.current.has(loadingKey)) {
                    // Load image when it becomes visible
                    loadImageForDisplay(parseInt(orderId), parseInt(designId));
                  }
                  return prevCache;
                });
                
                // Stop observing once we've triggered the load
                observer.unobserve(entry.target);
              }
            }
          });
        },
        { 
          rootMargin: '100px', // Start loading 100px before image enters viewport
          threshold: 0.01 // Trigger when 1% of image is visible
        }
      );

      // Observe all image placeholders
      const imageElements = document.querySelectorAll('[data-image-placeholder="true"]');
      imageElements.forEach((el) => observer.observe(el));
    }, 200);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrintingOrders.length, inPrintingOrders.length]); // Re-run only when orders count changes

  const handleImageClick = async (imageUrl, orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    
    // If image data is excluded, use cached or load it
    if (imageUrl === 'image_data_excluded' && orderId) {
      let imageToShow = imageCache[cacheKey];
      
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      
      if (imageToShow) {
        setSelectedImage(getFullUrl(imageToShow));
        setImageDialogOpen(true);
      } else {
        alert('الصورة غير متوفرة');
      }
      return;
    }
    
    // Don't open dialog if image data is excluded
    if (!imageUrl || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }
      setSelectedImage(getFullUrl(imageUrl));
    setImageDialogOpen(true);
  };

  // Helper function to open file (handles both URLs and base64)
  const openFile = async (fileUrl) => {
    if (!fileUrl || fileUrl === 'placeholder_print.pdf' || fileUrl === 'image_data_excluded') {
      return;
    }

    // Check if it's a base64 data URL
    if (fileUrl.startsWith('data:')) {
      // Convert base64 to blob and download
      try {
        // Extract base64 data (everything after comma)
        let base64Data = '';
        let mimeType = 'application/pdf';
        
        if (fileUrl.includes(',')) {
          const parts = fileUrl.split(',');
          base64Data = parts[1];
          // Extract MIME type from data URL
          const mimeMatch = fileUrl.match(/data:([^;]+);base64/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        } else {
          // Pure base64 string without data URL prefix
          base64Data = fileUrl;
        }

        // Clean base64 string (remove whitespace, newlines, etc.)
        const cleanBase64 = base64Data.replace(/\s/g, '');
  

        // Method 1: Try using fetch API first
        let blob;
        try {
          const response = await fetch(fileUrl);
          blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('الملف فارغ بعد التحويل');
          }
          
        } catch (fetchError) {
          
          // Method 2: Manual base64 to blob conversion (more reliable for large files)
          try {
            // Clean and validate base64
            const cleanBase64ForManual = base64Data.replace(/\s/g, '');
            
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64ForManual)) {
              throw new Error('الملف ليس بصيغة base64 صحيحة');
            }
            
            // Decode base64 in chunks for large files
            const binaryString = atob(cleanBase64ForManual);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Use detected MIME type or default to application/octet-stream
            const blobType = mimeType || 'application/octet-stream';
            blob = new Blob([bytes], { type: blobType });
            
            if (blob.size === 0) {
              throw new Error('الملف فارغ بعد التحويل');
            }
            
         
          } catch (manualError) {
            console.error('Both methods failed:', { fetchError, manualError });
            throw new Error('فشل في تحويل الملف. قد يكون الملف تالفاً أو كبيراً جداً.');
          }
        }
        
        // Detect file type from MIME type or blob content
        let fileExtension = 'pdf'; // default
        let fileName = `order_file_${Date.now()}`;
        
        // Determine file extension from MIME type
        if (mimeType) {
          const mimeToExt = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/svg+xml': 'svg',
            'image/gif': 'gif',
            'image/webp': 'webp'
          };
          fileExtension = mimeToExt[mimeType.toLowerCase()] || 'bin';
        } else {
          // Try to detect from file signature if MIME type is not available
          try {
            const arrayBuffer = await blob.slice(0, 8).arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // PDF signature
            if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
              fileExtension = 'pdf';
            }
            // PNG signature (89 50 4E 47)
            else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
              fileExtension = 'png';
            }
            // JPEG signature (FF D8 FF)
            else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
              fileExtension = 'jpg';
            }
            // SVG (check for <svg or <?xml)
            else {
              const textDecoder = new TextDecoder();
              const text = textDecoder.decode(uint8Array);
              if (text.includes('<svg') || (text.includes('<?xml') && text.includes('svg'))) {
                fileExtension = 'svg';
              }
            }
           
          } catch (sigError) {
          }
        }
        
        fileName = `${fileName}.${fileExtension}`;
        
        
        // Create blob URL for download
        const blobUrl = URL.createObjectURL(blob);
        // Download file directly
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Remove link and cleanup after download
        setTimeout(() => {
          document.body.removeChild(link);
          // Give more time for download to complete before revoking
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 10000); // 10 seconds - enough time for download
        }, 1000);
      } catch (error) {
        console.error('Error opening base64 file:', error);
        alert('حدث خطأ أثناء فتح الملف.\n' + error.message + '\n\nيرجى المحاولة مرة أخرى أو الاتصال بالدعم.');
      }
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      // Regular URL - download directly
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileUrl.split('/').pop() || 'file.pdf';
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } else {
      // Try to download as is
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = 'file.pdf';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  const handleFileClick = async (fileUrl, orderId, designId) => {
    // If file data is excluded, fetch full order data
    if (fileUrl === 'image_data_excluded' && orderId) {
      setLoadingImage(`file-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        
        if (design?.printFileUrl && design.printFileUrl !== 'image_data_excluded') {
          // Open file using helper function
          await openFile(design.printFileUrl);
        } else {
          alert('الملف غير متوفر في قاعدة البيانات');
        }
      } catch (error) {
        console.error('Error fetching order file:', error);
        alert('حدث خطأ أثناء جلب الملف: ' + (error.message || 'خطأ غير معروف'));
      } finally {
        setLoadingImage(null);
      }
      return;
    }
    
    // Normal file handling
    await openFile(fileUrl);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
  };

  const handleNotesClick = (order) => {
    setSelectedOrder(order);
    setNotesDialogOpen(true);
  };

  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleSaveNotes = async (orderId, updatedNotes) => {
    await ordersService.updateOrderNotes(orderId, updatedNotes);
    // Update local state
    setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
    
    // Update the correct list based on order status
    if (selectedOrder.status === ORDER_STATUS.PENDING_PRINTING) {
      setPendingPrintingOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    } else if (selectedOrder.status === ORDER_STATUS.IN_PRINTING) {
      setInPrintingOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    }
  };

  // Handle status update
  const handleStatusUpdate = async (orderId, currentStatus) => {
    setUpdatingOrderId(orderId);
    try {
      let response;
      
      if (currentStatus === ORDER_STATUS.PENDING_PRINTING) {
        // Move from "بانتظار الطباعة" to "في مرحلة الطباعة"
        response = await orderStatusService.setInPrinting(orderId);
      } else if (currentStatus === ORDER_STATUS.IN_PRINTING) {
        // Move from "في مرحلة الطباعة" to "في مرحلة التحضير"
        response = await orderStatusService.setInPreparation(orderId);
      }
      
      // After successful update, refresh the orders list to get the latest data
      // Also switch tab if order moved from pending to in printing
      if (currentStatus === ORDER_STATUS.PENDING_PRINTING) {
        // Order moved from pending to in printing, switch to tab 1
        setTimeout(() => {
          fetchOrders(false).then(() => {
            setCurrentTab(1); // Switch to "في مرحلة الطباعة" tab
          });
        }, 500);
      } else {
        setTimeout(() => {
          fetchOrders(false); // Don't show loading after action
        }, 500);
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };


  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return {
      label: ORDER_STATUS_LABELS[numericStatus] || "غير معروف",
      color: ORDER_STATUS_COLORS[numericStatus] || "default"
    };
  };

  const getStatusChipColor = (status) => {
    const statusInfo = getStatusLabel(status);
    return statusInfo.color || "default";
  };

  const getStatusText = (status) => {
    const statusInfo = getStatusLabel(status);
    return statusInfo.label || "غير معروف";
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;
    return `${numericValue.toLocaleString("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ₪`;
  };

  const normalizeDateValue = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // If the string already contains a timezone offset or Z, trust it as-is
      const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);
      const isoReady = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
      return new Date(hasTimezone ? isoReady : `${isoReady}Z`);
    }

    if (typeof value === "number") {
      return new Date(value);
    }

    return null;
  };

  const formatDateTime = (dateValue) => {
    const normalized = normalizeDateValue(dateValue);
    if (!normalized || Number.isNaN(normalized.getTime())) return "-";

    try {
      // Use UTC timezone to display time as stored, without local timezone conversion
      return normalized.toLocaleString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        calendar: "gregory",
        timeZone: "UTC",
      });
    } catch {
      return normalized.toString();
    }
  };

  // Load colors from API
  const loadColors = async () => {
    setLoadingColors(true);
    try {
      const colorsData = await colorsService.getAllColors();
      setColors(Array.isArray(colorsData) ? colorsData : []);
    } catch (error) {
      console.error('Error loading colors:', error);
      setColors([]);
    } finally {
      setLoadingColors(false);
    }
  };

  // Load sizes from API
  const loadSizes = async () => {
    setLoadingSizes(true);
    try {
      const sizesData = await sizesService.getAllSizes();
      setSizes(Array.isArray(sizesData) ? sizesData : []);
    } catch (error) {
      console.error('Error loading sizes:', error);
      setSizes([]);
    } finally {
      setLoadingSizes(false);
    }
  };

  // Load fabric types from API
  const loadFabricTypes = async () => {
    setLoadingFabricTypes(true);
    try {
      const fabricTypesData = await fabricTypesService.getAllFabricTypes();
      setFabricTypes(Array.isArray(fabricTypesData) ? fabricTypesData : []);
    } catch (error) {
      console.error('Error loading fabric types:', error);
      setFabricTypes([]);
    } finally {
      setLoadingFabricTypes(false);
    }
  };

  const getFabricLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const fabricType = item;
      if (fabricType === null || fabricType === undefined) return "-";
      
      const fabricTypeId = typeof fabricType === 'string' && !isNaN(fabricType) && fabricType !== '' 
        ? Number(fabricType) 
        : (typeof fabricType === 'number' ? fabricType : null);
      
      if (fabricTypeId === null) {
        return fabricType;
      }
      
      // Use constants for legacy values
      if (FABRIC_TYPE_LABELS[fabricTypeId]) {
        return FABRIC_TYPE_LABELS[fabricTypeId];
      }
      
      if (fabricTypes.length > 0) {
        const fabricTypeObj = fabricTypes.find(f => f.id === fabricTypeId);
        if (fabricTypeObj) {
          return fabricTypeObj.name || fabricTypeObj.nameAr || "-";
        }
      }
      
      return fabricType || "-";
    }
    
    // New format: check if fabricTypeId is null (legacy order)
    if (item.fabricTypeId === null || item.fabricTypeId === undefined) {
      // Legacy order - use constants mapping
      const fabricType = item.fabricType;
      if (fabricType === null || fabricType === undefined) return "-";
      const fabricTypeId = typeof fabricType === 'string' && !isNaN(fabricType) && fabricType !== '' 
        ? Number(fabricType) 
        : (typeof fabricType === 'number' ? fabricType : null);
      if (fabricTypeId !== null && FABRIC_TYPE_LABELS[fabricTypeId]) {
        return FABRIC_TYPE_LABELS[fabricTypeId];
      }
      return fabricType || "-";
    }
    
    // New order - use API values
    if (item.fabricTypeNameAr) {
      return item.fabricTypeNameAr;
    }
    
    // Fallback to API lookup
    if (fabricTypes.length > 0) {
      const fabricTypeObj = fabricTypes.find(f => f.id === item.fabricTypeId);
      if (fabricTypeObj) {
        return fabricTypeObj.name || fabricTypeObj.nameAr || "-";
      }
    }
    
    return "-";
  };

  const getSizeLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const size = item;
      if (size === null || size === undefined) return "-";
      if (typeof size === "string" && !size.trim()) return "-";
      
      // Convert to number if it's a string number
      const sizeId = typeof size === 'string' && !isNaN(size) && size !== '' 
        ? Number(size) 
        : (typeof size === 'number' ? size : null);
      
      // If it's not a number, it might already be a name - return it
      if (sizeId === null) {
        return size;
      }
      
      // Use constants for legacy values
      if (SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      
      if (sizes.length > 0) {
        // Try to find by legacyValue (the numeric value like 2, 4, 6, 101, 102, etc.)
        let sizeObj = sizes.find(s => s.legacyValue === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
        
        // Try exact match by ID as fallback
        sizeObj = sizes.find(s => s.id === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
        
        // Try to match by converting to string and comparing
        sizeObj = sizes.find(s => String(s.id) === String(sizeId) || String(s.legacyValue) === String(sizeId));
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }
      }
      
      return size || "-";
    }
    
    // New format: check if sizeId is null (legacy order)
    if (item.sizeId === null || item.sizeId === undefined) {
      // Legacy order - use constants mapping
      const size = item.size;
      if (size === null || size === undefined) return "-";
      const sizeId = typeof size === 'string' && !isNaN(size) && size !== '' 
        ? Number(size) 
        : (typeof size === 'number' ? size : null);
      if (sizeId !== null && SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      return size || "-";
    }
    
    // New order - use API values
    if (item.sizeNameAr) {
      return item.sizeName;
    }
    
    // Fallback to API lookup
    if (sizes.length > 0) {
      const sizeObj = sizes.find(s => s.id === item.sizeId || s.legacyValue === item.sizeId);
      if (sizeObj) {
        return sizeObj.name || sizeObj.nameAr || "-";
      }
    }
    
    return "-";
  };

  const getColorLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== 'object' || item === null) {
      const color = item;
      if (color === null || color === undefined) return "-";
      
      const colorId = typeof color === 'string' && !isNaN(color) && color !== '' 
        ? Number(color) 
        : (typeof color === 'number' ? color : null);
      
      if (colorId === null) {
        return color;
      }
      
      // Use constants for legacy values
      if (COLOR_LABELS[colorId]) {
        return COLOR_LABELS[colorId];
      }
      
      if (colors.length > 0) {
        const colorObj = colors.find(c => c.id === colorId);
        if (colorObj) {
          return colorObj.name || colorObj.nameAr || "-";
        }
      }
      
      return color || "-";
    }
    
    // New format: check if colorId is null (legacy order)
    if (item.colorId === null || item.colorId === undefined) {
      // Legacy order - use constants mapping
      const color = item.color;
      if (color === null || color === undefined) return "-";
      const colorId = typeof color === 'string' && !isNaN(color) && color !== '' 
        ? Number(color) 
        : (typeof color === 'number' ? color : null);
      if (colorId !== null && COLOR_LABELS[colorId]) {
        return COLOR_LABELS[colorId];
      }
      return color || "-";
    }
    
    // New order - use API values
    if (item.colorNameAr) {
      return item.colorNameAr;
    }
    
    // Fallback to API lookup
    if (colors.length > 0) {
      const colorObj = colors.find(c => c.id === item.colorId);
      if (colorObj) {
        return colorObj.name || colorObj.nameAr || "-";
      }
    }
    
    return "-";
  };

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

  const selectedOrderDesigns = selectedOrder?.orderDesigns || [];
  const totalOrderQuantity = selectedOrderDesigns.reduce((sum, design) => {
    const designCount =
      design?.orderDesignItems?.reduce((itemSum, item) => itemSum + (item?.quantity || 0), 0) || 0;
    return sum + designCount;
  }, 0);

  const discountDisplay = (() => {
    if (!selectedOrder) return "-";
    const parts = [];
    if (selectedOrder.discountAmount !== null && selectedOrder.discountAmount !== undefined) {
      parts.push(formatCurrency(selectedOrder.discountAmount));
    }
    if (
      selectedOrder.discountPercentage !== null &&
      selectedOrder.discountPercentage !== undefined &&
      selectedOrder.discountPercentage !== ""
    ) {
      parts.push(`${selectedOrder.discountPercentage}%`);
    }
    return parts.length > 0 ? parts.join(" / ") : "-";
  })();

  const orderNotes =
    typeof selectedOrder?.notes === "string" ? selectedOrder.notes.trim() : "";
  const discountNotes =
    typeof selectedOrder?.discountNotes === "string" ? selectedOrder.discountNotes.trim() : "";

  // Helper function to get field display value
  const getFieldDisplayValue = (fieldName, value) => {
    if (value === '' || value === null || value === undefined) {
      return '(فارغ)';
    }

    const valueStr = String(value).trim();
    if (!valueStr || valueStr === 'null' || valueStr === 'undefined') {
      return '(فارغ)';
    }
    
    // Check if it's a city field
    if (fieldName && (fieldName === 'مدينة العميل' || fieldName === 'المدينة' || fieldName.includes('مدينة'))) {
      if (cities.length > 0) {
        const numValue = Number(valueStr);
        const city = cities.find(c => {
          const cityId = c.id || c.Id || c.cityId;
          const cityIdStr = String(cityId || '');
          const cityIdNum = Number(cityId);
          return cityIdStr === valueStr || 
                 cityIdStr === String(value) || 
                 (numValue && cityIdNum && numValue === cityIdNum) ||
                 (cityId && String(cityId) === valueStr);
        });
        if (city) {
          const cityName = city.arabicCityName || city.cityName || city.name || city.Name;
          if (cityName) {
            return cityName;
          }
        }
      }
      return valueStr;
    }
    
    // Check if it's an area/district field
    if (fieldName && (fieldName === 'منطقة العميل' || fieldName === 'المنطقة' || fieldName.includes('منطقة'))) {
      if (areas.length > 0) {
        const numValue = Number(valueStr);
        const area = areas.find(a => {
          const areaId = a.id || a.Id || a.areaId;
          const areaIdStr = String(areaId || '');
          const areaIdNum = Number(areaId);
          return areaIdStr === valueStr || 
                 areaIdStr === String(value) || 
                 (numValue && areaIdNum && numValue === areaIdNum) ||
                 (areaId && String(areaId) === valueStr);
        });
        if (area) {
          const areaName = area.name || area.Name || area.areaName;
          if (areaName) {
            return areaName;
          }
        }
      }
      return valueStr;
    }
    
    return valueStr;
  };

  // Parse modification details
  const parseModificationDetails = (modificationDetailsString) => {
    if (!modificationDetailsString || typeof modificationDetailsString !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(modificationDetailsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing modification details:', error);
      return [];
    }
  };

  const modificationHistory = selectedOrder?.isModified 
    ? parseModificationDetails(selectedOrder?.modificationDetails)
    : [];

  // Note: getFilteredOrders, paginatedRows, and related functions are now handled by OrdersTab component

    return (
      <DashboardLayout
        title="PSBrand - لوحة مدير التصميم"
        user={user}
        onLogout={handleLogout}
        publicMessages={publicMessages}
        onHideMessage={handleHideMessage}
        messagesAnchorEl={messagesAnchorEl}
        setMessagesAnchorEl={setMessagesAnchorEl}
        messagesIconExtra={
          unreadMessagesCount > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: "#ff1744",
                border: "2px solid #5E4E3E",
                animation: showMessageNotification ? "pulse 1.5s infinite" : "none",
                boxShadow: showMessageNotification ? "0 0 8px rgba(255, 23, 68, 0.6)" : "none",
                "@keyframes pulse": {
                  "0%, 100%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.4)", opacity: 0.9 },
                },
              }}
            />
          )
        }
        onMessagesIconClick={() => setShowMessageNotification(false)}
      >
          <Paper
            elevation={0}
            sx={{
              padding: 4,
              borderRadius: 3,
              background: calmPalette.surface,
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
          >
          <Box sx={{ marginBottom: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
              variant="fullWidth"
              sx={{
                backgroundColor: calmPalette.surface,
                borderRadius: 3,
                boxShadow: calmPalette.shadow,
                backdropFilter: "blur(8px)",
              }}
              TabIndicatorProps={{
                sx: {
                  height: "100%",
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, rgba(96, 78, 62, 0.85) 0%, rgba(75, 61, 49, 0.9) 100%)",
                  zIndex: -1,
                },
              }}
            >
              <Tab
                label="الرئيسية"
                icon={<MessageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 0 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '12px 0 0 12px',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={`بانتظار الطباعة (${pendingPrintingOrders.length})`}
                icon={<Schedule />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 1 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={`في مرحلة الطباعة (${inPrintingOrders.length})`}
                icon={<Print />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 2 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label="متابعة الدوام"
                icon={<AccessTime />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 3 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label={`التصاميم`}
                icon={<ImageIcon />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 4 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
              <Tab
                label="طلبات التصاميم"
                icon={<FilterList />}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 56,
                  color: currentTab === 5 ? '#ffffff' : calmPalette.textMuted,
                  borderRadius: '0 12px 12px 0',
                  zIndex: 1,
                  '&.Mui-selected': {
                    color: '#ffffff',
                  },
                }}
              />
            </Tabs>
          </Box>

          {/* Welcome Page for Tab 0 */}
          {currentTab === 0 && (
            <WelcomePage onNewMessage={null} />
          )}

          {/* Orders Content for other tabs */}
          {currentTab !== 0 && (
            <>
              {currentTab === 1 && (
                <OrdersTab
                  orders={pendingPrintingOrders}
                  loading={loading}
                  onViewOrder={handleViewOrder}
                  onStatusUpdate={handleStatusUpdate}
                  onNotesClick={handleNotesClick}
                  updatingOrderId={updatingOrderId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  getStatusLabel={getStatusLabel}
                  getFullUrl={getFullUrl}
                  handleImageClick={handleImageClick}
                  imageCache={imageCache}
                  loadingImage={loadingImage}
                  setSelectedImage={setSelectedImage}
                  setImageDialogOpen={setImageDialogOpen}
                  orderStatus={ORDER_STATUS.PENDING_PRINTING}
                  actionButtonText="بدء الطباعة"
                />
              )}
              {currentTab === 2 && (
                <OrdersTab
                  orders={inPrintingOrders}
                  loading={loading}
                  onViewOrder={handleViewOrder}
                  onStatusUpdate={handleStatusUpdate}
                  onNotesClick={handleNotesClick}
                  updatingOrderId={updatingOrderId}
                  searchQuery={searchQueryInPrinting}
                  onSearchChange={setSearchQueryInPrinting}
                  getStatusLabel={getStatusLabel}
                  getFullUrl={getFullUrl}
                  handleImageClick={handleImageClick}
                  imageCache={imageCache}
                  loadingImage={loadingImage}
                  setSelectedImage={setSelectedImage}
                  setImageDialogOpen={setImageDialogOpen}
                  orderStatus={ORDER_STATUS.IN_PRINTING}
                  actionButtonText="إرسال للتحضير"
                />
              )}
              {currentTab === 3 && (
                <EmployeeAttendanceCalendar />
              )}
              {currentTab === 4 && (
                <DesignsFromDesignersTab
                  onShowNotification={(type, message) => {
                    setShowMessageNotification(true);
                    setNewMessageData({ type, message });
                  }}
                  setSelectedImage={setSelectedImage}
                  setImageDialogOpen={setImageDialogOpen}
                />
              )}
              {currentTab === 5 && (
                <DesignRequestsTab
                  setSelectedImage={setSelectedImage}
                  setImageDialogOpen={setImageDialogOpen}
                  designRequestsRefreshKey={designRequestsRefreshKey}
                />
              )}
            </>
          )}
        </Paper>

      {/* Details Dialog */}
      <OrderDetailsDialog
        open={openDialog}
        onClose={handleCloseDialog}
        order={selectedOrder}
        getStatusText={getStatusText}
        getStatusChipColor={getStatusChipColor}
        formatDateTime={formatDateTime}
        formatCurrency={formatCurrency}
        getFabricLabel={getFabricLabel}
        getColorLabel={getColorLabel}
        getSizeLabel={getSizeLabel}
        getFullUrl={getFullUrl}
        handleImageClick={handleImageClick}
        loadingImage={loadingImage}
        imageCache={imageCache}
        openFile={(fileUrl, orderId, designId) => handleFileClick(fileUrl, orderId, designId)}
        maxWidth="md"
        customContentAfterDesigns={
          selectedOrder?.isModified && user?.role === USER_ROLES.ADMIN ? (
            <>
              <Divider />
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <History color="warning" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    سجل التعديلات
                  </Typography>
                  <Chip 
                    label="تم التعديل" 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
                {modificationHistory.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {modificationHistory.map((modification, modIndex) => {
                      const timestamp = modification.Timestamp 
                        ? new Date(modification.Timestamp).toLocaleString("en-GB", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";
                      const changes = modification.Changes || [];

                      return (
                        <Box
                          key={modIndex}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            padding: 2,
                            bgcolor: "warning.50",
                          }}
                        >
                          <Typography 
                            variant="subtitle2" 
                            sx={{ fontWeight: 600, mb: 1.5, color: "warning.dark" }}
                          >
                            تعديل بتاريخ: {timestamp}
                          </Typography>
                          {changes.length > 0 ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                              {changes.map((change, changeIndex) => (
                                <Box
                                  key={changeIndex}
                                  sx={{
                                    p: 1.5,
                                    bgcolor: "background.paper",
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}
                                  >
                                    {change.Field || "حقل غير معروف"}
                                  </Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    <Box sx={{ flex: 1, minWidth: 200 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                        القيمة القديمة:
                                      </Typography>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          p: 0.75, 
                                          bgcolor: "error.50", 
                                          borderRadius: 0.5,
                                          color: "error.dark",
                                          wordBreak: "break-word"
                                        }}
                                      >
                                        {getFieldDisplayValue(change.Field, change.OldValue)}
                                      </Typography>
                                    </Box>
                                    <ArrowForward sx={{ color: "text.secondary", mx: 1 }} />
                                    <Box sx={{ flex: 1, minWidth: 200 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                        القيمة الجديدة:
                                      </Typography>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          p: 0.75, 
                                          bgcolor: "success.50", 
                                          borderRadius: 0.5,
                                          color: "success.dark",
                                          wordBreak: "break-word"
                                        }}
                                      >
                                        {getFieldDisplayValue(change.Field, change.NewValue)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              لا توجد تفاصيل التعديلات
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    لا توجد تفاصيل التعديلات
                  </Typography>
                )}
              </Box>
            </>
          ) : null
        }
        customActions={
          selectedOrder && (
            <Button
              variant="contained"
              startIcon={<Note />}
              onClick={() => handleNotesClick(selectedOrder)}
              sx={{ minWidth: 200 }}
            >
              عرض/تعديل الملاحظات
            </Button>
          )
        }
      />

      <ImagePreviewDialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        image={selectedImage}
      />

      {/* View Design Dialog - Same as Main Designer */}
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
            boxShadow: "0 8px 32px rgba(94, 78, 62, 0.12)",
            border: "none",
            overflow: "hidden",
          },
        }}
      >
        {viewingDesign && (
          <>
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
                    {viewingDesign.serialNumber}
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
                    {viewingDesign.createdAt
                      ? new Date(viewingDesign.createdAt).toLocaleDateString("ar-SA")
                      : viewingDesign.designDate
                      ? new Date(viewingDesign.designDate).toLocaleDateString("ar-SA")
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
                {imageUrl || viewingDesign.designImageUrl ? (
                  <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-start" }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedImageForView(imageUrl || viewingDesign.designImageUrl);
                        setImageViewDialogOpen(true);
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
                        try {
                          const fileKey = viewingDesign.designImageKey || extractFileKeyFromUrl(viewingDesign.designImageUrl);
                          if (fileKey) {
                            await handleDownloadFile(fileKey, `design_image_${viewingDesign.serialNumber || viewingDesign.id}`);
                          } else {
                            setShowMessageNotification(true);
                            setNewMessageData({
                              type: "error",
                              message: "لا يمكن العثور على مفتاح الصورة",
                            });
                          }
                        } catch (error) {
                          console.error("Error downloading image:", error);
                          setShowMessageNotification(true);
                          setNewMessageData({
                            type: "error",
                            message: error.message || "فشل في تحميل الصورة",
                          });
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
                {viewingDesign.designFileUrls && viewingDesign.designFileUrls.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {viewingDesign.designFileUrls.map((fileItem, index) => {
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
                        fileKey = extractFileKeyFromUrl(fileItem) || fileItem;
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
                                handleDownloadFile(fileKey, fileName);
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

      {/* Image View Dialog for Design Image */}
      <Dialog
        open={imageViewDialogOpen}
        onClose={() => setImageViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: "#ffffff",
            boxShadow: calmPalette.shadow,
            border: "1px solid rgba(94, 78, 62, 0.15)",
          },
        }}
      >
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
          عرض الصورة
          <IconButton
            onClick={() => setImageViewDialogOpen(false)}
            size="small"
            sx={{
              color: calmPalette.textSecondary,
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, px: 2.5, pb: 2, backgroundColor: "#ffffff" }}>
          {selectedImageForView && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={selectedImageForView}
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
      </Dialog>

      {/* Notes Dialog */}

      <NotesDialog
        open={notesDialogOpen}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />

      {/* Messages Popover */}
      <Popover
        open={Boolean(messagesAnchorEl)}
        anchorEl={messagesAnchorEl}
        onClose={() => {
          setMessagesAnchorEl(null);
          loadMessagesCount();
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: { xs: "90vw", sm: 480, md: 580 },
            maxWidth: 580,
            maxHeight: "85vh",
            background: "linear-gradient(135deg, #ffffff 0%, #faf9f7 100%)",
            borderRadius: 4,
            boxShadow: "0 12px 48px rgba(94, 78, 62, 0.25), 0 4px 16px rgba(94, 78, 62, 0.15)",
            mt: 1.5,
            border: "1px solid rgba(94, 78, 62, 0.15)",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Box sx={{ p: 0, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "transparent" }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2.5,
              pb: 2,
              background: "linear-gradient(135deg, rgba(94, 78, 62, 0.08) 0%, rgba(94, 78, 62, 0.03) 100%)",
              borderBottom: "2px solid rgba(94, 78, 62, 0.12)",
              flexShrink: 0,
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "1px",
                background: "linear-gradient(90deg, transparent 0%, rgba(94, 78, 62, 0.1) 50%, transparent 100%)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  background: "linear-gradient(135deg, " + calmPalette.primary + " 0%, " + calmPalette.primaryDark + " 100%)",
                  width: 44,
                  height: 44,
                  boxShadow: "0 4px 12px rgba(94, 78, 62, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <MessageIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    color: calmPalette.textPrimary, 
                    fontSize: "1.15rem", 
                    mb: 0.25,
                    background: "linear-gradient(135deg, " + calmPalette.textPrimary + " 0%, " + calmPalette.primary + " 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  رسائل الإدمن
                </Typography>
                <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.8rem", fontWeight: 500 }}>
                  آخر الرسائل والإشعارات
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                onClick={loadMessagesCount}
                size="small"
                sx={{
                  color: calmPalette.textPrimary,
                  backgroundColor: "rgba(94, 78, 62, 0.05)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(94, 78, 62, 0.15)",
                    transform: "rotate(180deg)",
                  },
                }}
              >
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                onClick={() => {
                  setMessagesAnchorEl(null);
                  loadMessagesCount();
                }}
                size="small"
                sx={{
                  color: calmPalette.textPrimary,
                  backgroundColor: "rgba(94, 78, 62, 0.05)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(220, 53, 69, 0.1)",
                    color: "#dc3545",
                    transform: "scale(1.1)",
                  },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
          
          {/* Messages Content */}
          <Box 
            sx={{ 
              p: 2.5, 
              pt: 2, 
              overflow: "auto", 
              flex: 1,
              background: "rgba(255, 255, 255, 0.4)",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "rgba(94, 78, 62, 0.05)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(94, 78, 62, 0.2)",
                borderRadius: "4px",
                "&:hover": {
                  background: "rgba(94, 78, 62, 0.3)",
                },
              },
            }}
          >
            <MessagesTab
              onNewMessage={(message) => {
                setNewMessageReceived(message);
                loadMessagesCount();
              }}
            />
          </Box>
        </Box>
      </Popover>

      {/* Message Notification Toast */}
      <Snackbar
        open={showMessageNotification}
        autoHideDuration={6000}
        onClose={() => {
          console.log("🔔 Closing notification...");
          setShowMessageNotification(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          mt: 2,
          zIndex: 10000,
        }}
        TransitionProps={{
          onEntered: () => {
            console.log("🔔 Toast entered/opened");
          }
        }}
      >
        <Alert 
          onClose={() => {
            console.log("🔔 Closing notification from Alert...");
            setShowMessageNotification(false);
          }} 
          severity={newMessageData?.type || "info"}
          icon={newMessageData?.type === "success" || newMessageData?.type === "error" ? undefined : <MessageIcon />}
          sx={{ 
            width: '100%',
            minWidth: 300,
            maxWidth: 500,
            bgcolor: "#ffffff",
            color: calmPalette.textPrimary,
            boxShadow: "0 8px 24px rgba(94, 78, 62, 0.3)",
            border: `1px solid ${calmPalette.primary}`,
            "& .MuiAlert-icon": {
              color: newMessageData?.type === "success" ? "#2e7d32" : newMessageData?.type === "error" ? "#d32f2f" : "#1976d2",
            },
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {newMessageData?.title || (newMessageData?.type === "success" ? "نجح" : newMessageData?.type === "error" ? "خطأ" : "رسالة جديدة")}
            </Typography>
            <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
              {newMessageData?.message || newMessageData?.content || "لديك رسالة جديدة من الإدارة"}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Design Status Change Dialog */}
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
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 248, 245, 0.98) 100%)",
            boxShadow: "0 8px 32px rgba(94, 78, 62, 0.2)",
            border: `1px solid ${calmPalette.primary}30`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${calmPalette.primary}15 0%, ${calmPalette.primary}05 100%)`,
            borderBottom: `1px solid ${calmPalette.primary}20`,
            pb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
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
            {selectedDesignForStatus?.actionType === "approve" ? "اعتماد التصميم" : selectedDesignForStatus?.actionType === "return" ? "إرجاع التصميم" : "رفض اعتماد التصميم"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 1 }}>
              الرقم التسلسلي: <strong>{selectedDesignForStatus?.serialNumber}</strong>
            </Typography>
            {selectedDesignForStatus?.designName && (
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                اسم التصميم: <strong>{selectedDesignForStatus.designName}</strong>
              </Typography>
            )}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="ملاحظات (اختياري)"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="أضف ملاحظات حول قرارك..."
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "& fieldset": {
                  borderColor: calmPalette.primary + "40",
                },
                "&:hover fieldset": {
                  borderColor: calmPalette.primary + "60",
                },
                "&.Mui-focused fieldset": {
                  borderColor: calmPalette.primary,
                },
              },
            }}
          />
        </DialogContent>
        <Box sx={{ p: 2.5, pt: 1, display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
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
              : " غير معتمد"}
          </Button>
        </Box>
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
    </DashboardLayout>
  );
};

export default DesignManagerDashboard;