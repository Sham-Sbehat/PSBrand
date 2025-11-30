import { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Snackbar,
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
import { financialCategoriesService, expenseSourcesService, transactionsService, reportsService } from '../../services/api';
import { useApp } from '../../context/AppContext';

const FinancialManagement = () => {
  const { user } = useApp();
  // Main tab state
  const [mainTab, setMainTab] = useState(0);
  
  // Category type tabs (Income/Expense)
  const [categoryTypeTab, setCategoryTypeTab] = useState(0);
  
  // Dialog states
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openSourceDialog, setOpenSourceDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  
  // Form states
  const [newCategory, setNewCategory] = useState({ name: '', description: '', type: 1, parentCategoryId: 0 });
  const [newSource, setNewSource] = useState({ name: '', categoryId: '' });
  const [newTransaction, setNewTransaction] = useState({ 
    type: 2, // 1 for income, 2 for expense (default to expense)
    categoryId: '', 
    sourceId: '', 
    employeeId: null,
    amount: '', 
    transactionDate: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    description: '' 
  });

  // Real data from API
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [savingCategory, setSavingCategory] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [openDeleteSourceDialog, setOpenDeleteSourceDialog] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState(null);
  const [deletingSource, setDeletingSource] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [openDeleteTransactionDialog, setOpenDeleteTransactionDialog] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState(false);
  const [reportSummary, setReportSummary] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(null); // null means "all months"
  const [reportYear, setReportYear] = useState(new Date().getFullYear());


  // Fetch transactions from API
  const fetchTransactions = async (month, year) => {
    setLoadingTransactions(true);
    try {
      const response = await transactionsService.getTransactionsByMonth(
        year,
        month
      );
      // API returns an object with transactions array, not a direct array
      const transactionsData = response?.transactions || response;
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setSnackbar({
        open: true,
        message: 'حدث خطأ أثناء جلب المعاملات المالية',
        severity: 'error'
      });
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Load transactions when month/year changes
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchTransactions(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  // Fetch report summary - either monthly or all
  const fetchReportSummary = async (year, month) => {
    setLoadingReport(true);
    try {
      let summary;
      if (month && month !== 'all') {
        // Fetch monthly report if month is selected
        summary = await reportsService.getMonthlyReport(year, month);
      } else {
        // Fetch all data if no month is selected
        summary = await reportsService.getSummary();
      }
      setReportSummary(summary);
    } catch (error) {
      console.error('Error fetching report summary:', error);
      setSnackbar({
        open: true,
        message: 'حدث خطأ أثناء جلب التقرير المالي',
        severity: 'error'
      });
      setReportSummary(null);
    } finally {
      setLoadingReport(false);
    }
  };

  // Load report when Reports tab is selected or month/year changes
  useEffect(() => {
    if (mainTab === 3) {
      if (reportMonth && reportMonth !== 'all' && reportYear) {
        // Fetch monthly report if month is selected
        fetchReportSummary(reportYear, reportMonth);
      } else if (!reportMonth || reportMonth === 'all') {
        // Fetch all data if no month is selected
        fetchReportSummary(reportYear, null);
      }
    }
  }, [mainTab, reportMonth, reportYear]);

  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      // Fetch income categories (type = 1)
      const incomeData = await financialCategoriesService.getCategoriesByType(1);
      setIncomeCategories(Array.isArray(incomeData) ? incomeData : []);
      
      // Fetch expense categories (type = 2)
      const expenseData = await financialCategoriesService.getCategoriesByType(2);
      setExpenseCategories(Array.isArray(expenseData) ? expenseData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setSnackbar({
        open: true,
        message: 'حدث خطأ أثناء جلب الفئات',
        severity: 'error'
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch sources from API
  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const sourcesData = await expenseSourcesService.getSources();
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      setSnackbar({
        open: true,
        message: 'حدث خطأ أثناء جلب المصادر',
        severity: 'error'
      });
    } finally {
      setLoadingSources(false);
    }
  };

  // Load categories and sources on component mount
  useEffect(() => {
    fetchCategories();
    fetchSources();
  }, []);

  const handleCategoryTypeTabChange = (event, newValue) => {
    setCategoryTypeTab(newValue);
  };

  const handleAddCategory = () => {
    setNewCategory({ 
      name: '', 
      description: '', 
      type: categoryTypeTab === 0 ? 1 : 2, // 1 for income, 2 for expense
      parentCategoryId: 0 
    });
    setOpenCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!newCategory.name.trim()) {
      setSnackbar({
        open: true,
        message: 'يرجى إدخال اسم الفئة',
        severity: 'error'
      });
      return;
    }

    setSavingCategory(true);
    try {
      // Build payload - only include parentCategoryId if it's not 0
      const payload = {
        name: newCategory.name,
        type: newCategory.type,
        isActive: newCategory.isActive !== undefined ? newCategory.isActive : true
      };
      
      // Only add parentCategoryId if it's not 0
      if (newCategory.parentCategoryId && newCategory.parentCategoryId !== 0) {
        payload.parentCategoryId = newCategory.parentCategoryId;
      }
      
      // Check if this is an update (has id) or create (no id)
      if (newCategory.id) {
        // Update existing category
        await financialCategoriesService.updateCategory(newCategory.id, payload);
        setSnackbar({
          open: true,
          message: 'تم تحديث الفئة بنجاح',
          severity: 'success'
        });
      } else {
        // Create new category
        await financialCategoriesService.createCategory(payload);
        setSnackbar({
          open: true,
          message: 'تم إضافة الفئة بنجاح',
          severity: 'success'
        });
      }
      
      setOpenCategoryDialog(false);
      setNewCategory({ name: '', description: '', type: 1, parentCategoryId: 0 });
      
      // Refresh categories
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حفظ الفئة',
        severity: 'error'
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingCategory(true);
    try {
      await financialCategoriesService.deleteCategory(categoryToDelete.id);
      
      setSnackbar({
        open: true,
        message: 'تم حذف الفئة بنجاح',
        severity: 'success'
      });
      
      setOpenDeleteDialog(false);
      setCategoryToDelete(null);
      
      // Refresh categories
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حذف الفئة',
        severity: 'error'
      });
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleAddSource = () => {
    setNewSource({ name: '', categoryId: '' });
    setOpenSourceDialog(true);
  };

  const handleSaveSource = async () => {
    if (!newSource.name.trim()) {
      setSnackbar({
        open: true,
        message: 'يرجى إدخال اسم المصدر',
        severity: 'error'
      });
      return;
    }

    if (!newSource.categoryId) {
      setSnackbar({
        open: true,
        message: 'يرجى اختيار الفئة',
        severity: 'error'
      });
      return;
    }

    setSavingSource(true);
    try {
      const payload = {
        name: newSource.name,
        categoryId: parseInt(newSource.categoryId),
        isActive: newSource.isActive !== undefined ? newSource.isActive : true
      };
      
      // Check if this is an update (has id) or create (no id)
      if (newSource.id) {
        // Update existing source
        await expenseSourcesService.updateSource(newSource.id, payload);
        setSnackbar({
          open: true,
          message: 'تم تحديث المصدر بنجاح',
          severity: 'success'
        });
      } else {
        // Create new source
        await expenseSourcesService.createSource(payload);
        setSnackbar({
          open: true,
          message: 'تم إضافة المصدر بنجاح',
          severity: 'success'
        });
      }
      
      setOpenSourceDialog(false);
      setNewSource({ name: '', categoryId: '' });
      
      // Refresh sources list
      await fetchSources();
    } catch (error) {
      console.error('Error saving source:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حفظ المصدر',
        severity: 'error'
      });
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteSource = (source) => {
    setSourceToDelete(source);
    setOpenDeleteSourceDialog(true);
  };

  const handleConfirmDeleteSource = async () => {
    if (!sourceToDelete) return;

    setDeletingSource(true);
    try {
      await expenseSourcesService.deleteSource(sourceToDelete.id);
      
      setSnackbar({
        open: true,
        message: 'تم حذف المصدر بنجاح',
        severity: 'success'
      });
      
      setOpenDeleteSourceDialog(false);
      setSourceToDelete(null);
      
      // Refresh sources list
      await fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حذف المصدر',
        severity: 'error'
      });
    } finally {
      setDeletingSource(false);
    }
  };

  const handleAddTransaction = () => {
    setNewTransaction({ 
      type: 2, // 1 for income, 2 for expense (default to expense)
      categoryId: '', 
      sourceId: '', 
      employeeId: null,
      amount: '', 
      transactionDate: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
      description: '' 
    });
    setOpenTransactionDialog(true);
  };

  const handleSaveTransaction = async () => {
    if (!newTransaction.categoryId) {
      setSnackbar({
        open: true,
        message: 'يرجى اختيار الفئة',
        severity: 'error'
      });
      return;
    }

    if (!newTransaction.sourceId) {
      setSnackbar({
        open: true,
        message: 'يرجى اختيار المصدر',
        severity: 'error'
      });
      return;
    }

    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      setSnackbar({
        open: true,
        message: 'يرجى إدخال مبلغ صحيح',
        severity: 'error'
      });
      return;
    }

    setSavingTransaction(true);
    try {
      // Find the selected category to check if it's a salary category
      const selectedCategory = [...expenseCategories, ...incomeCategories].find(
        cat => cat.id === parseInt(newTransaction.categoryId)
      );
      const isSalaryCategory = selectedCategory?.name?.toLowerCase().includes('راتب') || 
                                selectedCategory?.name?.toLowerCase().includes('رواتب');
      
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
      // Format: 2025-11-30T18:00:00.000Z
      let transactionDateISO = '';
      if (newTransaction.transactionDate) {
        // datetime-local format is YYYY-MM-DDTHH:mm (no seconds, no timezone)
        // We need to convert it to ISO format with timezone
        const dateTime = new Date(newTransaction.transactionDate);
        // Format as YYYY-MM-DDTHH:mm:00.000Z
        transactionDateISO = dateTime.toISOString();
      }
      
      const payload = {
        type: newTransaction.type,
        categoryId: parseInt(newTransaction.categoryId),
        sourceId: parseInt(newTransaction.sourceId),
        amount: parseFloat(newTransaction.amount),
        transactionDate: transactionDateISO,
        description: newTransaction.description || ''
      };
      
      // Only add employeeId for:
      // 1. Income transactions (type = 1)
      // 2. Expense transactions (type = 2) that are salary-related
      if (user?.id) {
        if (newTransaction.type === 1) {
          // For income transactions, we can include employeeId
          payload.employeeId = null;
        } else if (newTransaction.type === 2 && isSalaryCategory) {
          // For expense transactions, only include employeeId if it's a salary category
          payload.employeeId = null;
        }
      }
      
      if (newTransaction.id) {
        // Update existing transaction
        await transactionsService.updateTransaction(newTransaction.id, payload);
        setSnackbar({
          open: true,
          message: 'تم تحديث المعاملة المالية بنجاح',
          severity: 'success'
        });
        
        // Extract month and year from transactionDate for filter update
        const updatedTransactionDate = new Date(newTransaction.transactionDate);
        const updatedMonth = updatedTransactionDate.getMonth() + 1;
        const updatedYear = updatedTransactionDate.getFullYear();
        
        // If the updated transaction's month/year is different from current filter, update the filter
        if (updatedMonth !== selectedMonth || updatedYear !== selectedYear) {
          setSelectedMonth(updatedMonth);
          setSelectedYear(updatedYear);
          // fetchTransactions will be called automatically by useEffect when month/year changes
        } else {
          // Refresh transactions list for current month/year
          await fetchTransactions(selectedMonth, selectedYear);
        }
      } else {
        // Create new transaction
        await transactionsService.createTransaction(payload);
        setSnackbar({
          open: true,
          message: 'تم إضافة المعاملة المالية بنجاح',
          severity: 'success'
        });
        
        // Extract month and year from transactionDate for filter update
        const transactionDate = new Date(newTransaction.transactionDate);
        const transactionMonth = transactionDate.getMonth() + 1;
        const transactionYear = transactionDate.getFullYear();
        
        // If the new transaction's month/year is different from current filter, update the filter
        if (transactionMonth !== selectedMonth || transactionYear !== selectedYear) {
          setSelectedMonth(transactionMonth);
          setSelectedYear(transactionYear);
          // fetchTransactions will be called automatically by useEffect when month/year changes
        } else {
          // Refresh transactions list for current month/year
          await fetchTransactions(selectedMonth, selectedYear);
        }
      }
      
      setOpenTransactionDialog(false);
      setNewTransaction({ 
        type: 2,
        categoryId: '', 
        sourceId: '', 
        employeeId: null,
        amount: '', 
        transactionDate: new Date().toISOString().slice(0, 16),
        description: '' 
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حفظ المعاملة المالية',
        severity: 'error'
      });
    } finally {
      setSavingTransaction(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
    const transactionDate = new Date(transaction.transactionDate);
    const localDateTime = transactionDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    
    setNewTransaction({
      id: transaction.id,
      type: transaction.type,
      categoryId: transaction.categoryId,
      sourceId: transaction.sourceId,
      employeeId: transaction.employeeId,
      amount: transaction.amount,
      transactionDate: localDateTime,
      description: transaction.description || ''
    });
    setOpenTransactionDialog(true);
  };

  const handleDeleteTransaction = (transaction) => {
    setTransactionToDelete(transaction);
    setOpenDeleteTransactionDialog(true);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    setDeletingTransaction(true);
    try {
      await transactionsService.deleteTransaction(transactionToDelete.id);
      
      setSnackbar({
        open: true,
        message: 'تم حذف المعاملة المالية بنجاح',
        severity: 'success'
      });
      
      setOpenDeleteTransactionDialog(false);
      setTransactionToDelete(null);
      
      // Refresh transactions list
      await fetchTransactions(selectedMonth, selectedYear);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ أثناء حذف المعاملة المالية',
        severity: 'error'
      });
    } finally {
      setDeletingTransaction(false);
    }
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
                      <TableCell>الحالة</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCategories ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : (categoryTypeTab === 0 ? incomeCategories : expenseCategories).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            لا توجد فئات
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (categoryTypeTab === 0 ? incomeCategories : expenseCategories).map((category, index) => (
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
                                  onClick={() => handleDeleteCategory(category)}
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
                      ))
                    )}
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
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingSources ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : sources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            لا توجد مصادر
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sources.map((source, index) => (
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
                                onClick={() => handleDeleteSource(source)}
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
                      ))
                    )}
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
                    value={selectedMonth}
                    label="الشهر"
                    onChange={(e) => setSelectedMonth(e.target.value)}
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
                    value={selectedYear}
                    label="السنة"
                    onChange={(e) => setSelectedYear(e.target.value)}
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
                    {loadingTransactions ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            لا توجد معاملات مالية لهذا الشهر
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction, index) => {
                        const transactionDate = new Date(transaction.transactionDate);
                        const month = transactionDate.getMonth() + 1;
                        const year = transactionDate.getFullYear();
                        const isIncome = transaction.type === 1;
                        
                        return (
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
                                label={transaction.categoryName || '-'}
                                color={isIncome ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {transaction.sourceName || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: isIncome ? '#2e7d32' : '#d32f2f' 
                                }}
                              >
                                {isIncome ? '+' : '-'}{transaction.amount.toLocaleString()} ₪
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                                {getMonthName(month)} {year}
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
                                    onClick={() => handleEditTransaction(transaction)}
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
                                    onClick={() => handleDeleteTransaction(transaction)}
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
                        );
                      })
                    )}
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
              
              {/* Month/Year Filter for Reports */}
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
                    value={reportMonth || 'all'}
                    label="الشهر"
                    onChange={(e) => setReportMonth(e.target.value === 'all' ? null : e.target.value)}
                    sx={{ backgroundColor: '#fff' }}
                  >
                    <MenuItem value="all">الكل</MenuItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                      <MenuItem key={month} value={month}>
                        {getMonthName(month)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {reportMonth && reportMonth !== 'all' && (
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={reportYear}
                      label="السنة"
                      onChange={(e) => setReportYear(e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      {[2023, 2024, 2025, 2026].map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              
              {loadingReport ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                  <CircularProgress />
                </Box>
              ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ padding: 3, borderRadius: 3, boxShadow: calmPalette.shadow }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
                     الملخص المالي
                    </Typography>
                    <Divider sx={{ marginBottom: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">إجمالي الإيرادات:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            {(reportSummary?.totalIncome || 0).toLocaleString()} ₪
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">إجمالي المصاريف:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                            {(reportSummary?.totalExpenses || 0).toLocaleString()} ₪
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
                        {reportSummary?.topExpenses && reportSummary.topExpenses.length > 0 ? (
                          reportSummary.topExpenses.map((expense) => (
                            <Box key={expense.transactionId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {expense.categoryName || '-'} - {expense.sourceName || '-'}
                                </Typography>
                                {expense.employeeName && (
                                  <Typography variant="caption" color="text.secondary">
                                    {expense.employeeName}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                                {expense.amount.toLocaleString()} ₪
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center">
                            لا توجد مصاريف
                          </Typography>
                        )}
                      </Box>
                    </Card>
                  </Grid>

                  {/* Income by Category */}
                  {reportSummary?.incomeByCategory && reportSummary.incomeByCategory.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Card sx={{ padding: 3, borderRadius: 3, boxShadow: calmPalette.shadow }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
                          الإيرادات حسب الفئة
                        </Typography>
                        <Divider sx={{ marginBottom: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {reportSummary.incomeByCategory.map((category) => (
                            <Box key={category.categoryId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {category.categoryName}
                                </Typography>
                               
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                {category.totalAmount.toLocaleString()} ₪
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                </Grid>
                  )}

                  {/* Expenses by Category */}
                  {reportSummary?.expensesByCategory && reportSummary.expensesByCategory.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Card sx={{ padding: 3, borderRadius: 3, boxShadow: calmPalette.shadow }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
                          المصاريف حسب الفئة
                        </Typography>
                        <Divider sx={{ marginBottom: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {reportSummary.expensesByCategory.map((category) => (
                            <Box key={category.categoryId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {category.categoryName}
                                </Typography>
                                
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                                {category.totalAmount.toLocaleString()} ₪
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Card>
              </Grid>
                  )}
                </Grid>
              )}
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
           
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={newCategory.type}
                label="النوع"
                onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                disabled={!!newCategory.id} // Disable if editing
              >
                <MenuItem value={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#2e7d32' }} />
                    إيرادات
                  </Box>
                </MenuItem>
                <MenuItem value={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown sx={{ color: '#d32f2f' }} />
                    مصاريف
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            {newCategory.id && (
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={newCategory.isActive !== undefined ? newCategory.isActive : true}
                  label="الحالة"
                  onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.value === 'true' })}
                >
                  <MenuItem value={true}>نشط</MenuItem>
                  <MenuItem value={false}>غير نشط</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)} disabled={savingCategory}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            disabled={savingCategory}
            startIcon={savingCategory ? <CircularProgress size={16} /> : null}
          >
            {savingCategory ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Source Dialog */}
      <Dialog
        open={openSourceDialog}
        onClose={() => !savingSource && setOpenSourceDialog(false)}
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
                {[...expenseCategories, ...incomeCategories].map((category) => (
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
            {newSource.id && (
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={newSource.isActive !== undefined ? newSource.isActive : true}
                  label="الحالة"
                  onChange={(e) => setNewSource({ ...newSource, isActive: e.target.value === 'true' })}
                >
                  <MenuItem value={true}>نشط</MenuItem>
                  <MenuItem value={false}>غير نشط</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenSourceDialog(false)} 
            disabled={savingSource}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSource}
            disabled={savingSource}
            startIcon={savingSource ? <CircularProgress size={16} /> : null}
          >
            {savingSource ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Source Confirmation Dialog */}
      <Dialog
        open={openDeleteSourceDialog}
        onClose={() => !deletingSource && setOpenDeleteSourceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل أنت متأكد من رغبتك في حذف المصدر <strong>{sourceToDelete?.name}</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteSourceDialog(false)} 
            disabled={deletingSource}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteSource}
            disabled={deletingSource}
            startIcon={deletingSource ? <CircularProgress size={16} /> : null}
          >
            {deletingSource ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Transaction Dialog */}
      <Dialog
        open={openTransactionDialog}
        onClose={() => !savingTransaction && setOpenTransactionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {newTransaction.id ? 'تعديل المعاملة' : 'إضافة معاملة مالية جديدة'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <FormControl fullWidth>
              <InputLabel>نوع المعاملة</InputLabel>
              <Select
                value={newTransaction.type || 2}
                label="نوع المعاملة"
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value, categoryId: '', sourceId: '' })}
                required
                disabled={savingTransaction || !!newTransaction.id}
              >
                <MenuItem value={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#2e7d32' }} />
                    إيرادات
                  </Box>
                </MenuItem>
                <MenuItem value={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown sx={{ color: '#d32f2f' }} />
                    مصاريف
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={newTransaction.categoryId}
                label="الفئة"
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value, sourceId: '' })}
                required
                disabled={savingTransaction}
              >
                {((newTransaction.type || 2) === 1 ? incomeCategories : expenseCategories).map((category) => (
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
                disabled={!newTransaction.categoryId || savingTransaction}
              >
                {sources
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
              disabled={savingTransaction}
              InputProps={{
                endAdornment: <Typography sx={{ marginRight: 1 }}>₪</Typography>,
              }}
            />
            <TextField
              fullWidth
              label="التاريخ والوقت"
              type="datetime-local"
              value={newTransaction.transactionDate}
              onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                  required
              disabled={savingTransaction}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 60, // 1 minute
              }}
            />
            <TextField
              fullWidth
              label="الوصف"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              multiline
              rows={3}
              disabled={savingTransaction}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenTransactionDialog(false)} 
            disabled={savingTransaction}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveTransaction}
            disabled={savingTransaction}
            startIcon={savingTransaction ? <CircularProgress size={16} /> : null}
          >
            {savingTransaction ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog
        open={openDeleteTransactionDialog}
        onClose={() => !deletingTransaction && setOpenDeleteTransactionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل أنت متأكد من رغبتك في حذف هذه المعاملة المالية؟
          </Typography>
          {transactionToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                الفئة: {transactionToDelete.categoryName || '-'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                المصدر: {transactionToDelete.sourceName || '-'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                المبلغ: {transactionToDelete.amount?.toLocaleString()} ₪
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteTransactionDialog(false)} 
            disabled={deletingTransaction}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteTransaction}
            disabled={deletingTransaction}
            startIcon={deletingTransaction ? <CircularProgress size={16} /> : null}
          >
            {deletingTransaction ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => !deletingCategory && setOpenDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل أنت متأكد من رغبتك في حذف الفئة <strong>{categoryToDelete?.name}</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            disabled={deletingCategory}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deletingCategory}
            startIcon={deletingCategory ? <CircularProgress size={16} /> : null}
          >
            {deletingCategory ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FinancialManagement;

