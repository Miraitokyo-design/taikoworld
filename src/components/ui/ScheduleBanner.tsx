import type { ScheduleEvent } from '../../types/content';
import { formatShortDate } from '../../utils/scheduleUtils';

interface ScheduleBannerProps {
  /** 오늘 기준 가장 가까운 예정 연주 1건 (없으면 null) */
  nextEvent: ScheduleEvent | null;
  /** 배너 클릭/터치 시 상세 캘린더 모달을 여는 콜백 */
  onOpenCalendar: () => void;
}

/**
 * 화면 상단 정중앙에 항상 노출되는 최단 연주 일정 배너 컴포넌트
 * - "다음 연주" 라벨을 함께 보여줘 처음 방문한 사람도 다가오는 공연 일정임을 한눈에 알 수 있습니다.
 * @param props.nextEvent - 가장 가까운 예정 연주 데이터
 * @param props.onOpenCalendar - 캘린더 열기 핸들러
 */
export function ScheduleBanner({ nextEvent, onOpenCalendar }: ScheduleBannerProps) {
  return (
    <button
      type="button"
      className="schedule-banner"
      onClick={onOpenCalendar}
      aria-label="연주 일정 상세 캘린더 열기"
    >
      <span className="schedule-banner-pill">📅 다음 연주</span>

      {nextEvent ? (
        <span className="schedule-banner-text">
          <strong className="schedule-banner-date">
            {formatShortDate(nextEvent.date)}
          </strong>{' '}
          {nextEvent.title}
        </span>
      ) : (
        <span className="schedule-banner-text">예정된 연주 일정 보기</span>
      )}

      <span className="schedule-banner-arrow" aria-hidden="true">
        ▸
      </span>
    </button>
  );
}
