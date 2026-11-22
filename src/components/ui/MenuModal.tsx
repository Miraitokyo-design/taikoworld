import { useEffect } from 'react';
import type {
  ScheduleEvent,
  SeasonThemeConfig,
  WorldEnvironmentConfig,
} from '../../types/content';
import { formatShortDate } from '../../utils/scheduleUtils';

interface MenuModalProps {
  /** 가장 가까운 예정 연주 1건 (메뉴 항목 보조 안내용) */
  nextEvent: ScheduleEvent | null;
  /** 등록된 타이코 곡 수 */
  songCount: number;
  /** 사용자가 선택할 수 있는 기본 배경 테마 목록 (잔디 공원, 연습실, 눈오는 들판 등) */
  environments: WorldEnvironmentConfig[];
  /** 현재 선택된 기본 배경 테마 ID */
  selectedEnvironmentId: string;
  /** 운영자가 일괄 배포 중인 시즌 테마 (평상시에는 id === 'default') */
  deployedSeasonTheme: SeasonThemeConfig;
  /** 기본 배경 테마 변경 콜백 */
  onSelectEnvironment: (environmentId: string) => void;
  /** 직접 연주 소리 ON/OFF 여부 */
  isPlayerSoundOn: boolean;
  /** NPC 합주 소리 ON/OFF 여부 */
  isNpcSoundOn: boolean;
  /** 직접 연주 볼륨 (0.0 ~ 1.0) */
  playerVolume: number;
  /** NPC 합주 볼륨 (0.0 ~ 1.0) */
  npcVolume: number;
  /** 각 메뉴 항목 실행 콜백 */
  onOpenSchedule: () => void;
  onOpenMembers: () => void;
  onOpenSongs: () => void;
  onOpenTaikoGuide: () => void;
  onOpenCircle: () => void;
  onTogglePlayerSound: () => void;
  onToggleNpcSound: () => void;
  onChangePlayerVolume: (volume: number) => void;
  onChangeNpcVolume: (volume: number) => void;
  onClose: () => void;
}

/**
 * 화면 좌측 상단 [☰ 메뉴] 버튼을 눌렀을 때 열리는 통합 메뉴바 모달 컴포넌트
 * - 연주 일정, 멤버 정보, 곡 정보/직접 작곡, 타이코 종류·지역 단체, 서클/문의,
 *   기본 배경 테마 변경(잔디 공원·연습실·눈오는 들판 등), 세부 소리/볼륨 설정을 제공합니다.
 * - 시즌 테마(크리스마스·졸업·입학·오봉 등)는 운영자 일괄 배포로 적용되므로 메뉴에서 제외합니다.
 */
export function MenuModal({
  nextEvent,
  songCount,
  environments,
  selectedEnvironmentId,
  deployedSeasonTheme,
  onSelectEnvironment,
  isPlayerSoundOn,
  isNpcSoundOn,
  playerVolume,
  npcVolume,
  onOpenSchedule,
  onOpenMembers,
  onOpenSongs,
  onOpenTaikoGuide,
  onOpenCircle,
  onTogglePlayerSound,
  onToggleNpcSound,
  onChangePlayerVolume,
  onChangeNpcVolume,
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

  const effectivePlayerOn = isPlayerSoundOn && playerVolume > 0;
  const effectiveNpcOn = isNpcSoundOn && npcVolume > 0;

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
              <span className="menu-item-title">멤버 정보</span>
              <span className="menu-item-desc">
                캐릭터 일러스트로 서클 멤버 프로필 구경하기
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
                어깨북·시메·피리·차파 특징과 지역 서클(転太鼓舞·鶴亀会)
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

          {/* 기본 배경 테마 선택 (잔디 공원 · 연습실 · 눈오는 들판 등) */}
          <div className="menu-sound-card">
            <div className="menu-theme-head">
              <span className="menu-sound-heading" style={{ marginBottom: 0 }}>
                🗺️ 배경 테마
              </span>
              {deployedSeasonTheme.id !== 'default' && (
                <span className="menu-theme-status">
                  {deployedSeasonTheme.emoji} {deployedSeasonTheme.name} 진행 중
                </span>
              )}
            </div>
            <div className="menu-theme-grid">
              {environments.map((env) => (
                <button
                  key={env.id}
                  type="button"
                  className={`menu-theme-pill ${
                    selectedEnvironmentId === env.id ? 'is-active' : ''
                  }`}
                  onClick={() => onSelectEnvironment(env.id)}
                >
                  {env.emoji} {env.name}
                </button>
              ))}
            </div>
          </div>

          {/* 세분화된 소리 & 볼륨 설정 (직접 연주 vs NPC 합주) */}
          <div className="menu-sound-card">
            <div className="menu-sound-heading">🔊 소리 · 볼륨 설정</div>
            <div className="menu-sound-rows">
              <div className="sound-channel-box">
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
                    className={`sound-switch-pill ${effectivePlayerOn ? 'is-on' : 'is-off'}`}
                  >
                    {effectivePlayerOn ? 'ON' : 'OFF'}
                  </span>
                </button>
                <label className="sound-volume-row">
                  <span className="sound-volume-label">볼륨</span>
                  <input
                    type="range"
                    className="sound-volume-slider"
                    min={0}
                    max={100}
                    step={5}
                    value={isPlayerSoundOn ? Math.round(playerVolume * 100) : 0}
                    onChange={(e) => onChangePlayerVolume(Number(e.target.value) / 100)}
                  />
                  <span className="sound-volume-pct">
                    {isPlayerSoundOn ? Math.round(playerVolume * 100) : 0}%
                  </span>
                </label>
              </div>

              <div className="sound-channel-box">
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
                    className={`sound-switch-pill ${effectiveNpcOn ? 'is-on' : 'is-off'}`}
                  >
                    {effectiveNpcOn ? 'ON' : 'OFF'}
                  </span>
                </button>
                <label className="sound-volume-row">
                  <span className="sound-volume-label">볼륨</span>
                  <input
                    type="range"
                    className="sound-volume-slider"
                    min={0}
                    max={100}
                    step={5}
                    value={isNpcSoundOn ? Math.round(npcVolume * 100) : 0}
                    onChange={(e) => onChangeNpcVolume(Number(e.target.value) / 100)}
                  />
                  <span className="sound-volume-pct">
                    {isNpcSoundOn ? Math.round(npcVolume * 100) : 0}%
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
