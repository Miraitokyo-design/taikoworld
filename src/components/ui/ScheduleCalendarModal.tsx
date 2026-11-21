import { useEffect, useMemo, useState } from 'react';
import type { ScheduleEvent } from '../../types/content';
import {
  WEEKDAY_LABELS,
  buildMonthCalendarCells,
  formatFullDate,
  formatShortDate,
  getTodayDateKey,
  getUpcomingEvents,
  groupEventsByDate,
  parseDateKey,
} from '../../utils/scheduleUtils';

interface ScheduleCalendarModalProps {
  /** schedule.json에서 불러온 전체 연주 일정 목록 */
  events: ScheduleEvent[];
  /** 오늘 기준 가장 가까운 예정 일정 (초기 표시 월/선택 날짜 결정용) */
  nextEvent: ScheduleEvent | null;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 상단 일정 배너를 눌렀을 때 열리는 상세 월간 캘린더 모달 컴포넌트
 * - 연주 예정 일자에 마커(점/강조)를 표시하고, 날짜를 누르면 시간·장소·안내 메모를 보여줍니다.
 * - 다가오는 일정 바로가기 목록을 함께 제공해 다른 달에 있는 공연도 한 번에 점프할 수 있습니다.
 */
export function ScheduleCalendarModal({
  events,
  nextEvent,
  onClose,
}: ScheduleCalendarModalProps) {
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(events, todayKey),
    [events, todayKey]
  );

  // 초기 표시 월과 선택 날짜: 가장 가까운 예정 공연이 있으면 그 날짜로, 없으면 오늘로 시작
  const initialDateKey = nextEvent ? nextEvent.date : todayKey;
  const initialParsed = parseDateKey(initialDateKey);

  // useState: 현재 보고 있는 달력 연/월과 사용자가 선택한 날짜를 기억
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonthIndex, setViewMonthIndex] = useState(initialParsed.monthIndex);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  // useMemo: 연도나 월이 바뀔 때만 달력 칸 배열을 다시 계산해 불필요한 연산 방지
  const calendarCells = useMemo(
    () => buildMonthCalendarCells(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  // ESC 키로 모달 닫기 지원
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

  /** 이전 달로 이동하는 핸들러 */
  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIndex(11);
    } else {
      setViewMonthIndex((m) => m - 1);
    }
  };

  /** 다음 달로 이동하는 핸들러 */
  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIndex(0);
    } else {
      setViewMonthIndex((m) => m + 1);
    }
  };

  /** 특정 공연 일정으로 달력과 선택 날짜를 한 번에 이동하는 핸들러 */
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
      aria-label="연주 일정 캘린더"
    >
      {/* 카드 내부 클릭 시 배경 닫기 이벤트로 전파되지 않도록 차단 */}
      <div
        className="modal-card schedule-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div>
            <div className="modal-kicker">🥁 P.Taiko 공연 &amp; 체험 안내</div>
            <h2 className="modal-title">연주 일정 캘린더</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="일정 창 닫기"
          >
            ✕
          </button>
        </div>

        {/* 월 이동 네비게이션 */}
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="이전 달"
          >
            ◀
          </button>
          <div className="calendar-month-label">
            {viewYear}년 {viewMonthIndex + 1}월
          </div>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>

        {/* 요일 헤더 (일 ~ 토) */}
        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label, index) => (
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
                {/* schedule.json에 연주가 예정된 날짜에는 눈에 띄는 마커 점 표시 */}
                {hasEvent && <span className="calendar-event-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {/* 선택한 날짜의 상세 공연 안내 */}
        <div className="schedule-detail-section">
          <div className="schedule-detail-date">{formatFullDate(selectedDateKey)}</div>

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
            <p className="schedule-empty-text">
              선택한 날짜에는 예정된 연주 일정이 없습니다. 빨간 점이 표시된 날짜나 아래
              다가오는 일정을 눌러 확인해 보세요!
            </p>
          )}
        </div>

        {/* 다가오는 전체 연주 일정 빠른 이동 칩 목록 */}
        {upcomingEvents.length > 0 && (
          <div className="schedule-upcoming-section">
            <div className="schedule-upcoming-heading">다가오는 연주 일정 바로가기</div>
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
                  <span className="schedule-chip-date">{formatShortDate(item.date)}</span>
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
