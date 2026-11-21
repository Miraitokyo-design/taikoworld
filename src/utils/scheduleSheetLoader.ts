import type { ScheduleEvent } from '../types/content';

/** 일정 데이터를 어디서 불러왔는지 나타내는 출처 타입 */
export type ScheduleSource = 'local' | 'sheet';

/**
 * RFC-4180 규칙에 맞춰 CSV 텍스트를 2차원 문자열 배열(행 x 열)로 파싱하는 함수
 * - 제목이나 안내 메모 안에 쉼표(,)나 줄바꿈이 들어가 따옴표("...")로 감싸진 셀도 깨지지 않고 정확히 분리합니다.
 * @param csvText - 구글 스프레드시트에서 내려받은 원본 CSV 문자열
 * @returns 행(row)과 열(column)로 분리된 2차원 배열
 */
export function parseCsvRows(csvText: string): string[][] {
  // 윈도우/엑셀 등에서 붙을 수 있는 UTF-8 BOM(보이지 않는 첫 글자) 제거
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        // 따옴표 안에서 ""는 문자 " 하나로 해석
        currentCell += '"';
        i += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\r' && nextChar === '\n') {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // 마지막 줄에 줄바꿈이 없이 끝난 경우 남은 셀 반영
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 구글 시트에서 내려오는 다양한 날짜 표기를 표준 YYYY-MM-DD 형식으로 통일하는 함수
 * - 예: "2026. 12. 5", "2026/12/5", "2026-12-05" -> 모두 "2026-12-05"로 변환
 * @param rawDate - 시트의 날짜 셀 원본 문자열
 * @returns 정규화된 YYYY-MM-DD 문자열 (유효하지 않으면 null)
 */
export function normalizeSheetDate(rawDate: string): string | null {
  const match = rawDate.trim().match(/^(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})\.?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * 구글 시트의 시간 표기(예: "14:00:00", "9:30")를 깔끔한 HH:mm 형식으로 정리하는 함수
 * @param rawTime - 시트의 시간 셀 원본 문자열
 * @returns 정리된 시간 문자열
 */
export function normalizeSheetTime(rawTime: string): string {
  const trimmed = rawTime.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return trimmed;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/**
 * CSV 2차원 배열을 ScheduleEvent 배열로 변환하는 함수
 * - 한국어 헤더(날짜/시간/제목/장소/메모)와 영어 헤더(date/time/title/place/note) 모두 자동 인식합니다.
 * @param csvText - 구글 시트 CSV 텍스트
 * @returns 파싱된 연주 일정 목록
 */
export function parseScheduleCsv(csvText: string): ScheduleEvent[] {
  const rows = parseCsvRows(csvText).filter((row) =>
    row.some((cell) => cell.length > 0)
  );
  if (rows.length < 2) return [];

  // 첫 번째 행(헤더)에서 각 컬럼 위치를 자동 탐색
  const headerRow = rows[0].map((cell) => cell.toLowerCase().replace(/\s+/g, ''));

  const findColumnIndex = (candidates: string[], fallbackIndex: number): number => {
    const found = headerRow.findIndex((header) => candidates.includes(header));
    return found >= 0 ? found : fallbackIndex;
  };

  const dateCol = findColumnIndex(['date', '날짜', '일자', '공연일'], 0);
  const timeCol = findColumnIndex(['time', '시간', '시작시간'], 1);
  const titleCol = findColumnIndex(['title', '제목', '공연명', '일정명', '행사명'], 2);
  const placeCol = findColumnIndex(['place', 'location', '장소', '위치'], 3);
  const noteCol = findColumnIndex(['note', 'memo', '설명', '메모', '안내', '비고'], 4);

  const parsedEvents: ScheduleEvent[] = [];

  // 2번째 행부터 실제 일정 데이터로 변환
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const normalizedDate = normalizeSheetDate(row[dateCol] ?? '');
    const title = (row[titleCol] ?? '').trim();

    // 날짜나 제목이 비어 있거나 잘못된 행은 건너뛰어 달력이 깨지지 않게 보호
    if (!normalizedDate || !title) continue;

    parsedEvents.push({
      id: `sheet-${rowIndex}`,
      date: normalizedDate,
      time: normalizeSheetTime(row[timeCol] ?? ''),
      title,
      place: (row[placeCol] ?? '').trim(),
      note: (row[noteCol] ?? '').trim(),
    });
  }

  return parsedEvents;
}

/**
 * 구글 스프레드시트 공개 CSV 주소에서 최신 연주 일정을 불러오는 비동기 함수
 * - 주소가 비어 있거나, 네트워크 오류/잘못된 형식일 경우 기본 schedule.json으로 안전하게 폴백합니다.
 * @param csvUrl - 환경변수(VITE_SCHEDULE_CSV_URL)에 설정된 구글 시트 CSV URL
 * @param fallbackEvents - 연결 실패 시 대신 표시할 기본 일정 배열
 * @returns { events, source } 일정 배열과 데이터 출처
 */
export async function loadScheduleEvents(
  csvUrl: string | undefined,
  fallbackEvents: ScheduleEvent[]
): Promise<{ events: ScheduleEvent[]; source: ScheduleSource }> {
  const trimmedUrl = csvUrl?.trim();
  if (!trimmedUrl) {
    return { events: fallbackEvents, source: 'local' };
  }

  // 안전성 검사: http/https 주소가 아니면 외부 요청을 보내지 않고 기본 일정 사용
  if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
    return { events: fallbackEvents, source: 'local' };
  }

  // 느린 모바일 네트워크에서 무한 대기하지 않도록 6초 타임아웃 설정
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(trimmedUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    // 구글 시트가 비공개 상태라 로그인 HTML 페이지를 돌려준 경우 감지
    if (csvText.trimStart().startsWith('<!DOCTYPE') || csvText.trimStart().startsWith('<html')) {
      throw new Error('CSV 대신 HTML 페이지가 반환되었습니다. 웹에 게시(CSV) 주소를 확인해 주세요.');
    }

    const sheetEvents = parseScheduleCsv(csvText);
    if (sheetEvents.length === 0) {
      return { events: fallbackEvents, source: 'local' };
    }

    return { events: sheetEvents, source: 'sheet' };
  } catch (error) {
    console.warn('[Schedule] 구글 시트 일정을 불러오지 못해 기본 schedule.json을 표시합니다:', error);
    return { events: fallbackEvents, source: 'local' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
