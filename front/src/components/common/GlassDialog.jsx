import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";

const GlassDialog = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  maxWidth = "md",
  fullWidth = true,
  fullScreen,
  contentSx = {},
  titleSx = {},
  actionsSx = {},
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={fullScreen ? false : maxWidth}
      fullWidth={fullScreen || fullWidth}
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          background: calmPalette.surface,
          backdropFilter: "blur(16px)",
          borderRadius: fullScreen ? 0 : 3,
          boxShadow: calmPalette.shadow,
          border: "1px solid rgba(94, 78, 62, 0.18)",
          overflow: "hidden",
        },
      }}
    >
      {(title || subtitle || onClose || icon) && (
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            background: "linear-gradient(135deg, rgba(96, 78, 62, 0.75), rgba(73, 59, 48, 0.85))",
            color: "#f7f2ea",
            paddingY: 2,
            paddingX: { xs: 2, sm: 3 },
            "& .MuiTypography-h6": { fontSize: { xs: "1rem", sm: "1.25rem" } },
            ...titleSx,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {icon && <Box sx={{ color: "#f7f2ea" }}>{icon}</Box>}
            <Box>
              {title && (
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" sx={{ color: "rgba(247, 242, 234, 0.75)" }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                color: "#f7f2ea",
                border: "1px solid rgba(247, 242, 234, 0.35)",
                "&:hover": {
                  backgroundColor: "rgba(247, 242, 234, 0.15)",
                },
              }}
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent
        sx={{
          paddingX: { xs: 2, sm: 3 },
          paddingY: { xs: 2, sm: 3 },
          background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(232, 220, 205, 0.35) 100%)",
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            paddingX: 3,
            paddingY: 2,
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            borderTop: "1px solid rgba(94, 78, 62, 0.12)",
            ...actionsSx,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default GlassDialog;

