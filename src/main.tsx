import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

/**
 * 웹 앱 진입점
 * - index.html의 #root 요소 안에 React 앱을 마운트(화면에 연결)합니다.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
