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
  Grid,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Search,
} from '@mui/icons-material';
import { clientsService } from '../../services/api';
import calmPalette from '../../theme/calmPalette';

const ClientsManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phone2: '',
    country: '',
    province: '',
    district: '',
    address: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, clientId: null, clientName: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsService.getAllClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في تحميل العملاء', severity: 'error' });
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchClients();
      return;
    }

    try {
      setLoading(true);
      const data = await clientsService.searchClients(searchQuery);
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في البحث عن العملاء', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        phone2: client.phone2 || '',
        country: client.country || '',
        province: client.province || '',
        district: client.district || '',
        address: client.address || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        phone: '',
        phone2: '',
        country: '',
        province: '',
        district: '',
        address: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      phone2: '',
      country: '',
      province: '',
      district: '',
      address: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      setSnackbar({ open: true, message: 'يرجى إدخال الاسم ورقم الهاتف', severity: 'error' });
      return;
    }

    try {
      if (editingClient) {
        await clientsService.updateClient(editingClient.id, formData);
        setSnackbar({ open: true, message: 'تم تحديث العميل بنجاح', severity: 'success' });
      } else {
        await clientsService.createClient(formData);
        setSnackbar({ open: true, message: 'تم إضافة العميل بنجاح', severity: 'success' });
      }
      handleCloseDialog();
      fetchClients();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حفظ العميل', severity: 'error' });
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteDialog({ open: true, clientId: id, clientName: name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.clientId) return;

    try {
      setDeletingId(deleteDialog.clientId);
      await clientsService.deleteClient(deleteDialog.clientId);
      setSnackbar({ open: true, message: 'تم حذف العميل بنجاح', severity: 'success' });
      setDeleteDialog({ open: false, clientId: null, clientName: '' });
      fetchClients();
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل في حذف العميل', severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, clientId: null, clientName: '' });
  };

  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (client.name || '').toLowerCase().includes(query) ||
      (client.phone || '').includes(query) ||
      (client.phone2 || '').includes(query)
    );
  });

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
            <Person sx={{ fontSize: 32, color: calmPalette.primary }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
              إدارة العملاء
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
            إضافة عميل جديد
          </Button>
        </Box>

        <Box sx={{ marginBottom: 3 }}>
          <TextField
            fullWidth
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            InputProps={{
              startAdornment: (
                <IconButton onClick={handleSearch} sx={{ color: calmPalette.primary }}>
                  <Search />
                </IconButton>
              ),
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: calmPalette.primary,
                },
              },
            }}
          />
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
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>رقم الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>رقم الهاتف 2</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>البلد</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>المحافظة</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>المنطقة</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ padding: 4, color: calmPalette.textMuted }}>
                      لا يوجد عملاء
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
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
                      <TableCell>{client.name || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell>{client.phone2 || '-'}</TableCell>
                      <TableCell>{client.country || '-'}</TableCell>
                      <TableCell>{client.province || '-'}</TableCell>
                      <TableCell>{client.district || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(client)}
                              sx={{ color: calmPalette.primary }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(client.id, client.name)}
                              disabled={deletingId === client.id}
                              sx={{ color: 'error.main' }}
                            >
                              {deletingId === client.id ? (
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: calmPalette.surface, color: calmPalette.textPrimary }}>
          {editingClient ? 'تعديل العميل' : 'إضافة عميل جديد'}
        </DialogTitle>
        <DialogContent sx={{ background: calmPalette.surface }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="الاسم"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="رقم الهاتف"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="رقم الهاتف 2 (اختياري)"
                  value={formData.phone2}
                  onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="البلد"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="المحافظة"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="المنطقة"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="العنوان"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
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
            {editingClient ? 'تحديث' : 'إضافة'}
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
            هل أنت متأكد من حذف العميل <strong>"{deleteDialog.clientName}"</strong>؟
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
            disabled={deletingId === deleteDialog.clientId}
            sx={{
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            {deletingId === deleteDialog.clientId ? (
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

export default ClientsManagement;

