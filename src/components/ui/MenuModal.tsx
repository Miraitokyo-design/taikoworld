import { useEffect } from 'react';
import type { ScheduleEvent } from '../../types/content';
import { formatShortDate } from '../../utils/scheduleUtils';

interface MenuModalProps {
  /** 가장 가까운 예정 연주 1건 (메뉴 항목 보조 안내용) */
  nextEvent: ScheduleEvent | null;
  /** 전체 멤버 수 */
  memberCount: number;
  /** 등록된 타이코 곡 수 */
  songCount: number;
  /** 직접 연주 소리 ON/OFF 여부 */
  isPlayerSoundOn: boolean;
  /** NPC 합주 소리 ON/OFF 여부 */
  isNpcSoundOn: boolean;
  /** 각 메뉴 항목 실행 콜백 */
  onOpenSchedule: () => void;
  onOpenMembers: () => void;
  onOpenSongs: () => void;
  onOpenTaikoGuide: () => void;
  onOpenCircle: () => void;
  onTogglePlayerSound: () => void;
  onToggleNpcSound: () => void;
  onClose: () => void;
}

/**
 * 화면 좌측 상단 [☰ 메뉴] 버튼을 눌렀을 때 열리는 통합 메뉴바 모달 컴포넌트
 * - 연주 일정, 멤버 정보, 곡 정보/직접 작곡, 타이코 종류·지역 단체, 서클/문의, 세부 소리 설정을 제공합니다.
 */
export function MenuModal({
  nextEvent,
  memberCount,
  songCount,
  isPlayerSoundOn,
  isNpcSoundOn,
  onOpenSchedule,
  onOpenMembers,
  onOpenSongs,
  onOpenTaikoGuide,
  onOpenCircle,
  onTogglePlayerSound,
  onToggleNpcSound,
  onClose,
}: MenuModalProps) {
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

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Taiko World 메뉴"
    >
      <div
        className="modal-card menu-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">🌿 P.Taiko 3D 가상공간</div>
            <h2 className="modal-title">메뉴</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        {/* 핵심 메뉴 항목 목록 */}
        <div className="menu-list">
          <button type="button" className="menu-item-btn" onClick={onOpenSchedule}>
            <span className="menu-item-icon" aria-hidden="true">
              📅
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">연주 일정 캘린더</span>
              <span className="menu-item-desc">
                {nextEvent
                  ? `다음 연주: ${formatShortDate(nextEvent.date)} ${nextEvent.title}`
                  : '월간 공연 및 체험 일정 확인'}
              </span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          <button type="button" className="menu-item-btn" onClick={onOpenMembers}>
            <span className="menu-item-icon" aria-hidden="true">
              👥
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">멤버 정보 ({memberCount}명)</span>
              <span className="menu-item-desc">
                서클 멤버 프로필·담당 악기·연주 가능 곡 구경하기
              </span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          <button type="button" className="menu-item-btn" onClick={onOpenSongs}>
            <span className="menu-item-icon" aria-hidden="true">
              🎵
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">
                곡 정보 · 레이어 악보 / 직접 작곡 ({songCount}곡)
              </span>
              <span className="menu-item-desc">
                레이어 볼륨·강약 조절 및 나만의 타이코 곡 직접 작곡하기
              </span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          <button type="button" className="menu-item-btn" onClick={onOpenTaikoGuide}>
            <span className="menu-item-icon" aria-hidden="true">
              📖
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">타이코 종류 · 지역 단체 소개</span>
              <span className="menu-item-desc">
                어깨북·시메·피리·차파 특징과 지역 서클(転太鼓舞·鶴亀太鼓)
              </span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          <button type="button" className="menu-item-btn" onClick={onOpenCircle}>
            <span className="menu-item-icon" aria-hidden="true">
              💬
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">서클 소개 · 문의 / 인스타 QR</span>
              <span className="menu-item-desc">
                정기 연습 안내, 인스타그램 QR, 대학교 홈페이지
              </span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          {/* 세분화된 소리 설정 (직접 연주 vs NPC 합주) */}
          <div className="menu-sound-card">
            <div className="menu-sound-heading">🔊 소리 세부 설정</div>
            <div className="menu-sound-rows">
              <button
                type="button"
                className="sound-toggle-row"
                onClick={onTogglePlayerSound}
              >
                <span className="sound-toggle-info">
                  <span className="sound-toggle-name">🥁 직접 연주 소리</span>
                  <span className="sound-toggle-desc">북 체험 · 악보 미리듣기 · 작곡</span>
                </span>
                <span
                  className={`sound-switch-pill ${isPlayerSoundOn ? 'is-on' : 'is-off'}`}
                >
                  {isPlayerSoundOn ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                className="sound-toggle-row"
                onClick={onToggleNpcSound}
              >
                <span className="sound-toggle-info">
                  <span className="sound-toggle-name">👥 NPC 합주 소리</span>
                  <span className="sound-toggle-desc">공원에서 멤버들이 모였을 때 합주</span>
                </span>
                <span
                  className={`sound-switch-pill ${isNpcSoundOn ? 'is-on' : 'is-off'}`}
                >
                  {isNpcSoundOn ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
