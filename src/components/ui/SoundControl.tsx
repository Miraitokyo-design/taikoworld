import { useEffect, useRef } from 'react';

interface SoundControlProps {
  /** 직접 연주(북 체험 · 악보 · 소리 듣기) ON/OFF 상태 */
  isPlayerSoundOn: boolean;
  /** NPC 합주 배경 소리 ON/OFF 상태 */
  isNpcSoundOn: boolean;
  /** 직접 연주 볼륨 (0.0 ~ 1.0) */
  playerVolume: number;
  /** NPC 합주 배경 볼륨 (0.0 ~ 1.0) */
  npcVolume: number;
  /** 소리 설정 팝오버 열림 여부 */
  isOpen: boolean;
  /** 팝오버 열기/닫기 토글 */
  onToggleOpen: () => void;
  /** 팝오버 닫기 */
  onClose: () => void;
  /** 직접 연주 소리 토글 */
  onTogglePlayerSound: () => void;
  /** NPC 합주 소리 토글 */
  onToggleNpcSound: () => void;
  /** 직접 연주 볼륨 변경 콜백 (0.0 ~ 1.0) */
  onChangePlayerVolume: (volume: number) => void;
  /** NPC 합주 볼륨 변경 콜백 (0.0 ~ 1.0) */
  onChangeNpcVolume: (volume: number) => void;
}

/**
 * 메인 화면 우측 상단의 세분화된 소리 설정 컨트롤 컴포넌트
 * - [직접 연주 소리]와 [NPC 합주 배경 소리]를 각각 독립적으로 ON/OFF하고,
 *   볼륨 슬라이더(0% ~ 100%)로 원하는 크기로 조절할 수 있습니다.
 */
export function SoundControl({
  isPlayerSoundOn,
  isNpcSoundOn,
  playerVolume,
  npcVolume,
  isOpen,
  onToggleOpen,
  onClose,
  onTogglePlayerSound,
  onToggleNpcSound,
  onChangePlayerVolume,
  onChangeNpcVolume,
}: SoundControlProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 팝오버 바깥을 클릭하면 자동으로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, onClose]);

  const effectivePlayerOn = isPlayerSoundOn && playerVolume > 0;
  const effectiveNpcOn = isNpcSoundOn && npcVolume > 0;

  const soundIcon =
    !effectivePlayerOn && !effectiveNpcOn
      ? '🔇'
      : effectivePlayerOn && effectiveNpcOn
      ? '🔊'
      : '🔉';

  const soundLabel =
    !effectivePlayerOn && !effectiveNpcOn
      ? '꺼짐'
      : effectivePlayerOn && effectiveNpcOn
      ? '소리'
      : '일부';

  return (
    <div
      ref={wrapperRef}
      className="sound-control-wrap"
      data-ui-interactive="true"
    >
      <button
        type="button"
        className="mute-toggle-btn"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-label="소리 및 볼륨 설정 열기"
      >
        <span aria-hidden="true">{soundIcon}</span>
        <span className="mute-toggle-label">{soundLabel}</span>
      </button>

      {isOpen && (
        <div className="sound-popover" role="dialog" aria-label="세부 소리 및 볼륨 설정">
          <div className="sound-popover-title">🔊 소리 · 볼륨 설정</div>

          {/* 1) 직접 연주 소리 ON/OFF + 볼륨 슬라이더 */}
          <div className="sound-channel-box">
            <button
              type="button"
              className="sound-toggle-row"
              onClick={onTogglePlayerSound}
            >
              <span className="sound-toggle-info">
                <span className="sound-toggle-name">🥁 직접 연주 소리</span>
                <span className="sound-toggle-desc">북 체험 · 악보 · 작곡</span>
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
                aria-label="직접 연주 소리 볼륨"
              />
              <span className="sound-volume-pct">
                {isPlayerSoundOn ? Math.round(playerVolume * 100) : 0}%
              </span>
            </label>
          </div>

          {/* 2) NPC 합주 배경 소리 ON/OFF + 볼륨 슬라이더 */}
          <div className="sound-channel-box">
            <button
              type="button"
              className="sound-toggle-row"
              onClick={onToggleNpcSound}
            >
              <span className="sound-toggle-info">
                <span className="sound-toggle-name">👥 NPC 합주 소리</span>
                <span className="sound-toggle-desc">공원 멤버 배경 합주</span>
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
                aria-label="NPC 합주 소리 볼륨"
              />
              <span className="sound-volume-pct">
                {isNpcSoundOn ? Math.round(npcVolume * 100) : 0}%
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
