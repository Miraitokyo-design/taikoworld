import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { InstrumentConfig } from '../../types/world';
import type { TaikoHitType } from '../../systems/audioManager';
import { useI18n } from '../../i18n/I18nContext';

interface TaikoPlayOverlayProps {
  /** 현재 연주 중인 악기 설정 데이터 */
  instrument: InstrumentConfig;
  /** 북 중앙(don) 또는 테두리(ka)를 쳤을 때 호출되는 콜백 */
  onHit: (hitType: TaikoHitType) => void;
  /** [월드로 돌아가기] 또는 ESC로 탐색 화면으로 복귀하는 콜백 */
  onExit: () => void;
}

/** 화면에 잠깐 떠올랐다가 사라지는 타격 텍스트 이펙트 항목 */
interface HitEffect {
  id: number;
  type: TaikoHitType;
  label: string;
}

/**
 * 타이코 연주 모드 전용 오버레이 UI 컴포넌트
 * - 북 중앙(돈 / 강)과 북 테두리(카 / 약)를 손가락으로 바로 연타할 수 있습니다.
 * - PC에서는 키보드 단축키(F/J: 돈, D/K: 카, ESC/Space: 나가기)도 함께 지원합니다.
 */
export function TaikoPlayOverlay({ instrument, onHit, onExit }: TaikoPlayOverlayProps) {
  const { t } = useI18n();
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [activeFlash, setActiveFlash] = useState<TaikoHitType | null>(null);

  const effectIdRef = useRef(0);
  const flashTimerRef = useRef<number | null>(null);

  // 타격 실행 + 짧은 시각 이펙트 생성 공통 함수
  const triggerHit = useCallback(
    (hitType: TaikoHitType) => {
      onHit(hitType);

      setActiveFlash(hitType);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setActiveFlash(null);
      }, 90);

      const nextId = ++effectIdRef.current;
      const label =
        hitType === 'don' ? t('taikoPlay.donPop') : t('taikoPlay.kaPop');
      setEffects((prev) => [...prev.slice(-5), { id: nextId, type: hitType, label }]);

      window.setTimeout(() => {
        setEffects((prev) => prev.filter((item) => item.id !== nextId));
      }, 450);
    },
    [onHit, t]
  );

  // PC 키보드 단축키(F/J: 돈, D/K: 카, Space/ESC: 나가기) 등록
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'KeyF' || event.code === 'KeyJ') {
        event.preventDefault();
        triggerHit('don');
      } else if (event.code === 'KeyD' || event.code === 'KeyK') {
        event.preventDefault();
        triggerHit('ka');
      } else if (event.code === 'Space' || event.code === 'Escape') {
        event.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, [triggerHit, onExit]);

  const handleRimPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    triggerHit('ka');
  };

  const handleCenterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    triggerHit('don');
  };

  return (
    <div className="taiko-play-overlay" data-ui-interactive="true">
      {/* 상단 중앙: 현재 연주 중인 악기 이름 */}
      <div className="taiko-play-header">
        <div className="taiko-play-title">🥁 {instrument.name}</div>
      </div>

      {/* 중앙 원형 타격 패드: 바깥쪽 = 카(테두리), 안쪽 = 돈(중앙) */}
      <div className="taiko-pad-area">
        <div className="taiko-effect-layer" aria-hidden="true">
          {effects.map((effect) => (
            <span
              key={effect.id}
              className={`taiko-hit-pop taiko-hit-pop--${effect.type}`}
            >
              {effect.label}
            </span>
          ))}
        </div>

        {/* 바깥 테두리 (카 / Ka) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={t('taikoPlay.rimAria')}
          className={`taiko-rim-pad ${activeFlash === 'ka' ? 'is-active' : ''}`}
          onPointerDown={handleRimPointerDown}
        >
          <span className="taiko-rim-label">{t('taikoPlay.rimLabel')}</span>

          {/* 안쪽 가죽 중앙 (돈 / Don) */}
          <div
            role="button"
            tabIndex={0}
            aria-label={t('taikoPlay.centerAria')}
            className={`taiko-center-pad ${activeFlash === 'don' ? 'is-active' : ''}`}
            onPointerDown={handleCenterPointerDown}
          >
            <span className="taiko-center-main">{t('taikoPlay.centerMain')}</span>
            <span className="taiko-center-sub">{t('taikoPlay.centerSub')}</span>
          </div>
        </div>
      </div>

      {/* 하단 중앙 나가기 버튼 + Space 단축키 */}
      <button type="button" className="taiko-exit-btn" onClick={onExit}>
        <span>{t('taikoPlay.exitButton')}</span>
        <span className="key-cap">Space</span>
      </button>

      {/* 하단 조작 안내 */}
      <div className="taiko-play-guide">{t('taikoPlay.guideText')}</div>
    </div>
  );
}
