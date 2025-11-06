import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  AdminPanelSettings,
  Person,
  DesignServices,
  Assignment,
  ManageAccounts,
  Visibility,
  VisibilityOff,
  Lock,
} from "@mui/icons-material";
import { useApp } from "../context/AppContext";
import { authService } from "../services/api";
import { STORAGE_KEYS } from "../constants";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get("role");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Load saved credentials for the currently selected role
  useEffect(() => {
    const credKey = `savedCredentials_${selectedRole}`;
    const rememberKey = `rememberMe_${selectedRole}`;
    const savedCredentials = localStorage.getItem(credKey);
    const savedRememberMe = localStorage.getItem(rememberKey);
    
    if (savedCredentials && savedRememberMe === 'true') {
      try {
        const credentials = JSON.parse(savedCredentials);
        setValue('username', credentials.username || '');
        setValue('password', credentials.password || '');
        setRememberMe(true);
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    } else {
      // Clear inputs if there are no saved creds for this role
      setValue('username', '');
      setValue('password', '');
      setRememberMe(false);
    }
  }, [selectedRole, setValue]);

  // تحويل الـ Role من string إلى number
  const getRoleNumber = (role) => {
    switch (role) {
      case "admin":
        return 1;
      case "designer":
        return 2;
      case "preparer":
        return 3;
      case "designmanager":
        return 4;
      default:
        return 1;
    }
  };

  // الحصول على تفاصيل الـ Role
  const getRoleDetails = (role) => {
    switch (role) {
      case "admin":
        return {
          title: "تسجيل دخول الأدمن",
          icon: AdminPanelSettings,
          gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
          route: "/admin"
        };
      case "designer":
        return {
          title: "تسجيل دخول البائع",
          icon: DesignServices,
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          route: "/employee"
        };
      case "preparer":
        return {
          title: "تسجيل دخول محضر الطلبات",
          icon: Assignment,
          gradient: "linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)",
          route: "/preparer"
        };
      case "designmanager":
        return {
          title: "تسجيل دخول مدير التصميم",
          icon: ManageAccounts,
          gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          route: "/designmanager"
        };
      default:
        return {
          title: "تسجيل الدخول",
          icon: Person,
          gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          route: "/admin"
        };
    }
  };

  const roleDetails = getRoleDetails(selectedRole);
  const Icon = roleDetails.icon;

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError("");
    
    try {
      const credentials = {
        username: data.username,
        password: data.password,
        role: getRoleNumber(selectedRole)
      };
      
      const result = await authService.login(credentials);
      
      if (result.success) {
        console.log('Login successful, saving data:', { token: result.token, user: result.user });
        
        if (rememberMe) {
          // Persist across app restarts
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        } else {
          // Session-only login: cleared when app/window closes
          sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
          sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        }
        
        console.log('Data saved to localStorage:', {
          token: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
          user: localStorage.getItem(STORAGE_KEYS.USER_DATA)
        });
        
        // Save credentials if "Remember Me" is checked (per role)
        const credKey = `savedCredentials_${selectedRole}`;
        const rememberKey = `rememberMe_${selectedRole}`;
        if (rememberMe) {
          localStorage.setItem(credKey, JSON.stringify({
            username: data.username,
            password: data.password
          }));
          localStorage.setItem(rememberKey, 'true');
        } else {
          // Clear saved credentials for this role if unchecked
          localStorage.removeItem(credKey);
          localStorage.removeItem(rememberKey);
        }
        
        login(result.user);
        
        // Add employee ID to URL if available
        const routeWithId = result.user?.id ? 
          `${roleDetails.route}?employeeId=${result.user.id}` : 
          roleDetails.route;
        
        navigate(routeWithId);
      } else {
        setLoginError(result.message || "فشل في تسجيل الدخول");
      }
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 
                           error.response.data?.Message || 
                           `خطأ من الخادم: ${error.response.status}`;
        setLoginError(errorMessage);
      } else if (error.request) {
         setLoginError("لا يمكن الاتصال بالخادم. تأكد من تشغيل الـ Backend");
      } else {
        setLoginError("❌ حدث خطأ غير متوقع أثناء تسجيل الدخول. حاول مرة أخرى.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // دالة مساعدة للحصول على اسم الدور
  const getRoleName = (role) => {
    switch (role) {
      case "admin":
        return "مدير";
      case "designer":
        return "بائع";
      case "preparer":
        return "محضر طلبات";
      case "designmanager":
        return "مدير التصميم";
      default:
        return "غير محدد";
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  // إذا لم يتم تحديد role، ارجع للصفحة الرئيسية
  if (!selectedRole) {
    navigate("/");
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: roleDetails.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
              background: "rgba(255, 255, 255, 0.98)",
            }}
          >
            <Box sx={{ textAlign: "center", marginBottom: 4 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  padding: 3,
                  borderRadius: "50%",
                  background: roleDetails.gradient,
                  marginBottom: 2,
                }}
              >
                <Icon sx={{ fontSize: 60, color: "white" }} />
              </Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  background: roleDetails.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                PSBrand
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {roleDetails.title}
              </Typography>
            </Box>
            {loginError && (
              <Fade in>
                <Alert severity="error" sx={{ marginBottom: 3 }}>
                  {loginError}
                </Alert>
              </Fade>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ marginBottom: 3 }}>
                <Controller
                  name="username"
                  control={control}
                  rules={{ required: "اسم المستخدم مطلوب" }}
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
                            <Person color="primary" />
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
                  rules={{ required: "كلمة المرور مطلوبة" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="كلمة المرور"
                      type={showPassword ? "text" : "password"}
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
                              {!showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ marginBottom: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تذكرني"
                  sx={{ 
                    color: "text.secondary",
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.9rem"
                    }
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  padding: 2,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  background: roleDetails.gradient,
                  "&:hover": {
                    opacity: 0.9,
                  },
                }}
              >
                {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
              </Button>
            </form>

            <Box sx={{ textAlign: "center", marginTop: 3 }}>
               <Button
                variant="text"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                العودة للصفحة الرئيسية
              </Button>
              {rememberMe && (
                <Button
                  variant="text"
                  onClick={() => {
                    const credKey = `savedCredentials_${selectedRole}`;
                    const rememberKey = `rememberMe_${selectedRole}`;
                    localStorage.removeItem(credKey);
                    localStorage.removeItem(rememberKey);
                    setValue('username', '');
                    setValue('password', '');
                    setRememberMe(false);
                  }}
                  disabled={isLoading}
                  sx={{ marginTop: 1, fontSize: '0.8rem' }}
                >
                  مسح البيانات المحفوظة
                </Button>
              )}
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
