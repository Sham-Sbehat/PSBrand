import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
} from '@mui/material';
import {
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  Lock,
  Badge,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const { login, employees } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError('');

    // محاكاة تأخير الشبكة
    await new Promise((resolve) => setTimeout(resolve, 800));

    // البحث عن الموظف
    const employee = employees.find(
      (emp) => emp.username === data.username && emp.password === data.password
    );

    if (employee) {
      // تسجيل دخول ناجح
      login({
        id: employee.id,
        name: employee.name,
        username: employee.username,
        email: employee.email,
        phone: employee.phone,
        employeeId: employee.employeeId,
        role: 'employee',
      });
      navigate('/employee');
    } else {
      // خطأ في البيانات
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
      setIsLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={10}
            sx={{
              padding: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.98)',
            }}
          >
            {/* الأيقونة والعنوان */}
            <Box sx={{ textAlign: 'center', marginBottom: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  padding: 3,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  marginBottom: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 60, color: 'white' }} />
              </Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                PSBrand
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
                تسجيل دخول الموظف
              </Typography>
            </Box>

            {/* رسالة الخطأ */}
            {loginError && (
              <Fade in>
                <Alert severity="error" sx={{ marginBottom: 3 }}>
                  {loginError}
                </Alert>
              </Fade>
            )}

            {/* تنبيه إذا لم يكن هناك موظفين */}
            {employees.length === 0 && (
              <Alert severity="info" sx={{ marginBottom: 3 }}>
                لا يوجد موظفين مسجلين. يرجى التواصل مع الأدمن لإنشاء حساب.
              </Alert>
            )}

            {/* نموذج تسجيل الدخول */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ marginBottom: 3 }}>
                <Controller
                  name="username"
                  control={control}
                  rules={{ required: 'اسم المستخدم مطلوب' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="اسم المستخدم"
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Badge color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ marginBottom: 4 }}>
                <Controller
                  name="password"
                  control={control}
                  rules={{ required: 'كلمة المرور مطلوبة' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="كلمة المرور"
                      type={showPassword ? 'text' : 'password'}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleTogglePassword}
                              edge="end"
                              disabled={isLoading}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading || employees.length === 0}
                sx={{
                  padding: 2,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
                  },
                }}
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </form>

            {/* العودة للصفحة الرئيسية */}
            <Box sx={{ textAlign: 'center', marginTop: 3 }}>
              <Button
                variant="text"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                العودة للصفحة الرئيسية
              </Button>
            </Box>

            {/* معلومات للموظف */}
            <Box
              sx={{
                marginTop: 4,
                padding: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                💡 إذا لم يكن لديك حساب، تواصل مع الأدمن لإنشاء حساب جديد
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default EmployeeLogin;


