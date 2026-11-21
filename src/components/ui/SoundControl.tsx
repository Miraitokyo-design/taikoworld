import { useEffect, useRef } from 'react';

interface SoundControlProps {
  /** 직접 연주(북 체험 · 악보 · 소리 듣기) ON/OFF 상태 */
  isPlayerSoundOn: boolean;
  /** NPC 합주 배경 소리 ON/OFF 상태 */
  isNpcSoundOn: boolean;
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
}

/**
 * 화면 우측 상단의 세분화된 소리 설정 컨트롤 컴포넌트
 * - [직접 연주 소리]와 [NPC 합주 배경 소리]를 각각 독립적으로 ON/OFF할 수 있습니다.
 */
export function SoundControl({
  isPlayerSoundOn,
  isNpcSoundOn,
  isOpen,
  onToggleOpen,
  onClose,
  onTogglePlayerSound,
  onToggleNpcSound,
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

  const soundIcon =
    !isPlayerSoundOn && !isNpcSoundOn
      ? '🔇'
      : isPlayerSoundOn && isNpcSoundOn
      ? '🔊'
      : '🔉';

  const soundLabel =
    !isPlayerSoundOn && !isNpcSoundOn
      ? '꺼짐'
      : isPlayerSoundOn && isNpcSoundOn
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
        aria-label="소리 설정 열기"
      >
        <span aria-hidden="true">{soundIcon}</span>
        <span className="mute-toggle-label">{soundLabel}</span>
      </button>

      {isOpen && (
        <div className="sound-popover" role="dialog" aria-label="세부 소리 설정">
          <div className="sound-popover-title">🔊 소리 설정</div>

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
              <span className="sound-toggle-desc">공원 멤버 배경 합주</span>
            </span>
            <span
              className={`sound-switch-pill ${isNpcSoundOn ? 'is-on' : 'is-off'}`}
            >
              {isNpcSoundOn ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
