import { Box, Typography, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import calmPalette from "../../theme/calmPalette";

/**
 * شريط الإعلانات العامة - مكون مشترك لجميع اللوحات
 */
const PublicMessagesBanner = ({ messages = [], onHideMessage }) => {
  if (!messages || messages.length === 0) return null;

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: calmPalette.surface,
        py: 1.5,
        width: "100%",
        overflow: "hidden",
        borderBottom: "2px solid rgba(94, 78, 62, 0.2)",
        boxShadow: calmPalette.shadow,
        backdropFilter: "blur(8px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            px: { xs: 1.5, sm: 2.5 },
            background: "linear-gradient(135deg, rgba(97, 79, 65, 0.95) 0%, rgba(73, 59, 48, 0.95) 100%)",
            color: calmPalette.statCards[0].highlight,
            fontWeight: 700,
            fontSize: { xs: "0.7rem", sm: "0.8rem" },
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
            zIndex: 2,
            borderRight: "2px solid rgba(94, 78, 62, 0.3)",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
            minWidth: { xs: 80, sm: 110 },
          }}
        >
          <Typography sx={{ color: calmPalette.statCards[0].highlight, fontWeight: 700, fontSize: "inherit", letterSpacing: "inherit" }}>
            📢 إعلان عام
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, sm: 3 },
            marginLeft: { xs: 90, sm: 130 },
            marginRight: { xs: 40, sm: 50 },
            animation: "scroll 40s linear infinite",
            "@keyframes scroll": {
              "0%": { transform: "translateX(100%)" },
              "100%": { transform: "translateX(-100%)" },
            },
          }}
        >
          {messages.map((msg, i) => (
            <Box key={`${msg.id}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0, minWidth: "fit-content", px: 2 }}>
              <Typography variant="body2" sx={{ color: calmPalette.textPrimary, fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                {msg.title || "إعلان عام"}:
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontWeight: 500, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                {msg.content}
              </Typography>
              <Box component="span" sx={{ width: 4, height: 4, borderRadius: "50%", background: calmPalette.textMuted, display: "inline-block", mx: 1.5 }} />
            </Box>
          ))}
          {messages.map((msg, i) => (
            <Box key={`${msg.id}-dup-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0, minWidth: "fit-content", px: 2 }}>
              <Typography variant="body2" sx={{ color: calmPalette.textPrimary, fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                {msg.title || "إعلان عام"}:
              </Typography>
              <Typography variant="body2" sx={{ color: calmPalette.textSecondary, fontWeight: 500, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                {msg.content}
              </Typography>
              <Box component="span" sx={{ width: 4, height: 4, borderRadius: "50%", background: calmPalette.textMuted, display: "inline-block", mx: 1.5 }} />
            </Box>
          ))}
        </Box>

        {onHideMessage && (
          <IconButton
            size="small"
            onClick={() => onHideMessage(messages[0].id)}
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: calmPalette.textMuted,
              width: 28,
              height: 28,
              zIndex: 2,
              "&:hover": { backgroundColor: "rgba(94, 78, 62, 0.1)", color: calmPalette.textPrimary, transform: "translateY(-50%) rotate(90deg)" },
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default PublicMessagesBanner;
