import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { Note, Edit, Save, Close } from "@mui/icons-material";

const NotesDialog = ({ 
  open, 
  onClose, 
  order, 
  onSave,
  user
}) => {
  const [orderNotes, setOrderNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const handleSave = async () => {
    if (!order || !orderNotes.trim()) return;
    setSavingNotes(true);
    try {
      const currentDate = new Date();
      const dateTime = currentDate.toLocaleString("ar-SA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory"
      });
      const authorName = user?.name || "مستخدم غير معروف";
      
      // Format: [DateTime] Author Name: Note Text
      const newNote = `[${dateTime}] ${authorName}: ${orderNotes.trim()}`;
      
      // Append to existing notes or create new
      const existingNotes = order.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;
      
      await onSave(order.id, updatedNotes);
      setOrderNotes('');
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleClose = () => {
    setIsEditingNotes(false);
    setOrderNotes('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Note />
          <Typography variant="h6">ملاحظات الطلب</Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: 3 }}>
        {order && (
          <Box>
            <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">رقم الطلب:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {order.orderNumber || `#${order.id}`}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                الملاحظات
              </Typography>
              {!isEditingNotes ? (
                <IconButton size="small" onClick={() => setIsEditingNotes(true)}>
                  <Edit fontSize="small" />
                </IconButton>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={handleSave}
                    disabled={savingNotes}
                  >
                    {savingNotes ? <CircularProgress size={16} /> : <Save fontSize="small" />}
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setIsEditingNotes(false);
                      setOrderNotes('');
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
                rows={6}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
                variant="outlined"
              />
            ) : (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1, 
                minHeight: 150,
                maxHeight: 400,
                overflowY: 'auto'
              }}>
                {order.notes ? (
                  order.notes.split('\n\n').map((note, idx) => {
                    // Parse note format: [DateTime] Author: Text
                    const match = note.match(/^\[([^\]]+)\]\s+(.+?):\s*(.*)$/);
                    if (match) {
                      const [, datetime, author, text] = match;
                      return (
                        <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < order.notes.split('\n\n').length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {author}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {datetime}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                            {text}
                          </Typography>
                        </Box>
                      );
                    }
                    // Fallback for old format
                    return (
                      <Typography key={idx} variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotesDialog;

