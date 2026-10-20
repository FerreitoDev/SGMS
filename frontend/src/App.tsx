import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';
import { AppRoutes } from '@/routes/app-routes';
import { Toaster } from '@/components/ui/sonner';

export default function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
