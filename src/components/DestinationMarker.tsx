import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface DestinationMarkerProps {
  /** 클릭/터치로 지정된 목적지 [x, z] (목적지가 없으면 null) */
  target: [number, number] | null;
}

/**
 * 바닥 클릭/터치 시 이동 목적지를 잔디 위에 반짝이는 원형 링으로 표시하는 컴포넌트
 * - 모바일이나 PC에서 "내가 누른 곳으로 가고 있구나"를 직관적으로 알려줍니다.
 * @param props.target - 현재 목적지 좌표 [x, z] 또는 null
 */
export function DestinationMarker({ target }: DestinationMarkerProps) {
  const ringRef = useRef<Mesh>(null);

  // 매 프레임마다 링의 크기를 부드럽게 숨 쉬듯 키워서 살아 있는 느낌을 줌
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 6) * 0.14;
    ringRef.current.scale.set(pulse, pulse, 1);
  });

  if (!target) return null;

  return (
    <mesh
      ref={ringRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[target[0], 0.025, target[1]]}
    >
      <ringGeometry args={[0.18, 0.28, 24]} />
      <meshBasicMaterial color="#fffbe6" transparent opacity={0.9} />
    </mesh>
  );
}
