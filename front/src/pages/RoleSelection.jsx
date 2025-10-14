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
  Paper,
  Fade,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  Person as EmployeeIcon,
  DesignServices as DesignerIcon,
  Assignment as PreparerIcon,
  ManageAccounts as DesignManagerIcon,
} from "@mui/icons-material";
import { useApp } from "../context/AppContext";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [hoveredRole, setHoveredRole] = useState(null);

  const handleRoleSelect = (role) => {
    // كل الأدوار تروح لنفس صفحة Login مع تمرير الـ Role
    navigate(`/login?role=${role}`);
  };

  const roles = [
    {
      id: "admin",
      title: "أدمن",
      description: "إدارة الطلبات والموظفين",
      icon: AdminIcon,
      color: "#d32f2f",
      gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    },
    {
      id: "designmanager",
      title: "مدير التصميم",
      description: "إدارة ومراجعة التصاميم من المصممين",
      icon: DesignManagerIcon,
      color: "#e65100",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      id: "designer",
      title: "مصمم",
      description: "تصميم البلايز والمنتجات",
      icon: DesignerIcon,
      color: "#7b1fa2",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
      id: "preparer",
      title: "محضر طلبات",
      description: "إعداد ومتابعة الطلبات",
      icon: PreparerIcon,
      color: "#2e7d32",
      gradient: "linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 3,
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Box>
            <Paper
              elevation={0}
              sx={{
                padding: 4,
                marginBottom: 4,
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                borderRadius: 4,
              }}
            >
              <Typography
                variant="h2"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: 2,
                }}
              >
                PSBrand
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                نظام إدارة طلبات تصميم البلايز
              </Typography>
            </Paper>
            <Grid container spacing={4} justifyContent="center">
              {roles.map((role, index) => {
                const Icon = role.icon;
                return (
                  <Grid item xs={12} sm={6} md={4} key={role.id}>
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
                              ? "0 20px 40px rgba(0,0,0,0.2)"
                              : "0 10px 20px rgba(0,0,0,0.1)",
                        }}
                        onMouseEnter={() => setHoveredRole(role.id)}
                        onMouseLeave={() => setHoveredRole(null)}
                      >
                        <CardActionArea
                          onClick={() => handleRoleSelect(role.id)}
                          sx={{ height: "100%" }}
                        >
                          <Box
                            sx={{
                              background: role.gradient,
                              padding: 4,
                              textAlign: "center",
                              color: "white",
                            }}
                          >
                            <Icon sx={{ fontSize: 80, marginBottom: 2 }} />
                          </Box>
                          <CardContent sx={{ padding: 4, textAlign: "center" }}>
                            <Typography
                              variant="h4"
                              gutterBottom
                              sx={{ fontWeight: 700 }}
                            >
                              {role.title}
                            </Typography>
                            <Typography
                              variant="body1"
                              color="text.secondary"
                              sx={{ fontSize: "1.1rem" }}
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
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default RoleSelection;
