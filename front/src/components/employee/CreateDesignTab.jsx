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
  CardContent,
  Grid,
  InputAdornment,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  Search,
  Close,
  Image as ImageIcon,
} from "@mui/icons-material";
import { designRequestsService } from "../../services/api";
import CreateDesignForm from "./CreateDesignForm";
import GlassDialog from "../common/GlassDialog";
import calmPalette from "../../theme/calmPalette";

const CreateDesignTab = ({ user, setSelectedImage, setImageDialogOpen }) => {
  // State for designs
  const [openDesignsModal, setOpenDesignsModal] = useState(false);
  const [designsList, setDesignsList] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsCount, setDesignsCount] = useState(0);
  const [designsPage, setDesignsPage] = useState(0);
  const [designsPageSize, setDesignsPageSize] = useState(20);
  const [designsTotalCount, setDesignsTotalCount] = useState(0);
  const [designsSearchQuery, setDesignsSearchQuery] = useState("");

  // Fetch my designs count
  const fetchMyDesignsCount = async () => {
    try {
      if (user?.id) {
        const response = await designRequestsService.getDesignRequests({
          createdBy: user.id,
          page: 1,
          pageSize: 1,
        });
        setDesignsCount(response?.totalCount || 0);
      }
    } catch (error) {
      console.error("Error fetching designs count:", error);
      setDesignsCount(0);
    }
  };

  // Load my designs
  const loadMyDesigns = async () => {
    if (!user?.id) return;
    setLoadingDesigns(true);
    try {
      const response = await designRequestsService.getDesignRequests({
        createdBy: user.id,
        page: designsPage + 1,
        pageSize: designsPageSize,
      });
      
      if (response && response.data) {
        setDesignsList(response.data);
        setDesignsTotalCount(response.totalCount || 0);
      } else if (Array.isArray(response)) {
        setDesignsList(response);
        setDesignsTotalCount(response.length);
      } else {
        setDesignsList([]);
        setDesignsTotalCount(0);
      }
    } catch (error) {
      console.error("Error loading designs:", error);
      setDesignsList([]);
      setDesignsTotalCount(0);
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Load designs count on mount
  useEffect(() => {
    if (user?.id) {
      fetchMyDesignsCount();
    }
  }, [user?.id]);

  // Load designs when page changes in modal
  useEffect(() => {
    if (openDesignsModal && user?.id) {
      loadMyDesigns();
    }
  }, [designsPage, designsPageSize, openDesignsModal, user?.id]);

  // Refresh count when form is submitted successfully
  const handleDesignCreated = () => {
    fetchMyDesignsCount();
  };

  return (
    <>
      {/* Designs Count Card */}
      <Grid container spacing={3} sx={{ marginBottom: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            onClick={async () => {
              await loadMyDesigns();
              setOpenDesignsModal(true);
            }}
            sx={{
              position: "relative",
              background: calmPalette.statCards[2]?.background || calmPalette.statCards[0]?.background,
              color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight,
              borderRadius: 4,
              boxShadow: calmPalette.shadow,
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
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
                    sx={{ fontWeight: 700, color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight }}
                  >
                    {designsCount}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      marginTop: 1,
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    إجمالي التصاميم
                  </Typography>
                </Box>
                <ImageIcon sx={{ fontSize: 56, color: calmPalette.statCards[2]?.highlight || calmPalette.statCards[0]?.highlight }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Design Form */}
      <CreateDesignForm onSuccess={handleDesignCreated} />

      {/* My Designs Modal */}
      <GlassDialog
        open={openDesignsModal}
        onClose={() => {
          setOpenDesignsModal(false);
          setDesignsSearchQuery("");
          setDesignsPage(0);
        }}
        maxWidth="xl"
        title="تصاميمي"
        actions={
          <Button onClick={() => {
            setOpenDesignsModal(false);
            setDesignsSearchQuery("");
            setDesignsPage(0);
          }} variant="contained">
            إغلاق
          </Button>
        }
      >
        <Box sx={{ p: 3 }}>
          {/* Search Field */}
          <Box sx={{ mb: 3, width: "450px" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث في العنوان أو الوصف..."
              value={designsSearchQuery}
              onChange={(e) => setDesignsSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: designsSearchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setDesignsSearchQuery("")}
                    sx={{ padding: 0.5 }}
                  >
                    <Close fontSize="small" />
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
          {loadingDesigns && designsList.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>جاري التحميل...</Typography>
            </Box>
          ) : designsList.length === 0 ? (
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
                {designsSearchQuery ? "لم يتم العثور على نتائج للبحث" : "لم تقم بإنشاء أي تصاميم بعد"}
              </Typography>
            </Paper>
          ) : (
            <>
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
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الصور</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>تاريخ الإنشاء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      let filteredDesigns = designsList;
                      
                      // Apply search filter
                      if (designsSearchQuery.trim()) {
                        const query = designsSearchQuery.toLowerCase().trim();
                        filteredDesigns = designsList.filter((design) => {
                          const title = design.title || "";
                          const description = design.description || "";
                          return (
                            title.toLowerCase().includes(query) ||
                            description.toLowerCase().includes(query)
                          );
                        });
                      }

                      if (filteredDesigns.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Box sx={{ padding: 4 }}>
                                <Typography variant="body1" color="text.secondary">
                                  {designsSearchQuery.trim() ? "لا توجد نتائج للبحث" : "لا توجد تصاميم"}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return filteredDesigns.map((design) => {
                        const statusInfo = (() => {
                          const statusMap = {
                            1: { label: "في الانتظار", color: "warning" },
                            2: { label: "معتمد", color: "success" },
                            3: { label: "غير معتمد", color: "error" },
                            4: { label: "مرتجع", color: "info" },
                          };
                          return statusMap[design.status] || { label: design.statusName || "غير محدد", color: "default" };
                        })();

                        return (
                          <TableRow
                            key={design.id}
                            hover
                            sx={{
                              "&:nth-of-type(even)": {
                                backgroundColor: "rgba(255,255,255,0.3)",
                              },
                            }}
                          >
                            <TableCell>{design.title || "-"}</TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 300,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {design.description || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusInfo.label}
                                color={statusInfo.color}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                {design.images && design.images.length > 0 ? (
                                  design.images.slice(0, 3).map((image, idx) => (
                                    <Tooltip key={idx} title="انقر للمعاينة">
                                      <Box
                                        onClick={() => {
                                          setSelectedImage(image.downloadUrl);
                                          setImageDialogOpen(true);
                                        }}
                                        sx={{
                                          width: 50,
                                          height: 50,
                                          borderRadius: 1,
                                          overflow: "hidden",
                                          cursor: "pointer",
                                          border: `2px solid ${calmPalette.primary}30`,
                                          transition: "all 0.2s",
                                          "&:hover": {
                                            transform: "scale(1.1)",
                                            borderColor: calmPalette.primary,
                                          },
                                        }}
                                      >
                                        <img
                                          src={image.downloadUrl}
                                          alt={`${design.title} - ${idx + 1}`}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                          onError={(e) => {
                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23ddd' width='50' height='50'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3Eصورة%3C/text%3E%3C/svg%3E";
                                          }}
                                        />
                                      </Box>
                                    </Tooltip>
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    لا توجد صور
                                  </Typography>
                                )}
                                {design.images && design.images.length > 3 && (
                                  <Chip
                                    label={`+${design.images.length - 3}`}
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {design.createdAt
                                ? new Date(design.createdAt).toLocaleDateString("ar", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={designsTotalCount}
                page={designsPage}
                onPageChange={(event, newPage) => setDesignsPage(newPage)}
                rowsPerPage={designsPageSize}
                onRowsPerPageChange={(event) => {
                  setDesignsPageSize(parseInt(event.target.value, 10));
                  setDesignsPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="عدد الصفوف في الصفحة:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
                }
              />
            </>
          )}
        </Box>
      </GlassDialog>
    </>
  );
};

export default CreateDesignTab;

