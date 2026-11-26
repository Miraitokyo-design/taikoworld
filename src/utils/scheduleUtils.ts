import type { ScheduleEvent } from '../types/content';
import type { SupportedLanguage } from '../i18n/I18nContext';

/** 요일 언어별 표기 (일요일 = 0 ~ 토요일 = 6) */
export const WEEKDAY_LABELS_BY_LANG: Record<
  SupportedLanguage,
  readonly [string, string, string, string, string, string, string]
> = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};

/** 하위 호환용 기본 요일 배열 */
export const WEEKDAY_LABELS = WEEKDAY_LABELS_BY_LANG.ko;

/** 현재 언어에 맞는 7요일 라벨 배열 반환 */
export function getWeekdayLabels(lang: SupportedLanguage = 'ja') {
  return WEEKDAY_LABELS_BY_LANG[lang] ?? WEEKDAY_LABELS_BY_LANG.ja;
}

/** 월간 캘린더 한 칸의 데이터 타입 */
export interface CalendarCell {
  /** YYYY-MM-DD 형식 날짜 키 (빈 칸이면 null) */
  dateKey: string | null;
  /** 화면에 표시할 일자 숫자 (1 ~ 31, 빈 칸이면 null) */
  day: number | null;
  /** 요일 인덱스 (0: 일, 6: 토) */
  weekday: number;
}

/**
 * 오늘 날짜를 사용자 로컬 시간대(한국 KST 등) 기준 YYYY-MM-DD 문자열로 반환하는 함수
 * - toISOString()은 UTC(영국 표준시) 기준이라 한국 자정~오전 9시 사이에 어제 날짜로 어긋날 수 있어
 *   getFullYear / getMonth / getDate로 안전하게 조합합니다.
 * @param now - 기준 날짜 객체 (기본값: 현재 시각)
 * @returns YYYY-MM-DD 문자열
 */
export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 문자열을 연/월(0~11)/일 숫자로 안전하게 분리하는 함수
 * @param dateKey - YYYY-MM-DD 형식 문자열
 * @returns { year, monthIndex, day }
 */
export function parseDateKey(dateKey: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  return {
    year: Number(yearStr),
    monthIndex: Number(monthStr) - 1,
    day: Number(dayStr),
  };
}

/**
 * 오늘 이후(오늘 포함) 예정된 연주 일정만 날짜·시간 순으로 정렬해 반환하는 함수
 * @param events - schedule.json 전체 일정 목록
 * @param todayKey - 기준 오늘 날짜 (YYYY-MM-DD)
 * @returns 다가오는 일정 배열
 */
export function getUpcomingEvents(
  events: ScheduleEvent[],
  todayKey: string = getTodayDateKey()
): ScheduleEvent[] {
  return [...events]
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/**
 * 오늘 기준 가장 가까운 예정 연주 1건을 반환하는 함수 (상단 배너 표시용)
 * @param events - schedule.json 전체 일정 목록
 * @param todayKey - 기준 오늘 날짜 (YYYY-MM-DD)
 * @returns 가장 빠른 예정 일정 또는 없으면 null
 */
export function getNextUpcomingEvent(
  events: ScheduleEvent[],
  todayKey: string = getTodayDateKey()
): ScheduleEvent | null {
  const upcoming = getUpcomingEvents(events, todayKey);
  return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * 상단 배너용 짧은 날짜 문자열로 변환하는 함수 (예: "2026-12-05" -> "12/5(토)")
 * @param dateKey - YYYY-MM-DD 문자열
 * @returns "M/D(요일)" 형식 문자열
 */
export function formatShortDate(
  dateKey: string,
  lang: SupportedLanguage = 'ja'
): string {
  const { year, monthIndex, day } = parseDateKey(dateKey);
  const dateObj = new Date(year, monthIndex, day);
  const weekday = getWeekdayLabels(lang)[dateObj.getDay()];
  return `${monthIndex + 1}/${day}(${weekday})`;
}

/**
 * 상세 카드용 전체 날짜 문자열로 변환하는 함수
 * - ja: "2026年12月5日 (土)" / ko: "2026년 12월 5일 (토)"
 */
export function formatFullDate(
  dateKey: string,
  lang: SupportedLanguage = 'ja'
): string {
  const { year, monthIndex, day } = parseDateKey(dateKey);
  const dateObj = new Date(year, monthIndex, day);
  const weekday = getWeekdayLabels(lang)[dateObj.getDay()];
  if (lang === 'ko') {
    return `${year}년 ${monthIndex + 1}월 ${day}일 (${weekday})`;
  }
  return `${year}年${monthIndex + 1}月${day}日 (${weekday})`;
}

/**
 * 전체 일정 배열을 날짜별(YYYY-MM-DD)로 묶어 빠르게 조회할 수 있는 객체로 변환하는 함수
 * @param events - schedule.json 전체 일정 목록
 * @returns 날짜 키 -> 해당 날짜의 일정 배열 맵
 */
export function groupEventsByDate(
  events: ScheduleEvent[]
): Record<string, ScheduleEvent[]> {
  const grouped: Record<string, ScheduleEvent[]> = {};

  for (const event of events) {
    if (!grouped[event.date]) {
      grouped[event.date] = [];
    }
    grouped[event.date].push(event);
  }

  // 같은 날 여러 공연이 있을 경우 시작 시간 순 정렬
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.time.localeCompare(b.time));
  }

  return grouped;
}

/**
 * 특정 연도/월의 7열(일~토) 월간 캘린더 셀 배열을 생성하는 함수
 * @param year - 연도 (예: 2026)
 * @param monthIndex - 월 인덱스 (0 = 1월 ~ 11 = 12월)
 * @returns 달력 칸 배열 (앞/뒤 빈 칸 포함)
 */
export function buildMonthCalendarCells(
  year: number,
  monthIndex: number
): CalendarCell[] {
  // 해당 월의 1일 요일(0~6)과 마지막 일자(28~31) 계산
  const firstDayWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthStr = String(monthIndex + 1).padStart(2, '0');

  const cells: CalendarCell[] = [];

  // 1일 앞쪽의 빈 요일 칸 채우기
  for (let i = 0; i < firstDayWeekday; i++) {
    cells.push({ dateKey: null, day: null, weekday: i });
  }

  // 1일 ~ 말일 날짜 칸 생성
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const weekday = (firstDayWeekday + day - 1) % 7;
    cells.push({
      dateKey: `${year}-${monthStr}-${dayStr}`,
      day,
      weekday,
    });
  }

  // 마지막 주가 7칸으로 떨어지도록 뒤쪽 빈 칸 채우기
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, weekday: cells.length % 7 });
  }

  return cells;
}
