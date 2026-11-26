import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { I18nProvider } from './i18n/I18nContext';
import { App } from './App';

/**
 * 웹 앱 진입점
 * - index.html의 #root 요소 안에 I18nProvider(다국어 상태)와 React 앱을 마운트합니다.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
