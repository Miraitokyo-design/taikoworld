/// <reference types="vite/client" />

/**
 * Vite 환경변수(.env.local / Vercel Environment Variables) 타입 정의
 * - VITE_ 접두사가 붙은 변수만 브라우저 코드에서 import.meta.env로 안전하게 읽을 수 있습니다.
 */
interface ImportMetaEnv {
  /** 구글 스프레드시트 연주 일정 탭 공개 CSV 주소 */
  readonly VITE_SCHEDULE_CSV_URL?: string;
  /** 구글 스프레드시트 서클 멤버 탭 공개 CSV 주소 */
  readonly VITE_MEMBERS_CSV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
