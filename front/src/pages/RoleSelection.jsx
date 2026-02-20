import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Fade,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  DesignServices as DesignerIcon,
  Assignment as PreparerIcon,
  ManageAccounts as DesignManagerIcon,
  Inventory as PackagerIcon,
  Palette,
} from "@mui/icons-material";
import { useApp } from "../context/AppContext";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [hoveredRole, setHoveredRole] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleRoleSelect = (role) => {
    navigate(`/login?role=${role}`);
  };

  const handleSelectChange = (e) => {
    const roleId = e.target.value;
    setSelectedRoleId(roleId);
    if (roleId) navigate(`/login?role=${roleId}`);
  };

  const roles = [
    {
      id: "admin",
      title: "الإدارة",
      description: "إدارة الطلبات والموظفين",
      icon: AdminIcon,
      color: "#d32f2f",
      gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    },
    {
      id: "designmanager",
      title: " إدارة التصاميم",
      description: "إدارة ومراجعة التصاميم  ",
      icon: DesignManagerIcon,
      color: "#e65100",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      id: "designer",
      title: "قسم المبيعات",
      description: "استقبال الطلبات",
      icon: DesignerIcon,
      color: "#7b1fa2",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
     {
      id: "maindesigner",
      title: "قسم التصميم",
      description: "تصميم الطلبات",
      icon: Palette,
      color: "#9c27b0",
      gradient: "linear-gradient(135deg, #c471ed 0%, #f64f59 100%)",
    },
    {
      id: "preparer",
      title: "قسم التحضير",
      description: "إعداد ومتابعة الطلبات",
      icon: PreparerIcon,
      color: "#2e7d32",
      gradient: "linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)",
    },
    {
      id: "packager",
      title: "قسم التغليف",
      description: "تغليف الطلبات",
      icon: PackagerIcon,
      color: "#1976d2",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundImage: 'url("/PsBack.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: { xs: 2, sm: 3 },
        overflow: "auto",
      }}
    >
      {/* على الديسكتوب فقط: عنوان بالشكل الأصلي (بدون صندوق) */}
      {!isMobile && (
        <Box
          sx={{
            position: "absolute",
            top: 40,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.9)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              marginTop: 10,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "2rem",
            }}
          >
            نظام إدارة المبيعات
          </Typography>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ width: "100%" }}>
        <Fade in timeout={800}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* على الجوال فقط: صندوق العنوان الواضح + قائمة اختيار */}
            {isMobile && (
              <Box
                sx={{
                  width: "100%",
                  textAlign: "center",
                  py: 2,
                  px: 1,
                  mb: 2,
                  borderRadius: 2,
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ fontWeight: 600, color: "#fff", fontSize: "1.25rem" }}
                >
                  نظام إدارة المبيعات
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5, fontSize: "0.8rem" }}
                >
                  اختر نوع الحساب للمتابعة
                </Typography>
              </Box>
            )}

            {isMobile ? (
              <Box sx={{ width: "100%", maxWidth: 360 }}>
                <FormControl
                  fullWidth
                  size="medium"
                  sx={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <InputLabel id="role-select-label">نوع الحساب</InputLabel>
                  <Select
                    labelId="role-select-label"
                    id="role-select"
                    value={selectedRoleId}
                    label="نوع الحساب"
                    onChange={handleSelectChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 320,
                          mt: 1.5,
                          borderRadius: 2,
                          boxShadow: 4,
                        },
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>اختر الدور</em>
                    </MenuItem>
                    {roles.map((role) => {
                      const RoleIcon = role.icon;
                      return (
                      <MenuItem key={role.id} value={role.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <RoleIcon sx={{ color: role.color, fontSize: 22 }} />
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {role.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {role.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );})}
                  </Select>
                </FormControl>
              </Box>
            ) : (
              /* على اللابتوب: الشكل الأصلي (شبكة + كروت كما كانت) */
              <>
                <Grid
                  container
                  spacing={2}
                  justifyContent="center"
                  sx={{ marginTop: 9 }}
                >
                  {roles.map((role, index) => {
                    const Icon = role.icon;
                    return (
                      <Grid item xs={6} sm={4} md={1.7} marginTop={50} key={role.id}>
                        <Fade in timeout={1000 + index * 200}>
                          <Card
                            sx={{
                              height: "100%",
                              transition: "all 0.3s ease-in-out",
                              transform:
                                hoveredRole === role.id
                                  ? "translateY(-10px) scale(1.02)"
                                  : "translateY(0) scale(1)",
                              boxShadow:
                                hoveredRole === role.id
                                  ? "0 18px 36px rgba(6, 11, 23, 0.32)"
                                  : "0 10px 22px rgba(6, 11, 23, 0.22)",
                              background: "rgba(255, 255, 255, 0.12)",
                              backdropFilter: "blur(14px)",
                              border: "1px solid rgba(255, 255, 255, 0.28)",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                            onMouseEnter={() => setHoveredRole(role.id)}
                            onMouseLeave={() => setHoveredRole(null)}
                          >
                            <CardActionArea
                              onClick={() => handleRoleSelect(role.id)}
                              sx={{ height: "100%" }}
                            >
                              <CardContent
                                sx={{
                                  padding: 1.9,
                                  textAlign: "center",
                                  color: "rgba(255, 255, 255, 0.95)",
                                }}
                              >
                                <Typography
                                  variant="h5"
                                  gutterBottom
                                  sx={{ fontWeight: 700, color: "white" }}
                                >
                                  {role.title}
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: "rgba(255, 255, 255, 0.85)",
                                  }}
                                >
                                  {role.description}
                                </Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Fade>
                      </Grid>
                    );
                  })}
                </Grid>
                <Box sx={{ textAlign: "center", marginTop: 4 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255, 255, 255, 0.9)",
                      fontSize: "0.95rem",
                    }}
                  >
                    اختر نوع الحساب للمتابعة
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default RoleSelection;
