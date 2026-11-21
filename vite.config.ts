import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 개발 서버 및 프로덕션 빌드 설정
 * - React 플러그인을 연결해 TSX(TypeScript + React) 파일을 변환합니다.
 * - 용량이 큰 3D 엔진(three)과 React 코어를 별도 청크(묶음 파일)로 분리해
 *   배포 후 앱 코드만 수정했을 때 방문자 브라우저가 Three.js를 다시 받지 않도록 캐시 효율을 높입니다.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js + React Three Fiber 묶음(약 930KB, gzip 247KB)이 기본 경고 기준(500KB)을 넘지 않게 조정
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-vendor',
              test: /node_modules[\\/](three|@react-three)/,
              priority: 20,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
