import type { SongConfig } from '../types/content';

/** 브라우저 localStorage에 사용자가 직접 작곡한 곡을 저장할 때 사용하는 키 */
const CUSTOM_SONGS_STORAGE_KEY = 'taiko_world_custom_songs_v1';

/**
 * 브라우저 localStorage에서 사용자가 직접 작곡해 저장한 곡 목록을 안전하게 불러오는 함수
 * - 시크릿 모드나 저장 데이터 손상 시에도 앱이 깨지지 않도록 try/catch로 감쌉니다.
 * @returns 저장된 사용자 작곡 곡 배열
 */
export function loadCustomSongs(): SongConfig[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_SONGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    // 최소 필수 필드(id, title, layers)를 갖춘 곡만 유효하게 통과시킴
    return parsed.filter(
      (item): item is SongConfig =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SongConfig).id === 'string' &&
        typeof (item as SongConfig).title === 'string' &&
        Array.isArray((item as SongConfig).layers)
    );
  } catch {
    return [];
  }
}

/**
 * 사용자가 직접 작곡한 곡 목록을 브라우저 localStorage에 저장하는 함수
 * @param customSongs - 저장할 커스텀 곡 배열
 */
export function saveCustomSongs(customSongs: SongConfig[]): void {
  try {
    window.localStorage.setItem(
      CUSTOM_SONGS_STORAGE_KEY,
      JSON.stringify(customSongs)
    );
  } catch {
    // 저장 용량 초과 또는 프라이빗 브라우징 제한 시 조용히 무시
  }
}
