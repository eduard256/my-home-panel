import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Note: StrictMode temporarily disabled due to echarts-for-react ResizeObserver bug
// See: https://github.com/hustcc/echarts-for-react/issues
// This only affects development mode
ReactDOM.createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? <App /> : <React.StrictMode><App /></React.StrictMode>
);
