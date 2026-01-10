import { useState, useEffect, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  TablePagination,
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
  Logout,
  Close,
  Note,
  Schedule,
  Print,
  ArrowBack,
  ArrowForward,
  Visibility,
  Search,
  CameraAlt,
  History,
  AccessTime,
  Message,
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
  Edit,
  Delete,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, shipmentsService, colorsService, sizesService, fabricTypesService, messagesService, mainDesignerService, employeesService } from "../services/api";
import { Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { subscribeToOrderUpdates, subscribeToMessages, subscribeToDesigns } from "../services/realtime";
import MessagesTab from "../components/common/MessagesTab";
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, USER_ROLES, SIZE_LABELS, FABRIC_TYPE_LABELS, COLOR_LABELS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import GlassDialog from "../components/common/GlassDialog";
import EmployeeAttendanceCalendar from "../components/admin/EmployeeAttendanceCalendar";
import WelcomePage from "../components/common/WelcomePage";
import calmPalette from "../theme/calmPalette";
import Swal from "sweetalert2";

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
  const [sortField, setSortField] = useState(null); // null, "serialNumber", "date", "status", "designer"
  const [sortDirection, setSortDirection] = useState("asc"); // "asc", "desc"
  // Users mapping for designer names
  const [usersMap, setUsersMap] = useState({}); // { userId: userName }
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Can be string or array
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
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

  const getFullUrl = (inputUrl) => {
    if (!inputUrl || typeof inputUrl !== "string") return inputUrl;

    const trimmed = inputUrl.trim();
    if (!trimmed) return trimmed;

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }

    const normalizedPath = trimmed.replace(/\\/g, "/");
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL ||
      "https://psbrand-backend-production.up.railway.app/api";

    let baseDomain;
    try {
      baseDomain = new URL(API_BASE_URL).origin;
    } catch {
      baseDomain = API_BASE_URL.replace(/\/api.*$/i, "");
    }

    if (normalizedPath.startsWith("/")) {
      return `${baseDomain}${normalizedPath}`;
    }

    return `${baseDomain}/${normalizedPath}`;
  };


  // Fetch pending printing orders (Status 1: PENDING_PRINTING) - Tab 0
  const fetchPendingPrintingOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const orders = await ordersService.getOrdersByStatus(ORDER_STATUS.PENDING_PRINTING);
      setPendingPrintingOrders(orders || []);
    } catch (error) {
      console.error('Error fetching pending printing orders:', error);
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
      console.error('Error fetching in printing orders:', error);
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
      console.log("Main Designers mapping loaded:", mapping, "Total:", Object.keys(mapping).length);
      setUsersMap(mapping);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsersMap({});
    }
  };

  // Load designs from Main Designers
  const loadDesigns = async () => {
    setLoadingDesigns(true);
    try {
      // Load users first to ensure mapping is ready
      await loadUsers();
      const data = await mainDesignerService.getDesigns();
      console.log("Loaded designs:", data);
      const allDesignsArray = Array.isArray(data) ? data : [];
      setAllDesigns(allDesignsArray);
      
      // Filter designs locally based on selected tab
      // Map tab index to status: 0 = waiting (1), 1 = accepted (2), 2 = rejected (3), 3 = returned (4)
      const statusMap = {
        0: 1,    // في الانتظار
        1: 2,    // مقبول
        2: 3,    // مرفوض
        3: 4     // مرتجع
      };
      
      const status = statusMap[statusTab];
      const filteredDesigns = allDesignsArray.filter(design => design.status === status);
      setDesigns(filteredDesigns);
    } catch (error) {
      console.error("Error loading designs:", error);
      setDesigns([]);
      setAllDesigns([]);
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
      console.log("No designer ID found for design:", design.id, design);
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
    
    console.log("Designer ID not found in mapping:", designerId, "Available IDs:", Object.keys(usersMap));
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
      console.error("Error downloading file:", error);
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
      console.error("Error downloading all files:", error);
    }
  };

  // Filter and sort designs (status filter is now handled by statusTab in loadDesigns)
  const getFilteredAndSortedDesigns = () => {
    let filtered = [...designs];

    // Status filter is now handled by statusTab in loadDesigns, so no need to filter by status here

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((design) => {
        if (!design.createdAt) return false;
        const designDate = new Date(design.createdAt);
        designDate.setHours(0, 0, 0, 0);
        return designDate.getTime() === filterDate.getTime();
      });
    }

    // Apply designer filter
    if (designerFilter !== "all") {
      filtered = filtered.filter((design) => {
        const designerId = design.creatorId || design.createdBy || design.userId || design.mainDesignerId || 
                          design.creator?.id || design.mainDesigner?.id;
        return String(designerId) === String(designerFilter) || Number(designerId) === Number(designerFilter);
      });
    }

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
      
      // Show success message
      setShowMessageNotification(true);
      const statusMessages = {
        1: "تم تحديث الحالة إلى في الانتظار بنجاح",
        2: "تم قبول التصميم بنجاح",
        3: "تم رفض التصميم بنجاح",
        4: "تم إرجاع التصميم بنجاح"
      };
      setNewMessageData({
        type: "success",
        message: statusMessages[newStatus] || "تم تحديث حالة التصميم بنجاح",
      });
    } catch (error) {
      console.error("Error updating design status:", error);
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

  // Load designs when Tab 4 is opened or when statusTab changes
  useEffect(() => {
    if (currentTab === 4) {
      loadDesigns();
    }
  }, [currentTab, statusTab]);

  useEffect(() => {
    fetchOrders(true); // Show loading on initial fetch only

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribeOrders;
    (async () => {
      try {
        unsubscribeOrders = await subscribeToOrderUpdates({
          onOrderCreated: () => {
            fetchOrders(false);
          },
          onOrderStatusChanged: (orderData) => {
            // Always refresh from server when status changes to get latest data
            fetchOrders(false).catch(err => {
              console.error('Error refreshing orders after status change:', err);
            });
          },
        });
      } catch (err) {
        console.error('Failed to connect to order updates hub:', err);
      }
    })();

    // Subscribe to SignalR updates for real-time design updates
    let unsubscribeDesigns;
    (async () => {
      try {
        console.log("🔌 Subscribing to DesignsHub...");
        unsubscribeDesigns = await subscribeToDesigns({
          onDesignCreated: (designData) => {
            console.log("✅ onDesignCreated callback called", designData, "currentTab:", currentTab);
            // Reload designs when a new design is created
            if (currentTab === 4) {
              console.log("🎨 Design created, reloading designs...", designData);
              loadDesigns();
            } else {
              console.log("⚠️ Design created but not on designs tab (currentTab:", currentTab, ")");
            }
          },
          onDesignUpdated: (designData) => {
            console.log("✅ onDesignUpdated callback called", designData, "currentTab:", currentTab);
            // Reload designs when a design is updated
            if (currentTab === 4) {
              console.log("🎨 Design updated, reloading designs...", designData);
              loadDesigns();
            }
          },
          onDesignStatusChanged: (designData) => {
            console.log("✅ onDesignStatusChanged callback called", designData, "currentTab:", currentTab);
            // Reload designs when design status changes
            if (currentTab === 4) {
              console.log("🎨 Design status changed, reloading designs...", designData);
              loadDesigns();
            }
          },
        });
        console.log("✅ DesignsHub subscription successful");
      } catch (err) {
        console.error('❌ Failed to connect to designs hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribeOrders === 'function') unsubscribeOrders();
      if (typeof unsubscribeDesigns === 'function') unsubscribeDesigns();
    };
  }, [currentTab]);

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
        setCurrentImageIndex(0);
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
    setCurrentImageIndex(0);
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
    setCurrentImageIndex(0);
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

  // Load cities and areas for modification display
  useEffect(() => {
    const loadCitiesAndAreas = async () => {
      try {
        const citiesData = await shipmentsService.getCities();
        const citiesArray = Array.isArray(citiesData) ? citiesData : [];
        setCities(citiesArray);
        
        // Load areas for all cities
        const allAreas = [];
        for (const city of citiesArray) {
          if (city && (city.id || city.Id)) {
            try {
              const cityId = city.id || city.Id;
              const areasData = await shipmentsService.getAreas(cityId);
              const areasArray = Array.isArray(areasData) ? areasData : [];
              areasArray.forEach(area => {
                if (area) {
                  allAreas.push({ 
                    ...area, 
                    id: area.id || area.Id,
                    name: area.name || area.Name,
                    cityId: cityId 
                  });
                }
              });
            } catch (error) {
              console.error(`Error loading areas for city ${city.id || city.Id}:`, error);
            }
          }
        }
        setAreas(allAreas);
      } catch (error) {
        console.error('Error loading cities:', error);
      }
    };
    loadCitiesAndAreas();
  }, []);

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
          const cityName = city.name || city.Name || city.cityName;
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

  // Get filtered orders based on current tab and search query
  const getFilteredOrders = () => {
    const orders = currentTab === 1 ? pendingPrintingOrders : inPrintingOrders;
    const search = currentTab === 1 ? searchQuery : searchQueryInPrinting;
    
    if (!search.trim()) return orders;
    
    return orders.filter((order) => {
      const clientName = order.client?.name || "";
      const clientPhone = order.client?.phone || "";
      const orderNumber = order.orderNumber || `#${order.id}` || "";
      const query = search.toLowerCase().trim();
      return (
        clientName.toLowerCase().includes(query) ||
        clientPhone.toString().includes(query) ||
        orderNumber.toLowerCase().includes(query)
      );
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate total rows (each design counts as a row)
  const totalRows = filteredOrders.reduce((total, order) => {
    const designs = order.orderDesigns || [];
    return total + (designs.length > 0 ? designs.length : 1); // If no designs, count as 1 row
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
    // Clear loading states when changing page
    setLoadingImage(null);
    activeImageLoads.current.clear();
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
    // Clear loading states when changing rows per page
    setLoadingImage(null);
    activeImageLoads.current.clear();
  };

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(0);
    setLoadingImage(null);
    activeImageLoads.current.clear();
  }, [currentTab, searchQuery, searchQueryInPrinting]);

    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundImage: calmPalette.background,
          paddingBottom: 6,
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: calmPalette.appBar,
            boxShadow: "0 12px 30px rgba(34, 26, 21, 0.25)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Toolbar sx={{ minHeight: 72 }}>
            <Typography
              variant="h5"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#f6f1eb",
              }}
            >
              PSBrand - لوحة مدير التصميم
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Messages Icon */}
              <Tooltip title="رسائل الإدمن">
                <Box sx={{ position: "relative" }}>
                  <IconButton
                    onClick={(e) => {
                      if (messagesAnchorEl) {
                        setMessagesAnchorEl(null);
                      } else {
                        setMessagesAnchorEl(e.currentTarget);
                      }
                      setShowMessageNotification(false);
                    }}
                    sx={{
                      color: "#f6f1eb",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 2,
                      position: "relative",
                      backgroundColor: messagesAnchorEl ? "rgba(255, 255, 255, 0.15)" : "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      },
                    }}
                  >
                    <MessageIcon />
                  </IconButton>
                  {/* Notification Badge */}
                  {unreadMessagesCount > 0 && (
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
                          "0%, 100%": {
                            transform: "scale(1)",
                            opacity: 1,
                          },
                          "50%": {
                            transform: "scale(1.4)",
                            opacity: 0.9,
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              </Tooltip>
              
              <Avatar
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.22)",
                  color: "#ffffff",
                  backdropFilter: "blur(6px)",
                }}
              >
                {user?.name?.charAt(0) || "م"}
              </Avatar>
              <Typography variant="body1" sx={{ fontWeight: 500, color: "#f6f1eb" }}>
                {user?.name || "مدير التصميم"}
              </Typography>
              <IconButton
                color="inherit"
                onClick={handleLogout}
                sx={{
                  color: "#f6f1eb",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 2,
                }}
              >
                <Logout />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Public Messages Banner - Messages sent to all users */}
        {publicMessages.length > 0 && (
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 1000,
              background: calmPalette.surface,
              py: 1.5,
              width: "100%",
              overflow: "hidden",
              borderBottom: "2px solid rgba(94, 78, 62, 0.2)",
              boxShadow: calmPalette.shadow,
              backdropFilter: "blur(8px)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                width: "100%",
                overflow: "hidden",
              }}
            >
              {/* Announcement Label - Fixed on left */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  px: 2.5,
                  background: "linear-gradient(135deg, rgba(97, 79, 65, 0.95) 0%, rgba(73, 59, 48, 0.95) 100%)",
                  color: calmPalette.statCards[0].highlight,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                  zIndex: 2,
                  borderRight: "2px solid rgba(94, 78, 62, 0.3)",
                  boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
                }}
              >
                <Typography
                  sx={{
                    color: calmPalette.statCards[0].highlight,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.1em",
                  }}
                >
                  📢 إعلان عام
                </Typography>
              </Box>

              {/* Scrolling Messages */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  marginLeft: "130px",
                  marginRight: "50px",
                  animation: "scroll 40s linear infinite",
                  "@keyframes scroll": {
                    "0%": {
                      transform: "translateX(100%)",
                    },
                    "100%": {
                      transform: "translateX(-100%)",
                    },
                  },
                }}
              >
                {/* Messages */}
                {publicMessages.map((message, index) => (
                  <Box
                    key={`${message.id}-${index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexShrink: 0,
                      minWidth: "fit-content",
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textPrimary,
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.title || "إعلان عام"}:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textSecondary,
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: calmPalette.textMuted,
                        display: "inline-block",
                        mx: 1.5,
                      }}
                    />
                  </Box>
                ))}
                {/* Duplicate for seamless loop */}
                {publicMessages.map((message, index) => (
                  <Box
                    key={`${message.id}-dup-${index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexShrink: 0,
                      minWidth: "fit-content",
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textPrimary,
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.title || "إعلان عام"}:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.textSecondary,
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: calmPalette.textMuted,
                        display: "inline-block",
                        mx: 1.5,
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Close button - Fixed on right */}
              {publicMessages.length > 0 && (
                <IconButton
                  size="small"
                  onClick={() => handleHideMessage(publicMessages[0].id)}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: calmPalette.textMuted,
                    width: 28,
                    height: 28,
                    zIndex: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(94, 78, 62, 0.1)",
                      color: calmPalette.textPrimary,
                      transform: "translateY(-50%) rotate(90deg)",
                    },
                  }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        )}

        <Container maxWidth="xl" sx={{ paddingY: 5 }}>

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
              {currentTab !== 3 && currentTab !== 4 && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                <Box sx={{ flex: '0 0 auto', width: '50%', position: 'relative' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                    value={currentTab === 1 ? searchQuery : searchQueryInPrinting}
                    onChange={(e) => {
                      if (currentTab === 1) {
                        setSearchQuery(e.target.value);
                      } else {
                        setSearchQueryInPrinting(e.target.value);
                      }
                    }}
                  InputProps={{
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: 1,
                          color: (currentTab === 1 ? searchQuery : searchQueryInPrinting) ? calmPalette.primary : 'text.secondary',
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
                        fontWeight: 500,
                      },
                    },
                  }}
                />
                {(currentTab === 1 ? searchQuery : searchQueryInPrinting) && (
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
            </Box>
          )}

          {currentTab === 3 ? (
            <EmployeeAttendanceCalendar />
          ) : currentTab === 4 ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  التصاميم الواردة من المصممين ({getFilteredAndSortedDesigns().length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadDesigns}
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
                          label={allDesigns.filter(d => d.status === 1).length}
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
                          مقبول
                        </Typography>
                        <Chip
                          label={allDesigns.filter(d => d.status === 2).length}
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
                          مرفوض
                        </Typography>
                        <Chip
                          label={allDesigns.filter(d => d.status === 3).length}
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
                          label={allDesigns.filter(d => d.status === 4).length}
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
                {(dateFilter || designerFilter !== "all") && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDateFilter("");
                      setDesignerFilter("all");
                    }}
                    sx={{ color: calmPalette.textSecondary }}
                  >
                    إلغاء الفلترة
                  </Button>
                )}
              </Box>

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
                                  setSelectedImage(design.designImageUrl);
                                  setImageDialogOpen(true);
                                }}
                              >
                                <img
                                  src={design.designImageUrl}
                                  alt={design.designName}
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
                                    ? "مقبول"
                                    : design.status === 3
                                    ? "مرفوض"
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
                                      
                                      // Generate download URL for image
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
                                قبول
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
                                رفض
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
            </Box>
          ) : (
            <>
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
                      
                      // If no design (order has no designs)
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
                                onClick={() => handleNotesClick(order)}
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
                              onClick={() => handleViewOrder(order)}
                              sx={{ minWidth: 90, flexShrink: 0 }}
                            >
                              عرض
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleStatusUpdate(order.id, order.status)}
                              disabled={
                                (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
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
                                order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"
                              )}
                            </Button>
                          </Box>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // Calculate rowSpan for visible designs in current page
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
                                // Support both old format (mockupImageUrl) and new format (mockupImageUrls array)
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
                                      data-image-placeholder={isExcluded && !cachedImage ? "true" : "false"}
                                      data-order-id={order.id}
                                      data-design-id={design.id}
                                    >
                                      {isLoading ? (
                                        <CircularProgress size={20} />
                                      ) : displayImage ? (
                                        <img 
                                          src={displayImage} 
                                          alt={design.designName}
                                          onClick={() => {
                                            if (displayImage && displayImage !== 'image_data_excluded') {
                                              setSelectedImage(displayImage);
                                              setCurrentImageIndex(0);
                                              setImageDialogOpen(true);
                                            }
                                          }}
                                          onError={(e) => {
                                            e.target.src = '';
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) {
                                              e.target.nextSibling.style.display = 'flex';
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
                                        <Box 
                                          sx={{ 
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: "100%", 
                                            height: "100%", 
                                            color: calmPalette.textMuted,
                                            fontSize: '0.6rem',
                                            textAlign: 'center',
                                            px: 0.5
                                          }}
                                        >
                                          <ImageIcon sx={{ fontSize: 16, mb: 0.3, opacity: 0.5 }} />
                                          <span style={{ fontSize: '0.55rem' }}>تحميل...</span>
                                        </Box>
                                      )}
                                      <Box 
                                        sx={{ 
                                          display: 'none',
                                          width: "100%", 
                                          height: "100%", 
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                            bgcolor: calmPalette.surfaceHover,
                                          borderRadius: "4px",
                                          fontSize: '0.7rem',
                                            color: calmPalette.textPrimary
                                        }}
                                      >
                                        غير متوفرة
                                      </Box>
                                    </Box>
                                    {validImages.length > 1 && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          minWidth: 'auto',
                                          px: 1,
                                          py: 0.5,
                                          fontSize: '0.7rem',
                                          height: 'fit-content'
                                        }}
                                        onClick={() => {
                                          setSelectedImage(validImages);
                                          setCurrentImageIndex(0);
                                          setImageDialogOpen(true);
                                        }}
                                      >
                                        +{validImages.length - 1}
                                      </Button>
                                    )}
                                  </Box>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // Support both old format (printFileUrl) and new format (printFileUrls array)
                                const fileUrls = design?.printFileUrls || (design?.printFileUrl ? [design.printFileUrl] : []);
                                const validFiles = fileUrls.filter(url => url && url !== "placeholder_print.pdf");
                                
                                if (validFiles.length === 0) return "-";
                                
                                const firstFile = validFiles[0];
                                const isExcluded = firstFile === 'image_data_excluded';
                                
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    {isExcluded ? (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={loadingImage === `file-${order.id}-${design.id}` ? <CircularProgress size={14} /> : <PictureAsPdf />}
                                        onClick={() => handleFileClick(firstFile, order.id, design.id)}
                                        disabled={loadingImage === `file-${order.id}-${design.id}`}
                                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                                      >
                                        تحميل
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() => handleFileClick(firstFile, order.id, design.id)}
                                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                                      >
                                        PDF
                                      </Button>
                                    )}
                                    {validFiles.length > 1 && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          minWidth: 'auto',
                                          px: 1,
                                          py: 0.5,
                                          fontSize: '0.7rem',
                                          height: 'fit-content'
                                        }}
                                        onClick={() => {
                                          // Open all files - could show a dialog or download all
                                          validFiles.forEach((url, idx) => {
                                            setTimeout(() => handleFileClick(url, order.id, design.id), idx * 200);
                                          });
                                        }}
                                      >
                                        +{validFiles.length - 1}
                                      </Button>
                                    )}
                                  </Box>
                                );
                              })()}
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
                                    onClick={() => handleNotesClick(order)}
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
                                  onClick={() => handleViewOrder(order)}
                                  sx={{ minWidth: 90, flexShrink: 0 }}
                                >
                                  عرض
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleStatusUpdate(order.id, order.status)}
                                  disabled={
                                    (order.status !== ORDER_STATUS.PENDING_PRINTING && order.status !== ORDER_STATUS.IN_PRINTING) ||
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
                                    order.status === ORDER_STATUS.PENDING_PRINTING ? "بدء الطباعة" : 
                                    order.status === ORDER_STATUS.IN_PRINTING ? "إرسال للتحضير" : "غير متاح"
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
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
            </>
          )}
          </>
        )}
        </Paper>
      </Container>

      {/* Details Dialog */}
      <GlassDialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        title="تفاصيل الطلب"
        subtitle={selectedOrder?.orderNumber}
        contentSx={{ padding: 0 }}
        actions={
          <Button onClick={handleCloseDialog} variant="contained">
            إغلاق
          </Button>
        }
      >
        {selectedOrder && (
          <Box sx={{ padding: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات الطلب
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="رقم الطلب"
                    value={selectedOrder.orderNumber || `#${selectedOrder.id}`}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="الحالة"
                    value={
                      <Chip
                        label={getStatusText(selectedOrder.status)}
                        color={getStatusChipColor(selectedOrder.status)}
                        size="small"
                      />
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="التاريخ" value={formatDateTime(selectedOrder.orderDate)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="إجمالي الكمية"
                    value={
                      totalOrderQuantity || totalOrderQuantity === 0 ? totalOrderQuantity : "-"
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المجموع الفرعي" value={formatCurrency(selectedOrder.subTotal)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="التخفيض" value={discountDisplay} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="رسوم التوصيل"
                    value={formatCurrency(selectedOrder.deliveryFee ?? selectedOrder.deliveryPrice)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المبلغ الإجمالي"
                    value={formatCurrency(selectedOrder.totalAmount)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="يحتاج تصوير"
                    value={
                      selectedOrder.needsPhotography ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CameraAlt sx={{ color: 'primary.main' }} />
                          <Typography variant="body2">نعم</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">لا</Typography>
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="مصدر الطلب"
                    value={
                      selectedOrder.orderSource === 1 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            component="svg"
                            sx={{
                              width: 20,
                              height: 20,
                              fill: "#000000",
                            }}
                            viewBox="0 0 24 24"
                          >
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </Box>
                          <Typography variant="body2">تيك توك</Typography>
                        </Box>
                      ) : selectedOrder.orderSource === 2 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            component="svg"
                            sx={{
                              width: 20,
                              height: 20,
                              fill: "#E4405F",
                            }}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </Box>
                          <Typography variant="body2">انستجرام</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
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

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                معلومات العميل
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الاسم" value={selectedOrder.client?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الهاتف" value={selectedOrder.client?.phone || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المدينة" value={selectedOrder.province || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="المنطقة" value={selectedOrder.district || "-"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="الدولة" value={selectedOrder.country || "-"} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="البائع" value={selectedOrder.designer?.name || "-"} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem label="المعد" value={selectedOrder.preparer?.name || "غير محدد"} />
                </Grid>
              </Grid>
            </Box>

            {orderNotes && (
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

            {selectedOrder?.isModified && user?.role === USER_ROLES.ADMIN && (
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
            )}

            {selectedOrderDesigns.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    التصاميم ({selectedOrderDesigns.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {selectedOrderDesigns.map((design, index) => {
                      const designItems = design?.orderDesignItems || [];
                      const designQuantity =
                        designItems.reduce(
                          (sum, item) => sum + (item?.quantity || 0),
                          0
                        ) || 0;

                      return (
                        <Box
                          key={design.id || index}
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
                                  label={`قيمة التصميم: ${formatCurrency(design.totalPrice)}`}
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
                                      <TableCell>{getFabricLabel(item)}</TableCell>
                                      <TableCell>{getColorLabel(item)}</TableCell>
                                      <TableCell align="center">
                                        {getSizeLabel(item)}
                                      </TableCell>
                                      <TableCell align="center">
                                        {item?.quantity ?? "-"}
                                      </TableCell>
                                      <TableCell align="center">
                                        {formatCurrency(item?.unitPrice)}
                                      </TableCell>
                                      <TableCell align="center">
                                        {formatCurrency(item?.totalPrice)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}

                          {(() => {
                            const imageUrls =
                              design?.mockupImageUrls ||
                              (design?.mockupImageUrl ? [design.mockupImageUrl] : []);
                            const validImages = imageUrls.filter(
                              (url) => url && url !== "placeholder_mockup.jpg"
                            );

                            if (validImages.length === 0) return null;

                            return (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  الصور ({validImages.length})
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                  {validImages.map((imageUrl, idx) =>
                                    imageUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage === `image-${selectedOrder.id}-${design.id}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <ImageIcon />
                                          )
                                        }
                                        onClick={() =>
                                          handleImageClick(imageUrl, selectedOrder.id, design.id)
                                        }
                                        disabled={
                                          loadingImage === `image-${selectedOrder.id}-${design.id}`
                                        }
                                      >
                                        عرض الصورة {idx + 1}
                                      </Button>
                                    ) : (
                                      (() => {
                                        const displayUrl = getFullUrl(imageUrl);
                                        return (
                                          <Box
                                            key={idx}
                                            sx={{
                                              position: "relative",
                                              cursor: "pointer",
                                              "&:hover": { opacity: 0.8 },
                                            }}
                                          >
                                            <img
                                              src={displayUrl}
                                              alt={`${design.designName} - صورة ${idx + 1}`}
                                              onClick={() =>
                                                handleImageClick(imageUrl, selectedOrder.id, design.id)
                                              }
                                              style={{
                                                maxWidth: "150px",
                                                maxHeight: "150px",
                                                height: "auto",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                transition: "transform 0.2s",
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.transform = "scale(1.05)")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.transform = "scale(1)")
                                              }
                                            />
                                          </Box>
                                        );
                                      })()
                                    )
                                  )}
                                </Box>
                              </Box>
                            );
                          })()}

                          {(() => {
                            const fileUrls =
                              design?.printFileUrls ||
                              (design?.printFileUrl ? [design.printFileUrl] : []);
                            const validFiles = fileUrls.filter(
                              (url) => url && url !== "placeholder_print.pdf"
                            );

                            if (validFiles.length === 0) return null;

                            return (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  ملفات التصميم ({validFiles.length})
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                  {validFiles.map((fileUrl, idx) =>
                                    fileUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage === `file-${selectedOrder.id}-${design.id}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <PictureAsPdf />
                                          )
                                        }
                                        onClick={() =>
                                          handleFileClick(fileUrl, selectedOrder.id, design.id)
                                        }
                                        disabled={
                                          loadingImage === `file-${selectedOrder.id}-${design.id}`
                                        }
                                      >
                                        تحميل الملف {idx + 1}
                                      </Button>
                                    ) : (
                                      <Button
                                        key={idx}
                                        variant="contained"
                                        size="small"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() =>
                                          handleFileClick(fileUrl, selectedOrder.id, design.id)
                                        }
                                      >
                                        📄 ملف {idx + 1}
                                      </Button>
                                    )
                                  )}
                                </Box>
                              </Box>
                            );
                          })()}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                startIcon={<Note />}
                onClick={() => handleNotesClick(selectedOrder)}
                sx={{ minWidth: 200 }}
              >
                عرض/تعديل الملاحظات
              </Button>
            </Box>
          </Box>
        )}
      </GlassDialog>

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {Array.isArray(selectedImage) 
              ? `معاينة الصور (${currentImageIndex + 1} / ${selectedImage.length})`
              : 'معاينة الصورة'}
          </Typography>
          <IconButton onClick={handleCloseImageDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 2 }}>
          {(() => {
            // Handle both single image (string) and multiple images (array)
            const images = Array.isArray(selectedImage) ? selectedImage : (selectedImage ? [selectedImage] : []);
            const currentImage = images[currentImageIndex];
            
            if (!currentImage || currentImage === 'image_data_excluded') {
              return (
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>الصورة غير متوفرة</Typography>
                  <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات لتقليل حجم البيانات</Typography>
                </Box>
              );
            }
            
            return (
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                {images.length > 1 && (
                  <>
                    <IconButton
                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      sx={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                        zIndex: 1
                      }}
                    >
                      <ArrowBack />
                    </IconButton>
                    <IconButton
                      onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                      sx={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                        zIndex: 1
                      }}
                    >
                      <ArrowForward />
                    </IconButton>
                  </>
                )}
                <img 
                  src={currentImage} 
                  alt={`معاينة الصورة ${currentImageIndex + 1}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh', 
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
                <Box sx={{ 
                  display: 'none',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>لا يمكن عرض الصورة</Typography>
                  <Typography variant="body2">الصورة غير متوفرة في قائمة الطلبات</Typography>
                </Box>
                {images.length > 1 && (
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 2,
                    padding: '4px 8px'
                  }}>
                    {images.map((_, idx) => (
                      <Box
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: idx === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

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
            {selectedDesignForStatus?.actionType === "approve" ? "قبول التصميم" : selectedDesignForStatus?.actionType === "return" ? "إرجاع التصميم" : "رفض التصميم"}
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
              ? "قبول"
              : selectedDesignForStatus?.actionType === "return"
              ? "إرجاع"
              : "رفض"}
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
              label="مقبول"
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
          <ListItemText primary="مقبول" />
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
              label="مرفوض"
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
          <ListItemText primary="مرفوض" />
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
    </Box>
  );
};

export default DesignManagerDashboard;


