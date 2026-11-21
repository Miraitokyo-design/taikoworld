import { useEffect, useState } from 'react';
import type { ScheduleEvent } from '../types/content';
import { loadScheduleEvents } from '../utils/scheduleSheetLoader';
import type { ScheduleSource } from '../utils/scheduleSheetLoader';

/**
 * 연주 일정 데이터를 관리하는 커스텀 React Hook
 * - 초기 렌더링에서는 기본 내장 데이터(schedule.json)를 즉시 보여줘 지연이 없게 하고,
 *   환경변수(VITE_SCHEDULE_CSV_URL)가 설정되어 있으면 백그라운드에서 구글 스프레드시트 최신 일정을 불러와 교체합니다.
 * @param fallbackEvents - 기본 schedule.json 일정 배열
 * @returns { events, source } 최신 일정 배열과 출처('local' | 'sheet')
 */
export function useScheduleEvents(fallbackEvents: ScheduleEvent[]): {
  events: ScheduleEvent[];
  source: ScheduleSource;
} {
  // useState: 기본 일정으로 먼저 화면을 그린 뒤, 구글 시트 응답이 오면 최신 일정으로 갱신
  const [events, setEvents] = useState<ScheduleEvent[]>(fallbackEvents);
  const [source, setSource] = useState<ScheduleSource>('local');

  // useEffect: 앱이 처음 열릴 때 1회 구글 시트 CSV에서 최신 일정을 비동기로 조회
  useEffect(() => {
    let isCancelled = false;
    const csvUrl = import.meta.env.VITE_SCHEDULE_CSV_URL;

    async function fetchLatestSchedule() {
      const result = await loadScheduleEvents(csvUrl, fallbackEvents);
      if (isCancelled) return;
      setEvents(result.events);
      setSource(result.source);
    }

    void fetchLatestSchedule();

    // 컴포넌트가 사라진 뒤 늦게 도착한 응답으로 상태를 바꾸지 않도록 정리
    return () => {
      isCancelled = true;
    };
  }, [fallbackEvents]);

  return { events, source };
}
