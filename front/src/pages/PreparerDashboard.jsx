import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { Logout, Visibility, Assignment, Person, Phone, LocationOn, Receipt, CalendarToday, ShoppingBag, Note, Image as ImageIcon, PictureAsPdf } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ordersService, orderStatusService } from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import { USER_ROLES, COLOR_LABELS, SIZE_LABELS, FABRIC_TYPE_LABELS, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../constants";
import NotesDialog from "../components/common/NotesDialog";
import GlassDialog from "../components/common/GlassDialog";
import calmPalette from "../theme/calmPalette";

const getFullUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://psbrand-backend-production.up.railway.app/api";
  const baseDomain = API_BASE_URL.replace("/api", "");

  if (url.startsWith("/")) {
    return `${baseDomain}${url}`;
  }

  return `${baseDomain}/${url}`;
};

const getMockupImages = (design) => {
  if (!design) return [];
  const images = [];
  if (Array.isArray(design.mockupImageUrls)) {
    images.push(...design.mockupImageUrls);
  }
  if (design.mockupImageUrl) {
    images.push(design.mockupImageUrl);
  }
  return images.filter((url) => url && url !== "placeholder_mockup.jpg");
};

const getPrintFiles = (design) => {
  if (!design) return [];
  const files = [];
  if (Array.isArray(design.printFileUrls)) {
    files.push(...design.printFileUrls);
  }
  if (design.printFileUrl) {
    files.push(design.printFileUrl);
  }
  return files.filter((url) => url && url !== "placeholder_print.pdf");
};

const PreparerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  const [availableOrders, setAvailableOrders] = useState([]); // Tab 0: Status 3 (IN_PREPARATION)
  const [myOpenOrders, setMyOpenOrders] = useState([]); // Tab 1: Status 6 (OPEN_ORDER) with preparer === currentUser
  const [completedOrders, setCompletedOrders] = useState([]); // Tab 2: Status 4 (COMPLETED) with preparer === currentUser
  const [loading, setLoading] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openCompletedOrdersModal, setOpenCompletedOrdersModal] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const [selectedImage, setSelectedImage] = useState(null); // Selected image for dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false); // Image dialog state

  // Fetch available orders (Status 3: IN_PREPARATION) - Tab 0
  const fetchAvailableOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const prepOrders = await ordersService.getOrdersByStatus(3);
      setAvailableOrders(prepOrders || []);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch my open orders (Status 6: OPEN_ORDER with preparer === currentUser) - Tab 1
  const fetchMyOpenOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setMyOpenOrders([]);
        return;
      }
      
      // Use GetOrdersForPreparer API with status 6 (OPEN_ORDER)
      const myOrders = await ordersService.getOrdersForPreparer(currentUserId, ORDER_STATUS.OPEN_ORDER);
      setMyOpenOrders(myOrders || []);
    } catch (error) {
      console.error('Error fetching my open orders:', error);
      setMyOpenOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch completed orders (Status 4: COMPLETED with preparer === currentUser)
  const fetchCompletedOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setCompletedOrders([]);
        return;
      }
      
      // Use GetOrdersForPreparer API with status 4 (COMPLETED)
      const myCompletedOrders = await ordersService.getOrdersForPreparer(currentUserId, ORDER_STATUS.COMPLETED);
      setCompletedOrders(myCompletedOrders || []);
    } catch (error) {
      console.error('Error fetching completed orders:', error);
      setCompletedOrders([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch both tabs data
  const fetchAllOrders = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      await Promise.all([
        fetchAvailableOrders(false),
        fetchMyOpenOrders(false),
        fetchCompletedOrders(false)
      ]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAllOrders(true); // Show loading on initial fetch only

    // Subscribe to SignalR updates for real-time order updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onOrderCreated: (newOrder) => {
            console.log('SignalR: New order created event received', newOrder);
            if (newOrder && typeof newOrder === 'object' && newOrder.id) {
              if (newOrder.status === ORDER_STATUS.IN_PREPARATION) {
                // Add to available orders
                setAvailableOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === newOrder.id);
                  if (exists) return prevOrders;
                  return [newOrder, ...prevOrders];
                });
              } else if (newOrder.status === ORDER_STATUS.OPEN_ORDER) {
                // Check if it's assigned to current user
                const orderPreparerId = newOrder.preparer?.id || newOrder.preparerId || (typeof newOrder.preparer === 'number' ? newOrder.preparer : null);
                const currentUserId = user?.id;
                const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
                const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
                
                if (preparerIdNum === currentUserIdNum) {
                  setMyOpenOrders(prevOrders => {
                    const exists = prevOrders.some(order => order.id === newOrder.id);
                    if (exists) return prevOrders;
                    return [newOrder, ...prevOrders];
                  });
                }
              }
            } else {
              console.log('No order data received, refreshing list');
              fetchAllOrders(false);
            }
          },
          onOrderStatusChanged: (updatedOrder) => {
            console.log('SignalR: Order status changed', updatedOrder);
            if (updatedOrder) {
              const orderPreparerId = updatedOrder.preparer?.id || updatedOrder.preparerId || (typeof updatedOrder.preparer === 'number' ? updatedOrder.preparer : null);
              const currentUserId = user?.id;
              const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
              const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
              const isAssignedToMe = preparerIdNum === currentUserIdNum;

              if (updatedOrder.status === ORDER_STATUS.IN_PREPARATION) {
                // Update in available orders
                setAvailableOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === updatedOrder.id);
                  if (exists) {
                    return prevOrders.map(order => 
                      order.id === updatedOrder.id ? updatedOrder : order
                    );
                  } else {
                    return [updatedOrder, ...prevOrders];
                  }
                });
                // Remove from my open orders if it was there
                setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
              } else if (updatedOrder.status === ORDER_STATUS.OPEN_ORDER && isAssignedToMe) {
                // Update in my open orders
                setMyOpenOrders(prevOrders => {
                  const exists = prevOrders.some(order => order.id === updatedOrder.id);
                  if (exists) {
                    return prevOrders.map(order => 
                      order.id === updatedOrder.id ? updatedOrder : order
                    );
                  } else {
                    return [updatedOrder, ...prevOrders];
                  }
                });
                // Remove from available orders
                setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                } else if (updatedOrder.status === ORDER_STATUS.COMPLETED && isAssignedToMe) {
                  // Update in completed orders
                  setCompletedOrders(prevOrders => {
                    const exists = prevOrders.some(order => order.id === updatedOrder.id);
                    if (exists) {
                      return prevOrders.map(order => 
                        order.id === updatedOrder.id ? updatedOrder : order
                      );
                    } else {
                      return [updatedOrder, ...prevOrders];
                    }
                  });
                  // Remove from other lists
                  setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                } else {
                  // Status changed to something else, remove from all lists
                  setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setMyOpenOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                  setCompletedOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id));
                }
            }
            fetchAllOrders(false);
          },
        });
        console.log('SignalR: Successfully subscribed to order updates');
      } catch (err) {
        console.error('Failed to connect to updates hub:', err);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Load image for display (lazy loading with Intersection Observer)
  const loadImageForDisplay = async (orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;
    
    // Check cache first
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    // Don't load if already loading
    if (loadingImage === `image-${orderId}-${designId}`) {
      return null;
    }
    
    // Load if not in cache
    setLoadingImage(`image-${orderId}-${designId}`);
    try {
      console.log('Loading image for:', { orderId, designId });
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find(d => d.id === designId);
      const images = getMockupImages(design);
      const firstImage = images.find(url => url && url !== 'image_data_excluded');

      if (firstImage) {
        const fullImageUrl = getFullUrl(firstImage);
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: fullImageUrl
        }));
        return fullImageUrl;
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setLoadingImage(null);
    }
    return null;
  };

  // Force re-render when imageCache changes (to update displayed images)
  useEffect(() => {
    // This effect ensures that when imageCache updates, the component re-renders
    // The dependency on imageCache will trigger re-render automatically
  }, [imageCache]);

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
                
                // Check if already loaded or loading using current state
                setImageCache(prevCache => {
                  if (!prevCache[key]) {
                    setLoadingImage(prevLoading => {
                      if (prevLoading !== `image-${orderId}-${designId}`) {
                        // Load image when it becomes visible
                        loadImageForDisplay(parseInt(orderId), parseInt(designId));
                      }
                      return prevLoading;
                    });
                  }
                  return prevCache;
                });
              }
            }
          });
        },
        { rootMargin: '50px' } // Start loading 50px before image enters viewport
      );

      // Observe all image placeholders
      const imageElements = document.querySelectorAll('[data-image-placeholder="true"]');
      imageElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableOrders.length, myOpenOrders.length, completedOrders.length]); // Re-run when orders change

  // Helper function to open file (handles both URLs and base64)
  const openFile = async (fileUrl, orderId, designId) => {
    if (!fileUrl || fileUrl === 'placeholder_print.pdf') {
      return;
    }

    // If file data is excluded, fetch full order data first
    if (fileUrl === 'image_data_excluded' && orderId) {
      setLoadingImage(`file-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find(d => d.id === designId);
        const files = getPrintFiles(design);
        const firstValidFile = files.find(url => url !== 'image_data_excluded');
        if (firstValidFile) {
          fileUrl = firstValidFile;
        } else if (files.includes('image_data_excluded')) {
          fileUrl = null;
        }

        if (!fileUrl) {
          alert('الملف غير متوفر');
          setLoadingImage(null);
          return;
        }
      } catch (error) {
        console.error('Error fetching order file:', error);
        alert('حدث خطأ أثناء جلب الملف');
        setLoadingImage(null);
        return;
      } finally {
        setLoadingImage(null);
      }
    }

    // Check if it's a base64 data URL
    if (fileUrl.startsWith('data:')) {
      try {
        let base64Data = '';
        let mimeType = 'application/pdf';
        
        if (fileUrl.includes(',')) {
          const parts = fileUrl.split(',');
          base64Data = parts[1];
          const mimeMatch = fileUrl.match(/data:([^;]+);base64/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        } else {
          base64Data = fileUrl;
        }

        const cleanBase64 = base64Data.replace(/\s/g, '');
        
        let blob;
        try {
          const response = await fetch(fileUrl);
          blob = await response.blob();
        } catch (fetchError) {
          const binaryString = atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
        }
        
        if (blob.size === 0) {
          throw new Error('الملف فارغ');
        }

        // Detect file type
        let fileExtension = 'pdf';
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
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `order_file_${Date.now()}.${fileExtension}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        }, 1000);
      } catch (error) {
        console.error('Error opening file:', error);
        alert('حدث خطأ أثناء فتح الملف.\n' + error.message);
      }
    } else {
      const fullFileUrl = getFullUrl(fileUrl);
      const link = document.createElement('a');
      link.href = fullFileUrl;
      link.download = fullFileUrl.split('/').pop() || 'file.pdf';
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  const handleViewDetails = async (order) => {
    console.log('Opening order details:', order);
    console.log('Order designs:', order?.orderDesigns);
    
    setSelectedOrder(order);
    setOpenDetailsModal(true);
    
    // Load images for all designs when modal opens
    if (order?.orderDesigns) {
      order.orderDesigns.forEach(design => {
        console.log('Design:', {
          id: design.id,
          name: design.designName,
          mockupImageUrls: design.mockupImageUrls,
          printFileUrls: design.printFileUrls
        });
      });
      
      const loadPromises = order.orderDesigns.map(design => {
        const images = getMockupImages(design);
        if (images.includes('image_data_excluded')) {
          console.log('Loading image for design:', design.id);
          return loadImageForDisplay(order.id, design.id);
        }
        return Promise.resolve(null);
      });
      
      // Wait for all images to load, then update selectedOrder to trigger re-render
      Promise.all(loadPromises).then(() => {
        console.log('All images loaded');
        // Force re-render by updating selectedOrder
        setSelectedOrder(prev => ({ ...prev }));
      });
    }
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleImageClick = async (imageUrl, orderId, designId) => {
    if (!imageUrl || imageUrl === 'placeholder_mockup.jpg') {
      return;
    }

    if (imageUrl === 'image_data_excluded' && orderId) {
      const cacheKey = `${orderId}-${designId}`;
      let imageToShow = imageCache[cacheKey];
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      if (imageToShow) {
        setSelectedImage(imageToShow);
        setImageDialogOpen(true);
      } else {
        alert('الصورة غير متوفرة');
      }
      return;
    }

    setSelectedImage(getFullUrl(imageUrl));
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
  };

  const handleNotesClick = (order) => {
    setSelectedOrder(order);
    setOpenNotesDialog(true);
  };

  const handleCloseNotesDialog = () => {
    setOpenNotesDialog(false);
    setSelectedOrder(null);
  };

  const handleSaveNotes = async (orderId, updatedNotes) => {
    await ordersService.updateOrderNotes(orderId, updatedNotes);
    // Update local state for all order lists
    setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
    setAvailableOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
    setMyOpenOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
    setCompletedOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, notes: updatedNotes } : order
    ));
  };

  // Handle status update: when already OPEN_ORDER -> set COMPLETED
  const handleStatusUpdate = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // Move from "في مرحلة التحضير" to "مكتمل"
      const response = await orderStatusService.setCompleted(orderId);
      
      // After successful update, refresh the orders list to get the latest data
      // Wait a bit for backend to process, then refresh
      setTimeout(() => {
        fetchAllOrders(false); // Don't show loading after action
      }, 500);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Mark order as OPEN_ORDER (when preparer takes the order)
  const handleOpenOrder = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      // 1) Assign current preparer to this order
      await ordersService.assignPreparer(orderId, user?.id);
      // 2) Set status to OpenOrder
      const response = await orderStatusService.setOpenOrder(orderId);
      
      // After successful update, refresh the orders list and switch to Tab 1
      setTimeout(() => {
        fetchAllOrders(false); // Don't show loading after action
        setCurrentTab(1); // Switch to "طلباتي المفتوحة" tab
      }, 500);
      
    } catch (error) {
      console.error('Error setting order to OPEN_ORDER:', error);
      alert(`حدث خطأ أثناء فتح الطلب: ${error.response?.data?.message || error.message || 'خطأ غير معروف'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusLabel = (status) => {
    const numericStatus = typeof status === 'number' ? status : parseInt(status);
    return {
      label: ORDER_STATUS_LABELS[numericStatus],
      color: ORDER_STATUS_COLORS[numericStatus]
    };
  };

  const stats = [
    {
      title: "الطلبات المتاحة للتحضير",
      value: availableOrders.length,
      icon: Assignment,
    },
    {
      title: "قيد التحضير",
      value: myOpenOrders.length,
      icon: Assignment,
    },
    {
      title: "الطلبات المكتملة",
      value: completedOrders.length,
      icon: Assignment,
      onClick: () => setOpenCompletedOrdersModal(true),
    },
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Refresh the relevant tab when switching
    if (newValue === 0) {
      fetchAvailableOrders(false);
    } else if (newValue === 1) {
      fetchMyOpenOrders(false);
    }
  };

  const handleCloseCompletedOrdersModal = () => {
    setOpenCompletedOrdersModal(false);
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
            }}
          >
            PSBrand - لوحة محضر الطلبات
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
              {user?.name || "محضر طلبات"}
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

      <Container maxWidth="xl" sx={{ paddingY: 5 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle = calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={stat.onClick || undefined}
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: 4,
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
                    cursor: stat.onClick ? "pointer" : "default",
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
                          sx={{ fontWeight: 700, color: cardStyle.highlight }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            marginTop: 1,
                            color: "rgba(255, 255, 255, 0.8)",
                          }}
                        >
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ fontSize: 56, color: cardStyle.highlight }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

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
              label="الطلبات المتاحة للتحضير"
              icon={<Assignment />}
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
              label="قيد التحضير"
              icon={<Assignment />}
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

        {/* Orders Table */}
        <Paper
          elevation={0}
          sx={{
            padding: 4,
            borderRadius: 4,
            background: calmPalette.surface,
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
          }}
        >
          {currentTab === 0 && (
            <>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 700, marginBottom: 3 }}
          >
       الطلبات المتاحة للتحضير ({availableOrders.length})
          </Typography>

              {loading && availableOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
              <Typography sx={{ marginLeft: 2 }}>جاري تحميل الطلبات...</Typography>
            </Box>
              ) : availableOrders.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <Typography color="text.secondary">لا توجد طلبات متاحة للفتح</Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{ 
                width: '100%',
                borderRadius: 3, 
                border: '1px solid rgba(94, 78, 62, 0.18)',
                backgroundColor: "rgba(255,255,255,0.4)",
                overflowX: 'auto',
                '& .MuiTable-root': {
                  direction: 'ltr',
                  width: '100%',
                  minWidth: '1200px'
                },
                '& .MuiTableCell-root': {
                  whiteSpace: 'nowrap',
                  padding: '14px 18px',
                  fontSize: '0.95rem'
                }
              }}
            >
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: 'rgba(94, 78, 62, 0.08)',
                    '& th': { color: calmPalette.textPrimary },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>البلد</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المجموع الفرعي</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableOrders.map((order, index) => {
                      // Get preparer ID from order
                      const orderPreparerId = order.preparer?.id || order.preparerId || (typeof order.preparer === 'number' ? order.preparer : null);
                      const currentUserId = user?.id;
                      
                      // Normalize IDs to numbers for comparison
                      const preparerIdNum = orderPreparerId ? Number(orderPreparerId) : null;
                      const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
                      
                      const isAssignedToOther = preparerIdNum !== null && preparerIdNum !== currentUserIdNum;
                      
                      // Can open order: Status is IN_PREPARATION and not assigned to another preparer
                      const canOpenOrder = order.status === ORDER_STATUS.IN_PREPARATION && !isAssignedToOther;
                      
                      // Show button only if can open
                      const showActionButton = canOpenOrder;
                      
                      return (
                    <TableRow 
                      key={order.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.35)' },
                        '&:hover': { backgroundColor: 'rgba(94, 78, 62, 0.12)' },
                        // Gray out if assigned to another preparer
                        opacity: (isAssignedToOther && order.status === ORDER_STATUS.IN_PREPARATION) ? 0.6 : 1
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.country || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.subTotal || 0} ₪
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: '1rem' }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate 
                          ? new Date(order.orderDate).toLocaleDateString("en-GB", { 
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                            sx={{ 
                              minWidth: '100px',
                              fontSize: '0.8rem'
                            }}
                          >
                            عرض التفاصيل
                          </Button>
                          {showActionButton ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleOpenOrder(order.id)}
                              disabled={updatingOrderId === order.id}
                              sx={{ 
                                minWidth: '120px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {updatingOrderId === order.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CircularProgress size={14} color="inherit" />
                                  جاري...
                                </Box>
                              ) : (
                                'فتح الطلب'
                              )}
                            </Button>
                          ) : isAssignedToOther ? (
                            <Chip
                              label={`مفتوح من: ${order.preparer?.name || 'محضر آخر'}`}
                              color="warning"
                              size="small"
                              sx={{ minWidth: '120px' }}
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
              )}
            </>
          )}

          {currentTab === 1 && (
            <>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: 700, marginBottom: 3 }}
              >
                 قيد التحضير ({myOpenOrders.length})
              </Typography>

              {loading && myOpenOrders.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ marginLeft: 2 }}>جاري تحميل الطلبات...</Typography>
                </Box>
              ) : myOpenOrders.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
                  <Typography color="text.secondary">لا توجد طلبات مفتوحة</Typography>
                </Box>
              ) : (
            <TableContainer
              sx={{ 
                width: '100%',
                borderRadius: 3, 
                border: '1px solid rgba(94, 78, 62, 0.18)',
                backgroundColor: "rgba(255,255,255,0.4)",
                overflowX: 'auto',
                '& .MuiTable-root': {
                  direction: 'ltr',
                  width: '100%',
                  minWidth: '1200px'
                },
                '& .MuiTableCell-root': {
                  whiteSpace: 'nowrap',
                  padding: '14px 18px',
                  fontSize: '0.95rem'
                }
              }}
            >
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: 'rgba(94, 78, 62, 0.08)',
                    '& th': { color: calmPalette.textPrimary },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>اسم العميل</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>البلد</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المحافظة</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>المجموع الفرعي</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجمالي</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تاريخ الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 80 }}>الملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myOpenOrders.map((order, index) => {
                      return (
                    <TableRow 
                      key={order.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.35)' },
                        '&:hover': { backgroundColor: 'rgba(94, 78, 62, 0.12)' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.country || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.subTotal || 0} ₪
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", fontSize: '1rem' }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate 
                          ? new Date(order.orderDate).toLocaleDateString("en-GB", { 
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(order)}
                            sx={{ 
                              minWidth: '100px',
                              fontSize: '0.8rem'
                            }}
                          >
                            عرض التفاصيل
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleStatusUpdate(order.id)}
                            disabled={updatingOrderId === order.id}
                            sx={{ 
                              minWidth: '120px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {updatingOrderId === order.id ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CircularProgress size={14} color="inherit" />
                                جاري...
                              </Box>
                            ) : (
                              'إكمال الطلب'
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
            </>
          )}
        </Paper>
      </Container>

      {/* Completed Orders Modal */}
      <GlassDialog
        open={openCompletedOrdersModal}
        onClose={handleCloseCompletedOrdersModal}
        maxWidth="xl"
        title={`الطلبات المكتملة (${completedOrders.length})`}
        actions={
          <Button onClick={handleCloseCompletedOrdersModal} variant="contained">
            إغلاق
          </Button>
        }
      >
        {loading && completedOrders.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4, gap: 2, alignItems: "center" }}>
            <CircularProgress />
            <Typography>جاري التحميل...</Typography>
          </Box>
        ) : completedOrders.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
            <Typography>لا توجد طلبات مكتملة</Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(94, 78, 62, 0.18)",
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          >
            <Table>
              <TableHead
                sx={{
                  backgroundColor: "rgba(94, 78, 62, 0.08)",
                  "& th": { fontWeight: 700, color: calmPalette.textPrimary },
                }}
              >
                <TableRow>
                  <TableCell>رقم الطلب</TableCell>
                  <TableCell>اسم العميل</TableCell>
                  <TableCell>رقم الهاتف</TableCell>
                  <TableCell>البلد</TableCell>
                  <TableCell>المحافظة</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ الطلب</TableCell>
                  <TableCell>الملاحظات</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedOrders.map((order) => {
                  const status = getStatusLabel(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{ "&:nth-of-type(even)": { backgroundColor: "rgba(255,255,255,0.3)" } }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.client?.name || "-"}
                      </TableCell>
                      <TableCell>{order.client?.phone || "-"}</TableCell>
                      <TableCell>{order.country || "-"}</TableCell>
                      <TableCell>{order.province || "-"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>
                        {order.totalAmount || 0} ₪
                      </TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              calendar: "gregory",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <IconButton
                          size="small"
                          onClick={() => handleNotesClick(order)}
                          sx={{
                            color: order.notes ? "primary.main" : "action.disabled",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                          title={order.notes ? "عرض/تعديل الملاحظات" : "إضافة ملاحظات"}
                        >
                          <Note />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleViewDetails(order)}
                        >
                          عرض التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </GlassDialog>

      {/* Order Details Modal */}
      <GlassDialog
        open={openDetailsModal}
        onClose={handleCloseDetailsModal}
        maxWidth="lg"
        title="تفاصيل الطلب"
        subtitle={selectedOrder?.orderNumber}
        contentSx={{ padding: 3, maxHeight: "85vh", overflowY: "auto" }}
        actions={
          <Button onClick={handleCloseDetailsModal} variant="contained">
            إغلاق
          </Button>
        }
      >
        {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* Order Basic Info */}
              <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                  <Receipt color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    معلومات الطلب
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        رقم الطلب
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {selectedOrder.orderNumber}
                      </Typography>
                    </Box>
                </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        التاريخ
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                   {selectedOrder.orderDate 
                    ? new Date(selectedOrder.orderDate).toLocaleDateString("ar-SA", { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric",
                        calendar: "gregory" 
                      })
                    : "-"}
                  </Typography>
                    </Box>
                </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        الحالة
                      </Typography>
                  <Chip
                    label={getStatusLabel(selectedOrder.status).label}
                    color={getStatusLabel(selectedOrder.status).color}
                        size="medium"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Client Info */}
              <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                  <Person color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    معلومات العميل
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        الاسم
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.client?.name || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        رقم الهاتف
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.client?.phone || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        العنوان
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "1.1rem", pr: 3 }}>
                      {selectedOrder.district && `${selectedOrder.district}, `}
                      {selectedOrder.province && `${selectedOrder.province}, `}
                      {selectedOrder.country || "-"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Financial Summary */}
              <Paper elevation={3} sx={{ p: 2.5, borderRadius: 2, bgcolor: "rgba(96, 78, 62, 0.75)", color: "white" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: "2px solid rgba(255,255,255,0.3)" }}>
                  <Receipt sx={{ color: "white" }} fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>
                    الملخص المالي
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        المجموع الفرعي
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedOrder.subTotal || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        رسوم التوصيل
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedOrder.deliveryFee || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        الإجمالي الكلي
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {selectedOrder.totalAmount || 0} ₪
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Notes Section */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Note />}
                  onClick={() => handleNotesClick(selectedOrder)}
                  sx={{ minWidth: 200 }}
                >
                  عرض/تعديل الملاحظات
                </Button>
              </Box>
                
              {/* Designs Section */}
                {selectedOrder.orderDesigns && selectedOrder.orderDesigns.length > 0 && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <ShoppingBag color="primary" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      التصاميم والمنتجات ({selectedOrder.orderDesigns.length})
                    </Typography>
                  </Box>
                    {selectedOrder.orderDesigns.map((design, idx) => (
                    <Paper key={idx} elevation={2} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "divider" }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                          {design.designName || `التصميم ${idx + 1}`}
                        </Typography>
                        {design.totalPrice && (
                          <Chip 
                            label={`إجمالي: ${design.totalPrice} ₪`}
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      
                      {(() => {
                        const cacheKey = `${selectedOrder?.id}-${design.id}`;
                        const images = getMockupImages(design);
                        const validImages = images.filter(url => url && url !== 'placeholder_mockup.jpg');

                        if (validImages.length === 0) return null;

                        return (
                          <Box sx={{ mb: 2.5 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                              الصور ({validImages.length})
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1
                              }}
                            >
                              {validImages.map((imageUrl, imgIdx) => {
                                if (imageUrl === 'image_data_excluded') {
                                  const isLoading = loadingImage === `image-${selectedOrder?.id}-${design.id}`;
                                  return (
                                    <Button
                                      key={`img-btn-${imgIdx}`}
                                      variant="outlined"
                                      size="small"
                                      startIcon={isLoading ? <CircularProgress size={16} /> : <ImageIcon />}
                                      onClick={() => handleImageClick(imageUrl, selectedOrder?.id, design.id)}
                                      disabled={isLoading}
                                    >
                                      عرض الصورة {imgIdx + 1}
                                    </Button>
                                  );
                                }

                                const displayUrl = getFullUrl(imageUrl);
                                const isLoading = loadingImage === `image-${selectedOrder?.id}-${design.id}` && !imageCache[cacheKey];

                                return (
                                  <Box
                                    key={`img-${imgIdx}`}
                                    sx={{
                                      position: 'relative',
                                      cursor: 'pointer',
                                      '&:hover': { opacity: 0.85 }
                                    }}
                                  >
                                    {isLoading ? (
                                      <Box
                                        sx={{
                                          width: 120,
                                          height: 120,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '8px',
                                          bgcolor: 'grey.100'
                                        }}
                                      >
                                        <CircularProgress size={20} />
                                      </Box>
                                    ) : (
                                      <img
                                        src={displayUrl}
                                        alt={`${design.designName} - صورة ${imgIdx + 1}`}
                                        onClick={() => handleImageClick(imageUrl, selectedOrder?.id, design.id)}
                                        style={{
                                          maxWidth: '140px',
                                          maxHeight: '140px',
                                          borderRadius: '8px',
                                          transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                      />
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })()}

                        {design.orderDesignItems && design.orderDesignItems.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                            عناصر التصميم ({design.orderDesignItems.length})
                          </Typography>
                          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                  <TableCell sx={{ fontWeight: 700 }}>المقاس</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>اللون</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>نوع القماش</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700 }}>الكمية</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>سعر الوحدة</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>المجموع</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {design.orderDesignItems.map((item, itemIdx) => (
                                  <TableRow key={itemIdx} hover>
                                    <TableCell>{SIZE_LABELS[item.size] || item.size}</TableCell>
                                    <TableCell>{COLOR_LABELS[item.color] || item.color}</TableCell>
                                    <TableCell>{FABRIC_TYPE_LABELS[item.fabricType] || item.fabricType}</TableCell>
                                    <TableCell align="center">{item.quantity}</TableCell>
                                    <TableCell align="right">{item.unitPrice} ₪</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: "primary.main" }}>
                                      {item.totalPrice || (item.unitPrice * item.quantity)} ₪
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}

                        {(() => {
                          const files = getPrintFiles(design);
                          if (files.length === 0) return null;

                          return (
                            <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                ملفات التصميم ({files.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {files.map((fileUrl, fileIdx) => (
                                  fileUrl === 'image_data_excluded' ? (
                                    <Button
                                      key={`file-btn-${fileIdx}`}
                                      variant="outlined"
                                      size="small"
                                      startIcon={loadingImage === `file-${selectedOrder?.id}-${design.id}` ? <CircularProgress size={16} /> : <PictureAsPdf />}
                                      onClick={() => openFile(fileUrl, selectedOrder?.id, design.id)}
                                      disabled={loadingImage === `file-${selectedOrder?.id}-${design.id}`}
                                    >
                                      تحميل الملف {fileIdx + 1}
                                    </Button>
                                  ) : (
                                    <Button
                                      key={`file-${fileIdx}`}
                                      variant="contained"
                                      size="small"
                                      startIcon={<PictureAsPdf />}
                                      onClick={() => openFile(fileUrl, selectedOrder?.id, design.id)}
                                    >
                                      ملف {fileIdx + 1}
                                    </Button>
                                  )
                                ))}
                              </Box>
                            </Box>
                          );
                        })()}
                      </Paper>
                    ))}
                </Box>
                )}
            </Box>
          )}
        </GlassDialog>

      {/* Notes Dialog */}
      <NotesDialog
        open={openNotesDialog}
        onClose={handleCloseNotesDialog}
        order={selectedOrder}
        onSave={handleSaveNotes}
        user={user}
      />

      {/* Image Dialog */}
      <GlassDialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        title="معاينة الصورة"
        contentSx={{ padding: 0 }}
      >
        {selectedImage ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, padding: 3 }}>
            <img
              src={selectedImage}
              alt="معاينة الصورة"
              onError={(e) => {
                e.target.style.display = "none";
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = "flex";
                }
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 24px 65px rgba(15, 23, 42, 0.35)",
              }}
            />
            <Box
              sx={{
                display: "none",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "400px",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                لا يمكن عرض الصورة
              </Typography>
              <Typography variant="body2">الصورة غير متوفرة</Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              color: "text.secondary",
              padding: 4,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              الصورة غير متوفرة
            </Typography>
            <Typography variant="body2">لم يتم تضمين بيانات الصورة في قائمة الطلبات</Typography>
          </Box>
        )}
      </GlassDialog>
    </Box>
  );
};

export default PreparerDashboard;
