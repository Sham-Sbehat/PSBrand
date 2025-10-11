import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import App from './App.jsx';
import './index.css';

// إنشاء cache للـ RTL
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <App />
    </CacheProvider>
  </StrictMode>
);
