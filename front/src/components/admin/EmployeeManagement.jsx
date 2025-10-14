import { useState, useEffect } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  Add,
  Delete,
  Person,
  Phone,
  Work,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import { employeesService } from '../../services/api';

const EmployeeManagement = () => {
  const { employees, addEmployee, deleteEmployee, setEmployees } = useApp();
  const [openDialog, setOpenDialog] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesService.getAllEmployees();
      const convertedEmployees = response.map(emp => ({
        ...emp,
        role: employeesService.convertRoleToString(emp.role)
      }));
      setEmployees(convertedEmployees);
    } catch (err) {
      setError('فشل في جلب بيانات الموظفين');
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      role: '',
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

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeesService.createEmployee(data);
      const newEmployee = {
        ...response,
        role: employeesService.convertRoleToString(response.role)
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        handleCloseDialog();
      }, 2000);
    } catch (err) {
      setError('فشل في إضافة الموظف');
      console.error('Error creating employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      try {
        setLoading(true);
        setError(null);
        await employeesService.deleteEmployee(employeeId);
        deleteEmployee(employeeId);
      } catch (err) {
        setError('فشل في حذف الموظف');
        console.error('Error deleting employee:', err);
      } finally {
        setLoading(false);
      }
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

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {loading && employees.length === 0 ? (
        <Box sx={{ textAlign: 'center', padding: 4 }}>
          <Typography variant="h6" color="text.secondary">
            جاري تحميل الموظفين...
          </Typography>
        </Box>
      ) : employees.length === 0 ? (
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
                <TableCell sx={{ fontWeight: 700 }}>الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوظيفة</TableCell>
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
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>
                    <Chip 
                      label={
                        employee.role === 'admin' ? 'أدمن' :
                        employee.role === 'designer' ? 'مصمم' : 
                        'محضر طلبات'
                      } 
                      color={
                        employee.role === 'admin' ? 'error' :
                        employee.role === 'designer' ? 'secondary' : 
                        'success'
                      }
                      size="small" 
                    />
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
          
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
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
              name="role"
              control={control}
              rules={{ required: 'الوظيفة مطلوبة' }}
              render={({ field }) => (
                <FormControl fullWidth sx={{ marginBottom: 2 }} error={!!errors.role}>
                  <InputLabel>الوظيفة</InputLabel>
                  <Select
                    {...field}
                    label="الوظيفة"
                    startAdornment={<Work sx={{ marginRight: 1, marginLeft: 1 }} />}
                  >
                    
                    <MenuItem value="admin">أدمن</MenuItem>
                    <MenuItem value="designer">مصمم</MenuItem>
                    <MenuItem value="order_preparer">محضر طلبات</MenuItem>
                    <MenuItem value="designmanager">مدير التصميم</MenuItem>
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
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
          <Button onClick={handleCloseDialog} disabled={loading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={submitSuccess || loading}
          >
            {loading ? 'جاري الإضافة...' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EmployeeManagement;

