import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
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
  CircularProgress,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Delete,
  Person,
  Phone,
  Work,
  Visibility,
  VisibilityOff,
  Store,
  AccessTime,
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useApp } from '../../context/AppContext';
import { employeesService } from '../../services/api';
import GlassDialog from '../common/GlassDialog';
import SellerManagement from './SellerManagement';
import EmployeeAttendanceCalendar from './EmployeeAttendanceCalendar';
import Swal from 'sweetalert2';

const EmployeeManagement = () => {
  const { employees, addEmployee, deleteEmployee, setEmployees } = useApp();
  const [openDialog, setOpenDialog] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSubTab, setCurrentSubTab] = useState(0);
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
      whatsappNumber: '',
    },
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    reset();
    setError(null);
    setSubmitSuccess(false);
    setShowPassword(false);
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSubmitSuccess(false);
      
      const response = await employeesService.createEmployee(data);
      const newEmployee = {
        ...response,
        role: employeesService.convertRoleToString(response.role)
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      
      // إظهار رسالة النجاح
      setSubmitSuccess(true);
      
      // إغلاق المودال تلقائياً بعد ثانيتين
      setTimeout(() => {
        handleCloseDialog();
      }, 2000);
      
    } catch (err) {
      setError('فشل في إضافة الموظف');
      setSubmitSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employeeId) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'هل أنت متأكد من حذف هذا الموظف؟ لن يمكنك التراجع عن هذا الإجراء!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذفه!',
      cancelButtonText: 'إلغاء',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        setError(null);
        await employeesService.deleteEmployee(employeeId);
        deleteEmployee(employeeId);
        Swal.fire({
          title: 'تم الحذف!',
          text: 'تم حذف الموظف بنجاح.',
          icon: 'success',
          confirmButtonColor: '#3085d6'
        });
      } catch (err) {
        setError('فشل في حذف الموظف');
        Swal.fire({
          title: 'خطأ!',
          text: 'فشل في حذف الموظف. حاول مرة أخرى.',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubTabChange = (event, newValue) => {
    setCurrentSubTab(newValue);
  };

  return (
    <Box>
      <Tabs
        value={currentSubTab}
        onChange={handleSubTabChange}
        sx={{
          marginBottom: 3,
          borderBottom: '1px solid rgba(107, 142, 127, 0.15)',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            minHeight: 48,
          },
        }}
        TabIndicatorProps={{
          sx: {
            height: '3px',
            borderRadius: '3px 3px 0 0',
            background: 'linear-gradient(90deg, #6B8E7F 0%, #8B7FA8 100%)',
          },
        }}
      >
        <Tab
          label="الموظفين"
          icon={<Person />}
          iconPosition="start"
          sx={{
            color: currentSubTab === 0 ? '#5A7A6B' : '#7A9A8B',
            '&.Mui-selected': {
              color: '#5A7A6B',
              fontWeight: 700,
            },
          }}
        />
        <Tab
          label="إدارة البائعين"
          icon={<Store />}
          iconPosition="start"
          sx={{
            color: currentSubTab === 1 ? '#5A7A6B' : '#7A9A8B',
            '&.Mui-selected': {
              color: '#5A7A6B',
              fontWeight: 700,
            },
          }}
        />
        <Tab
          label="متابعة الدوام"
          icon={<AccessTime />}
          iconPosition="start"
          sx={{
            color: currentSubTab === 2 ? '#5A7A6B' : '#7A9A8B',
            '&.Mui-selected': {
              color: '#5A7A6B',
              fontWeight: 700,
            },
          }}
        />
      </Tabs>

      {currentSubTab === 0 && (
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
                        employee.role === 'designer' ? 'بائع' : 
                        employee.role === 'designmanager' ? 'مدير التصميم' :
                        employee.role === 'packager' ? 'مسؤول تغليف' :
                        'محضر طلبات'
                      } 
                      color={
                        employee.role === 'admin' ? 'error' :
                        employee.role === 'designer' ? 'secondary' : 
                        employee.role === 'designmanager' ? 'warning' :
                        employee.role === 'packager' ? 'info' :
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
      <GlassDialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        title="إضافة موظف جديد"
        actions={
          <>
            <Button onClick={handleCloseDialog} disabled={loading}>
              إغلاق
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={submitSuccess || loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </>
        }
      >
        {submitSuccess && (
          <Alert severity="success" sx={{ marginBottom: 2 }}>
            ✅ تم إضافة الموظف بنجاح! 
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
                  <MenuItem value="designer">بائع</MenuItem>
                  <MenuItem value="preparer">محضر طلبات</MenuItem>
                  <MenuItem value="designmanager">مدير التصميم</MenuItem>
                  <MenuItem value="packager">مسؤول تغليف الطلبات</MenuItem>
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
                type={showPassword ? "text" : "password"}
                error={!!errors.password}
                helperText={errors.password?.message || 'كلمة المرور للموظف'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePassword}
                        edge="end"
                        disabled={loading}
                      >
                        {!showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Box>
      </GlassDialog>
        </Paper>
      )}

      {currentSubTab === 1 && <SellerManagement />}
      {currentSubTab === 2 && <EmployeeAttendanceCalendar />}
    </Box>
  );
};

export default EmployeeManagement;

