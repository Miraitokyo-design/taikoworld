import type { ScheduleEvent } from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
import { formatShortDate } from '../../utils/scheduleUtils';

interface ScheduleBannerProps {
  /** 오늘 기준 가장 가까운 예정 연주 1건 (없으면 null) */
  nextEvent: ScheduleEvent | null;
  /** 배너 클릭/터치 시 상세 캘린더 모달을 여는 콜백 */
  onOpenCalendar: () => void;
}

/**
 * 화면 상단 정중앙에 항상 노출되는 최단 연주 일정 배너 컴포넌트
 * - 현재 언어(ja/ko)에 맞춰 날짜와 라벨을 자동 표시합니다.
 */
export function ScheduleBanner({ nextEvent, onOpenCalendar }: ScheduleBannerProps) {
  const { lang, t } = useI18n();

  return (
    <button
      type="button"
      className="schedule-banner"
      onClick={onOpenCalendar}
      aria-label={t('schedule.bannerAria')}
    >
      <span className="schedule-banner-pill">{t('schedule.bannerPill')}</span>

      {nextEvent ? (
        <span className="schedule-banner-text">
          <strong className="schedule-banner-date">
            {formatShortDate(nextEvent.date, lang)}
          </strong>{' '}
          {nextEvent.title}
        </span>
      ) : (
        <span className="schedule-banner-text">{t('schedule.bannerFallback')}</span>
      )}

      <span className="schedule-banner-arrow" aria-hidden="true">
        ▸
      </span>
    </button>
  );
}
