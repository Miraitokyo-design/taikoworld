import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 개발 서버 및 프로덕션 빌드 설정
 * - React 플러그인을 연결해 TSX(TypeScript + React) 파일을 변환합니다.
 */
export default defineConfig({
  plugins: [react()],
});
