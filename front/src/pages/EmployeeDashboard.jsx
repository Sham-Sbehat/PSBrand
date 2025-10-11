import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Logout,
  Assignment,
  CheckCircle,
  Pending,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import OrderForm from '../components/employee/OrderForm';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders } = useApp();
  const [showForm, setShowForm] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // إحصائيات الموظف
  const employeeOrders = orders.filter(
    (order) => order.employeeName === user?.name
  );
  const pendingOrders = employeeOrders.filter(
    (order) => order.status === 'pending'
  );
  const completedOrders = employeeOrders.filter(
    (order) => order.status === 'completed'
  );

  const stats = [
    {
      title: 'إجمالي الطلبات',
      value: employeeOrders.length,
      icon: Assignment,
      color: '#1976d2',
    },
    {
      title: 'قيد الانتظار',
      value: pendingOrders.length,
      icon: Pending,
      color: '#ed6c02',
    },
    {
      title: 'مكتملة',
      value: completedOrders.length,
      icon: CheckCircle,
      color: '#2e7d32',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* شريط العنوان */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            PSBrand - لوحة الموظف
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {user?.name?.charAt(0) || 'م'}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user?.name || 'موظف'}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        {/* الإحصائيات */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`,
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body1" sx={{ marginTop: 1 }}>
                          {stat.title}
                        </Typography>
                      </Box>
                      <Icon sx={{ fontSize: 60, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* نموذج إنشاء الطلب */}
        <Box sx={{ marginBottom: 4 }}>
          <OrderForm onSuccess={() => setShowForm(false)} />
        </Box>

        {/* قائمة الطلبات السابقة */}
        {employeeOrders.length > 0 && (
          <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 700, marginBottom: 3 }}
            >
              طلباتي السابقة
            </Typography>

            <Grid container spacing={3}>
              {employeeOrders.map((order) => (
                <Grid item xs={12} md={6} key={order.id}>
                  <Card
                    sx={{
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: 2,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {order.customerName}
                        </Typography>
                        <Chip
                          label={
                            order.status === 'pending'
                              ? 'قيد الانتظار'
                              : order.status === 'completed'
                              ? 'مكتمل'
                              : 'ملغي'
                          }
                          color={
                            order.status === 'pending'
                              ? 'warning'
                              : order.status === 'completed'
                              ? 'success'
                              : 'error'
                          }
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>الهاتف:</strong> {order.customerPhone}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>المقاس:</strong> {order.size} |{' '}
                        <strong>اللون:</strong> {order.color}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <strong>السعر:</strong> {order.price} ₪
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', marginTop: 1 }}
                      >
                        {new Date(order.createdAt).toLocaleDateString('ar', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default EmployeeDashboard;


