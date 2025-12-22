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
  Straighten,
} from '@mui/icons-material';
import { sizesService } from '../../services/api';
import calmPalette from '../../theme/calmPalette';

const SizesManagement = () => {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, sizeId: null, sizeName: '' });

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    try {
      setLoading(true);
      const data = await sizesService.getAllSizes();
      setSizes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching sizes:', error);
      setSnackbar({ open: true, message: 'فشل في تحميل المقاسات', severity: 'error' });
      setSizes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (size = null) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        name: size.name || '',
        nameAr: size.nameAr || size.name || '',
      });
    } else {
      setEditingSize(null);
      setFormData({ name: '', nameAr: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSize(null);
    setFormData({ name: '', nameAr: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.nameAr) {
      setSnackbar({ open: true, message: 'يرجى إدخال جميع الحقول المطلوبة', severity: 'error' });
      return;
    }

    try {
      if (editingSize) {
        await sizesService.updateSize(editingSize.id, formData);
        setSnackbar({ open: true, message: 'تم تحديث المقاس بنجاح', severity: 'success' });
      } else {
        await sizesService.createSize(formData);
        setSnackbar({ open: true, message: 'تم إضافة المقاس بنجاح', severity: 'success' });
      }
      handleCloseDialog();
      fetchSizes();
    } catch (error) {
      console.error('Error saving size:', error);
      setSnackbar({ open: true, message: 'فشل في حفظ المقاس', severity: 'error' });
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteDialog({ open: true, sizeId: id, sizeName: name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.sizeId) return;

    try {
      setDeletingId(deleteDialog.sizeId);
      await sizesService.deleteSize(deleteDialog.sizeId);
      setSnackbar({ open: true, message: 'تم حذف المقاس بنجاح', severity: 'success' });
      setDeleteDialog({ open: false, sizeId: null, sizeName: '' });
      fetchSizes();
    } catch (error) {
      console.error('Error deleting size:', error);
      setSnackbar({ open: true, message: 'فشل في حذف المقاس', severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, sizeId: null, sizeName: '' });
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
            <Straighten sx={{ fontSize: 32, color: calmPalette.primary }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              إدارة المقاسات
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
            إضافة مقاس جديد
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
                {sizes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ padding: 4, color: calmPalette.textMuted }}>
                      لا توجد مقاسات
                    </TableCell>
                  </TableRow>
                ) : (
                  sizes.map((size) => (
                    <TableRow
                      key={size.id}
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
                      <TableCell>{size.name || '-'}</TableCell>
                      <TableCell>{size.nameAr || size.name || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(size)}
                              sx={{ color: calmPalette.primary }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(size.id, size.nameAr || size.name)}
                              disabled={deletingId === size.id}
                              sx={{ color: 'error.main' }}
                            >
                              {deletingId === size.id ? (
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
          {editingSize ? 'تعديل المقاس' : 'إضافة مقاس جديد'}
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
            {editingSize ? 'تحديث' : 'إضافة'}
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
            هل أنت متأكد من حذف المقاس <strong>"{deleteDialog.sizeName}"</strong>؟
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
            disabled={deletingId === deleteDialog.sizeId}
            sx={{
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            {deletingId === deleteDialog.sizeId ? (
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

export default SizesManagement;

