import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProductPoolPage } from '@/pages/ProductPool';
import { CampaignConfigPage } from '@/pages/CampaignConfig';
import { PriceCheckPage } from '@/pages/PriceCheck';
import { DashboardPage } from '@/pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductPoolPage />} />
          <Route path="/campaigns" element={<CampaignConfigPage />} />
          <Route path="/campaigns/:id" element={<CampaignConfigPage />} />
          <Route path="/price-check" element={<PriceCheckPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
