import { Box, ButtonBase, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

/**
 * رجوع لاختيار المشروع — زاوية الصفحة، نص أبيض + سهم (مثل تصميم الواجهة).
 */
export default function BackToProjectCorner({ disabled = false }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: "absolute",
        top: { xs: 10, sm: 18 },
        right: { xs: 10, sm: 18 },
        zIndex: 2,
      }}
    >
      <ButtonBase
        disabled={disabled}
        onClick={() => navigate("/")}
        focusRipple
        sx={{
          borderRadius: 2,
          px: { xs: 1, sm: 1.5 },
          py: 1,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          flexDirection: "row",
          textShadow: "0 1px 4px rgba(0,0,0,0.75)",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.1)",
          },
          "&.Mui-disabled": {
            opacity: 0.45,
          },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.875rem", sm: "0.95rem" },
            color: "inherit",
          }}
        >
           رجوع
        </Typography>
        <Box
          component="span"
          aria-hidden
          sx={{
            color: "#fff",
            fontSize: "1.25rem",
            lineHeight: 1,
            fontWeight: 700,
            textShadow: "0 1px 4px rgba(0,0,0,0.75)",
          }}
        >
          ←
        </Box>
      </ButtonBase>
    </Box>
  );
}
