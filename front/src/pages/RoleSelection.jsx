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
      title: "بائع",
      description: "استقبال الطلبات والبيع",
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
        position: "relative",
        minHeight: "100vh",
        backgroundImage: 'url("/PsBack.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 3,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: { xs: 24, md: 40 },
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
            fontSize: { xs: "1.5rem", md: "2rem" },
          }}
        >
          نظام إدارة المبيعات
        </Typography>
      </Box>
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Box>
            <Grid
              container
              spacing={2}
              justifyContent="center"
              sx={{ marginTop: 9 }}
            >
              {roles.map((role, index) => {
                const Icon = role.icon;
                return (
                  <Grid item xs={12} sm={4} md={2.8} marginTop={50} key={role.id}>
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
                              padding: 5,
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
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default RoleSelection;
