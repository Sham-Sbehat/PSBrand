import { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Category,
  AccountBalance,
  CalendarMonth,
  Description,
} from '@mui/icons-material';
import calmPalette from '../../theme/calmPalette';

const FinancialManagement = () => {
  // Main tab state
  const [mainTab, setMainTab] = useState(0);
  
  // Category type tabs (Income/Expense)
  const [categoryTypeTab, setCategoryTypeTab] = useState(0);
  
  // Dialog states
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openSourceDialog, setOpenSourceDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  
  // Form states (mock data for design)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', type: 'income' });
  const [newSource, setNewSource] = useState({ name: '', description: '', categoryId: '' });
  const [newTransaction, setNewTransaction] = useState({ 
    categoryId: '', 
    sourceId: '', 
    amount: '', 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(),
    description: '' 
  });

  // Mock data for design demonstration
  const mockIncomeCategories = [
    { id: 1, name: 'مبيعات', description: 'إيرادات من المبيعات', isActive: true },
    { id: 2, name: 'خدمات', description: 'إيرادات من الخدمات', isActive: true },
  ];

  const mockExpenseCategories = [
    { id: 3, name: 'مطبوعات', description: 'مصاريف الطباعة', isActive: true },
    { id: 4, name: 'إعلانات', description: 'مصاريف الإعلانات', isActive: true },
    { id: 5, name: 'رواتب', description: 'رواتب الموظفين', isActive: true },
  ];

  const mockSources = [
    { id: 1, name: 'ورق', categoryId: 3, categoryName: 'مطبوعات', description: 'شراء ورق للطباعة' },
    { id: 2, name: 'حبر', categoryId: 3, categoryName: 'مطبوعات', description: 'شراء حبر للطابعات' },
    { id: 3, name: 'إعلان فيسبوك', categoryId: 4, categoryName: 'إعلانات', description: 'إعلانات على فيسبوك' },
  ];

  const mockTransactions = [
    { id: 1, categoryName: 'مطبوعات', sourceName: 'ورق', amount: 1000, month: 11, year: 2025, description: 'شراء ورق لشهر نوفمبر' },
    { id: 2, categoryName: 'إعلانات', sourceName: 'إعلان فيسبوك', amount: 200, month: 11, year: 2025, description: 'إعلان نوفمبر' },
    { id: 3, categoryName: 'مطبوعات', sourceName: 'حبر', amount: 500, month: 10, year: 2025, description: 'شراء حبر لشهر أكتوبر' },
  ];

  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
  };

  const handleCategoryTypeTabChange = (event, newValue) => {
    setCategoryTypeTab(newValue);
  };

  const handleAddCategory = () => {
    setNewCategory({ name: '', description: '', type: categoryTypeTab === 0 ? 'income' : 'expense' });
    setOpenCategoryDialog(true);
  };

  const handleAddSource = () => {
    setNewSource({ name: '', description: '', categoryId: '' });
    setOpenSourceDialog(true);
  };

  const handleAddTransaction = () => {
    setNewTransaction({ 
      categoryId: '', 
      sourceId: '', 
      amount: '', 
      month: new Date().getMonth() + 1, 
      year: new Date().getFullYear(),
      description: '' 
    });
    setOpenTransactionDialog(true);
  };

  // Get current month name in Arabic
  const getMonthName = (month) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1] || month;
  };

  return (
    <Box>
      {/* Main Tabs Container */}
      <Paper elevation={3} sx={{ padding: 0, borderRadius: 3, overflow: 'hidden' }}>
        {/* Main Navigation Tabs */}
        <Box sx={{ 
          backgroundColor: calmPalette.surface, 
          padding: 2, 
          borderBottom: `2px solid ${calmPalette.surface}` 
        }}>
          <Tabs
            value={mainTab}
            onChange={handleMainTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: calmPalette.statCards[0].background,
              },
            }}
          >
            <Tab
              label="الفئات المالية"
              icon={<Category />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calmPalette.textMuted,
                minHeight: 60,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: calmPalette.statCards[0].background,
                },
              }}
            />
            <Tab
              label="المصادر"
              icon={<Description />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calmPalette.textMuted,
                minHeight: 60,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: calmPalette.statCards[0].background,
                },
              }}
            />
            <Tab
              label="المعاملات المالية"
              icon={<AttachMoney />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calmPalette.textMuted,
                minHeight: 60,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: calmPalette.statCards[0].background,
                },
              }}
            />
            <Tab
              label="التقارير"
              icon={<AccountBalance />}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calmPalette.textMuted,
                minHeight: 60,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: calmPalette.statCards[0].background,
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Tab Content Area */}
        <Box sx={{ padding: 4 }}>
          {/* Categories Tab */}
          {mainTab === 0 && (
            <Box>
              {/* Header with Add Button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  إدارة الفئات المالية
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddCategory}
                  sx={{
                    background: calmPalette.statCards[0].background,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    '&:hover': {
                      background: calmPalette.statCards[0].background,
                      opacity: 0.9,
                      transform: 'translateY(-2px)',
                      boxShadow: calmPalette.shadow,
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  إضافة فئة جديدة
                </Button>
              </Box>

              {/* Income/Expense Sub-tabs */}
              <Box sx={{ 
                marginBottom: 3, 
                backgroundColor: '#f8f8f8',
                borderRadius: 2,
                padding: 1,
              }}>
                <Tabs
                  value={categoryTypeTab}
                  onChange={handleCategoryTypeTabChange}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                      backgroundColor: categoryTypeTab === 0 ? '#2e7d32' : '#d32f2f',
                    },
                  }}
                >
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ color: categoryTypeTab === 0 ? '#2e7d32' : 'inherit' }} />
                        <Typography sx={{ fontWeight: 600 }}>فئات الإيرادات</Typography>
                      </Box>
                    }
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'none',
                      color: categoryTypeTab === 0 ? '#2e7d32' : 'inherit',
                      '&.Mui-selected': {
                        color: '#2e7d32',
                      },
                    }}
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingDown sx={{ color: categoryTypeTab === 1 ? '#d32f2f' : 'inherit' }} />
                        <Typography sx={{ fontWeight: 600 }}>فئات المصاريف</Typography>
                      </Box>
                    }
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'none',
                      color: categoryTypeTab === 1 ? '#d32f2f' : 'inherit',
                      '&.Mui-selected': {
                        color: '#d32f2f',
                      },
                    }}
                  />
                </Tabs>
              </Box>

              {/* Categories Table */}
              <TableContainer 
                component={Paper} 
                elevation={0}
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid #e0e0e0',
                  overflow: 'hidden'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ 
                      backgroundColor: calmPalette.statCards[0].background,
                      '& .MuiTableCell-head': {
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }
                    }}>
                      <TableCell>اسم الفئة</TableCell>
                      <TableCell>الوصف</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(categoryTypeTab === 0 ? mockIncomeCategories : mockExpenseCategories).map((category, index) => (
                      <TableRow 
                        key={category.id} 
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {categoryTypeTab === 0 ? (
                              <TrendingUp sx={{ color: '#2e7d32', fontSize: 24 }} />
                            ) : (
                              <TrendingDown sx={{ color: '#d32f2f', fontSize: 24 }} />
                            )}
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {category.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {category.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={category.isActive ? 'نشط' : 'غير نشط'}
                            color={category.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setNewCategory(category);
                                  setOpenCategoryDialog(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'primary.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  // Handle delete
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Sources Tab */}
          {mainTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  إدارة المصادر
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddSource}
                  sx={{
                    background: calmPalette.statCards[0].background,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    '&:hover': {
                      background: calmPalette.statCards[0].background,
                      opacity: 0.9,
                      transform: 'translateY(-2px)',
                      boxShadow: calmPalette.shadow,
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  إضافة مصدر جديد
                </Button>
              </Box>

              <TableContainer 
                component={Paper} 
                elevation={0}
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid #e0e0e0',
                  overflow: 'hidden'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ 
                      backgroundColor: calmPalette.statCards[0].background,
                      '& .MuiTableCell-head': {
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }
                    }}>
                      <TableCell>اسم المصدر</TableCell>
                      <TableCell>الفئة</TableCell>
                      <TableCell>الوصف</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockSources.map((source, index) => (
                      <TableRow 
                        key={source.id} 
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                          }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {source.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={source.categoryName}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {source.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setNewSource(source);
                                  setOpenSourceDialog(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'primary.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  // Handle delete
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Transactions Tab */}
          {mainTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  المعاملات المالية
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddTransaction}
                  sx={{
                    background: calmPalette.statCards[0].background,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    '&:hover': {
                      background: calmPalette.statCards[0].background,
                      opacity: 0.9,
                      transform: 'translateY(-2px)',
                      boxShadow: calmPalette.shadow,
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  إضافة معاملة جديدة
                </Button>
              </Box>

              {/* Month/Year Filter */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                marginBottom: 3,
                padding: 2,
                backgroundColor: '#f8f8f8',
                borderRadius: 2,
                alignItems: 'center',
              }}>
                <CalendarMonth sx={{ color: calmPalette.statCards[0].background }} />
                <Typography variant="body1" sx={{ fontWeight: 600, marginRight: 1 }}>
                  فلترة حسب:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>الشهر</InputLabel>
                  <Select
                    value={11}
                    label="الشهر"
                    sx={{ backgroundColor: '#fff' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                      <MenuItem key={month} value={month}>
                        {getMonthName(month)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>السنة</InputLabel>
                  <Select
                    value={2025}
                    label="السنة"
                    sx={{ backgroundColor: '#fff' }}
                  >
                    {[2023, 2024, 2025, 2026].map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TableContainer 
                component={Paper} 
                elevation={0}
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid #e0e0e0',
                  overflow: 'hidden'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ 
                      backgroundColor: calmPalette.statCards[0].background,
                      '& .MuiTableCell-head': {
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }
                    }}>
                      <TableCell>الفئة</TableCell>
                      <TableCell>المصدر</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>الشهر</TableCell>
                      <TableCell>الوصف</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockTransactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id} 
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                          }
                        }}
                      >
                        <TableCell>
                          <Chip
                            label={transaction.categoryName}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transaction.sourceName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                            {transaction.amount.toLocaleString()} ₪
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getMonthName(transaction.month)} {transaction.year}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {transaction.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setNewTransaction(transaction);
                                  setOpenTransactionDialog(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'primary.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  // Handle delete
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Reports Tab */}
          {mainTab === 3 && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, marginBottom: 3 }}>
                التقارير المالية
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ padding: 3, borderRadius: 3, boxShadow: calmPalette.shadow }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
                      ملخص شهري
                    </Typography>
                    <Divider sx={{ marginBottom: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">إجمالي الإيرادات:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                          {(5000).toLocaleString()} ₪
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">إجمالي المصاريف:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                          {(1700).toLocaleString()} ₪
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          صافي الربح:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1976d2' }}>
                          {(3300).toLocaleString()} ₪
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ padding: 3, borderRadius: 3, boxShadow: calmPalette.shadow }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
                      أعلى المصاريف
                    </Typography>
                    <Divider sx={{ marginBottom: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {mockTransactions.slice(0, 3).map((transaction) => (
                        <Box key={transaction.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{transaction.categoryName} - {transaction.sourceName}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transaction.amount.toLocaleString()} ₪
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Add/Edit Category Dialog */}
      <Dialog
        open={openCategoryDialog}
        onClose={() => setOpenCategoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {newCategory.id ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <TextField
              fullWidth
              label="اسم الفئة"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="الوصف"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={newCategory.type}
                label="النوع"
                onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
              >
                <MenuItem value="income">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#2e7d32' }} />
                    إيرادات
                  </Box>
                </MenuItem>
                <MenuItem value="expense">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown sx={{ color: '#d32f2f' }} />
                    مصاريف
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Handle save
              setOpenCategoryDialog(false);
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Source Dialog */}
      <Dialog
        open={openSourceDialog}
        onClose={() => setOpenSourceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {newSource.id ? 'تعديل المصدر' : 'إضافة مصدر جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={newSource.categoryId}
                label="الفئة"
                onChange={(e) => setNewSource({ ...newSource, categoryId: e.target.value })}
                required
              >
                {[...mockExpenseCategories, ...mockIncomeCategories].map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="اسم المصدر"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="الوصف"
              value={newSource.description}
              onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSourceDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Handle save
              setOpenSourceDialog(false);
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Transaction Dialog */}
      <Dialog
        open={openTransactionDialog}
        onClose={() => setOpenTransactionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {newTransaction.id ? 'تعديل المعاملة' : 'إضافة معاملة مالية جديدة'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={newTransaction.categoryId}
                label="الفئة"
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value, sourceId: '' })}
                required
              >
                {[...mockExpenseCategories, ...mockIncomeCategories].map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>المصدر</InputLabel>
              <Select
                value={newTransaction.sourceId}
                label="المصدر"
                onChange={(e) => setNewTransaction({ ...newTransaction, sourceId: e.target.value })}
                required
                disabled={!newTransaction.categoryId}
              >
                {mockSources
                  .filter((source) => source.categoryId === newTransaction.categoryId)
                  .map((source) => (
                    <MenuItem key={source.id} value={source.id}>
                      {source.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="المبلغ"
              type="number"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              required
              InputProps={{
                endAdornment: <Typography sx={{ marginRight: 1 }}>₪</Typography>,
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>الشهر</InputLabel>
                <Select
                  value={newTransaction.month}
                  label="الشهر"
                  onChange={(e) => setNewTransaction({ ...newTransaction, month: e.target.value })}
                  required
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <MenuItem key={month} value={month}>
                      {getMonthName(month)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>السنة</InputLabel>
                <Select
                  value={newTransaction.year}
                  label="السنة"
                  onChange={(e) => setNewTransaction({ ...newTransaction, year: e.target.value })}
                  required
                >
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label="الوصف"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTransactionDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Handle save
              setOpenTransactionDialog(false);
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialManagement;

