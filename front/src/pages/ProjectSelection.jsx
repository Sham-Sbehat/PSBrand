import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Fade,
} from "@mui/material";
import { setTenantId, TENANT_IDS } from "../services/tenantStorage";
import { clearSharedTenantCaches } from "../services/api";

const PROJECT_BLOCKS = [
  {
    id: TENANT_IDS.PSBRAND,
    title: "PSBrand",
    logoSrc: "/white-logo.png",
    logoAlt: "شعار PSBrand",
  },
  {
    id: TENANT_IDS.MAVA,
    title: "MAVA",
    logoSrc: "/mava-logo.png",
    logoAlt: "شعار MAVA",
  },
];

/**
 * أول خطوة: اختيار المشروع (بلوكات) قبل صفحة اختيار نوع الحساب.
 */
const ProjectSelection = () => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);

  const handlePick = (id) => {
    setTenantId(id);
    clearSharedTenantCaches();
    navigate("/roles", { replace: false });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        // ثيم بني: تدرجات قهوة / كراميل / بني غامق (قريب من theme-color المشروع)
        backgroundColor: "#1c1410",
        backgroundImage: `
          radial-gradient(ellipse 115% 78% at 50% -28%, rgba(160, 120, 80, 0.32), transparent 56%),
          radial-gradient(ellipse 68% 52% at 100% 38%, rgba(94, 78, 62, 0.42), transparent 52%),
          radial-gradient(ellipse 58% 48% at 0% 72%, rgba(120, 82, 52, 0.28), transparent 50%),
          radial-gradient(ellipse 45% 35% at 80% 85%, rgba(61, 44, 32, 0.55), transparent 60%),
          linear-gradient(168deg, #16100d 0%, #2a1f18 38%, #1e1612 72%, #14100c 100%)
        `,
        backgroundAttachment: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Fade in timeout={600}>
          <Box>
            <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "0.02em",
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                }}
              >
                اختر المشروع
              </Typography>
            </Box>

            <Grid container spacing={{ xs: 2.5, sm: 4 }} justifyContent="center">
              {PROJECT_BLOCKS.map((project, index) => {
                const isHover = hoveredId === project.id;
                return (
                  <Grid item xs={12} sm={6} key={project.id}>
                    <Fade in timeout={500 + index * 150}>
                      <Card
                        sx={{
                          height: "100%",
                          minHeight: { xs: 280, sm: 340, md: 380 },
                          transition: "all 0.3s ease-in-out",
                          transform: isHover
                            ? "translateY(-8px) scale(1.02)"
                            : "translateY(0) scale(1)",
                          boxShadow: isHover
                            ? "0 20px 40px rgba(6, 11, 23, 0.4)"
                            : "0 10px 24px rgba(6, 11, 23, 0.25)",
                          background: "rgba(255, 255, 255, 0.12)",
                          backdropFilter: "blur(14px)",
                          border: isHover
                            ? "2px solid rgba(255, 255, 255, 0.55)"
                            : "1px solid rgba(255, 255, 255, 0.28)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                        onMouseEnter={() => setHoveredId(project.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <CardActionArea
                          onClick={() => handlePick(project.id)}
                          sx={{
                            height: "100%",
                            minHeight: { xs: 280, sm: 340, md: 380 },
                            display: "flex",
                            alignItems: "stretch",
                          }}
                        >
                          <CardContent
                            sx={{
                              width: "100%",
                              py: { xs: 4, sm: 5 },
                              px: { xs: 3, sm: 4 },
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: { xs: 2, sm: 2.5 },
                            }}
                          >
                            <Box
                              sx={{
                                width: { xs: 150, sm: 180, md: 200 },
                                height: { xs: 150, sm: 180, md: 200 },
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(0, 0, 0, 0.28)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(255, 255, 255, 0.22)",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.25)",
                                p: { xs: 1.5, sm: 2 },
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                component="img"
                                src={project.logoSrc}
                                alt={project.logoAlt}
                                draggable={false}
                                sx={{
                                  maxWidth: "100%",
                                  maxHeight: "100%",
                                  width: "auto",
                                  height: "auto",
                                  objectFit: "contain",
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h4"
                              sx={{
                                fontWeight: 800,
                                color: "#fff",
                                fontSize: { xs: "1.65rem", sm: "2rem" },
                              }}
                            >
                              {project.title}
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                color: "rgba(255, 255, 255, 0.88)",
                                lineHeight: 1.6,
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                              }}
                            >
                              {project.description}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default ProjectSelection;
