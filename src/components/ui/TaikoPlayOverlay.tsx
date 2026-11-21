import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { InstrumentConfig } from '../../types/world';
import type { TaikoHitType } from '../../systems/audioManager';

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
 * - PC에서는 키보드 단축키(F/J: 돈, D/K: 카, ESC: 나가기)도 함께 지원합니다.
 * - 한글 입력 상태에서도 단축키가 동작하도록 event.code를 사용합니다.
 * @param props.instrument - 현재 연주 중인 악기 정보
 * @param props.onHit - 타격 시 오디오/3D 반응을 실행할 콜백
 * @param props.onExit - 탐색 모드로 돌아가는 콜백
 */
export function TaikoPlayOverlay({ instrument, onHit, onExit }: TaikoPlayOverlayProps) {
  // 타격 시 순간적으로 떠오르는 "돈!" / "카!" 시각 이펙트 목록
  const [effects, setEffects] = useState<HitEffect[]>([]);
  // 어떤 영역이 방금 눌렸는지 순간 강조하기 위한 상태
  const [activeFlash, setActiveFlash] = useState<TaikoHitType | null>(null);

  const effectIdRef = useRef(0);
  const flashTimerRef = useRef<number | null>(null);

  // 타격 실행 + 짧은 시각 이펙트 생성 공통 함수
  const triggerHit = useCallback(
    (hitType: TaikoHitType) => {
      onHit(hitType);

      // 패드 눌림 강조 효과 (90ms 동안 살짝 커지거나 빛남)
      setActiveFlash(hitType);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setActiveFlash(null);
      }, 90);

      // 떠오르는 텍스트 이펙트 추가 후 450ms 뒤 자동 제거
      const nextId = ++effectIdRef.current;
      const label = hitType === 'don' ? '돈!' : '카!';
      setEffects((prev) => [...prev.slice(-5), { id: nextId, type: hitType, label }]);

      window.setTimeout(() => {
        setEffects((prev) => prev.filter((item) => item.id !== nextId));
      }, 450);
    },
    [onHit]
  );

  // PC 키보드 단축키(F/J: 돈, D/K: 카, ESC: 나가기) 등록
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 키를 꾹 누르고 있을 때 OS 자동 반복 입력이 연타로 들어오는 것 방지
      if (event.repeat) return;

      if (event.code === 'KeyF' || event.code === 'KeyJ') {
        event.preventDefault();
        triggerHit('don');
      } else if (event.code === 'KeyD' || event.code === 'KeyK') {
        event.preventDefault();
        triggerHit('ka');
      } else if (event.code === 'Escape') {
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

  /**
   * 터치/클릭 즉시 타격을 실행하는 핸들러
   * - onClick 대신 onPointerDown을 사용해 모바일 연타 시 지연(딜레이)을 없앱니다.
   */
  const handleRimPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    triggerHit('ka');
  };

  const handleCenterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 중앙을 눌렀을 때 바깥 테두리(카) 이벤트까지 같이 실행되지 않도록 전파 차단
    event.stopPropagation();
    triggerHit('don');
  };

  return (
    <div className="taiko-play-overlay" data-ui-interactive="true">
      {/* 상단 헤더: 월드로 돌아가기 버튼 + 악기 이름 */}
      <div className="taiko-play-header">
        <button type="button" className="taiko-exit-btn" onClick={onExit}>
          ← 월드로 돌아가기
        </button>
        <div className="taiko-play-title">🥁 {instrument.name}</div>
      </div>

      {/* 중앙 원형 타격 패드: 바깥쪽 = 카(테두리), 안쪽 = 돈(중앙) */}
      <div className="taiko-pad-area">
        {/* 타격 시 위로 톡 튀어 오르는 텍스트 이펙트 */}
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
          aria-label="북 테두리 치기 (카)"
          className={`taiko-rim-pad ${activeFlash === 'ka' ? 'is-active' : ''}`}
          onPointerDown={handleRimPointerDown}
        >
          <span className="taiko-rim-label">테두리 · 카 (D / K)</span>

          {/* 안쪽 가죽 중앙 (돈 / Don) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="북 중앙 치기 (돈)"
            className={`taiko-center-pad ${activeFlash === 'don' ? 'is-active' : ''}`}
            onPointerDown={handleCenterPointerDown}
          >
            <span className="taiko-center-main">돈</span>
            <span className="taiko-center-sub">중앙 탭 · F / J</span>
          </div>
        </div>
      </div>

      {/* 하단 조작 안내 */}
      <div className="taiko-play-guide">
        두 손가락으로 빠르게 연타해도 소리가 겹쳐 울려요!
      </div>
    </div>
  );
}
