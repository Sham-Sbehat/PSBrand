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
  TextField,
  CircularProgress,
  TablePagination,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Alert,
  Popover,
} from "@mui/material";
import {
  Logout,
  Inventory,
  Close,
  Note,
  Schedule,
  Print,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  Visibility,
  Search,
  CameraAlt,
  LocalShipping,
  CalendarToday,
  Message as MessageIcon,
  Refresh,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService, shipmentsService, colorsService, sizesService, fabricTypesService } from "../services/api";
import { Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { subscribeToOrderUpdates, subscribeToMessages } from "../services/realtime";
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, SIZE_LABELS, FABRIC_TYPE_LABELS, COLOR_LABELS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import GlassDialog from "../components/common/GlassDialog";
import WelcomePage from "../components/common/WelcomePage";
import MessagesTab from "../components/common/MessagesTab";
import calmPalette from "../theme/calmPalette";
import { messagesService } from "../services/api";

const PackagerDashboard = () => {
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
  const [packagedOrders, setPackagedOrders] = useState([]); // Tab 1: Status 8 (IN_PACKAGING)
  const [completedOrders, setCompletedOrders] = useState([]); // Tab 2: Status 4 (COMPLETED)
  const [confirmedDeliveryOrders, setConfirmedDeliveryOrders] = useState([]); // Tab 3: Confirmed Delivery Orders
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Can be string or array
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryPackaged, setSearchQueryPackaged] = useState('');
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const activeImageLoads = useRef(new Set()); // Track active image loads to prevent duplicates
  const MAX_CONCURRENT_LOADS = 3; // Maximum concurrent image loads
  const [page, setPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Number of rows per page
  const [openShippingDialog, setOpenShippingDialog] = useState(false);
  const [orderToShip, setOrderToShip] = useState(null);
  const [shippingNotes, setShippingNotes] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedDate, setSelectedDate] = useState(null); // No date filter by default
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(false);
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

  // Fetch all orders

  // Fetch packaged orders (Status 8: IN_PACKAGING) - Tab 0
  const fetchPackagedOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const packagingOrders = await ordersService.getOrdersByStatus(ORDER_STATUS.IN_PACKAGING);
      setPackagedOrders(packagingOrders || []);
    } catch (error) {
      console.error('Error fetching packaged orders:', error);
      setPackagedOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch completed orders (Status 4: COMPLETED) - Tab 1
  // Fetch orders from selected date (only if date is provided)
  const fetchCompletedOrders = async (showLoading = false, dateString = null) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Only use date if explicitly provided (from date picker)
      // If dateString is null, fetch all completed orders without date filter
      let dateISOString = null;
      if (dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        // Create date in UTC at start of day to avoid timezone issues
        dateISOString = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
      }
      
      const completedOrders = await ordersService.getOrdersByStatus(ORDER_STATUS.COMPLETED, dateISOString);
      setCompletedOrders(completedOrders || []);
    } catch (error) {
      console.error('Error fetching completed orders:', error);
      setCompletedOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch confirmed delivery orders - Tab 2
  const fetchConfirmedDeliveryOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await ordersService.getConfirmedDeliveryOrders();
      
      // Handle different response formats
      let orders = [];
      if (Array.isArray(response)) {
        orders = response;
      } else if (response && Array.isArray(response.data)) {
        orders = response.data;
      } else if (response && Array.isArray(response.orders)) {
        orders = response.orders;
      } else if (response && typeof response === 'object') {
        // Check if response has order properties directly (single order object)
        // or if it's a wrapper object
        if (response.id || response.orderId || response.orderNumber) {
          // It's a single order object
          orders = [response];
        } else if (response.items && Array.isArray(response.items)) {
          orders = response.items;
        } else {
          // Try to find any array property
          const arrayKeys = Object.keys(response).filter(key => Array.isArray(response[key]));
          if (arrayKeys.length > 0) {
            orders = response[arrayKeys[0]];
          } else {
            // Last resort: convert single object to array
            orders = [response];
          }
        }
      }
      
      setConfirmedDeliveryOrders(orders);
    } catch (error) {
      console.error('Error fetching confirmed delivery orders:', error);
      setConfirmedDeliveryOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Handle date change for completed orders
  const handleDateChange = async (event) => {
    const newDateString = event.target.value;
    setSelectedDate(newDateString || null);
    
    // If date is cleared, fetch all orders without date filter
    // If date is selected, fetch orders for that date
    await fetchCompletedOrders(false, newDateString || null);
  };

  const fetchOrders = async (showLoading = false) => {
    await Promise.all([
      fetchPackagedOrders(showLoading),
      fetchCompletedOrders(false), // Don't show loading for second call
      fetchConfirmedDeliveryOrders(false) // Don't show loading for third call
    ]);
  };

  // Load colors, sizes, and fabric types on component mount
  useEffect(() => {
    loadColors();
    loadSizes();
    loadFabricTypes();
  }, []);

  // Play notification sound
  const playMessageSound = () => {
    console.log("🔔 Attempting to play message sound...");
    try {
      // Create or reuse audio context
      let audioContext = window.messageAudioContext;
      if (!audioContext) {
        console.log("Creating new audio context...");
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.messageAudioContext = audioContext;
      }
      
      console.log("Audio context state:", audioContext.state);
      
      // Always try to resume first (browsers require user interaction)
      const playAudio = () => {
        if (audioContext.state === 'suspended') {
          console.log("Resuming suspended audio context...");
          audioContext.resume().then(() => {
            console.log("Audio context resumed, playing sound...");
            playSound(audioContext);
          }).catch((error) => {
            console.error("Could not resume audio context:", error);
            // Try to play anyway
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
      
      // Try to resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playAudio();
        }).catch(() => {
          // If resume fails, try to play anyway
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
      
      // Create a pleasant notification sound (bell-like) - more noticeable and louder
      const frequencies = [523.25, 659.25, 783.99]; // C, E, G
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = baseTime + (index * 0.08);
        const duration = 0.25; // Longer duration
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.05); // Louder
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
      
      // Count messages created in last 24 hours as "new"
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
      // Get hidden messages from localStorage first
      let hiddenIds = [];
      try {
        const saved = localStorage.getItem('hiddenPublicMessages');
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
      // Save to localStorage
      localStorage.setItem('hiddenPublicMessages', JSON.stringify(updated));
      return updated;
    });
    // Remove from visible messages immediately
    setPublicMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // Initialize audio context on user interaction (required by browsers)
  useEffect(() => {
    const initAudio = () => {
      if (!window.messageAudioContext) {
        try {
          window.messageAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          // Resume immediately if possible
          if (window.messageAudioContext.state === 'suspended') {
            window.messageAudioContext.resume().catch(() => {});
          }
        } catch (error) {
          console.log("Audio context initialization failed:", error);
        }
      }
    };

    // Initialize on first user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    fetchOrders(true); // Show loading on initial fetch only
    if (user?.id) {
      loadMessagesCount();
    }

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribeOrderUpdates;
    (async () => {
      try {
        unsubscribeOrderUpdates = await subscribeToOrderUpdates({
          onOrderCreated: () => {
            fetchOrders(false);
          },
          onOrderStatusChanged: (orderData) => {
            // Always refresh from server when status changes to get latest data
            fetchOrders(false).then(() => {
              // The state will be updated by fetchOrders
            }).catch(err => {
              console.error('Error refreshing orders after status change:', err);
            });
          },
        });
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    // Subscribe to Messages Hub for real-time message updates
    let unsubscribeMessages;
    (async () => {
      try {
        unsubscribeMessages = await subscribeToMessages({
          onNewMessage: (message) => {
            console.log("💬💬💬 New message received in PackagerDashboard from messagesHub:", message);
            console.log("💬 Setting notification state...");
            setNewMessageReceived(message);
            setNewMessageData(message);
            setShowMessageNotification(true);
            console.log("💬 Notification state set to true, showMessageNotification:", true);
            
            // Play sound
            console.log("💬 Playing sound...");
            playMessageSound();
            
            // Reload count
            loadMessagesCount();
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
      if (typeof unsubscribeOrderUpdates === 'function') unsubscribeOrderUpdates();
      if (typeof unsubscribeMessages === 'function') unsubscribeMessages();
    };
  }, [user?.id]);

  // Debug: Monitor showMessageNotification changes
  useEffect(() => {
    console.log("🔔 showMessageNotification changed to:", showMessageNotification);
    console.log("🔔 newMessageData:", newMessageData);
  }, [showMessageNotification, newMessageData]);

  // Load hidden message IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hiddenPublicMessages');
      if (saved) {
        const hiddenIds = JSON.parse(saved);
        setHiddenMessageIds(hiddenIds);
      }
    } catch (e) {
      console.error("Error reading hidden messages from localStorage:", e);
    }
  }, []);

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
  }, [completedOrders.length, packagedOrders.length]); // Re-run only when orders count changes

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
    // Update notes in the appropriate list
    if (selectedOrder.status === ORDER_STATUS.COMPLETED) {
      setCompletedOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    } else if (selectedOrder.status === ORDER_STATUS.IN_PACKAGING) {
      setPackagedOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, notes: updatedNotes } : order
      ));
    }
  };

  // Handle status update - تحويل من في مرحلة التغليف إلى مكتمل
  const handleStatusUpdate = async (orderId, currentStatus) => {
    setUpdatingOrderId(orderId);
    try {
      if (currentStatus === ORDER_STATUS.IN_PACKAGING) {
        // Move from "في مرحلة التغليف" to "مكتمل"
        await orderStatusService.setCompleted(orderId);
      }
      
      // After successful update, refresh the orders list
      setTimeout(() => {
        fetchOrders(false); // Don't show loading after action
      }, 500);
      
    } catch (error) {
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle shipping click - إرسال الطلب لشركة التوصيل
  const handleShippingClick = (order) => {
    // التحقق من أن الطلب مكتمل قبل السماح بالإرسال
    const numericStatus = typeof order.status === 'number' 
      ? order.status 
      : parseInt(order.status, 10);
    
    if (numericStatus !== ORDER_STATUS.COMPLETED) {
      setSnackbar({
        open: true,
        message: 'الطلب يجب أن يكون مكتملاً لإرساله لشركة التوصيل',
        severity: 'warning'
      });
      return;
    }
    
    setOrderToShip(order);
    setShippingNotes('');
    setOpenShippingDialog(true);
  };

  const handleCloseShippingDialog = () => {
    if (shippingLoading) return;
    setOpenShippingDialog(false);
    setOrderToShip(null);
    setShippingNotes('');
  };

  const handleConfirmShipping = async () => {
    if (!orderToShip) return;

    setShippingLoading(true);
    try {
      await shipmentsService.createShipment(orderToShip.id, shippingNotes);
      
      // Set order status to sent to delivery company after successful shipment
      try {
        await orderStatusService.setSentToDeliveryCompany(orderToShip.id);
      } catch (statusError) {
        // Don't show error to user - shipment was created successfully
      }
      
      // Close dialog first
      handleCloseShippingDialog();
      
      // Show success toast
      setSnackbar({
        open: true,
        message: `تم إرسال الطلب ${orderToShip.orderNumber || `#${orderToShip.id}`} إلى شركة التوصيل بنجاح`,
        severity: 'success'
      });
      
      // Refresh orders list from server
      try {
        await fetchOrders(false);
      } catch (refreshError) {
        console.error('Error refreshing orders after shipping:', refreshError);
      }
    } catch (error) {
      console.error('Error sending order to delivery company:', error);
      
      // Close dialog first even on error
      handleCloseShippingDialog();
      
      // Show error toast
      setSnackbar({
        open: true,
        message: `حدث خطأ أثناء إرسال الطلب إلى شركة التوصيل: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`,
        severity: 'error'
      });
    } finally {
      setShippingLoading(false);
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
      const sizesArray = Array.isArray(sizesData) ? sizesData : [];
      setSizes(sizesArray);
    } catch (error) {
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
    
    // New format: check if sizeId is null (legacy order)
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
        // Check if it's already a name from API
        if (sizes.length > 0) {
          const sizeObj = sizes.find(s => 
            (s.nameAr && s.nameAr === size) || 
            (s.name && s.name === size)
          );
          if (sizeObj) {
            return sizeObj.name || sizeObj.nameAr || "-";
          }
        }
        return size;
      }
      
      // Use constants for legacy values
      if (SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      
      // Search in sizes array by legacyValue (not id)
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
        
        // Try to match by converting ID to string and comparing
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

  // Filter orders based on current tab
  const getFilteredOrders = () => {
    const orders = currentTab === 1 ? packagedOrders : currentTab === 3 ? completedOrders : confirmedDeliveryOrders;
    const search = currentTab === 1 ? searchQueryPackaged : searchQuery;
    
    // Ensure orders is always an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    if (!search.trim()) return ordersArray;
    
    return ordersArray.filter((order) => {
      const clientName = order.client?.name || "";
      const clientPhone = order.client?.phone || "";
      const orderNumber = order.orderNumber || `#${order.id}` || "";
      const query = search.toLowerCase().trim();
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

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
    setLoadingImage(null);
    activeImageLoads.current.clear();
  }, []);


  const handleTabChange = async (event, newValue) => {
    setCurrentTab(newValue);
    // Fetch confirmed delivery orders when switching to tab 2
    if (newValue === 2) {
      await fetchConfirmedDeliveryOrders(true);
    }
  };

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
              PSBrand - لوحة مسؤول التغليف
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
                      setShowMessageNotification(false); // Hide notification when opening
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
                {user?.name || "مسؤول التغليف"}
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
                  animation: "scroll 20s linear infinite",
                  "@keyframes scroll": {
                    "0%": {
                      transform: "translateX(0)",
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
          {/* Tabs */}
          <Box sx={{ marginBottom: 3 }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
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
                label="الرسائل"
                icon={<MessageIcon />}
                iconPosition="start"
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: calmPalette.textMuted,
                  "&.Mui-selected": {
                    color: "#f7f2ea",
                  },
                }}
              />
              <Tab
                label={`في مرحلة التغليف (${packagedOrders.length})`}
                icon={<Inventory />}
                iconPosition="start"
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: calmPalette.textMuted,
                  "&.Mui-selected": {
                    color: "#f7f2ea",
                  },
                }}
              />
              <Tab
                label={`الطلبات المكتملة (${completedOrders.length})`}
                icon={<CheckCircle />}
                iconPosition="start"
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: calmPalette.textMuted,
                  "&.Mui-selected": {
                    color: "#f7f2ea",
                  },
                }}
              />
              <Tab
                label={`طلبات التوصيل المؤكدة (${confirmedDeliveryOrders.length})`}
                icon={<LocalShipping />}
                iconPosition="start"
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: calmPalette.textMuted,
                  "&.Mui-selected": {
                    color: "#f7f2ea",
                  },
                }}
              />
            </Tabs>
          </Box>

          {/* Welcome Page for Messages Tab */}
          {currentTab === 0 && (
            <WelcomePage onNewMessage={newMessageReceived} />
          )}

          {/* Orders Table for other tabs */}
          {currentTab !== 0 && (
            <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 3,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {currentTab === 1 && <Inventory sx={{ verticalAlign: "middle", mr: 1 }} />}
              {currentTab === 1 && <CheckCircle sx={{ verticalAlign: "middle", mr: 1 }} />}
              {currentTab === 3 && <LocalShipping sx={{ verticalAlign: "middle", mr: 1 }} />}
              {currentTab === 1 
                ? `في مرحلة التغليف (${filteredOrders.length})`
                : currentTab === 1
                ? `الطلبات المكتملة (${filteredOrders.length})`
                : `طلبات التوصيل المؤكدة (${filteredOrders.length})`
              }
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Date picker for completed orders tab */}
              {currentTab === 1 && (
                <TextField
                  type="date"
                  size="small"
                  label="اختر التاريخ (اختياري)"
                  value={selectedDate || ''}
                  onChange={handleDateChange}
                  onClick={(e) => {
                    // Open date picker when clicking anywhere on the input
                    const input = e.currentTarget.querySelector('input');
                    if (input) {
                      input.showPicker?.();
                    }
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: 1,
                          color: calmPalette.primary,
                          pointerEvents: 'none', // Allow clicks to pass through to input
                        }}
                      >
                        <CalendarToday fontSize="small" />
                      </Box>
                    ),
                  }}
                  inputProps={{
                    onClick: (e) => {
                      // Open date picker when clicking on the input field
                      e.currentTarget.showPicker?.();
                    },
                  }}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.85)",
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(94, 78, 62, 0.1)',
                    minWidth: 200,
                    cursor: 'pointer',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      paddingLeft: 1,
                      cursor: 'pointer',
                      '& input': {
                        cursor: 'pointer',
                      },
                      '& fieldset': {
                        borderColor: 'rgba(94, 78, 62, 0.2)',
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: calmPalette.primary + '80',
                        borderWidth: 2,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: calmPalette.primary,
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 400, position: 'relative' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                  value={currentTab === 1 ? searchQueryPackaged : searchQuery}
                  onChange={(e) => {
                    if (currentTab === 1) {
                      setSearchQueryPackaged(e.target.value);
                    } else {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: 1,
                          color: (currentTab === 1 ? searchQueryPackaged : searchQuery) ? calmPalette.primary : 'text.secondary',
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
                 {((currentTab === 1 && searchQuery) || (currentTab === 1 && searchQueryPackaged)) && (
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
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
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
                      paginatedRows.map(({ order, design, isFirstRow }, index) => {
                      const status = getStatusLabel(order.status);
                      const designs = order.orderDesigns || [];
                      const isEven = index % 2 === 0;
                      
                      // If no design (order has no designs)
                      if (!design) {
                        return (
                          <TableRow
                            key={`order-${order.id}`}
                            hover
                            sx={{
                              backgroundColor: currentTab === 1 
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : currentTab === 1
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : currentTab === 3
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : (isEven ? 'rgba(0, 0, 0, 0.02)' : 'transparent'),
                              "&:hover": {
                                backgroundColor: currentTab === 1 
                                  ? 'rgba(75, 61, 49, 0.25)' 
                                  : currentTab === 1
                                  ? 'rgba(75, 61, 49, 0.25)'
                                  : currentTab === 3
                                  ? 'rgba(75, 61, 49, 0.25)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
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
                            {/* No button for completed orders - preparer sends to packaging */}
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
                              backgroundColor: currentTab === 1 
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : currentTab === 1
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : currentTab === 3
                                ? (isEven ? 'rgba(75, 61, 49, 0.15)' : 'rgba(96, 78, 62, 0.08)')
                                : (isEven ? 'rgba(0, 0, 0, 0.02)' : 'transparent'),
                              "&:hover": {
                                backgroundColor: currentTab === 1 
                                  ? 'rgba(75, 61, 49, 0.25)' 
                                  : currentTab === 1
                                  ? 'rgba(75, 61, 49, 0.25)'
                                  : currentTab === 3
                                  ? 'rgba(75, 61, 49, 0.25)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
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
                                {/* Show "مكتمل" button only for IN_PACKAGING orders (Tab 0) */}
                                {currentTab === 1 && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleStatusUpdate(order.id, order.status)}
                                    disabled={
                                      order.status !== ORDER_STATUS.IN_PACKAGING ||
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
                                    " إكمال"
                                    )}
                                  </Button>
                                )}
                                {/* Show "إرسال لشركة التوصيل" button only for COMPLETED orders (Tab 1) */}
                                {currentTab === 1 && (
                                  <Tooltip 
                                    title={
                                      (() => {
                                        const numericStatus = typeof order.status === 'number' 
                                          ? order.status 
                                          : parseInt(order.status, 10);
                                        const isSentToDelivery = order.isSentToDeliveryCompany === true;
                                        if (numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY || isSentToDelivery) {
                                          return "تم الإرسال لشركة التوصيل";
                                        } else if (numericStatus !== ORDER_STATUS.COMPLETED) {
                                          return "الطلب يجب أن يكون مكتملاً لإرساله لشركة التوصيل";
                                        } else {
                                          return "إرسال الطلب لشركة التوصيل";
                                        }
                                      })()
                                    } 
                                    arrow 
                                    placement="top"
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        startIcon={<LocalShipping />}
                                        onClick={() => handleShippingClick(order)}
                                        disabled={
                                          (() => {
                                            const numericStatus = typeof order.status === 'number' 
                                              ? order.status 
                                              : parseInt(order.status, 10);
                                            // التحقق من وجود shipment
                                            const isSentToDelivery = order.isSentToDeliveryCompany === true;
                                            // الزر مفعّل فقط عندما يكون الطلب مكتملاً وغير مرسل لشركة التوصيل
                                            return numericStatus !== ORDER_STATUS.COMPLETED || 
                                                   numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY ||
                                                   isSentToDelivery;
                                          })()
                                        }
                                        sx={{ 
                                          minWidth: 90, 
                                          flexShrink: 0,
                                          backgroundColor: '#2e7d32',
                                          '&:hover': {
                                            backgroundColor: '#1b5e20',
                                          },
                                          '&:disabled': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.12)',
                                            color: 'rgba(0, 0, 0, 0.26)',
                                          }
                                        }}
                                      >
                                        إرسال
                                      </Button>
                                    </span>
                                  </Tooltip>
                                )}
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedOrder && (() => {
              const numericStatus = typeof selectedOrder.status === 'number' 
                ? selectedOrder.status 
                : parseInt(selectedOrder.status, 10);
              const isSentToDelivery = selectedOrder.isSentToDeliveryCompany === true;
              const canSendToDelivery = numericStatus === ORDER_STATUS.COMPLETED && 
                                       numericStatus !== ORDER_STATUS.SENT_TO_DELIVERY_COMPANY &&
                                       !isSentToDelivery;
              
              return canSendToDelivery ? (
                <Tooltip 
                  title="إرسال الطلب لشركة التوصيل"
                  arrow 
                  placement="top"
                >
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<LocalShipping />}
                      onClick={() => {
                        handleShippingClick(selectedOrder);
                        handleCloseDialog();
                      }}
                      sx={{
                        backgroundColor: '#2e7d32',
                        '&:hover': {
                          backgroundColor: '#1b5e20',
                        },
                      }}
                    >
                      إرسال لشركة التوصيل
                    </Button>
                  </span>
                </Tooltip>
              ) : null;
            })()}
            <Button onClick={handleCloseDialog} variant="contained">
              إغلاق
            </Button>
          </Box>
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

      {/* Notes Dialog */}

      <NotesDialog
        open={notesDialogOpen}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />

      {/* Shipping Dialog */}
      <GlassDialog
        open={openShippingDialog}
        onClose={handleCloseShippingDialog}
        maxWidth="sm"
        title="إرسال إلى شركة التوصيل"
        actions={
          <>
            <Button 
              onClick={handleCloseShippingDialog} 
              disabled={shippingLoading}
              variant="outlined"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmShipping}
              color="success"
              variant="contained"
              disabled={shippingLoading}
              startIcon={shippingLoading ? <CircularProgress size={20} /> : <LocalShipping />}
              sx={{
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20',
                }
              }}
            >
              {shippingLoading ? 'جاري الإرسال...' : 'إرسال'}
            </Button>
          </>
        }
      >
        <Box sx={{ padding: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            إرسال الطلب <strong>{orderToShip?.orderNumber || `#${orderToShip?.id}`}</strong> إلى شركة التوصيل
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            يمكنك إضافة ملاحظات خاصة بشركة التوصيل (اختياري)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="ملاحظات شركة التوصيل"
            value={shippingNotes}
            onChange={(e) => setShippingNotes(e.target.value)}
            placeholder="أدخل أي ملاحظات خاصة بشركة التوصيل..."
            disabled={shippingLoading}
            sx={{ mt: 2 }}
          />
        </Box>
      </GlassDialog>

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
            width: { xs: "90vw", sm: 450, md: 550 },
            maxWidth: 550,
            maxHeight: "80vh",
            background: "#ffffff",
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(94, 78, 62, 0.3)",
            mt: 1,
            border: "1px solid rgba(94, 78, 62, 0.2)",
          },
        }}
      >
        <Box sx={{ p: 0, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              pb: 1.5,
              borderBottom: "1px solid rgba(94, 78, 62, 0.1)",
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: calmPalette.primary,
                  width: 40,
                  height: 40,
                }}
              >
                <MessageIcon sx={{ fontSize: 22 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary, fontSize: "1.1rem", mb: 0.25 }}>
                  رسائل الإدمن
                </Typography>
                <Typography variant="caption" sx={{ color: calmPalette.textSecondary, fontSize: "0.75rem" }}>
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
                  "&:hover": {
                    backgroundColor: "rgba(94, 78, 62, 0.1)",
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
                  "&:hover": {
                    backgroundColor: "rgba(94, 78, 62, 0.1)",
                  },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
          
          {/* Messages Content */}
          <Box sx={{ p: 2, pt: 1.5, overflow: "auto", flex: 1 }}>
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
          severity="info"
          icon={<MessageIcon />}
          sx={{ 
            width: '100%',
            minWidth: 300,
            maxWidth: 500,
            bgcolor: "#ffffff",
            color: calmPalette.textPrimary,
            boxShadow: "0 8px 24px rgba(94, 78, 62, 0.3)",
            border: `1px solid ${calmPalette.primary}`,
            "& .MuiAlert-icon": {
              color: "#1976d2",
              fontSize: 28,
            },
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "1rem" }}>
            رسالة جديدة من الإدارة
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.9rem", color: calmPalette.textSecondary }}>
            {newMessageData?.title || "رسالة جديدة"}
          </Typography>
        </Alert>
      </Snackbar>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PackagerDashboard;


