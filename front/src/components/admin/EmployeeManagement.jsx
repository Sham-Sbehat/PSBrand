import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add,
  Delete,
  Person,
  Email,
  Phone,
  Badge,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';

const EmployeeManagement = () => {
  const { employees, addEmployee, deleteEmployee } = useApp();
  const [openDialog, setOpenDialog] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeId: '',
      username: '',
      password: '',
    },
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    reset();
  };

  const onSubmit = (data) => {
    addEmployee(data);
    setSubmitSuccess(true);

    setTimeout(() => {
      setSubmitSuccess(false);
      handleCloseDialog();
    }, 2000);
  };

  const handleDelete = (employeeId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      deleteEmployee(employeeId);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          إدارة الموظفين ({employees.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          إضافة موظف
        </Button>
      </Box>

      {employees.length === 0 ? (
        <Box sx={{ textAlign: 'center', padding: 4 }}>
          <Typography variant="h6" color="text.secondary">
            لا يوجد موظفين مسجلين
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم المستخدم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>البريد الإلكتروني</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>رقم الموظف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الإضافة</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' },
                  }}
                >
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>
                    <Chip label={employee.username} color="primary" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>
                    <Chip label={employee.employeeId} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(employee.createdAt).toLocaleDateString('ar')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* نافذة إضافة موظف */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة موظف جديد</DialogTitle>
        <DialogContent>
          {submitSuccess && (
            <Alert severity="success" sx={{ marginBottom: 2 }}>
              تم إضافة الموظف بنجاح! ✓
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ marginTop: 2 }}
          >
            <Controller
              name="name"
              control={control}
              rules={{ required: 'الاسم مطلوب' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="اسم الموظف"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  sx={{ marginBottom: 2 }}
                  InputProps={{
                    startAdornment: <Person sx={{ marginRight: 1 }} />,
                  }}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              rules={{
                required: 'البريد الإلكتروني مطلوب',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'بريد إلكتروني غير صحيح',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ marginBottom: 2 }}
                  InputProps={{
                    startAdornment: <Email sx={{ marginRight: 1 }} />,
                  }}
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              rules={{
                required: 'رقم الهاتف مطلوب',
                pattern: {
                  value: /^[0-9+\-\s()]+$/,
                  message: 'رقم هاتف غير صحيح',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="رقم الهاتف"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  sx={{ marginBottom: 2 }}
                  InputProps={{
                    startAdornment: <Phone sx={{ marginRight: 1 }} />,
                  }}
                />
              )}
            />

            <Controller
              name="employeeId"
              control={control}
              rules={{ required: 'رقم الموظف مطلوب' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="رقم الموظف"
                  error={!!errors.employeeId}
                  helperText={errors.employeeId?.message}
                  sx={{ marginBottom: 2 }}
                  InputProps={{
                    startAdornment: <Badge sx={{ marginRight: 1 }} />,
                  }}
                />
              )}
            />

            <Controller
              name="username"
              control={control}
              rules={{ 
                required: 'اسم المستخدم مطلوب',
                minLength: {
                  value: 3,
                  message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
                },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: 'فقط أحرف إنجليزية وأرقام و _',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="اسم المستخدم (للدخول)"
                  error={!!errors.username}
                  helperText={errors.username?.message || 'سيستخدمه الموظف لتسجيل الدخول'}
                  sx={{ marginBottom: 2 }}
                  InputProps={{
                    startAdornment: <Person sx={{ marginRight: 1 }} />,
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{
                required: 'كلمة المرور مطلوبة',
                minLength: {
                  value: 6,
                  message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="كلمة المرور"
                  type="password"
                  error={!!errors.password}
                  helperText={errors.password?.message || 'كلمة المرور للموظف'}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: 3 }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={submitSuccess}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EmployeeManagement;

