import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import uiTranslations from '../locales/ui.json';

/**
 * 지원 언어 코드 타입
 * - 추후 영어(en) 추가 시 여기에 'en'을 더하고 src/locales/*.json 각 항목에 "en": "..."를 넣으면 됩니다.
 */
export type SupportedLanguage = 'ja' | 'ko';

/** 일본어·한국어(·향후 영어)를 한 객체 안에 나란히 보관하는 병렬 번역 타입 */
export interface LocalizedText {
  ja: string;
  ko: string;
  en?: string;
}

/** 메뉴바·입장 화면에서 선택 가능한 언어 버튼 메타데이터 */
export interface LanguageOption {
  id: SupportedLanguage;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'ja', nativeLabel: '日本語', flag: '🇯🇵' },
  { id: 'ko', nativeLabel: '한국어', flag: '🇰🇷' },
  // 추후 영어 추가 시 아래 주석을 해제하고 src/locales/*.json에 "en" 필드를 채우세요:
  // { id: 'en', nativeLabel: 'English', flag: '🇺🇸' },
] as const;

/** 첫 접속 시 기본 적용되는 언어 (일본어) */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ja';

/** 사용자가 고른 언어를 브라우저에 기억해 두는 저장 키 */
const LANGUAGE_STORAGE_KEY = 'taikoworld_lang_v1';

interface I18nContextValue {
  /** 현재 활성 언어 ('ja' | 'ko') */
  lang: SupportedLanguage;
  /** 언어 변경 및 localStorage 자동 저장 함수 */
  setLang: (nextLang: SupportedLanguage) => void;
  /** src/locales/ui.json에서 경로('menu.title' 등)로 문구를 꺼내고 {변수}를 치환하는 함수 */
  t: (path: string, vars?: Record<string, string | number>) => string;
  /** { ja, ko } 객체에서 현재 언어 문자열을 꺼내는 보조 함수 */
  pick: (entry: Partial<LocalizedText> | undefined, fallback?: string) => string;
  /** 선택 가능한 언어 목록 */
  languages: readonly LanguageOption[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** 저장된 언어가 있으면 복원하고, 첫 접속이면 일본어('ja')를 반환하는 보조 함수 */
function loadInitialLanguage(): SupportedLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'ja' || saved === 'ko') {
      return saved;
    }
  } catch {
    // 브라우저 저장소 접근 제한 환경은 기본값 사용
  }
  return DEFAULT_LANGUAGE;
}

/** 점('.') 구분 경로로 중첩 JSON 사전에서 { ja, ko } 번역 객체를 찾아오는 내부 함수 */
function resolveUiEntry(path: string): Partial<LocalizedText> | null {
  const segments = path.split('.');
  let cursor: unknown = uiTranslations;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  if (
    cursor &&
    typeof cursor === 'object' &&
    ('ja' in cursor || 'ko' in cursor)
  ) {
    return cursor as Partial<LocalizedText>;
  }
  return null;
}

/** 문자열 내부의 {key} 치환자를 실제 값으로 바꾸는 내부 함수 */
function formatTemplate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

/**
 * Taiko World 전역 다국어(i18n) 상태를 공급하는 Provider 컴포넌트
 * - 기본값은 'ja'(일본어)이며, 메뉴에서 한국어('ko')로 바꾸면 즉시 전 화면이 전환되고 localStorage에 저장됩니다.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>(() => loadInitialLanguage());

  // <html>의 lang 속성을 현재 선택 언어에 맞춰 동기화 (스크린리더·브라우저 폰트 렌더링 최적화)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((nextLang: SupportedLanguage) => {
    setLangState(nextLang);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // 무시
    }
  }, []);

  const pick = useCallback(
    (entry: Partial<LocalizedText> | undefined, fallback = ''): string => {
      if (!entry) return fallback;
      return entry[lang] ?? entry[DEFAULT_LANGUAGE] ?? entry.ko ?? fallback;
    },
    [lang]
  );

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const entry = resolveUiEntry(path);
      const raw = entry
        ? entry[lang] ?? entry[DEFAULT_LANGUAGE] ?? entry.ko ?? path
        : path;
      return formatTemplate(raw, vars);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t,
      pick,
      languages: LANGUAGE_OPTIONS,
    }),
    [lang, setLang, t, pick]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * 컴포넌트 내부에서 현재 언어와 번역 함수 t를 꺼내 쓰는 커스텀 Hook
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}
