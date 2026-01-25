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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from "@mui/material";
import {
  Search,
  Clear,
  Refresh,
  Visibility,
  Image as ImageIcon,
  FilterList,
} from "@mui/icons-material";
import { designRequestsService, employeesService } from "../../services/api";
import { USER_ROLES } from "../../constants";
import calmPalette from "../../theme/calmPalette";
import DesignRequestDetailsDialog from "../common/DesignRequestDetailsDialog";

const DesignRequestsTab = ({ setSelectedImage, setImageDialogOpen }) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [designerFilter, setDesignerFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [viewingDesign, setViewingDesign] = useState(null);
  const [viewDesignDialogOpen, setViewDesignDialogOpen] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [creators, setCreators] = useState([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set()); // Track loaded images

  // Load design requests with filters
  const loadDesigns = async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        pageSize: pageSize,
      };

      // Add filters
      if (statusFilter !== "all") {
        params.status = parseInt(statusFilter);
      }

      if (designerFilter !== "all") {
        if (designerFilter === "unassigned") {
          // For unassigned, we'll filter client-side
          params.mainDesignerId = 0;
        } else {
          params.mainDesignerId = parseInt(designerFilter);
        }
      }

      if (createdByFilter !== "all") {
        params.createdBy = parseInt(createdByFilter);
      }

      const response = await designRequestsService.getDesignRequests(params);
      
      // Handle response structure
      let allDesigns = [];
      if (response && response.data) {
        allDesigns = response.data;
        setTotalCount(response.totalCount || 0);
      } else if (Array.isArray(response)) {
        allDesigns = response;
        setTotalCount(response.length);
      } else {
        allDesigns = [];
        setTotalCount(0);
      }

      // Filter unassigned if needed
      if (designerFilter === "unassigned") {
        allDesigns = allDesigns.filter(
          (design) => !design.mainDesignerId || design.mainDesignerId === 0
        );
      }

      setDesigns(allDesigns);
    } catch (error) {
      console.error("Error loading design requests:", error);
      setDesigns([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load designers list
  const loadDesigners = async () => {
    setLoadingDesigners(true);
    try {
      const allEmployees = await employeesService.getAllEmployees();
      // Filter only main designers
      const mainDesigners = allEmployees.filter(
        (emp) => emp.role === USER_ROLES.MAIN_DESIGNER || emp.role === "MAIN_DESIGNER"
      );
      setDesigners(mainDesigners);
    } catch (error) {
      console.error("Error loading designers:", error);
      setDesigners([]);
    } finally {
      setLoadingDesigners(false);
    }
  };

  // Load creators list (employees/sellers - البائعين)
  const loadCreators = async () => {
    setLoadingCreators(true);
    try {
      // Get all employees and filter only sellers (DESIGNER role)
      const allEmployees = await employeesService.getAllEmployees();
      // Filter only sellers/employees (DESIGNER role = بائع)
      const sellers = allEmployees.filter(
        (emp) => emp.role === USER_ROLES.DESIGNER || emp.role === "DESIGNER" || emp.role === "EMPLOYEE"
      );
      
      // Sort by name
      sellers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
      
      setCreators(sellers);
    } catch (error) {
      console.error("Error loading creators:", error);
      setCreators([]);
    } finally {
      setLoadingCreators(false);
    }
  };

  // Load designers and creators on mount
  useEffect(() => {
    loadDesigners();
    loadCreators();
  }, []);

  // Load designs when filters or pagination change
  useEffect(() => {
    loadDesigns();
  }, [page, pageSize, statusFilter, designerFilter, createdByFilter]);

  // Filter designs based on search query
  const getFilteredDesigns = () => {
    if (!searchQuery.trim()) return designs;

    const query = searchQuery.toLowerCase().trim();
    return designs.filter((design) => {
      const title = design.title || "";
      const description = design.description || "";
      const createdByName = design.createdByName || "";
      const mainDesignerName = design.mainDesignerName || "";
      return (
        title.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        createdByName.toLowerCase().includes(query) ||
        mainDesignerName.toLowerCase().includes(query)
      );
    });
  };

  // Get status label and color
  const getStatusLabel = (status) => {
    const statusMap = {
      1: { label: "في الانتظار", color: "warning" },
      2: { label: "معتمد", color: "success" },
      3: { label: "غير معتمد", color: "error" },
      4: { label: "مرتجع", color: "info" },
    };
    return statusMap[status] || { label: "غير محدد", color: "default" };
  };

  // Handle view design
  const handleViewDesign = (design) => {
    setViewingDesign(design);
    setViewDesignDialogOpen(true);
  };

  // Handle image click
  const handleImageClick = (image) => {
    setSelectedImage(image.downloadUrl);
    setImageDialogOpen(true);
  };

  const filteredDesigns = getFilteredDesigns();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          طلبات التصاميم ({filteredDesigns.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadDesigns}
          disabled={loading}
          size="small"
        >
          تحديث
        </Button>
      </Box>

      {/* Filters and Search */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search Field */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
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

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            label="الحالة"
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="1">في الانتظار</MenuItem>
            <MenuItem value="2">معتمد</MenuItem>
            <MenuItem value="3">غير معتمد</MenuItem>
            <MenuItem value="4">مرتجع</MenuItem>
          </Select>
        </FormControl>

        {/* Designer Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>المصمم</InputLabel>
          <Select
            value={designerFilter}
            onChange={(e) => {
              setDesignerFilter(e.target.value);
              setPage(0);
            }}
            label="المصمم"
            disabled={loadingDesigners}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="unassigned">غير معين</MenuItem>
            {designers.map((designer) => (
              <MenuItem key={designer.id} value={String(designer.id)}>
                {designer.name || `مصمم ${designer.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Created By Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>المنشئ</InputLabel>
          <Select
            value={createdByFilter}
            onChange={(e) => {
              setCreatedByFilter(e.target.value);
              setPage(0);
            }}
            label="المنشئ"
            disabled={loadingCreators}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <MenuItem value="all">الكل</MenuItem>
            {creators.map((creator) => (
              <MenuItem key={creator.id} value={String(creator.id)}>
                {creator.name || `منشئ ${creator.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Designs Table */}
      {loading && designs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>جاري التحميل...</Typography>
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
            لا توجد طلبات تصاميم
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
            {searchQuery || statusFilter !== "all" || designerFilter !== "all" || createdByFilter !== "all"
              ? "لم يتم العثور على نتائج للبحث أو الفلاتر"
              : "لم يتم إرسال أي طلبات تصاميم بعد"}
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
            mb: 2,
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
                  المصمم المعين
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
                      <Typography variant="body2" sx={{ color: calmPalette.textPrimary }}>
                        {design.mainDesignerName || (
                          <Chip label="غير معين" size="small" color="default" />
                        )}
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
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
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
                              },
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      {/* View Design Dialog */}
      <DesignRequestDetailsDialog
        open={viewDesignDialogOpen}
        onClose={() => {
          setViewDesignDialogOpen(false);
          setViewingDesign(null);
        }}
        design={viewingDesign}
        onImageClick={(image) => {
          handleImageClick(image);
        }}
        getStatusLabel={getStatusLabel}
      />
    </Box>
  );
};

export default DesignRequestsTab;

