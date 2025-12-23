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
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Palette,
} from '@mui/icons-material';
import { colorsService } from '../../services/api';
import calmPalette from '../../theme/calmPalette';

const ColorsManagement = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '', hexCode: '#000000' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, colorId: null, colorName: '' });

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    try {
      setLoading(true);
      const data = await colorsService.getAllColors();
      setColors(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في تحميل الألوان', severity: 'error' });
      setColors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (color = null) => {
    if (color) {
      setEditingColor(color);
      setFormData({
        name: color.name || '',
        nameAr: color.nameAr || color.name || '',
        hexCode: color.hexCode || '#000000',
      });
    } else {
      setEditingColor(null);
      setFormData({ name: '', nameAr: '', hexCode: '#000000' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingColor(null);
    setFormData({ name: '', nameAr: '', hexCode: '#000000' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.nameAr) {
      setSnackbar({ open: true, message: 'يرجى إدخال جميع الحقول المطلوبة', severity: 'error' });
      return;
    }

    try {
      if (editingColor) {
        await colorsService.updateColor(editingColor.id, formData);
        setSnackbar({ open: true, message: 'تم تحديث اللون بنجاح', severity: 'success' });
      } else {
        await colorsService.createColor(formData);
        setSnackbar({ open: true, message: 'تم إضافة اللون بنجاح', severity: 'success' });
      }
      handleCloseDialog();
      fetchColors();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حفظ اللون', severity: 'error' });
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteDialog({ open: true, colorId: id, colorName: name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.colorId) return;

    try {
      setDeletingId(deleteDialog.colorId);
      await colorsService.deleteColor(deleteDialog.colorId);
      setSnackbar({ open: true, message: 'تم حذف اللون بنجاح', severity: 'success' });
      setDeleteDialog({ open: false, colorId: null, colorName: '' });
      fetchColors();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حذف اللون', severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, colorId: null, colorName: '' });
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
            <Palette sx={{ fontSize: 32, color: calmPalette.primary }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              إدارة الألوان
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
            إضافة لون جديد
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
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>اللون</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الاسم (إنجليزي)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الاسم (عربي)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>كود اللون</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {colors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ padding: 4, color: calmPalette.textMuted }}>
                      لا توجد ألوان
                    </TableCell>
                  </TableRow>
                ) : (
                  colors.map((color) => (
                    <TableRow
                      key={color.id}
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
                      <TableCell>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            backgroundColor: color.hexCode || '#000000',
                            border: '2px solid rgba(0,0,0,0.1)',
                          }}
                        />
                      </TableCell>
                      <TableCell>{color.name || '-'}</TableCell>
                      <TableCell>{color.nameAr || color.name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={color.hexCode || '-'}
                          size="small"
                          sx={{
                            backgroundColor: color.hexCode || '#000000',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(color)}
                              sx={{ color: calmPalette.primary }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(color.id, color.nameAr || color.name)}
                              disabled={deletingId === color.id}
                              sx={{ color: 'error.main' }}
                            >
                              {deletingId === color.id ? (
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
          {editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}
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
            <Box>
              <TextField
                label="كود اللون (Hex)"
                value={formData.hexCode}
                onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                fullWidth
                inputProps={{ maxLength: 7 }}
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: 1,
                        backgroundColor: formData.hexCode,
                        border: '2px solid rgba(0,0,0,0.1)',
                        marginRight: 1,
                      }}
                    />
                  ),
                }}
              />
              <input
                type="color"
                value={formData.hexCode}
                onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                style={{
                  marginTop: 8,
                  width: '100%',
                  height: 40,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              />
            </Box>
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
            {editingColor ? 'تحديث' : 'إضافة'}
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
            هل أنت متأكد من حذف اللون <strong>"{deleteDialog.colorName}"</strong>؟
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
            disabled={deletingId === deleteDialog.colorId}
            sx={{
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            {deletingId === deleteDialog.colorId ? (
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

export default ColorsManagement;

