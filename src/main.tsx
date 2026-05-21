import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './styles.css';

import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@app/App';
import { AuthProvider } from '@shared/auth/AuthContext';
import { WorkspacePreferencesProvider } from '@shared/preferences/WorkspacePreferencesContext';
import { queryClient } from '@shared/queryClient';
import { theme } from '@shared/theme/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkspacePreferencesProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </WorkspacePreferencesProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
