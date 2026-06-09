import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './theme.css';
import './styles.css';

import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@app/App';
import { useWorkspacePreferences, WorkspacePreferencesProvider } from '@shared/preferences/WorkspacePreferencesContext';

import { queryClient } from '@shared/queryClient';
import {AuthProvider} from "@shared/auth/AuthContext";
import { buildTheme, buildCssVariablesResolver } from '@shared/theme/theme';

function ThemedApp() {
  const { colorPreset, eventTheme, resolvedColorScheme } = useWorkspacePreferences();
  const theme = buildTheme(colorPreset, eventTheme);
  const cssVariablesResolver = buildCssVariablesResolver(colorPreset, eventTheme);

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={resolvedColorScheme}
      cssVariablesResolver={cssVariablesResolver}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
        <WorkspacePreferencesProvider>
              <AuthProvider>
          <ThemedApp />
              </AuthProvider>
        </WorkspacePreferencesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
