import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Palette,
  Straighten,
  Texture,
  Person,
  Message as MessageIcon,
} from '@mui/icons-material';
import ColorsManagement from './ColorsManagement';
import SizesManagement from './SizesManagement';
import FabricTypesManagement from './FabricTypesManagement';
import ClientsManagement from './ClientsManagement';
import MessagesManagement from './MessagesManagement';
import calmPalette from '../../theme/calmPalette';

const ManagementDashboard = ({ initialSubTab = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentTab, setCurrentTab] = useState(initialSubTab ?? 0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  useEffect(() => {
    if (initialSubTab != null) {
      setCurrentTab(initialSubTab);
    }
  }, [initialSubTab]);

  return (
    <Box>
      <Box sx={{ marginBottom: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            backgroundColor: calmPalette.surface,
            borderRadius: 3,
            boxShadow: calmPalette.shadow,
            backdropFilter: 'blur(8px)',
            minHeight: { xs: 48, sm: 64 },
            '& .MuiTabs-scrollButtons': {
              color: calmPalette.textMuted,
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            },
          }}
          TabIndicatorProps={{
            sx: {
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(96, 78, 62, 0.85) 0%, rgba(75, 61, 49, 0.9) 100%)',
              zIndex: -1,
            },
          }}
        >
          <Tab
            label="الألوان"
            icon={<Palette />}
            iconPosition="start"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: calmPalette.textMuted,
              minHeight: { xs: 48, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              '&.Mui-selected': {
                color: '#f7f2ea',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                },
              },
            }}
          />
          <Tab
            label="المقاسات"
            icon={<Straighten />}
            iconPosition="start"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: calmPalette.textMuted,
              minHeight: { xs: 48, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              '&.Mui-selected': {
                color: '#f7f2ea',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                },
              },
            }}
          />
          <Tab
            label="أنواع الأقمشة"
            icon={<Texture />}
            iconPosition="start"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: calmPalette.textMuted,
              minHeight: { xs: 48, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              '&.Mui-selected': {
                color: '#f7f2ea',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                },
              },
            }}
          />
          <Tab
            label="العملاء"
            icon={<Person />}
            iconPosition="start"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: calmPalette.textMuted,
              minHeight: { xs: 48, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              '&.Mui-selected': {
                color: '#f7f2ea',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                },
              },
            }}
          />
          <Tab
            label="الرسائل"
            icon={<MessageIcon />}
            iconPosition="start"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: calmPalette.textMuted,
              minHeight: { xs: 48, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              '&.Mui-selected': {
                color: '#f7f2ea',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1 },
                '& svg': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                },
              },
            }}
          />
        </Tabs>
      </Box>

      <Box>
        {currentTab === 0 && <ColorsManagement />}
        {currentTab === 1 && <SizesManagement />}
        {currentTab === 2 && <FabricTypesManagement />}
        {currentTab === 3 && <ClientsManagement />}
        {currentTab === 4 && <MessagesManagement />}
      </Box>
    </Box>
  );
};

export default ManagementDashboard;

