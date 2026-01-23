import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  AttachMoney,
} from "@mui/icons-material";
import DepositOrderForm from "./DepositOrderForm";
import calmPalette from "../../theme/calmPalette";

const DepositOrdersTab = ({
  depositOrdersCount,
  fetchDepositOrders,
  fetchDepositOrdersCount,
  setOpenDepositOrdersList,
}) => {
  return (
    <>
      {/* Stats Card for Deposit Orders */}
      <Grid container spacing={3} sx={{ marginBottom: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            onClick={async () => {
              await fetchDepositOrders();
              setOpenDepositOrdersList(true);
            }}
            sx={{
              position: "relative",
              background: calmPalette.statCards[1]?.background || calmPalette.statCards[0]?.background,
              color: calmPalette.statCards[1]?.highlight || calmPalette.statCards[0]?.highlight,
              borderRadius: 4,
              boxShadow: calmPalette.shadow,
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 55%)",
                pointerEvents: "none",
              },
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: "0 28px 50px rgba(46, 38, 31, 0.22)",
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: calmPalette.statCards[1]?.highlight || calmPalette.statCards[0]?.highlight }}
                  >
                    {depositOrdersCount}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      marginTop: 1,
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    طلبات العربون
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 56, color: calmPalette.statCards[1]?.highlight || calmPalette.statCards[0]?.highlight }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Deposit Order Form */}
      <Box
        sx={{
          marginBottom: 4,
          background: calmPalette.surface,
          borderRadius: 4,
          boxShadow: calmPalette.shadow,
          backdropFilter: "blur(8px)",
          padding: 3,
        }}
      >
        <DepositOrderForm
          onSuccess={() => {
            fetchDepositOrders();
            fetchDepositOrdersCount();
          }}
        />
      </Box>
    </>
  );
};

export default DepositOrdersTab;

