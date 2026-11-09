import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './auth';
import { Shell } from './components/Shell';
import './index.css';
import Chips from './pages/Chips';
import Content from './pages/Content';
import GameSetup from './pages/GameSetup';
import LiveTables from './pages/LiveTables';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Players from './pages/Players';
import Reports from './pages/Reports';
import Support from './pages/Support';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: true } } });

function Guard({ children }: { children: ReactNode }) {
  const { admin, ready } = useAuth();
  if (!ready) return null;
  return admin ? <>{children}</> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Guard><Shell /></Guard>}>
              <Route index element={<Overview />} />
              <Route path="players" element={<Players />} />
              <Route path="support" element={<Support />} />
              <Route path="games" element={<GameSetup />} />
              <Route path="tables" element={<LiveTables />} />
              <Route path="chips" element={<Chips />} />
              <Route path="reports" element={<Reports />} />
              <Route path="content" element={<Content />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
