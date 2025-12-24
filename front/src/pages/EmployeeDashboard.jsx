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
  TextField,
  CircularProgress,
  Divider,
  Tooltip,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Logout,
  Assignment,
  CheckCircle,
  Pending,
  Close,
  Visibility,
  Note,
  Edit,
  Save,
  Image as ImageIcon,
  PictureAsPdf,
  Search,
  WhatsApp as WhatsAppIcon,
  CameraAlt,
  History,
  ArrowForward,
  Star,
  ContactPhone,
  CheckBox,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  ordersService,
  orderStatusService,
  shipmentsService,
  colorsService,
  sizesService,
  fabricTypesService,
} from "../services/api";
import { subscribeToOrderUpdates } from "../services/realtime";
import {
  USER_ROLES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS,
  SIZE_LABELS,
  FABRIC_TYPE_LABELS,
  COLOR_LABELS,
} from "../constants";
import { openWhatsApp } from "../utils";
import OrderForm from "../components/employee/OrderForm";
import GlassDialog from "../components/common/GlassDialog";
import NotificationsBell from "../components/common/NotificationsBell";
import calmPalette from "../theme/calmPalette";

// Helper function to build full image/file URL
const getFullUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://psbrand-backend-production.up.railway.app/api";
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

const getStatusChipColor = (status) => {
  const numericStatus =
    typeof status === "number" ? status : parseInt(status, 10);
  return ORDER_STATUS_COLORS[numericStatus] || "default";
};

const getStatusText = (status) => {
  const numericStatus =
    typeof status === "number" ? status : parseInt(status, 10);
  return ORDER_STATUS_LABELS[numericStatus] || "غير معروف";
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);
    const isoReady = trimmed.includes("T")
      ? trimmed
      : trimmed.replace(" ", "T");
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
    return normalized.toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      calendar: "gregory",
    });
  } catch {
    return normalized.toString();
  }
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

// getFabricLabel, getSizeLabel, and getColorLabel are now defined inside component to access API data

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

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders } = useApp();
  const [showForm, setShowForm] = useState(true);
  const [openOrdersModal, setOpenOrdersModal] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [loadingImage, setLoadingImage] = useState(null); // Track which image is loading
  const [imageCache, setImageCache] = useState({}); // Cache: { 'orderId-designId': imageUrl }
  const [selectedImage, setSelectedImage] = useState(null); // Selected image for dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false); // Image dialog state
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loadingFabricTypes, setLoadingFabricTypes] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [openDeliveryStatusDialog, setOpenDeliveryStatusDialog] =
    useState(false);
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [deliveryStatusLoading, setDeliveryStatusLoading] = useState(false);
  const [orderForDeliveryStatus, setOrderForDeliveryStatus] = useState(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderId: statusData }
  const [loadingDeliveryStatuses, setLoadingDeliveryStatuses] = useState({}); // { orderId: true }
  const [newNotificationReceived, setNewNotificationReceived] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [ordersSummary, setOrdersSummary] = useState({
    totalCount: 0,
    totalAmountWithDelivery: 0,
    totalAmountWithoutDelivery: 0,
    periodDescription: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByDate, setSortByDate] = useState("orderDate"); // 'orderDate' = تاريخ الإنشاء, 'createdAt' = تاريخ الطلب
  const [ordersModalTab, setOrdersModalTab] = useState(0); // 0 = جميع الطلبات, 1 = الطلبات المؤكدة للتوصيل
  const [confirmedDeliveryOrders, setConfirmedDeliveryOrders] = useState([]);
  const [loadingConfirmedDelivery, setLoadingConfirmedDelivery] =
    useState(false);
  const [confirmedDeliveryCount, setConfirmedDeliveryCount] = useState(0);
  const [deliveryCompanyFilter, setDeliveryCompanyFilter] = useState("all"); // 'all', 'no_shipment', 'has_shipment', or status IDs

  const selectedOrderDesigns = selectedOrder?.orderDesigns || [];
  const totalOrderQuantity = selectedOrderDesigns.reduce((sum, design) => {
    const designCount =
      design?.orderDesignItems?.reduce(
        (itemSum, item) => itemSum + (item?.quantity || 0),
        0
      ) || 0;
    return sum + designCount;
  }, 0);

  const discountDisplay = (() => {
    if (!selectedOrder) return "-";
    const parts = [];
    if (
      selectedOrder.discountAmount !== null &&
      selectedOrder.discountAmount !== undefined
    ) {
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

  const discountNotes =
    typeof selectedOrder?.discountNotes === "string"
      ? selectedOrder.discountNotes.trim()
      : "";

  const selectedOrderNotes =
    typeof selectedOrder?.notes === "string" ? selectedOrder.notes.trim() : "";

  const sellerName =
    selectedOrder?.employee?.name ||
    selectedOrder?.employeeName ||
    selectedOrder?.salesRep?.name ||
    "-";

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
      setSizes(Array.isArray(sizesData) ? sizesData : []);
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

  // Helper function to convert color ID to nameAr from API
  const getColorLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== "object" || item === null) {
      const color = item;
      if (color === null || color === undefined) return "-";

      const colorId =
        typeof color === "string" && !isNaN(color) && color !== ""
          ? Number(color)
          : typeof color === "number"
          ? color
          : null;

      if (colorId === null) {
        return color;
      }

      // Use constants for legacy values
      if (COLOR_LABELS[colorId]) {
        return COLOR_LABELS[colorId];
      }

      if (colors.length > 0) {
        const colorObj = colors.find((c) => c.id === colorId);
        if (colorObj) {
          return colorObj.nameAr || colorObj.name || "-";
        }
      }

      return color || "-";
    }

    // New format: check if colorId is null (legacy order)
    if (item.colorId === null || item.colorId === undefined) {
      // Legacy order - use constants mapping
      const color = item.color;
      if (color === null || color === undefined) return "-";
      const colorId =
        typeof color === "string" && !isNaN(color) && color !== ""
          ? Number(color)
          : typeof color === "number"
          ? color
          : null;
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
      const colorObj = colors.find((c) => c.id === item.colorId);
      if (colorObj) {
        return colorObj.nameAr || colorObj.name || "-";
      }
    }

    return "-";
  };

  // Helper function to convert size ID to nameAr from API
  const getSizeLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== "object" || item === null) {
      const size = item;
      if (size === null || size === undefined) return "-";
      if (typeof size === "string" && !size.trim()) return "-";

      // Convert to number if it's a string number
      const sizeId =
        typeof size === "string" && !isNaN(size) && size !== ""
          ? Number(size)
          : typeof size === "number"
          ? size
          : null;

      // If it's not a number, it might already be a name - return it
      if (sizeId === null) {
        // Check if it's already a name from API
        if (sizes.length > 0) {
          const sizeObj = sizes.find(
            (s) =>
              (s.nameAr && s.nameAr === size) || (s.name && s.name === size)
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
        let sizeObj = sizes.find((s) => s.legacyValue === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }

        // Try exact match by ID as fallback
        sizeObj = sizes.find((s) => s.id === sizeId);
        if (sizeObj) {
          return sizeObj.name || sizeObj.nameAr || "-";
        }

        // Try to match by converting ID to string and comparing
        sizeObj = sizes.find(
          (s) =>
            String(s.id) === String(sizeId) ||
            String(s.legacyValue) === String(sizeId)
        );
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
      const sizeId =
        typeof size === "string" && !isNaN(size) && size !== ""
          ? Number(size)
          : typeof size === "number"
          ? size
          : null;
      if (sizeId !== null && SIZE_LABELS[sizeId]) {
        return SIZE_LABELS[sizeId];
      }
      return size || "-";
    }

    // New order - use API values
    if (item.sizeName) {
      return item.sizeName;
    }

    // Fallback to API lookup
    if (sizes.length > 0) {
      const sizeObj = sizes.find(
        (s) => s.id === item.sizeId || s.legacyValue === item.sizeId
      );
      if (sizeObj) {
        return sizeObj.name || sizeObj.nameAr || "-";
      }
    }

    return "-";
  };

  // Helper function to convert fabric type ID to nameAr from API
  const getFabricLabel = (item) => {
    // If item is a primitive value (backward compatibility)
    if (typeof item !== "object" || item === null) {
      const fabricType = item;
      if (fabricType === null || fabricType === undefined) return "-";

      const fabricTypeId =
        typeof fabricType === "string" &&
        !isNaN(fabricType) &&
        fabricType !== ""
          ? Number(fabricType)
          : typeof fabricType === "number"
          ? fabricType
          : null;

      if (fabricTypeId === null) {
        return fabricType;
      }

      // Use constants for legacy values
      if (FABRIC_TYPE_LABELS[fabricTypeId]) {
        return FABRIC_TYPE_LABELS[fabricTypeId];
      }

      if (fabricTypes.length > 0) {
        const fabricTypeObj = fabricTypes.find((f) => f.id === fabricTypeId);
        if (fabricTypeObj) {
          return fabricTypeObj.nameAr || fabricTypeObj.name || "-";
        }
      }

      return fabricType || "-";
    }

    // New format: check if sizeId is null (legacy order)
    if (item.fabricTypeId === null || item.fabricTypeId === undefined) {
      // Legacy order - use constants mapping
      const fabricType = item.fabricType;
      if (fabricType === null || fabricType === undefined) return "-";
      const fabricTypeId =
        typeof fabricType === "string" &&
        !isNaN(fabricType) &&
        fabricType !== ""
          ? Number(fabricType)
          : typeof fabricType === "number"
          ? fabricType
          : null;
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
      const fabricTypeObj = fabricTypes.find((f) => f.id === item.fabricTypeId);
      if (fabricTypeObj) {
        return fabricTypeObj.name || fabricTypeObj.nameAr || "-";
      }
    }

    return "-";
  };

  useEffect(() => {
    loadColors();
    loadSizes();
    loadFabricTypes();
  }, []);

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
              areasArray.forEach((area) => {
                if (area) {
                  allAreas.push({
                    ...area,
                    id: area.id || area.Id || area.areaId,
                    name: area.name || area.Name || area.areaName,
                    cityId: cityId,
                  });
                }
              });
            } catch (error) {
              // Silent fail for individual cities
            }
          }
        }
        setAreas(allAreas);
      } catch (error) {
        console.error("Error loading cities:", error);
      }
    };
    loadCitiesAndAreas();
  }, []);

  // Helper function to get field display value
  const getFieldDisplayValue = (fieldName, value) => {
    if (value === "" || value === null || value === undefined) {
      return "(فارغ)";
    }

    const valueStr = String(value).trim();
    if (!valueStr || valueStr === "null" || valueStr === "undefined") {
      return "(فارغ)";
    }

    // Check if it's a city field
    if (
      fieldName &&
      (fieldName === "مدينة العميل" ||
        fieldName === "المدينة" ||
        fieldName.includes("مدينة"))
    ) {
      if (cities.length > 0) {
        const numValue = Number(valueStr);
        const city = cities.find((c) => {
          const cityId = c.id || c.Id || c.cityId;
          const cityIdStr = String(cityId || "");
          const cityIdNum = Number(cityId);
          // Try multiple matching strategies
          return (
            cityIdStr === valueStr ||
            cityIdStr === String(value) ||
            (numValue && cityIdNum && numValue === cityIdNum) ||
            (cityId && String(cityId) === valueStr)
          );
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
    if (
      fieldName &&
      (fieldName === "منطقة العميل" ||
        fieldName === "المنطقة" ||
        fieldName.includes("منطقة"))
    ) {
      if (areas.length > 0) {
        const numValue = Number(valueStr);
        const area = areas.find((a) => {
          const areaId = a.id || a.Id || a.areaId;
          const areaIdStr = String(areaId || "");
          const areaIdNum = Number(areaId);
          // Try multiple matching strategies
          return (
            areaIdStr === valueStr ||
            areaIdStr === String(value) ||
            (numValue && areaIdNum && numValue === areaIdNum) ||
            (areaId && String(areaId) === valueStr)
          );
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
    if (
      !modificationDetailsString ||
      typeof modificationDetailsString !== "string"
    ) {
      return [];
    }
    try {
      const parsed = JSON.parse(modificationDetailsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error parsing modification details:", error);
      return [];
    }
  };

  const modificationHistory = selectedOrder?.isModified
    ? parseModificationDetails(selectedOrder?.modificationDetails)
    : [];

  // Fetch designer orders count on component mount
  const fetchDesignerOrdersCount = async () => {
    if (user?.role === USER_ROLES.DESIGNER && user?.id) {
      try {
        // استخدام API الجديد مع التاريخ الحالي
        const today = new Date();
        const isoDateString = today.toISOString();
        const response = await ordersService.getOrdersByDesignerAndMonth(
          user.id,
          isoDateString
        );
        const orders =
          response?.orders || (Array.isArray(response) ? response : []);
        setTotalOrdersCount(response?.totalCount || orders.length);
      } catch (error) {
        console.error("Error fetching orders count:", error);
      }
    }
  };

  // Fetch delivery status for orders sent to delivery company
  const fetchDeliveryStatus = async (orderId, order = null) => {
    // If order not provided, try to find it in ordersList
    let orderToCheck = order;
    if (!orderToCheck) {
      orderToCheck = ordersList.find((o) => o.id === orderId);
    }

    // Check if order is sent to delivery company - if not, don't make API call
    if (orderToCheck && !orderToCheck.isSentToDeliveryCompany) {
      // Order not sent to delivery company, set null and return
      setDeliveryStatuses((prev) => ({ ...prev, [orderId]: null }));
      return;
    }

    // Check if order is already marked as closed in backend (IsDeliveryStatusClosed flag)
    // If closed, don't fetch again
    if (orderToCheck && orderToCheck.isDeliveryStatusClosed === true) {
      // Order delivery status is closed in backend, don't fetch again
      return;
    }

    // Also check if status is already loaded and is closed (for backward compatibility)
    const existingStatus = deliveryStatuses[orderId];
    if (existingStatus) {
      // Check if it has isClosed flag (set when status is 10: Closed)
      if (existingStatus.isClosed === true) {
        // Status is closed, don't fetch again
        return;
      }
      // Also check by status ID for backward compatibility
      if (existingStatus.status) {
        const statusId = existingStatus.status.id || existingStatus.statusId;
        // Status IDs: 10 = Closed
        if (statusId === 10) {
          // Status is closed, don't fetch again
          return;
        }
      }
    }

    // Check if already loading or loaded
    if (
      loadingDeliveryStatuses[orderId] ||
      deliveryStatuses[orderId] !== undefined
    ) {
      return;
    }

    setLoadingDeliveryStatuses((prev) => ({ ...prev, [orderId]: true }));

    try {
      const statusData = await shipmentsService.getDeliveryStatus(orderId);

      // Check if status is closed (10: Closed only)
      // If closed, save it with isClosed flag and don't fetch again
      const statusId = statusData?.status?.id || statusData?.statusId;
      if (statusId === 10) {
        // Status is closed - save it with isClosed flag (won't fetch again)
        setDeliveryStatuses((prev) => ({
          ...prev,
          [orderId]: { ...statusData, isClosed: true },
        }));
      } else {
        // Status is not closed - save normally
        setDeliveryStatuses((prev) => ({ ...prev, [orderId]: statusData }));
      }
    } catch (error) {
      // إذا كان الخطأ هو "NO_SHIPMENT" (لم يتم إنشاء شحنة بعد)، هذا طبيعي ولا نعرضه
      const errorCode = error.response?.data?.code;
      if (errorCode !== "NO_SHIPMENT") {
        console.error(
          `Error fetching delivery status for order ${orderId}:`,
          error
        );
      }
      setDeliveryStatuses((prev) => ({ ...prev, [orderId]: null }));
    } finally {
      setLoadingDeliveryStatuses((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  };

  useEffect(() => {
    fetchDesignerOrdersCount();

    // Subscribe to SignalR updates for real-time delivery status updates
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToOrderUpdates({
          onDeliveryStatusChanged: (orderId, deliveryStatus) => {
            // Update delivery status in real-time when backend sends update
            setDeliveryStatuses((prev) => ({
              ...prev,
              [orderId]: deliveryStatus,
            }));
          },
          onShipmentStatusUpdated: (shipmentData) => {
            // Handle shipment status update from webhook (ShipmentStatusUpdated event)
            const orderId = shipmentData?.orderId;
            if (orderId) {
              // استخدام البيانات مباشرة من SignalR
              if (shipmentData?.status) {
                const statusData = {
                  orderId: shipmentData.orderId,
                  shipmentId: shipmentData.shipmentId,
                  roadFnShipmentId: shipmentData.roadFnShipmentId,
                  trackingNumber: shipmentData.trackingNumber,
                  status:
                    typeof shipmentData.status === "string"
                      ? {
                          arabic: shipmentData.status,
                          english: shipmentData.status,
                        }
                      : shipmentData.status,
                  lastUpdate: shipmentData.lastUpdate,
                };
                setDeliveryStatuses((prev) => ({
                  ...prev,
                  [orderId]: statusData,
                }));
              } else {
                // إذا لم تكن البيانات كاملة، نجلب من API فقط إذا كان الطلب مرسل لشركة التوصيل
                // Find order in ordersList to check isSentToDeliveryCompany
                const order = ordersList.find((o) => o.id === orderId);
                if (order && order.isSentToDeliveryCompany) {
                  fetchDeliveryStatus(orderId, order);
                }
              }
            }
          },
          onShipmentNoteAdded: (shipmentData) => {
            // Handle shipment note added from webhook (ShipmentNoteAdded event)
            const orderId = shipmentData?.orderId;
            if (orderId) {
              // استخدام البيانات مباشرة من SignalR
              if (shipmentData?.status) {
                const statusData = {
                  orderId: shipmentData.orderId,
                  shipmentId: shipmentData.shipmentId,
                  roadFnShipmentId: shipmentData.roadFnShipmentId,
                  trackingNumber: shipmentData.trackingNumber,
                  status:
                    typeof shipmentData.status === "string"
                      ? {
                          arabic: shipmentData.status,
                          english: shipmentData.status,
                        }
                      : shipmentData.status,
                  note: shipmentData.note,
                  lastUpdate: shipmentData.entryDateTime,
                };
                setDeliveryStatuses((prev) => ({
                  ...prev,
                  [orderId]: statusData,
                }));
              } else {
                // Only fetch if order is sent to delivery company
                // Find order in ordersList to check isSentToDeliveryCompany
                const order = ordersList.find((o) => o.id === orderId);
                if (order && order.isSentToDeliveryCompany) {
                  fetchDeliveryStatus(orderId, order);
                }
              }
            }
          },
          onNewNotification: (notification) => {
            setNewNotificationReceived(notification);
            setTimeout(() => setNewNotificationReceived(null), 100);
          },
        });
      } catch (err) {
        console.error("Failed to connect to updates hub:", err);
      }
    })();

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user]);

  // Load delivery statuses for all orders - try to fetch for all orders
  // API will return error/empty if no shipment exists, which is fine
  useEffect(() => {
    if (!ordersList || ordersList.length === 0) return;

    // Try to fetch delivery status for all orders
    // We check if already loaded/loading to avoid duplicate requests
    ordersList.forEach((order) => {
      // Check synchronously if already loaded or loading
      const isLoaded = deliveryStatuses[order.id] !== undefined;
      const isLoading = loadingDeliveryStatuses[order.id] === true;

      // Only fetch if not already checked AND order is sent to delivery company
      if (!isLoaded && !isLoading && order.isSentToDeliveryCompany) {
        // Only fetch for orders sent to delivery company
        fetchDeliveryStatus(order.id, order).catch(() => {
          // Silently fail - this order just doesn't have a shipment
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersList]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const loadOrdersByDate = async (dateString) => {
    if (user?.role !== USER_ROLES.DESIGNER || !user?.id) return;

    setLoading(true);
    try {
      // تحويل التاريخ من YYYY-MM-DD إلى ISO string
      const date = dateString ? new Date(dateString) : new Date();
      const isoDateString = date.toISOString();
      const response = await ordersService.getOrdersByDesignerAndMonth(
        user.id,
        isoDateString
      );

      // الـ API يرجع object يحتوي على orders array
      const orders =
        response?.orders || (Array.isArray(response) ? response : []);
      setOrdersList(Array.isArray(orders) ? orders : []);

      // حفظ معلومات الـ summary
      setOrdersSummary({
        totalCount: response?.totalCount || orders.length,
        totalAmountWithDelivery: response?.totalAmountWithDelivery || 0,
        totalAmountWithoutDelivery: response?.totalAmountWithoutDelivery || 0,
        periodDescription: response?.periodDescription || "",
      });

      // تحديث العدد الإجمالي
      setTotalOrdersCount(response?.totalCount || orders.length);

      // جلب حالة التوصيل فقط للطلبات المرسلة لشركة التوصيل
      orders.slice(0, 20).forEach((order) => {
        if (order.isSentToDeliveryCompany) {
          fetchDeliveryStatus(order.id, order);
        }
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrdersList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (index) => {
    // If it's the first card (Total Orders) and user is a designer, open modal
    if (index === 0 && user?.role === USER_ROLES.DESIGNER && user?.id) {
      // تعيين التاريخ الحالي كافتراضي إذا لم يكن محدد
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayString = `${year}-${month}-${day}`;
      setSelectedDate(todayString);

      await loadOrdersByDate(todayString);
      setOpenOrdersModal(true);
    }
  };

  const handleDateChange = async (event) => {
    const newDateString = event.target.value;
    if (!newDateString || !user?.id) return;

    setSelectedDate(newDateString);
    await loadOrdersByDate(newDateString);
  };

  // Load image for display (lazy loading)
  const loadImageForDisplay = async (orderId, designId) => {
    const cacheKey = `${orderId}-${designId}`;

    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }

    if (loadingImage === `image-${orderId}-${designId}`) {
      return null;
    }

    setLoadingImage(`image-${orderId}-${designId}`);
    try {
      const fullOrder = await ordersService.getOrderById(orderId);
      const design = fullOrder.orderDesigns?.find((d) => d.id === designId);

      const imageUrls = getMockupImages(design);
      const firstImage = imageUrls.find(
        (url) =>
          url &&
          url !== "image_data_excluded" &&
          url !== "placeholder_mockup.jpg"
      );

      if (firstImage) {
        const fullImageUrl = getFullUrl(firstImage);
        setImageCache((prev) => ({
          ...prev,
          [cacheKey]: fullImageUrl,
        }));
        return fullImageUrl;
      }
    } catch (error) {
      console.error("Error loading image:", error);
    } finally {
      setLoadingImage(null);
    }
    return null;
  };

  // Helper function to open file (handles both URLs and base64)
  const openFile = async (fileUrl, orderId, designId) => {
    if (!fileUrl || fileUrl === "placeholder_print.pdf") {
      return;
    }

    // If file data is excluded, fetch full order data first
    if (fileUrl === "image_data_excluded" && orderId) {
      setLoadingImage(`file-${orderId}-${designId}`);
      try {
        const fullOrder = await ordersService.getOrderById(orderId);
        const design = fullOrder.orderDesigns?.find((d) => d.id === designId);
        const files = getPrintFiles(design);
        const firstValidFile = files.find(
          (url) => url !== "image_data_excluded"
        );
        if (firstValidFile) {
          fileUrl = firstValidFile;
        } else if (files.includes("image_data_excluded")) {
          fileUrl = null;
        }

        if (!fileUrl) {
          alert("الملف غير متوفر");
          setLoadingImage(null);
          return;
        }
      } catch (error) {
        alert("حدث خطأ أثناء جلب الملف");
        setLoadingImage(null);
        return;
      } finally {
        setLoadingImage(null);
      }
    }

    // Check if it's a base64 data URL
    if (fileUrl.startsWith("data:")) {
      try {
        let base64Data = "";
        let mimeType = "application/pdf";

        if (fileUrl.includes(",")) {
          const parts = fileUrl.split(",");
          base64Data = parts[1];
          const mimeMatch = fileUrl.match(/data:([^;]+);base64/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        } else {
          base64Data = fileUrl;
        }

        const cleanBase64 = base64Data.replace(/\s/g, "");

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
          blob = new Blob([bytes], {
            type: mimeType || "application/octet-stream",
          });
        }

        if (blob.size === 0) {
          throw new Error("الملف فارغ");
        }

        // Detect file type
        let fileExtension = "pdf";
        if (mimeType) {
          const mimeToExt = {
            "application/pdf": "pdf",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/svg+xml": "svg",
            "image/gif": "gif",
            "image/webp": "webp",
          };
          fileExtension = mimeToExt[mimeType.toLowerCase()] || "bin";
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `order_file_${Date.now()}.${fileExtension}`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        }, 1000);
      } catch (error) {
        console.error("Error opening file:", error);
        alert("حدث خطأ أثناء فتح الملف.\n" + error.message);
      }
    } else {
      const fullFileUrl = getFullUrl(fileUrl);
      const link = document.createElement("a");
      link.href = fullFileUrl;
      link.download = fullFileUrl.split("/").pop() || "file.pdf";
      link.target = "_blank";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setOrderNotes(""); // Start with empty for new note
    setIsEditingNotes(false);
    setOpenDetailsModal(true);

    // Load images for all designs when modal opens
    if (order?.orderDesigns) {
      order.orderDesigns.forEach((design) => {});

      const loadPromises = order.orderDesigns.map((design) => {
        const images = getMockupImages(design);
        const hasExcludedImage = images.includes("image_data_excluded");
        if (hasExcludedImage) {
          return loadImageForDisplay(order.id, design.id);
        }
        return Promise.resolve(null);
      });

      // Wait for all images to load, then update selectedOrder to trigger re-render
      Promise.all(loadPromises).then(() => {
        // Force re-render by updating selectedOrder
        setSelectedOrder((prev) => ({ ...prev }));
      });
    }
  };

  const handleOpenEditOrder = async (order) => {
    setEditLoading(true);
    try {
      const fullOrder = await ordersService.getOrderById(order.id);
      setOrderToEdit(fullOrder || order);
      setOpenEditDialog(true);
    } catch (error) {
      alert("حدث خطأ أثناء جلب بيانات الطلب للتعديل");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEditOrder = () => {
    if (editLoading) return;
    setOpenEditDialog(false);
    setOrderToEdit(null);
  };

  const handleSubmitEditOrder = async (updatedOrder) => {
    if (!orderToEdit || !updatedOrder) return;

    setEditLoading(true);
    try {
      const payloadToSend = {
        ...orderToEdit,
        ...updatedOrder,
        id: orderToEdit.id,
      };

      if (Array.isArray(payloadToSend.orderDesigns)) {
        payloadToSend.orderDesigns = payloadToSend.orderDesigns.map(
          (design) => ({
            ...design,
            orderId: payloadToSend.id,
          })
        );
      }

      await ordersService.updateOrder(orderToEdit.id, payloadToSend);

      let refreshed = [];
      try {
        if (user?.role === USER_ROLES.DESIGNER && user?.id) {
          refreshed = await ordersService.getOrdersByDesigner(user.id);
        } else {
          refreshed = await ordersService.getAllOrders();
        }
      } catch (refreshError) {
        console.error("Error refreshing orders after update:", refreshError);
      }

      if (Array.isArray(refreshed)) {
        setOrdersList(refreshed);
        setTotalOrdersCount(refreshed.length);
      }

      const updatedSelected =
        refreshed?.find?.((order) => order.id === orderToEdit.id) ||
        payloadToSend;

      if (selectedOrder?.id === orderToEdit.id && updatedSelected) {
        setSelectedOrder(updatedSelected);
      }

      setOrderToEdit(updatedSelected);
      fetchDesignerOrdersCount();
    } catch (error) {
      console.error("Error updating order:", error);
      alert("حدث خطأ أثناء تحديث الطلب. الرجاء المحاولة مرة أخرى.");
    } finally {
      setEditLoading(false);
    }
  };

  // Force re-render when imageCache changes
  useEffect(() => {
    // This effect ensures that when imageCache updates, the component re-renders
  }, [imageCache]);

  const handleImageClick = async (imageUrl, orderId, designId) => {
    if (!imageUrl || imageUrl === "placeholder_mockup.jpg") {
      return;
    }

    if (imageUrl === "image_data_excluded" && orderId) {
      const cacheKey = `${orderId}-${designId}`;
      let imageToShow = imageCache[cacheKey];
      if (!imageToShow) {
        imageToShow = await loadImageForDisplay(orderId, designId);
      }
      if (imageToShow) {
        setSelectedImage(imageToShow);
        setImageDialogOpen(true);
      } else {
        alert("الصورة غير متوفرة");
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

  const handleCloseOrdersModal = () => {
    setOpenOrdersModal(false);
    setOrdersList([]);
    setConfirmedDeliveryOrders([]);
    setConfirmedDeliveryCount(0);
    setSearchQuery("");
    setDeliveryCompanyFilter("all");
    setOrdersModalTab(0);
  };

  // Load confirmed delivery orders
  const loadConfirmedDeliveryOrders = async () => {
    if (!user?.id) return;

    setLoadingConfirmedDelivery(true);
    try {
      const response = await ordersService.getConfirmedDeliveryOrders({
        designerId: user.id,
        page: 1,
        pageSize: 100,
      });

      // Handle different response formats
      let orders = [];
      if (Array.isArray(response)) {
        orders = response;
      } else if (response?.orders && Array.isArray(response.orders)) {
        orders = response.orders;
      } else if (response?.data && Array.isArray(response.data)) {
        orders = response.data;
      }

      setConfirmedDeliveryOrders(orders);
      // Set count from response
      setConfirmedDeliveryCount(response?.totalCount || orders.length);

      // Fetch delivery status for orders sent to delivery company
      orders.slice(0, 20).forEach((order) => {
        if (order.isSentToDeliveryCompany) {
          fetchDeliveryStatus(order.id, order);
        }
      });
    } catch (error) {
      console.error("Error fetching confirmed delivery orders:", error);
      setConfirmedDeliveryOrders([]);
    } finally {
      setLoadingConfirmedDelivery(false);
    }
  };

  // Handle tab change
  const handleOrdersModalTabChange = (event, newValue) => {
    setOrdersModalTab(newValue);
    if (newValue === 1 && confirmedDeliveryOrders.length === 0) {
      // Load confirmed delivery orders when switching to that tab
      loadConfirmedDeliveryOrders();
    }
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedOrder(null);
    setOrderNotes("");
    setIsEditingNotes(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder || !orderNotes.trim()) return;
    setSavingNotes(true);
    try {
      const currentDate = new Date();
      const dateTime = currentDate.toLocaleString("ar-SA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory",
      });
      const authorName = user?.name || "مستخدم غير معروف";

      // Format: [DateTime] Author Name: Note Text
      const newNote = `[${dateTime}] ${authorName}: ${orderNotes.trim()}`;

      // Append to existing notes or create new
      const existingNotes = selectedOrder.notes || "";
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n${newNote}`
        : newNote;

      await ordersService.updateOrderNotes(selectedOrder.id, updatedNotes);
      // Update local state
      setSelectedOrder({ ...selectedOrder, notes: updatedNotes });
      setOrdersList((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, notes: updatedNotes }
            : order
        )
      );
      setOrderNotes(""); // Clear input
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusLabel = (status) => ({
    label: ORDER_STATUS_LABELS[status] || "غير معروف",
    color: ORDER_STATUS_COLORS[status] || "default",
  });

  const handleCancelOrder = async (order) => {
    if (!order) return;
    setCancelLoadingId(order.id);
    try {
      await orderStatusService.setCancelled(order.id);
      setOrdersList((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, status: ORDER_STATUS.CANCELLED }
            : item
        )
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: ORDER_STATUS.CANCELLED } : prev
        );
      }
      fetchDesignerOrdersCount(); // refresh counts if designer
    } catch (error) {
    } finally {
      setCancelLoadingId(null);
    }
  };

  // Handle contact customer and update contacted status (Toggle)
  const handleContactCustomer = async (order) => {
    if (!order) return;

    // Determine new status (toggle)
    const currentStatus = order.isContacted || order.isContactedWithClient;
    const newStatus = !currentStatus;

    try {
      // Update contacted status in backend
      await ordersService.updateContactedStatus(order.id);

      // Update local state with new status
      setOrdersList((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                isContacted: newStatus,
                isContactedWithClient: newStatus,
              }
            : item
        )
      );

      // Update confirmed delivery orders if in that tab
      setConfirmedDeliveryOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                isContacted: newStatus,
                isContactedWithClient: newStatus,
              }
            : item
        )
      );

      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                isContacted: newStatus,
                isContactedWithClient: newStatus,
              }
            : prev
        );
      }
    } catch (error) {
      console.error("Error updating contacted status:", error);
      alert("حدث خطأ أثناء تحديث حالة التواصل. الرجاء المحاولة مرة أخرى.");
    }
  };

  const handleDeliveryStatusClick = async (order) => {
    setOrderForDeliveryStatus(order);
    setDeliveryStatusLoading(true);
    setOpenDeliveryStatusDialog(true);
    setDeliveryStatusData(null);

    // Only fetch if order is sent to delivery company
    if (!order.isSentToDeliveryCompany) {
      setDeliveryStatusData({
        status: {
          arabic: "لم يتم إرسال الطلب لشركة التوصيل بعد",
          english: "Order not sent to delivery company yet",
        },
      });
      setDeliveryStatusLoading(false);
      return;
    }

    try {
      const statusData = await shipmentsService.getDeliveryStatus(order.id);
      setDeliveryStatusData(statusData);
    } catch (error) {
      // إذا كان الخطأ هو "NO_SHIPMENT" (لم يتم إنشاء شحنة بعد)، هذا طبيعي ولا نعرضه
      const errorCode = error.response?.data?.code;
      if (errorCode !== "NO_SHIPMENT") {
        console.error("Error fetching delivery status:", error);
        alert(
          `حدث خطأ أثناء جلب حالة التوصيل: ${
            error.response?.data?.message || error.message || "خطأ غير معروف"
          }`
        );
      } else {
        // If NO_SHIPMENT, just show a message in the dialog without an alert
        setDeliveryStatusData({
          status: {
            arabic: "لم يتم إنشاء شحنة بعد",
            english: "No shipment created yet",
          },
        });
      }
    } finally {
      setDeliveryStatusLoading(false);
    }
  };

  const handleCloseDeliveryStatusDialog = () => {
    setOpenDeliveryStatusDialog(false);
    setDeliveryStatusData(null);
    setOrderForDeliveryStatus(null);
  };

  const employeeOrders = orders.filter(
    (order) => order.employeeName === user?.name
  );
  const pendingOrders = employeeOrders.filter(
    (order) => order.status === "pending"
  );
  const completedOrders = employeeOrders.filter(
    (order) => order.status === "completed"
  );

  const stats = [
    {
      title: "إجمالي الطلبات",
      value:
        user?.role === USER_ROLES.DESIGNER
          ? totalOrdersCount
          : employeeOrders.length,
      icon: Assignment,
    },
  ];

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
            PSBrand - لوحة الموظف
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <NotificationsBell onNewNotification={newNotificationReceived} />
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                backdropFilter: "blur(6px)",
              }}
            >
              {user?.name?.charAt(0) || "م"}
            </Avatar>
            <Typography
              variant="body1"
              sx={{ fontWeight: 500, color: "#f6f1eb" }}
            >
              {user?.name || "موظف"}
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

      <Container maxWidth="lg" sx={{ paddingY: 5 }}>
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const cardStyle =
              calmPalette.statCards[index % calmPalette.statCards.length];
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  onClick={() => handleCardClick(index)}
                  sx={{
                    position: "relative",
                    background: cardStyle.background,
                    color: cardStyle.highlight,
                    borderRadius: 4,
                    boxShadow: calmPalette.shadow,
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    backdropFilter: "blur(6px)",
                    cursor:
                      index === 0 && user?.role === USER_ROLES.DESIGNER
                        ? "pointer"
                        : "default",
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
        <Box
          sx={{
            marginBottom: 4,
            background: calmPalette.surface,
            borderRadius: 4,
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
            padding: 3,
          }}
        >
          <OrderForm
            onSuccess={() => {
              setShowForm(false);
              fetchDesignerOrdersCount(); // Refresh orders count after creating new order
            }}
          />
        </Box>

        {employeeOrders.length > 0 && (
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
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 700, marginBottom: 3 }}
            >
              طلباتي السابقة
            </Typography>

            <Grid container spacing={3}>
              {employeeOrders.map((order) => (
                <Grid item xs={12} md={6} key={order.id}>
                  <Card
                    sx={{
                      background: calmPalette.surfaceHover,
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 18px 36px rgba(46, 38, 31, 0.18)",
                      },
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: 2,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {order.customerName}
                        </Typography>
                        <Chip
                          label={
                            order.status === "pending"
                              ? "قيد الانتظار"
                              : order.status === "completed"
                              ? "مكتمل"
                              : "ملغي"
                          }
                          color={
                            order.status === "pending"
                              ? "warning"
                              : order.status === "completed"
                              ? "success"
                              : "error"
                          }
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>الهاتف:</strong> {order.customerPhone}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>المقاس:</strong> {order.size} |{" "}
                        <strong>اللون:</strong>{" "}
                        {getColorLabel({
                          color: order.color,
                          colorId: order.colorId,
                        })}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>السعر:</strong> {order.price} ₪
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", marginTop: 1 }}
                      >
                        {new Date(order.createdAt).toLocaleDateString("ar", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Container>

      {/* Orders Modal */}
      <GlassDialog
        open={openOrdersModal}
        onClose={handleCloseOrdersModal}
        maxWidth="xl"
        title="اجمالي الطلبات"
        actions={
          <Button onClick={handleCloseOrdersModal} variant="contained">
            إغلاق
          </Button>
        }
      >
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={ordersModalTab}
            onChange={handleOrdersModalTabChange}
            aria-label="orders tabs"
          >
            <Tab label="جميع الطلبات" />
            <Tab label="الطلبات المؤكدة للتوصيل" />
          </Tabs>
        </Box>

        {/* Tab 0: All Orders */}
        {ordersModalTab === 0 && (
          <>
            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", padding: 4 }}
              >
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>جاري التحميل...</Typography>
              </Box>
            ) : ordersList.length === 0 ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", padding: 4 }}
              >
                <Typography>لا توجد طلبات</Typography>
              </Box>
            ) : (
              <>
                {/* Search Field */}
                <Box
                  sx={{
                    marginBottom: 2,
                    marginTop: 2,
                    position: "relative",
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      width: "30%",
                      minWidth: 400,
                    }}
                  >
                    <TextField
                      fullWidth
                      size="medium"
                      placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              marginRight: 1,
                              color: searchQuery
                                ? calmPalette.primary
                                : "text.secondary",
                              transition: "color 0.3s ease",
                            }}
                          >
                            <Search />
                          </Box>
                        ),
                      }}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 3,
                        boxShadow: "0 4px 20px rgba(94, 78, 62, 0.1)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 6px 25px rgba(94, 78, 62, 0.15)",
                          backgroundColor: "rgba(255,255,255,0.95)",
                        },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 3,
                          paddingLeft: 1,
                          "& fieldset": {
                            borderColor: "rgba(94, 78, 62, 0.2)",
                            borderWidth: 2,
                            transition: "all 0.3s ease",
                          },
                          "&:hover fieldset": {
                            borderColor: calmPalette.primary + "80",
                            borderWidth: 2,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                            boxShadow: `0 0 0 3px ${calmPalette.primary}20`,
                          },
                          "& input": {
                            padding: "12px 14px",
                            fontSize: "0.95rem",
                            fontWeight: 500,
                          },
                        },
                      }}
                    />
                  </Box>
                  <TextField
                    select
                    size="small"
                    label="ترتيب حسب التاريخ"
                    value={sortByDate}
                    onChange={(e) => {
                      setSortByDate(e.target.value);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="orderDate">تاريخ ادخال الطلب</MenuItem>
                    <MenuItem value="createdAt">تاريخ الطلب</MenuItem>
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="فلتر حسب حالة التوصيل"
                    value={deliveryCompanyFilter}
                    onChange={(e) => {
                      setDeliveryCompanyFilter(e.target.value);
                    }}
                    sx={{ minWidth: 250 }}
                  >
                    <MenuItem value="all">جميع حالات التوصيل</MenuItem>
                    <MenuItem value="no_shipment">بدون شحنة</MenuItem>
                    <MenuItem value="has_shipment">
                      لديه شحنة (أي حالة)
                    </MenuItem>
                    <MenuItem value="1">مسودة (Draft)</MenuItem>
                    <MenuItem value="2">مؤكدة (Submitted)</MenuItem>
                    <MenuItem value="4">في المكتب (Picked Up Office)</MenuItem>
                    <MenuItem value="5">بحاجة متابعة (ON HOLD)</MenuItem>
                    <MenuItem value="7">مرتجع للمرسل (Returned)</MenuItem>
                    <MenuItem value="8">تحصيلات مع السائقين (Cod)</MenuItem>
                    <MenuItem value="9">في المحاسبة (In Accounting)</MenuItem>
                    <MenuItem value="10">مغلق (Closed)</MenuItem>
                    <MenuItem value="11">ملغي (Cancelled)</MenuItem>
                    <MenuItem value="12">نقل بريد داخل فروع الشركة</MenuItem>
                    <MenuItem value="13">متابعة قبل ارجاع الطرد</MenuItem>
                    <MenuItem value="14">مع السائق (With Driver)</MenuItem>
                    <MenuItem value="15">احضار بدل (Return Exchange)</MenuItem>
                    <MenuItem value="16">تاجيلات في المكتب</MenuItem>
                    <MenuItem value="17">تحويل فرع للطرود المرتجعة</MenuItem>
                    <MenuItem value="18">ارسال الشحنات للشركه</MenuItem>
                    <MenuItem value="19">تأجيلات (postponed)</MenuItem>
                    <MenuItem value="20">فواتير قيد التسليم</MenuItem>
                    <MenuItem value="22">رواجع يوم الخميس</MenuItem>
                    <MenuItem value="23">طرود مرتجعه مغلقه</MenuItem>
                  </TextField>
                </Box>
                {searchQuery && (
                  <Box
                    sx={{
                      marginTop: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      backgroundColor: calmPalette.primary + "15",
                      padding: "8px 16px",
                      borderRadius: 2,
                      width: "fit-content",
                      border: `1px solid ${calmPalette.primary}30`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        backgroundColor: calmPalette.primary + "25",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Search sx={{ fontSize: 18, color: calmPalette.primary }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.primary,
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      {(() => {
                        const filteredCount = searchQuery.trim()
                          ? ordersList.filter((order) => {
                              const clientName = order.client?.name || "";
                              const clientPhone = order.client?.phone || "";
                              const query = searchQuery.toLowerCase().trim();
                              return (
                                clientName.toLowerCase().includes(query) ||
                                clientPhone.includes(query)
                              );
                            }).length
                          : ordersList.length;
                        return `تم العثور على ${filteredCount} ${
                          filteredCount === 1 ? "نتيجة" : "نتائج"
                        }`;
                      })()}
                    </Typography>
                  </Box>
                )}
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
                        "& th": {
                          fontWeight: 700,
                          color: calmPalette.textPrimary,
                        },
                      }}
                    >
                      <TableRow>
                        <TableCell>رقم الطلب</TableCell>
                        <TableCell>اسم العميل</TableCell>
                        <TableCell>الرقم</TableCell>
                        <TableCell>الإجمالي</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          حالة التوصيل
                        </TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        let filteredOrders = ordersList;

                        // Apply search filter
                        if (searchQuery.trim()) {
                          filteredOrders = filteredOrders.filter((order) => {
                            const clientName = order.client?.name || "";
                            const clientPhone = order.client?.phone || "";
                            const orderNumber =
                              order.orderNumber || `#${order.id}` || "";
                            const query = searchQuery.toLowerCase().trim();
                            return (
                              clientName.toLowerCase().includes(query) ||
                              clientPhone.includes(query) ||
                              orderNumber.toLowerCase().includes(query)
                            );
                          });
                        }

                        // Apply delivery status filter
                        if (deliveryCompanyFilter !== "all") {
                          filteredOrders = filteredOrders.filter((order) => {
                            const statusData = deliveryStatuses[order.id];

                            if (deliveryCompanyFilter === "no_shipment") {
                              // بدون شحنة: إما لم يتم إرسال الطلب لشركة التوصيل، أو لا يوجد shipment
                              return (
                                !order.isSentToDeliveryCompany ||
                                statusData === null ||
                                statusData === undefined
                              );
                            } else if (
                              deliveryCompanyFilter === "has_shipment"
                            ) {
                              // لديه شحنة: تم إرسال الطلب لشركة التوصيل وهناك shipment
                              return (
                                order.isSentToDeliveryCompany &&
                                statusData !== null &&
                                statusData !== undefined
                              );
                            } else {
                              // فلتر حسب حالة محددة
                              if (
                                !order.isSentToDeliveryCompany ||
                                !statusData ||
                                !statusData.status
                              ) {
                                return false;
                              }
                              const statusId =
                                statusData.status.id || statusData.statusId;
                              return (
                                String(statusId) ===
                                String(deliveryCompanyFilter)
                              );
                            }
                          });
                        }

                        // Sort by date (newest first) - use selected date field (createdAt or orderDate)
                        const sortedOrders = [...filteredOrders].sort(
                          (a, b) => {
                            const dateA =
                              sortByDate === "orderDate"
                                ? a.orderDate || a.createdAt || ""
                                : a.createdAt || a.orderDate || "";
                            const dateB =
                              sortByDate === "orderDate"
                                ? b.orderDate || b.createdAt || ""
                                : b.createdAt || b.orderDate || "";
                            if (!dateA && !dateB) return 0;
                            if (!dateA) return 1;
                            if (!dateB) return -1;
                            return new Date(dateB) - new Date(dateA); // Newest first
                          }
                        );

                        if (sortedOrders.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} align="center">
                                <Box sx={{ padding: 4 }}>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                  >
                                    {searchQuery.trim()
                                      ? "لا توجد نتائج للبحث"
                                      : "لا توجد طلبات"}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return sortedOrders.map((order) => {
                          const status = getStatusLabel(order.status);
                          return (
                            <TableRow
                              key={order.id}
                              hover
                              sx={{
                                "&:nth-of-type(even)": {
                                  backgroundColor: "rgba(255,255,255,0.3)",
                                },
                              }}
                            >
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  {order.isContacted ||
                                  order.isContactedWithClient ? (
                                    <Tooltip title="تم التواصل مع الزبون">
                                      <CheckCircle
                                        sx={{
                                          color: "#4caf50",
                                          fontSize: 18,
                                          cursor: "pointer",
                                        }}
                                      />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="انقر لتحديث حالة التواصل">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleContactCustomer(order)
                                        }
                                        sx={{
                                          color: calmPalette.primary,
                                          padding: 0.25,
                                          minWidth: "auto",
                                          width: 24,
                                          height: 24,
                                          "&:hover": {
                                            backgroundColor:
                                              calmPalette.primary + "15",
                                            transform: "scale(1.1)",
                                          },
                                          transition: "all 0.2s",
                                          "& .MuiSvgIcon-root": {
                                            fontSize: 18,
                                          },
                                        }}
                                      >
                                        <ContactPhone />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Typography variant="body2">
                                    {order.orderNumber}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{order.client?.name || "-"}</TableCell>
                              <TableCell>
                                {order.client?.phone ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {order.client.phone}
                                    </Typography>
                                    <Tooltip title="انقر للتواصل مع الزبون عبر الواتساب">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          openWhatsApp(order.client.phone);
                                        }}
                                        sx={{
                                          color: "#25D366",
                                          "&:hover": {
                                            backgroundColor:
                                              "rgba(37, 211, 102, 0.1)",
                                          },
                                        }}
                                      >
                                        <WhatsAppIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>{order.totalAmount} ₪</TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Chip
                                    label={status.label}
                                    color={status.color}
                                    size="small"
                                  />
                                  {order.needsPhotography && (
                                    <Tooltip title="يحتاج تصوير">
                                      <CameraAlt
                                        sx={{
                                          color: "primary.main",
                                          fontSize: 20,
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                  {order.isModified &&
                                    user?.role === USER_ROLES.ADMIN && (
                                      <Tooltip title="تم تعديل الطلب">
                                        <History
                                          sx={{
                                            color: "warning.main",
                                            fontSize: 20,
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                </Box>
                              </TableCell>
                              <TableCell
                                onClick={() => {
                                  // Always allow clicking - we'll try to fetch delivery status
                                  handleDeliveryStatusClick(order);
                                }}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: "action.hover",
                                  },
                                }}
                              >
                                {(() => {
                                  const statusData = deliveryStatuses[order.id];
                                  const isLoading =
                                    loadingDeliveryStatuses[order.id];

                                  // If order is not sent to delivery company, don't show loading or fetch status
                                  if (!order.isSentToDeliveryCompany) {
                                    return (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        -
                                      </Typography>
                                    );
                                  }

                                  if (isLoading) {
                                    return (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <CircularProgress size={16} />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          جاري التحميل...
                                        </Typography>
                                      </Box>
                                    );
                                  }

                                  if (statusData === null) {
                                    // We checked but no shipment exists
                                    // Order is sent to delivery company but no shipment yet
                                    return (
                                      <Chip
                                        label="في انتظار الشحنة"
                                        sx={{
                                          backgroundColor: "#ff9800",
                                          color: "#ffffff",
                                          fontWeight: 600,
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                        }}
                                      />
                                    );
                                  }

                                  if (statusData && statusData.status) {
                                    return (
                                      <Chip
                                        label={
                                          statusData.status.arabic ||
                                          statusData.status.english ||
                                          "غير معروف"
                                        }
                                        sx={{
                                          backgroundColor:
                                            statusData.status.color ||
                                            "#1976d2",
                                          color: "#ffffff",
                                          fontWeight: 600,
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                          maxWidth: "150px",
                                          "&:hover": {
                                            opacity: 0.9,
                                            transform: "scale(1.05)",
                                          },
                                          transition: "all 0.2s",
                                          "& .MuiChip-label": {
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          },
                                        }}
                                        size="small"
                                      />
                                    );
                                  }

                                  // No data yet - show dash (will be populated when shipment is created or fetched)
                                  return (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      -
                                    </Typography>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                {order.orderDate
                                  ? new Date(
                                      order.orderDate
                                    ).toLocaleDateString("ar-SA", {
                                      calendar: "gregory",
                                    })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Visibility />}
                                    onClick={() => handleViewDetails(order)}
                                  >
                                    عرض
                                  </Button>
                                  <Tooltip
                                    title={(() => {
                                      const numericStatus =
                                        typeof order.status === "number"
                                          ? order.status
                                          : parseInt(order.status, 10);
                                      if (
                                        numericStatus ===
                                        ORDER_STATUS.IN_PACKAGING
                                      ) {
                                        return "لا يمكن تعديل الطلب في مرحلة التغليف";
                                      } else if (
                                        numericStatus === ORDER_STATUS.COMPLETED
                                      ) {
                                        return "لا يمكن تعديل الطلب المكتمل";
                                      } else if (
                                        numericStatus ===
                                        ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                                      ) {
                                        return "لا يمكن تعديل الطلب المرسل لشركة التوصيل";
                                      }
                                      return "تعديل الطلب";
                                    })()}
                                    arrow
                                    placement="top"
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        sx={{ minWidth: 80 }}
                                        onClick={() =>
                                          handleOpenEditOrder(order)
                                        }
                                        disabled={(() => {
                                          const numericStatus =
                                            typeof order.status === "number"
                                              ? order.status
                                              : parseInt(order.status, 10);
                                          return (
                                            numericStatus ===
                                              ORDER_STATUS.IN_PACKAGING ||
                                            numericStatus ===
                                              ORDER_STATUS.COMPLETED ||
                                            numericStatus ===
                                              ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                                          );
                                        })()}
                                      >
                                        تعديل
                                      </Button>
                                    </span>
                                  </Tooltip>
                                  {order.status !== ORDER_STATUS.CANCELLED &&
                                    order.status !== ORDER_STATUS.COMPLETED && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        sx={{
                                          minWidth: 100,
                                          "&.Mui-disabled": {
                                            color: "#777777",
                                            borderColor: "rgba(0,0,0,0.12)",
                                            backgroundColor: "rgba(0,0,0,0.03)",
                                          },
                                        }}
                                        onClick={() => handleCancelOrder(order)}
                                        disabled={cancelLoadingId === order.id}
                                      >
                                        {cancelLoadingId === order.id ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          "إلغاء الطلب"
                                        )}
                                      </Button>
                                    )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}

        {/* Tab 1: Confirmed Delivery Orders */}
        {ordersModalTab === 1 && (
          <>
            {loadingConfirmedDelivery ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", padding: 4 }}
              >
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>جاري التحميل...</Typography>
              </Box>
            ) : confirmedDeliveryOrders.length === 0 ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", padding: 4 }}
              >
                <Typography>لا توجد طلبات مؤكدة للتوصيل</Typography>
              </Box>
            ) : (
              <>
                {/* Count Display */}
                <Box
                  sx={{
                    marginBottom: 2,
                    marginTop: 1,
                    padding: 2,
                    backgroundColor: calmPalette.primary + "15",
                    borderRadius: 2,
                    border: `1px solid ${calmPalette.primary}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: "black",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                    }}
                  >
                    إجمالي الطلبات المؤكدة للتوصيل: {confirmedDeliveryCount}
                  </Typography>
                </Box>
                {/* Search Field */}
                <Box
                  sx={{
                    marginBottom: 2,
                    marginTop: 2,
                    position: "relative",
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      width: "30%",
                      minWidth: 400,
                    }}
                  >
                    <TextField
                      fullWidth
                      size="medium"
                      placeholder="بحث باسم العميل أو رقم الهاتف أو رقم الطلب..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              marginRight: 1,
                              color: searchQuery
                                ? calmPalette.primary
                                : "text.secondary",
                              transition: "color 0.3s ease",
                            }}
                          >
                            <Search />
                          </Box>
                        ),
                      }}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 3,
                        boxShadow: "0 4px 20px rgba(94, 78, 62, 0.1)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 6px 25px rgba(94, 78, 62, 0.15)",
                          backgroundColor: "rgba(255,255,255,0.95)",
                        },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 3,
                          paddingLeft: 1,
                          "& fieldset": {
                            borderColor: "rgba(94, 78, 62, 0.2)",
                            borderWidth: 2,
                            transition: "all 0.3s ease",
                          },
                          "&:hover fieldset": {
                            borderColor: calmPalette.primary + "80",
                            borderWidth: 2,
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: calmPalette.primary,
                            borderWidth: 2,
                            boxShadow: `0 0 0 3px ${calmPalette.primary}20`,
                          },
                          "& input": {
                            padding: "12px 14px",
                            fontSize: "0.95rem",
                            fontWeight: 500,
                          },
                        },
                      }}
                    />
                  </Box>
                  <TextField
                    select
                    size="small"
                    label="ترتيب حسب التاريخ"
                    value={sortByDate}
                    onChange={(e) => {
                      setSortByDate(e.target.value);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="orderDate">تاريخ ادخال الطلب</MenuItem>
                    <MenuItem value="createdAt">تاريخ الطلب</MenuItem>
                  </TextField>
                </Box>
                {searchQuery && (
                  <Box
                    sx={{
                      marginTop: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      backgroundColor: calmPalette.primary + "15",
                      padding: "8px 16px",
                      borderRadius: 2,
                      width: "fit-content",
                      border: `1px solid ${calmPalette.primary}30`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        backgroundColor: calmPalette.primary + "25",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Search sx={{ fontSize: 18, color: calmPalette.primary }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: calmPalette.primary,
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      {(() => {
                        const filteredCount = searchQuery.trim()
                          ? confirmedDeliveryOrders.filter((order) => {
                              const clientName = order.client?.name || "";
                              const clientPhone = order.client?.phone || "";
                              const orderNumber =
                                order.orderNumber || `#${order.id}` || "";
                              const query = searchQuery.toLowerCase().trim();
                              return (
                                clientName.toLowerCase().includes(query) ||
                                clientPhone.includes(query) ||
                                orderNumber.toLowerCase().includes(query)
                              );
                            }).length
                          : confirmedDeliveryOrders.length;
                        return `تم العثور على ${filteredCount} ${
                          filteredCount === 1 ? "نتيجة" : "نتائج"
                        }`;
                      })()}
                    </Typography>
                  </Box>
                )}
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
                        "& th": {
                          fontWeight: 700,
                          color: calmPalette.textPrimary,
                        },
                      }}
                    >
                      <TableRow>
                        <TableCell>رقم الطلب</TableCell>
                        <TableCell>اسم العميل</TableCell>
                        <TableCell>الرقم</TableCell>
                        <TableCell>الإجمالي</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          حالة التوصيل
                        </TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        let filteredOrders = confirmedDeliveryOrders;

                        // Apply search filter
                        if (searchQuery.trim()) {
                          filteredOrders = filteredOrders.filter((order) => {
                            const clientName = order.client?.name || "";
                            const clientPhone = order.client?.phone || "";
                            const orderNumber =
                              order.orderNumber || `#${order.id}` || "";
                            const query = searchQuery.toLowerCase().trim();
                            return (
                              clientName.toLowerCase().includes(query) ||
                              clientPhone.includes(query) ||
                              orderNumber.toLowerCase().includes(query)
                            );
                          });
                        }

                        // Apply delivery status filter
                        if (deliveryCompanyFilter !== "all") {
                          filteredOrders = filteredOrders.filter((order) => {
                            const statusData = deliveryStatuses[order.id];

                            if (deliveryCompanyFilter === "no_shipment") {
                              // بدون شحنة: إما لم يتم إرسال الطلب لشركة التوصيل، أو لا يوجد shipment
                              return (
                                !order.isSentToDeliveryCompany ||
                                statusData === null ||
                                statusData === undefined
                              );
                            } else if (
                              deliveryCompanyFilter === "has_shipment"
                            ) {
                              // لديه شحنة: تم إرسال الطلب لشركة التوصيل وهناك shipment
                              return (
                                order.isSentToDeliveryCompany &&
                                statusData !== null &&
                                statusData !== undefined
                              );
                            } else {
                              // فلتر حسب حالة محددة
                              if (
                                !order.isSentToDeliveryCompany ||
                                !statusData ||
                                !statusData.status
                              ) {
                                return false;
                              }
                              const statusId =
                                statusData.status.id || statusData.statusId;
                              return (
                                String(statusId) ===
                                String(deliveryCompanyFilter)
                              );
                            }
                          });
                        }

                        // Sort by date (newest first)
                        const sortedOrders = [...filteredOrders].sort(
                          (a, b) => {
                            const dateA =
                              sortByDate === "orderDate"
                                ? a.orderDate || a.createdAt || ""
                                : a.createdAt || a.orderDate || "";
                            const dateB =
                              sortByDate === "orderDate"
                                ? b.orderDate || b.createdAt || ""
                                : b.createdAt || b.orderDate || "";
                            if (!dateA && !dateB) return 0;
                            if (!dateA) return 1;
                            if (!dateB) return -1;
                            return new Date(dateB) - new Date(dateA); // Newest first
                          }
                        );

                        if (sortedOrders.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} align="center">
                                <Box sx={{ padding: 4 }}>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                  >
                                    {searchQuery.trim()
                                      ? "لا توجد نتائج للبحث"
                                      : "لا توجد طلبات مؤكدة للتوصيل"}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return sortedOrders.map((order) => {
                          const status = getStatusLabel(order.status);
                          return (
                            <TableRow
                              key={order.id}
                              hover
                              sx={{
                                "&:nth-of-type(even)": {
                                  backgroundColor: "rgba(255,255,255,0.3)",
                                },
                              }}
                            >
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  {order.isContacted ||
                                  order.isContactedWithClient ? (
                                    <Tooltip title="انقر لإلغاء حالة التواصل">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleContactCustomer(order)
                                        }
                                        sx={{
                                          color: "#4caf50",
                                          padding: 0.25,
                                          minWidth: "auto",
                                          width: 24,
                                          height: 24,
                                          "&:hover": {
                                            backgroundColor: "#4caf5015",
                                            transform: "scale(1.1)",
                                          },
                                          transition: "all 0.2s",
                                          "& .MuiSvgIcon-root": {
                                            fontSize: 18,
                                          },
                                        }}
                                      >
                                        <CheckCircle />
                                      </IconButton>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="انقر لتحديث حالة التواصل">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleContactCustomer(order)
                                        }
                                        sx={{
                                          color: calmPalette.primary,
                                          padding: 0.25,
                                          minWidth: "auto",
                                          width: 24,
                                          height: 24,
                                          "&:hover": {
                                            backgroundColor:
                                              calmPalette.primary + "15",
                                            transform: "scale(1.1)",
                                          },
                                          transition: "all 0.2s",
                                          "& .MuiSvgIcon-root": {
                                            fontSize: 18,
                                          },
                                        }}
                                      >
                                        <ContactPhone />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Typography variant="body2">
                                    {order.orderNumber}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{order.client?.name || "-"}</TableCell>
                              <TableCell>
                                {order.client?.phone ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {order.client.phone}
                                    </Typography>
                                    <Tooltip title="انقر للتواصل مع الزبون عبر الواتساب">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          openWhatsApp(order.client.phone);
                                        }}
                                        sx={{
                                          color: "#25D366",
                                          "&:hover": {
                                            backgroundColor:
                                              "rgba(37, 211, 102, 0.1)",
                                          },
                                        }}
                                      >
                                        <WhatsAppIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>{order.totalAmount} ₪</TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Chip
                                    label={status.label}
                                    color={status.color}
                                    size="small"
                                  />
                                  {order.needsPhotography && (
                                    <Tooltip title="يحتاج تصوير">
                                      <CameraAlt
                                        sx={{
                                          color: "primary.main",
                                          fontSize: 20,
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                  {order.isModified &&
                                    user?.role === USER_ROLES.ADMIN && (
                                      <Tooltip title="تم تعديل الطلب">
                                        <History
                                          sx={{
                                            color: "warning.main",
                                            fontSize: 20,
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                </Box>
                              </TableCell>
                              <TableCell
                                onClick={() => {
                                  handleDeliveryStatusClick(order);
                                }}
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: "action.hover",
                                  },
                                }}
                              >
                                {(() => {
                                  const statusData = deliveryStatuses[order.id];
                                  const isLoading =
                                    loadingDeliveryStatuses[order.id];

                                  if (!order.isSentToDeliveryCompany) {
                                    return (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        -
                                      </Typography>
                                    );
                                  }

                                  if (isLoading) {
                                    return (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <CircularProgress size={16} />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          جاري التحميل...
                                        </Typography>
                                      </Box>
                                    );
                                  }

                                  if (statusData === null) {
                                    return (
                                      <Chip
                                        label="في انتظار الشحنة"
                                        sx={{
                                          backgroundColor: "#ff9800",
                                          color: "#ffffff",
                                          fontWeight: 600,
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                        }}
                                      />
                                    );
                                  }

                                  if (statusData && statusData.status) {
                                    return (
                                      <Chip
                                        label={
                                          statusData.status.arabic ||
                                          statusData.status.english ||
                                          "غير معروف"
                                        }
                                        sx={{
                                          backgroundColor:
                                            statusData.status.color ||
                                            "#1976d2",
                                          color: "#ffffff",
                                          fontWeight: 600,
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                          maxWidth: "150px",
                                          "&:hover": {
                                            opacity: 0.9,
                                            transform: "scale(1.05)",
                                          },
                                          transition: "all 0.2s",
                                          "& .MuiChip-label": {
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          },
                                        }}
                                        size="small"
                                      />
                                    );
                                  }

                                  return (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      -
                                    </Typography>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                {order.orderDate
                                  ? new Date(
                                      order.orderDate
                                    ).toLocaleDateString("ar-SA", {
                                      calendar: "gregory",
                                    })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Visibility />}
                                    onClick={() => handleViewDetails(order)}
                                  >
                                    عرض
                                  </Button>
                                  <Tooltip
                                    title={(() => {
                                      const numericStatus =
                                        typeof order.status === "number"
                                          ? order.status
                                          : parseInt(order.status, 10);
                                      if (
                                        numericStatus ===
                                        ORDER_STATUS.IN_PACKAGING
                                      ) {
                                        return "لا يمكن تعديل الطلب في مرحلة التغليف";
                                      } else if (
                                        numericStatus === ORDER_STATUS.COMPLETED
                                      ) {
                                        return "لا يمكن تعديل الطلب المكتمل";
                                      } else if (
                                        numericStatus ===
                                        ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                                      ) {
                                        return "لا يمكن تعديل الطلب المرسل لشركة التوصيل";
                                      }
                                      return "تعديل الطلب";
                                    })()}
                                    arrow
                                    placement="top"
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        sx={{ minWidth: 100 }}
                                        onClick={() =>
                                          handleOpenEditOrder(order)
                                        }
                                        disabled={(() => {
                                          const numericStatus =
                                            typeof order.status === "number"
                                              ? order.status
                                              : parseInt(order.status, 10);
                                          return (
                                            numericStatus ===
                                              ORDER_STATUS.IN_PACKAGING ||
                                            numericStatus ===
                                              ORDER_STATUS.COMPLETED ||
                                            numericStatus ===
                                              ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                                          );
                                        })()}
                                      >
                                        تعديل
                                      </Button>
                                    </span>
                                  </Tooltip>
                                  {order.status !== ORDER_STATUS.CANCELLED &&
                                    order.status !== ORDER_STATUS.COMPLETED && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        sx={{
                                          minWidth: 120,
                                          "&.Mui-disabled": {
                                            color: "#777777",
                                            borderColor: "rgba(0,0,0,0.12)",
                                            backgroundColor: "rgba(0,0,0,0.03)",
                                          },
                                        }}
                                        onClick={() => handleCancelOrder(order)}
                                        disabled={cancelLoadingId === order.id}
                                      >
                                        {cancelLoadingId === order.id ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          "إلغاء الطلب"
                                        )}
                                      </Button>
                                    )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
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
          <Box sx={{ display: "flex", gap: 2 }}>
            <Tooltip
              title={
                selectedOrder &&
                (() => {
                  const numericStatus =
                    typeof selectedOrder.status === "number"
                      ? selectedOrder.status
                      : parseInt(selectedOrder.status, 10);
                  if (numericStatus === ORDER_STATUS.IN_PACKAGING) {
                    return "لا يمكن تعديل الطلب في مرحلة التغليف";
                  } else if (numericStatus === ORDER_STATUS.COMPLETED) {
                    return "لا يمكن تعديل الطلب المكتمل";
                  } else if (
                    numericStatus === ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                  ) {
                    return "لا يمكن تعديل الطلب المرسل لشركة التوصيل";
                  }
                  return "تعديل الطلب";
                })()
              }
              arrow
              placement="top"
            >
              <span>
                <Button
                  variant="outlined"
                  onClick={() =>
                    selectedOrder && handleOpenEditOrder(selectedOrder)
                  }
                  disabled={
                    !selectedOrder ||
                    editLoading ||
                    (selectedOrder &&
                      (() => {
                        const numericStatus =
                          typeof selectedOrder.status === "number"
                            ? selectedOrder.status
                            : parseInt(selectedOrder.status, 10);
                        return (
                          numericStatus === ORDER_STATUS.IN_PACKAGING ||
                          numericStatus === ORDER_STATUS.COMPLETED ||
                          numericStatus ===
                            ORDER_STATUS.SENT_TO_DELIVERY_COMPANY
                        );
                      })())
                  }
                >
                  تعديل
                </Button>
              </span>
            </Tooltip>
            <Button onClick={handleCloseDetailsModal} variant="contained">
              إغلاق
            </Button>
          </Box>
        }
      >
        {selectedOrder && (
          <Box
            sx={{
              padding: 3,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
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
                  <InfoItem
                    label="التاريخ"
                    value={formatDateTime(selectedOrder.createdAt)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="إجمالي الكمية"
                    value={
                      totalOrderQuantity || totalOrderQuantity === 0
                        ? totalOrderQuantity
                        : "-"
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المجموع الفرعي"
                    value={formatCurrency(selectedOrder.subTotal)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem label="التخفيض" value={discountDisplay} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="رسوم التوصيل"
                    value={formatCurrency(
                      selectedOrder.deliveryFee ?? selectedOrder.deliveryPrice
                    )}
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <CameraAlt sx={{ color: "primary.main" }} />
                          <Typography variant="body2">نعم</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          لا
                        </Typography>
                      )
                    }
                  />
                </Grid>
              </Grid>
              {discountNotes && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
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
                  <InfoItem
                    label="الاسم"
                    value={selectedOrder.client?.name || "-"}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="الهاتف"
                    value={selectedOrder.client?.phone || "-"}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المدينة"
                    value={selectedOrder.province || "-"}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="المنطقة"
                    value={selectedOrder.district || "-"}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoItem
                    label="الدولة"
                    value={selectedOrder.country || "-"}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                الموظفون
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <InfoItem
                    label="البائع"
                    value={selectedOrder.designer?.name || "-"}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InfoItem
                    label="المعد"
                    value={selectedOrder.preparer?.name || "غير محدد"}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Note color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    الملاحظات
                  </Typography>
                </Box>
                {!isEditingNotes ? (
                  <IconButton
                    size="small"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                ) : (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      {savingNotes ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Save fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setOrderNotes("");
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
              {isEditingNotes ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك هنا..."
                  variant="outlined"
                />
              ) : (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    minHeight: 80,
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {selectedOrderNotes ? (
                    selectedOrderNotes.split("\n\n").map((note, idx, arr) => {
                      const match = note.match(
                        /^\[([^\]]+)\]\s+(.+?):\s*(.*)$/
                      );
                      if (match) {
                        const [, datetime, author, text] = match;
                        return (
                          <Box
                            key={idx}
                            sx={{
                              mb: 2,
                              pb: 2,
                              borderBottom:
                                idx < arr.length - 1 ? "1px solid" : "none",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: "primary.main" }}
                              >
                                {author}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {datetime}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {text}
                            </Typography>
                          </Box>
                        );
                      }
                      return (
                        <Typography
                          key={idx}
                          variant="body2"
                          sx={{ mb: 1, whiteSpace: "pre-wrap" }}
                        >
                          {note}
                        </Typography>
                      );
                    })
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      لا توجد ملاحظات
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {selectedOrder?.isModified && user?.role === USER_ROLES.ADMIN && (
              <>
                <Divider />
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
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
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {modificationHistory.map((modification, modIndex) => {
                        const timestamp = modification.Timestamp
                          ? new Date(modification.Timestamp).toLocaleString(
                              "en-GB",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
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
                              sx={{
                                fontWeight: 600,
                                mb: 1.5,
                                color: "warning.dark",
                              }}
                            >
                              تعديل بتاريخ: {timestamp}
                            </Typography>
                            {changes.length > 0 ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1.5,
                                }}
                              >
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
                                      sx={{
                                        fontWeight: 600,
                                        mb: 1,
                                        color: "primary.main",
                                      }}
                                    >
                                      {change.Field || "حقل غير معروف"}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 200 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ display: "block", mb: 0.5 }}
                                        >
                                          القيمة القديمة:
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            p: 0.75,
                                            bgcolor: "error.50",
                                            borderRadius: 0.5,
                                            color: "error.dark",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {getFieldDisplayValue(
                                            change.Field,
                                            change.OldValue
                                          )}
                                        </Typography>
                                      </Box>
                                      <ArrowForward
                                        sx={{ color: "text.secondary", mx: 1 }}
                                      />
                                      <Box sx={{ flex: 1, minWidth: 200 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ display: "block", mb: 0.5 }}
                                        >
                                          القيمة الجديدة:
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            p: 0.75,
                                            bgcolor: "success.50",
                                            borderRadius: 0.5,
                                            color: "success.dark",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {getFieldDisplayValue(
                                            change.Field,
                                            change.NewValue
                                          )}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
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
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    التصاميم ({selectedOrderDesigns.length})
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {selectedOrderDesigns.map((design, index) => {
                      const designItems = design?.orderDesignItems || [];
                      const designQuantity =
                        designItems.reduce(
                          (sum, item) => sum + (item?.quantity || 0),
                          0
                        ) || 0;
                      const orderId = selectedOrder?.id || 0;
                      const designId = design?.id || index;

                      return (
                        <Box
                          key={designId}
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
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {design.designName || `تصميم ${index + 1}`}
                            </Typography>
                            <Box
                              sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                            >
                              <Chip
                                label={`الكمية: ${designQuantity}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {design.totalPrice !== undefined &&
                                design.totalPrice !== null && (
                                  <Chip
                                    label={`قيمة التصميم: ${formatCurrency(
                                      design.totalPrice
                                    )}`}
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
                                    <TableCell align="center">
                                      السعر الفردي
                                    </TableCell>
                                    <TableCell align="center">
                                      الإجمالي
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {designItems.map((item, idx) => (
                                    <TableRow key={item?.id || idx}>
                                      <TableCell>
                                        {getFabricLabel(item)}
                                      </TableCell>
                                      <TableCell>
                                        {getColorLabel(item)}
                                      </TableCell>
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
                                        {formatCurrency(
                                          item?.totalPrice ??
                                            item?.unitPrice * item?.quantity
                                        )}
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
                              (design?.mockupImageUrl
                                ? [design.mockupImageUrl]
                                : []);
                            const validImages = imageUrls.filter(
                              (url) => url && url !== "placeholder_mockup.jpg"
                            );

                            if (validImages.length === 0) return null;

                            return (
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ mb: 1, fontWeight: 600 }}
                                >
                                  الصور ({validImages.length})
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                  }}
                                >
                                  {validImages.map((imageUrl, idx) =>
                                    imageUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage ===
                                          `image-${orderId}-${designId}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <ImageIcon />
                                          )
                                        }
                                        onClick={() =>
                                          handleImageClick(
                                            imageUrl,
                                            orderId,
                                            designId
                                          )
                                        }
                                        disabled={
                                          loadingImage ===
                                          `image-${orderId}-${designId}`
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
                                              alt={`${
                                                design.designName
                                              } - صورة ${idx + 1}`}
                                              onClick={() =>
                                                handleImageClick(
                                                  imageUrl,
                                                  orderId,
                                                  designId
                                                )
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
                                                (e.currentTarget.style.transform =
                                                  "scale(1.05)")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.transform =
                                                  "scale(1)")
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
                              (design?.printFileUrl
                                ? [design.printFileUrl]
                                : []);
                            const validFiles = fileUrls.filter(
                              (url) => url && url !== "placeholder_print.pdf"
                            );

                            if (validFiles.length === 0) return null;

                            return (
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ mb: 1, fontWeight: 600 }}
                                >
                                  ملفات التصميم ({validFiles.length})
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                  }}
                                >
                                  {validFiles.map((fileUrl, idx) =>
                                    fileUrl === "image_data_excluded" ? (
                                      <Button
                                        key={idx}
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                          loadingImage ===
                                          `file-${orderId}-${designId}` ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <PictureAsPdf />
                                          )
                                        }
                                        onClick={() =>
                                          openFile(fileUrl, orderId, designId)
                                        }
                                        disabled={
                                          loadingImage ===
                                          `file-${orderId}-${designId}`
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
                                          openFile(fileUrl, orderId, designId)
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
          </Box>
        )}
      </GlassDialog>

      <GlassDialog
        open={openEditDialog}
        onClose={handleCloseEditOrder}
        maxWidth="xl"
        title="تعديل الطلب"
        contentSx={{ padding: 0 }}
        actions={null}
      >
        {orderToEdit && (
          <OrderForm
            mode="edit"
            initialOrder={orderToEdit}
            onUpdate={handleSubmitEditOrder}
            onCancel={handleCloseEditOrder}
            onSuccess={handleCloseEditOrder}
          />
        )}
      </GlassDialog>

      {/* Delivery Status Dialog */}
      <GlassDialog
        open={openDeliveryStatusDialog}
        onClose={handleCloseDeliveryStatusDialog}
        maxWidth="md"
        title="حالة التوصيل من شركة التوصيل"
        subtitle={
          orderForDeliveryStatus?.orderNumber
            ? `طلب رقم: ${orderForDeliveryStatus.orderNumber}`
            : undefined
        }
        actions={
          <Button onClick={handleCloseDeliveryStatusDialog} variant="contained">
            إغلاق
          </Button>
        }
      >
        <Box sx={{ padding: 3 }}>
          {deliveryStatusLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : deliveryStatusData ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Order & Shipment Info */}
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  معلومات الشحنة
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الطلب"
                      value={deliveryStatusData.orderId || "-"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الشحنة"
                      value={deliveryStatusData.shipmentId || "-"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم الشحنة (RoadFn)"
                      value={deliveryStatusData.roadFnShipmentId || "-"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem
                      label="رقم التتبع"
                      value={deliveryStatusData.trackingNumber || "-"}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Status Info */}
              {deliveryStatusData.status && (
                <Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    حالة الشحنة
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Chip
                      label={
                        deliveryStatusData.status.arabic ||
                        deliveryStatusData.status.english ||
                        "-"
                      }
                      sx={{
                        backgroundColor:
                          deliveryStatusData.status.color || "#1976d2",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        padding: "8px 16px",
                      }}
                    />
                    {deliveryStatusData.status.english && (
                      <Typography variant="body2" color="text.secondary">
                        ({deliveryStatusData.status.english})
                      </Typography>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <InfoItem
                        label="معرف الحالة"
                        value={deliveryStatusData.status.id || "-"}
                      />
                    </Grid>
                    {deliveryStatusData.status.colorName && (
                      <Grid item xs={12} sm={6}>
                        <InfoItem
                          label="اسم اللون"
                          value={deliveryStatusData.status.colorName}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Driver Info */}
              {deliveryStatusData.driver && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      معلومات السائق
                    </Typography>
                    <Grid container spacing={2}>
                      {deliveryStatusData.driver.name && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="اسم السائق"
                            value={deliveryStatusData.driver.name}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.phone && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="هاتف السائق"
                            value={deliveryStatusData.driver.phone}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.vehicleNumber && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="رقم المركبة"
                            value={deliveryStatusData.driver.vehicleNumber}
                          />
                        </Grid>
                      )}
                      {deliveryStatusData.driver.licenseNumber && (
                        <Grid item xs={12} sm={6}>
                          <InfoItem
                            label="رقم الرخصة"
                            value={deliveryStatusData.driver.licenseNumber}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </>
              )}

              {/* Additional Info */}
              {!deliveryStatusData.status && !deliveryStatusData.driver && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    لا توجد معلومات إضافية متاحة
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                لا توجد معلومات حالة توصيل متاحة لهذا الطلب
              </Typography>
            </Box>
          )}
        </Box>
      </GlassDialog>

      {/* Image Dialog */}
      <GlassDialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        title="معاينة الصورة"
        contentSx={{ padding: 0 }}
      >
        {selectedImage ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400,
              padding: 3,
            }}
          >
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
            <Typography variant="body2">
              لم يتم تضمين بيانات الصورة في قائمة الطلبات
            </Typography>
          </Box>
        )}
      </GlassDialog>
    </Box>
  );
};

export default EmployeeDashboard;
