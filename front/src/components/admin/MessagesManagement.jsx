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
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Message as MessageIcon,
  Refresh,
  Search,
  FilterList,
} from '@mui/icons-material';
import { messagesService } from '../../services/api';
import { useApp } from '../../context/AppContext';
import calmPalette from '../../theme/calmPalette';
import SendMessageDialog from './SendMessageDialog';

const MessagesManagement = () => {
  const { user } = useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null, messageTitle: '' });
  const [togglingId, setTogglingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive', 'expired'
  const [recipientFilter, setRecipientFilter] = useState('all'); // 'all', 'specific', 'allEmployees'

  useEffect(() => {
    fetchMessages();
    // يمكن إضافة fetchEmployees هنا إذا كان متاحاً
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await messagesService.getAllMessages();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setSnackbar({ open: true, message: 'فشل في تحميل الرسائل', severity: 'error' });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (message = null) => {
    setEditingMessage(message);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMessage(null);
  };

  const handleMessageSent = (savedMessage = null) => {
    if (savedMessage && savedMessage.id) {
      // Update the message in the list locally instead of fetching all messages
      setMessages(prevMessages => {
        const index = prevMessages.findIndex(msg => msg.id === savedMessage.id);
        if (index >= 0) {
          // Update existing message
          const updated = [...prevMessages];
          updated[index] = savedMessage;
          return updated;
        } else {
          // Add new message if it doesn't exist (for new messages)
          return [savedMessage, ...prevMessages];
        }
      });
    } else {
      // If no message provided or invalid, fetch all messages (fallback)
      fetchMessages();
    }
  };

  const handleDeleteClick = (message) => {
    setDeleteDialog({
      open: true,
      messageId: message.id,
      messageTitle: message.title || 'هذه الرسالة',
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await messagesService.deleteMessage(deleteDialog.messageId);
      setSnackbar({ open: true, message: 'تم حذف الرسالة بنجاح', severity: 'success' });
      setDeleteDialog({ open: false, messageId: null, messageTitle: '' });
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'فشل في حذف الرسالة',
        severity: 'error',
      });
    }
  };

  const handleToggleActive = async (messageId) => {
    try {
      setTogglingId(messageId);
      await messagesService.toggleMessageActive(messageId);
      setSnackbar({ open: true, message: 'تم تحديث حالة الرسالة بنجاح', severity: 'success' });
      fetchMessages();
    } catch (error) {
      console.error('Error toggling message:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'فشل في تحديث حالة الرسالة',
        severity: 'error',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    try {
      return new Date(expiresAt) < new Date();
    } catch {
      return false;
    }
  };

  // Filter messages
  const filteredMessages = messages.filter((message) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = (message.title || '').toLowerCase().includes(query);
      const contentMatch = (message.content || '').toLowerCase().includes(query);
      if (!titleMatch && !contentMatch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !message.isActive) return false;
      if (statusFilter === 'inactive' && message.isActive) return false;
      if (statusFilter === 'expired' && !isExpired(message.expiresAt)) return false;
    }

    // Recipient filter
    if (recipientFilter !== 'all') {
      if (recipientFilter === 'allEmployees' && message.userId !== null) return false;
      if (recipientFilter === 'specific' && message.userId === null) return false;
    }

    return true;
  });

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 2, sm: 3 },
          background: calmPalette.surface,
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: calmPalette.shadow,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: calmPalette.primary,
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
              }}
            >
              <MessageIcon />
            </Avatar>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: calmPalette.textPrimary,
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              }}
            >
              إدارة الرسائل
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchMessages}
              disabled={loading}
              sx={{
                borderColor: calmPalette.primary,
                color: calmPalette.primary,
                '&:hover': {
                  borderColor: calmPalette.primary,
                  backgroundColor: `${calmPalette.primary}10`,
                },
              }}
            >
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                backgroundColor: calmPalette.primary,
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: calmPalette.primary,
                  opacity: 0.9,
                },
              }}
            >
              إضافة رسالة جديدة
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            marginBottom: 3,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="بحث في العنوان أو المحتوى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: calmPalette.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              minWidth: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(94, 78, 62, 0.2)',
                },
                '&:hover fieldset': {
                  borderColor: calmPalette.primary + '80',
                },
                '&.Mui-focused fieldset': {
                  borderColor: calmPalette.primary,
                },
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="الحالة"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="inactive">غير نشط</MenuItem>
              <MenuItem value="expired">منتهي</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>المستلم</InputLabel>
            <Select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              label="المستلم"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="allEmployees">جميع الموظفين</MenuItem>
              <MenuItem value="specific">موظف محدد</MenuItem>
            </Select>
          </FormControl>
          {(searchQuery || statusFilter !== 'all' || recipientFilter !== 'all') && (
            <Button
              size="small"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRecipientFilter('all');
              }}
              sx={{ color: calmPalette.textMuted }}
            >
              إعادة تعيين
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: calmPalette.surfaceHover }}>
                  <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المحتوى</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المستلم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ الانتهاء</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ الإنشاء</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ padding: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {messages.length === 0
                          ? 'لا توجد رسائل حالياً'
                          : 'لا توجد نتائج مطابقة للفلتر'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((message) => {
                    const expired = isExpired(message.expiresAt);
                    return (
                      <TableRow key={message.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {message.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {message.content || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={message.userId ? `موظف #${message.userId}` : 'جميع الموظفين'}
                            size="small"
                            color={message.userId ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Chip
                              label="منتهي"
                              size="small"
                              color="error"
                            />
                          ) : (
                            <Chip
                              label={message.isActive ? 'نشط' : 'غير نشط'}
                              size="small"
                              color={message.isActive ? 'success' : 'default'}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={expired ? 'error' : 'text.primary'}>
                            {formatDate(message.expiresAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(message.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
                            <Tooltip title={message.isActive ? 'إلغاء التفعيل' : 'تفعيل'}>
                              <span>
                                {togglingId === message.id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <Switch
                                    checked={message.isActive}
                                    onChange={() => handleToggleActive(message.id)}
                                    size="small"
                                    sx={{
                                      '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: calmPalette.primary,
                                      },
                                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: calmPalette.primary,
                                      },
                                    }}
                                  />
                                )}
                              </span>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(message)}
                                sx={{ color: calmPalette.primary }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(message)}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit/Create Dialog */}
      <SendMessageDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onMessageSent={handleMessageSent}
        editingMessage={editingMessage}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, messageId: null, messageTitle: '' })}
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف الرسالة "{deleteDialog.messageTitle}"؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, messageId: null, messageTitle: '' })}
            sx={{ color: calmPalette.textMuted }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default MessagesManagement;

