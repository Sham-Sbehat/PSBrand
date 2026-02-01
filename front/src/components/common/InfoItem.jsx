import { Box, Typography } from "@mui/material";

/**
 * عنصر عرض تسمية-قيمة - مكون مشترك
 */
const InfoItem = ({ label, value }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box sx={{ typography: "body1", fontWeight: 600, color: "text.primary" }}>
      {value ?? "-"}
    </Box>
  </Box>
);

export default InfoItem;
