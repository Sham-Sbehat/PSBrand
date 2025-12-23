import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Texture,
} from '@mui/icons-material';
import { fabricTypesService } from '../../services/api';
import calmPalette from '../../theme/calmPalette';

const FabricTypesManagement = () => {
  const [fabricTypes, setFabricTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFabricType, setEditingFabricType] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, fabricTypeId: null, fabricTypeName: '' });

  useEffect(() => {
    fetchFabricTypes();
  }, []);

  const fetchFabricTypes = async () => {
    try {
      setLoading(true);
      const data = await fabricTypesService.getAllFabricTypes();
      setFabricTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في تحميل أنواع الأقمشة', severity: 'error' });
      setFabricTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fabricType = null) => {
    if (fabricType) {
      setEditingFabricType(fabricType);
      setFormData({
        name: fabricType.name || '',
        nameAr: fabricType.nameAr || fabricType.name || '',
      });
    } else {
      setEditingFabricType(null);
      setFormData({ name: '', nameAr: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFabricType(null);
    setFormData({ name: '', nameAr: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.nameAr) {
      setSnackbar({ open: true, message: 'يرجى إدخال جميع الحقول المطلوبة', severity: 'error' });
      return;
    }

    try {
      if (editingFabricType) {
        await fabricTypesService.updateFabricType(editingFabricType.id, formData);
        setSnackbar({ open: true, message: 'تم تحديث نوع القماش بنجاح', severity: 'success' });
      } else {
        await fabricTypesService.createFabricType(formData);
        setSnackbar({ open: true, message: 'تم إضافة نوع القماش بنجاح', severity: 'success' });
      }
      handleCloseDialog();
      fetchFabricTypes();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حفظ نوع القماش', severity: 'error' });
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteDialog({ open: true, fabricTypeId: id, fabricTypeName: name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.fabricTypeId) return;

    try {
      setDeletingId(deleteDialog.fabricTypeId);
      await fabricTypesService.deleteFabricType(deleteDialog.fabricTypeId);
      setSnackbar({ open: true, message: 'تم حذف نوع القماش بنجاح', severity: 'success' });
      setDeleteDialog({ open: false, fabricTypeId: null, fabricTypeName: '' });
      fetchFabricTypes();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حذف نوع القماش', severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, fabricTypeId: null, fabricTypeName: '' });
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          padding: 3,
          background: calmPalette.surface,
          borderRadius: 3,
          boxShadow: calmPalette.shadow,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Texture sx={{ fontSize: 32, color: calmPalette.primary }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              إدارة أنواع الأقمشة
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: calmPalette.primary,
              '&:hover': { background: calmPalette.primaryDark },
            }}
          >
            إضافة نوع قماش جديد
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الاسم (إنجليزي)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الاسم (عربي)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fabricTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ padding: 4, color: calmPalette.textMuted }}>
                      لا توجد أنواع أقمشة
                    </TableCell>
                  </TableRow>
                ) : (
                  fabricTypes.map((fabricType) => (
                    <TableRow
                      key={fabricType.id}
                      hover
                      sx={{
                        '&:nth-of-type(even)': {
                          backgroundColor: 'rgba(75, 61, 49, 0.08)',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(75, 61, 49, 0.15)',
                        },
                      }}
                    >
                      <TableCell>{fabricType.name || '-'}</TableCell>
                      <TableCell>{fabricType.nameAr || fabricType.name || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(fabricType)}
                              sx={{ color: calmPalette.primary }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(fabricType.id, fabricType.nameAr || fabricType.name)}
                              disabled={deletingId === fabricType.id}
                              sx={{ color: 'error.main' }}
                            >
                              {deletingId === fabricType.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Delete fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: calmPalette.surface, color: calmPalette.textPrimary }}>
          {editingFabricType ? 'تعديل نوع القماش' : 'إضافة نوع قماش جديد'}
        </DialogTitle>
        <DialogContent sx={{ background: calmPalette.surface }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <TextField
              label="الاسم (إنجليزي)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="الاسم (عربي)"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ background: calmPalette.surface, padding: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: calmPalette.textMuted }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              background: calmPalette.primary,
              '&:hover': { background: calmPalette.primaryDark },
            }}
          >
            {editingFabricType ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ background: calmPalette.surface, color: calmPalette.textPrimary }}>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent sx={{ background: calmPalette.surface, paddingTop: 2 }}>
          <Typography variant="body1" sx={{ color: calmPalette.textPrimary }}>
            هل أنت متأكد من حذف نوع القماش <strong>"{deleteDialog.fabricTypeName}"</strong>؟
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textMuted, marginTop: 1 }}>
            لا يمكن التراجع عن هذه العملية.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ background: calmPalette.surface, padding: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            sx={{ color: calmPalette.textMuted }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deletingId === deleteDialog.fabricTypeId}
            sx={{
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            {deletingId === deleteDialog.fabricTypeId ? (
              <CircularProgress size={20} />
            ) : (
              'حذف'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FabricTypesManagement;

