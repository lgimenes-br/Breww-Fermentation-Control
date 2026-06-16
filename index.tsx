import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import { SettingsProvider } from './SettingsContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrewProvider } from './context/BrewContext';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <BrewProvider>
            <App />
          </BrewProvider>
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);