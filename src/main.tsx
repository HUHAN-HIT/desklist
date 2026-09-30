import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WidgetApp from './app/widget/WidgetApp';
import MainApp from './app/main/MainApp';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

// 两窗共用一份代码，按 URL 参数分流：index.html?window=widget | main
const kind = new URLSearchParams(window.location.search).get('window') ?? 'widget';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {kind === 'main' ? <MainApp /> : <WidgetApp />}
    </QueryClientProvider>
  </React.StrictMode>,
);
