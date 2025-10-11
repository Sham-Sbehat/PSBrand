import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Logout,
  Assignment,
  People,
  CheckCircle,
  Pending,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import OrdersList from '../components/admin/OrdersList';
import EmployeeManagement from '../components/admin/EmployeeManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, orders, employees } = useApp();
  const [currentTab, setCurrentTab] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // إحصائيات الأدمن
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const completedOrders = orders.filter(
    (order) => order.status === 'completed'
  );

  const stats = [
    {
      title: 'إجمالي الطلبات',
      value: orders.length,
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
    {
      title: 'عدد الموظفين',
      value: employees.length,
      icon: People,
      color: '#9c27b0',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* شريط العنوان */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            PSBrand -اااااااااااااااااا لوحة الأدمن
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {user?.name?.charAt(0) || 'أ'}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user?.name || 'الأدمن'}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ paddingY: 4 }}>
        {/* الإحصائيات */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={6} md={3} key={index}>
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

        {/* التبويبات */}
        <Box sx={{ marginBottom: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Tab
              label="الطلبات"
              icon={<Assignment />}
              iconPosition="start"
              sx={{ fontWeight: 600, fontSize: '1rem' }}
            />
            <Tab
              label="إدارة الموظفين"
              icon={<People />}
              iconPosition="start"
              sx={{ fontWeight: 600, fontSize: '1rem' }}
            />
          </Tabs>
        </Box>

        {/* المحتوى */}
        <Box>
          {currentTab === 0 && <OrdersList />}
          {currentTab === 1 && <EmployeeManagement />}
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboard;


