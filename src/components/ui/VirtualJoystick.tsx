import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MoveVector } from '../../types/world';

interface VirtualJoystickProps {
  /** 조이스틱의 현재 방향 벡터({ x, z })를 3D 이동 루프에 전달할 ref */
  joystickVectorRef: MutableRefObject<MoveVector>;
}

/** 조이스틱 중심에서 손잡이(노브)가 움직일 수 있는 최대 반경 (px) */
const MAX_RADIUS_PX = 48;
/** 미세한 손떨림이나 짧은 탭을 이동으로 오인하지 않기 위한 데드존 반경 (px) */
const DEADZONE_PX = 8;

/**
 * 터치한 요소가 일반 UI 버튼·링크 등 상호작용 요소인지 판별하는 도우미 함수
 * - 추후 [연주하기], [서클/문의] 같은 버튼을 누를 때 조이스틱이 뜨지 않게 막아줍니다.
 * @param target - 터치 이벤트가 시작된 DOM 요소
 * @returns UI 버튼 위라면 true
 */
function isInteractiveUiElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, [data-ui-interactive]'));
}

/**
 * 모바일 터치 시 손가락을 댄 위치에 나타나는 플로팅 가상 조이스틱 컴포넌트
 * - 터치(pointerType === 'touch')일 때만 활성화되어 PC 마우스/키보드 조작과 충돌하지 않습니다.
 * - 드래그 중에는 React 상태를 매번 바꾸지 않고 DOM ref와 joystickVectorRef만 갱신해 60fps 성능을 유지합니다.
 * @param props.joystickVectorRef - 이동 방향 { x, z }를 기록할 공유 ref
 */
export function VirtualJoystick({ joystickVectorRef }: VirtualJoystickProps) {
  // 조이스틱 원판이 나타날 화면 위치 (손을 떼면 null로 숨김)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // 현재 조이스틱을 조작 중인 손가락 ID와 시작 좌표를 기억 (멀티터치 간섭 방지)
  const activePointerIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // useEffect: 브라우저 전체 화면의 포인터(터치) 이벤트를 등록하고 언마운트 시 정리
  useEffect(() => {
    const resetJoystick = () => {
      activePointerIdRef.current = null;
      originRef.current = null;
      joystickVectorRef.current.x = 0;
      joystickVectorRef.current.z = 0;
      setOrigin(null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      // 모바일/태블릿 터치 입력일 때만 플로팅 조이스틱 표시
      if (event.pointerType !== 'touch') return;
      // 이미 다른 손가락으로 조이스틱을 조작 중이거나, UI 버튼을 누른 경우는 무시
      if (activePointerIdRef.current !== null) return;
      if (isInteractiveUiElement(event.target)) return;

      activePointerIdRef.current = event.pointerId;
      const startPos = { x: event.clientX, y: event.clientY };
      originRef.current = startPos;
      joystickVectorRef.current.x = 0;
      joystickVectorRef.current.z = 0;
      setOrigin(startPos);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return;
      if (!originRef.current) return;

      // 처음 터치한 지점으로부터 손가락이 이동한 거리(dx, dy) 계산
      const dx = event.clientX - originRef.current.x;
      const dy = event.clientY - originRef.current.y;
      const distance = Math.hypot(dx, dy);

      // 조이스틱 손잡이(노브)가 원판 바깥으로 벗어나지 않도록 최대 반경 안으로 제한
      const clampedDistance = Math.min(distance, MAX_RADIUS_PX);
      const ratio = distance > 0 ? clampedDistance / distance : 0;
      const knobX = dx * ratio;
      const knobY = dy * ratio;

      // 손잡이 위치를 DOM에 직접 반영해 드래그 중 불필요한 React 재렌더링 방지
      if (knobRef.current) {
        knobRef.current.style.transform = `translate3d(${knobX}px, ${knobY}px, 0)`;
      }

      // 데드존 안쪽의 미세한 움직임은 0으로 처리
      if (distance <= DEADZONE_PX) {
        joystickVectorRef.current.x = 0;
        joystickVectorRef.current.z = 0;
        return;
      }

      // 데드존 이후~최대 반경까지 0 ~ 1 사이의 부드러운 아날로그 세기 계산
      const strength = (clampedDistance - DEADZONE_PX) / (MAX_RADIUS_PX - DEADZONE_PX);
      joystickVectorRef.current.x = (dx / distance) * strength;
      // 화면 아래쪽(+Y)이 3D 월드 앞쪽(+Z)에 대응
      joystickVectorRef.current.z = (dy / distance) * strength;
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return;
      resetJoystick();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', resetJoystick);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', resetJoystick);
      resetJoystick();
    };
  }, [joystickVectorRef]);

  // 터치 중이 아닐 때는 화면을 가리지 않도록 아무것도 그리지 않음
  if (!origin) return null;

  return (
    <div
      className="virtual-joystick-base"
      style={{
        left: `${origin.x}px`,
        top: `${origin.y}px`,
      }}
      aria-hidden="true"
    >
      <div ref={knobRef} className="virtual-joystick-knob" />
    </div>
  );
}
