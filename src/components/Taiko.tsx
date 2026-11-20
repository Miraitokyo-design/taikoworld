import type { InstrumentConfig } from '../types/world';

interface TaikoProps {
  /** instruments.json에서 불러온 악기 설정 데이터 */
  instrument: InstrumentConfig;
}

/**
 * 임시 타이코(나가도 다이코) 3D 모델 컴포넌트
 * - 원기둥과 상자 도형으로 북 몸통·가죽면·받침대를 표현하며,
 *   추후 Blender GLB 모델(inst_taiko_nagado.glb)로 교체할 예정입니다.
 * @param props.instrument - 악기 설정 객체
 */
export function Taiko({ instrument }: TaikoProps) {
  const [x, y, z] = instrument.position;

  return (
    <group name={instrument.id} position={[x, y, z]}>
      {/* 가벼운 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 상호작용 가능 범위를 은은하게 보여주는 바닥 원형 링 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[instrument.interactRadius - 0.06, instrument.interactRadius, 36]} />
        <meshBasicMaterial color="#fff8dc" transparent opacity={0.45} />
      </mesh>

      {/* 나무 받침대 (왼쪽/오른쪽 다리) */}
      <mesh position={[-0.42, 0.32, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.14, 0.7, 0.72]} />
        <meshStandardMaterial color="#6e472b" roughness={0.85} />
      </mesh>
      <mesh position={[0.42, 0.32, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.14, 0.7, 0.72]} />
        <meshStandardMaterial color="#6e472b" roughness={0.85} />
      </mesh>

      {/* 타이코 본체 (앞쪽 방문자를 향해 살짝 기울어진 원기둥) */}
      <group position={[0, 0.88, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
        {/* 빨간색/나무색 북 몸통 */}
        <mesh>
          <cylinderGeometry args={[0.56, 0.56, 0.72, 24]} />
          <meshStandardMaterial color="#b93b2d" roughness={0.65} />
        </mesh>

        {/* 앞면 가죽(북면) */}
        <mesh position={[0, 0.365, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 24]} />
          <meshStandardMaterial color="#f5ead4" roughness={0.8} />
        </mesh>

        {/* 뒷면 가죽(북면) */}
        <mesh position={[0, -0.365, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 24]} />
          <meshStandardMaterial color="#f5ead4" roughness={0.8} />
        </mesh>

        {/* 앞쪽 테두리 장식(카 타격 영역 느낌) */}
        <mesh position={[0, 0.355, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.53, 0.04, 10, 24]} />
          <meshStandardMaterial color="#4a2c1d" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
