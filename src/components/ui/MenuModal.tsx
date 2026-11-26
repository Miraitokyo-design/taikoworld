import { useEffect } from 'react';
import type {
  ScheduleEvent,
  SeasonThemeConfig,
  WorldEnvironmentConfig,
} from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
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
 * - 언어 전환(日本語 / 한국어), 연주 일정, 멤버 정보, 곡 정보/직접 작곡, 타이코 종류·지역 단체,
 *   서클/문의, 기본 배경 테마 변경, 세부 소리/볼륨 설정을 제공합니다.
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
  const { lang, setLang, t, languages } = useI18n();

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
      aria-label={t('menu.ariaLabel')}
    >
      <div
        className="modal-card menu-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">{t('menu.kicker')}</div>
            <h2 className="modal-title">{t('menu.title')}</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('menu.closeAria')}
          >
            ✕
          </button>
        </div>

        {/* 핵심 메뉴 항목 목록 (다국어 사전 src/locales/ui.json에서 일괄 관리) */}
        <div className="menu-list">
          <button type="button" className="menu-item-btn" onClick={onOpenSchedule}>
            <span className="menu-item-icon" aria-hidden="true">
              📅
            </span>
            <span className="menu-item-body">
              <span className="menu-item-title">{t('menu.scheduleTitle')}</span>
              <span className="menu-item-desc">
                {nextEvent
                  ? t('menu.scheduleNextPrefix', {
                      date: formatShortDate(nextEvent.date, lang),
                      title: nextEvent.title,
                    })
                  : t('menu.scheduleFallbackDesc')}
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
              <span className="menu-item-title">{t('menu.membersTitle')}</span>
              <span className="menu-item-desc">{t('menu.membersDesc')}</span>
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
                {t('menu.songsTitle')} {t('menu.songsCount', { count: songCount })}
              </span>
              <span className="menu-item-desc">{t('menu.songsDesc')}</span>
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
              <span className="menu-item-title">{t('menu.taikoGuideTitle')}</span>
              <span className="menu-item-desc">{t('menu.taikoGuideDesc')}</span>
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
              <span className="menu-item-title">{t('menu.circleTitle')}</span>
              <span className="menu-item-desc">{t('menu.circleDesc')}</span>
            </span>
            <span className="menu-item-arrow" aria-hidden="true">
              ▸
            </span>
          </button>

          {/* 언어 전환 카드 (기본 日本語 / 한국어 전환, 추후 영어 확장 대응) */}
          <div className="menu-sound-card">
            <div className="menu-sound-heading">{t('language.heading')}</div>
            <div className="menu-theme-grid">
              {languages.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`menu-theme-pill ${lang === option.id ? 'is-active' : ''}`}
                  onClick={() => setLang(option.id)}
                >
                  {option.flag} {option.nativeLabel}
                </button>
              ))}
            </div>
          </div>

          {/* 기본 배경 테마 선택 (잔디 공원 · 연습실 · 눈오는 들판 · 노을 광장) */}
          <div className="menu-sound-card">
            <div className="menu-theme-head">
              <span className="menu-sound-heading" style={{ marginBottom: 0 }}>
                {t('menu.environmentHeading')}
              </span>
              {deployedSeasonTheme.id !== 'default' && (
                <span className="menu-theme-status">
                  {t('menu.seasonInProgress', {
                    emoji: deployedSeasonTheme.emoji,
                    name: deployedSeasonTheme.name,
                  })}
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
            <div className="menu-sound-heading">{t('menu.soundHeading')}</div>
            <div className="menu-sound-rows">
              <div className="sound-channel-box">
                <button
                  type="button"
                  className="sound-toggle-row"
                  onClick={onTogglePlayerSound}
                >
                  <span className="sound-toggle-info">
                    <span className="sound-toggle-name">{t('sound.playerLabel')}</span>
                    <span className="sound-toggle-desc">{t('sound.playerMenuDesc')}</span>
                  </span>
                  <span
                    className={`sound-switch-pill ${effectivePlayerOn ? 'is-on' : 'is-off'}`}
                  >
                    {effectivePlayerOn ? t('common.on') : t('common.off')}
                  </span>
                </button>
                <label className="sound-volume-row">
                  <span className="sound-volume-label">{t('common.volume')}</span>
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
                    <span className="sound-toggle-name">{t('sound.npcLabel')}</span>
                    <span className="sound-toggle-desc">{t('sound.npcMenuDesc')}</span>
                  </span>
                  <span
                    className={`sound-switch-pill ${effectiveNpcOn ? 'is-on' : 'is-off'}`}
                  >
                    {effectiveNpcOn ? t('common.on') : t('common.off')}
                  </span>
                </button>
                <label className="sound-volume-row">
                  <span className="sound-volume-label">{t('common.volume')}</span>
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
