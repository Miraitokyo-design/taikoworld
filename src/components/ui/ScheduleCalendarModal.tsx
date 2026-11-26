import { useEffect, useMemo, useState } from 'react';
import type { ScheduleEvent } from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
import {
  buildMonthCalendarCells,
  formatFullDate,
  formatShortDate,
  getTodayDateKey,
  getUpcomingEvents,
  getWeekdayLabels,
  groupEventsByDate,
  parseDateKey,
} from '../../utils/scheduleUtils';

interface ScheduleCalendarModalProps {
  /** schedule.json에서 불러온 전체 연주 일정 목록 */
  events: ScheduleEvent[];
  /** 오늘 기준 가장 가까운 예정 일정 (초기 표시 월/선택 날짜 결정용) */
  nextEvent: ScheduleEvent | null;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 상단 일정 배너를 눌렀을 때 열리는 상세 월간 캘린더 모달 컴포넌트
 */
export function ScheduleCalendarModal({
  events,
  nextEvent,
  onBackToMenu,
  onClose,
}: ScheduleCalendarModalProps) {
  const { lang, t } = useI18n();
  const weekdayLabels = getWeekdayLabels(lang);

  const todayKey = useMemo(() => getTodayDateKey(), []);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(events, todayKey),
    [events, todayKey]
  );

  const initialDateKey = nextEvent ? nextEvent.date : todayKey;
  const initialParsed = parseDateKey(initialDateKey);

  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonthIndex, setViewMonthIndex] = useState(initialParsed.monthIndex);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  const calendarCells = useMemo(
    () => buildMonthCalendarCells(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIndex(11);
    } else {
      setViewMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIndex(0);
    } else {
      setViewMonthIndex((m) => m + 1);
    }
  };

  const handleJumpToEvent = (event: ScheduleEvent) => {
    const parsed = parseDateKey(event.date);
    setViewYear(parsed.year);
    setViewMonthIndex(parsed.monthIndex);
    setSelectedDateKey(event.date);
  };

  const selectedDayEvents = eventsByDate[selectedDateKey] ?? [];

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('schedule.dialogAria')}
    >
      <div
        className="modal-card schedule-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">{t('schedule.kicker')}</div>
            <h2 className="modal-title">{t('schedule.title')}</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={onBackToMenu}
              >
                {t('common.backToMenu')}
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label={t('schedule.closeAria')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 월 이동 네비게이션 */}
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label={t('schedule.prevMonthAria')}
          >
            ◀
          </button>
          <div className="calendar-month-label">
            {t('schedule.monthFormat', {
              year: viewYear,
              month: viewMonthIndex + 1,
            })}
          </div>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label={t('schedule.nextMonthAria')}
          >
            ▶
          </button>
        </div>

        {/* 요일 헤더 (일 ~ 토) */}
        <div className="calendar-weekdays">
          {weekdayLabels.map((label, index) => (
            <div
              key={label}
              className={`calendar-weekday ${
                index === 0 ? 'is-sun' : index === 6 ? 'is-sat' : ''
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 월간 날짜 그리드 */}
        <div className="calendar-grid">
          {calendarCells.map((cell, index) => {
            if (!cell.dateKey || cell.day === null) {
              return <div key={`empty-${index}`} className="calendar-cell is-empty" />;
            }

            const hasEvent = Boolean(eventsByDate[cell.dateKey]?.length);
            const isSelected = cell.dateKey === selectedDateKey;
            const isToday = cell.dateKey === todayKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                className={[
                  'calendar-cell',
                  cell.weekday === 0 ? 'is-sun' : '',
                  cell.weekday === 6 ? 'is-sat' : '',
                  hasEvent ? 'has-event' : '',
                  isSelected ? 'is-selected' : '',
                  isToday ? 'is-today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedDateKey(cell.dateKey!)}
              >
                <span className="calendar-day-num">{cell.day}</span>
                {hasEvent && <span className="calendar-event-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {/* 선택한 날짜의 상세 공연 안내 */}
        <div className="schedule-detail-section">
          <div className="schedule-detail-date">
            {formatFullDate(selectedDateKey, lang)}
          </div>

          {selectedDayEvents.length > 0 ? (
            <div className="schedule-event-list">
              {selectedDayEvents.map((item) => (
                <div key={item.id} className="schedule-event-card">
                  <div className="schedule-event-title">{item.title}</div>
                  <div className="schedule-event-meta">
                    <span>⏰ {item.time}</span>
                    <span>📍 {item.place}</span>
                  </div>
                  {item.note && <p className="schedule-event-note">{item.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="schedule-empty-text">{t('schedule.emptyDay')}</p>
          )}
        </div>

        {/* 다가오는 전체 연주 일정 빠른 이동 칩 목록 */}
        {upcomingEvents.length > 0 && (
          <div className="schedule-upcoming-section">
            <div className="schedule-upcoming-heading">
              {t('schedule.upcomingHeading')}
            </div>
            <div className="schedule-upcoming-chips">
              {upcomingEvents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`schedule-upcoming-chip ${
                    selectedDateKey === item.date ? 'is-active' : ''
                  }`}
                  onClick={() => handleJumpToEvent(item)}
                >
                  <span className="schedule-chip-date">
                    {formatShortDate(item.date, lang)}
                  </span>
                  <span className="schedule-chip-title">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
