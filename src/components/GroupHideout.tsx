import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { GroupHideoutConfig } from '../types/world';

interface GroupHideoutProps {
  /** spaces.json에 정의된 지역 타이코 단체 아지트(큐브) 설정 */
  hideout: GroupHideoutConfig;
  /** 플레이어가 이 아지트의 상호작용 반경 안에 들어와 있는지 여부 */
  isPlayerNear: boolean;
  /** 탐색 화면이 활성화되어 [! E] 말풍선과 클릭을 받을 수 있는지 여부 */
  isInteractionActive: boolean;
  /** 가까워진 상태에서 아지트 또는 [!] 말풍선을 눌렀을 때 단체 소개를 여는 콜백 */
  onSelect: (hideout: GroupHideoutConfig) => void;
}

/**
 * 잔디 공원 좌/우 앞쪽에 배치되는 지역 타이코 단체 아지트(임시 큐브) 3D 컴포넌트
 * - 원점(Origin)이 바닥(y = 0)에 있어, 추후 Blender 아지트 GLB 건물 모델로 바로 교체할 수 있습니다.
 * - 사용자가 가까이 접근하면 머리 위에 [! E] 말풍선이 뜨고, 클릭하거나 E 키를 눌러 지역 단체 소개를 엽니다.
 */
export function GroupHideout({
  hideout,
  isPlayerNear,
  isInteractionActive,
  onSelect,
}: GroupHideoutProps) {
  const [x, y, z] = hideout.position;

  useEffect(() => {
    if (!isPlayerNear || !isInteractionActive) {
      document.body.style.cursor = 'auto';
    }
  }, [isPlayerNear, isInteractionActive]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  /**
   * 가까워진 상태에서 큐브나 주변을 짧게 클릭/탭하면 해당 지역 단체 소개 열기
   */
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isPlayerNear || !isInteractionActive) return;
    if (event.delta > 8) return;
    event.stopPropagation();
    onSelect(hideout);
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!isPlayerNear || !isInteractionActive) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  return (
    <group
      name={hideout.id}
      position={[x, y, z]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* 가벼운 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.3, 24]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.34} />
      </mesh>

      {/* 상호작용 가능 범위를 보여주는 바닥 원형 링 (접근 시 밝은 노란빛 강조) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry
          args={[hideout.interactRadius - 0.07, hideout.interactRadius, 36]}
        />
        <meshBasicMaterial
          color={isPlayerNear && isInteractionActive ? '#ffe066' : '#fff8dc'}
          transparent
          opacity={isPlayerNear && isInteractionActive ? 0.85 : 0.34}
        />
      </mesh>

      {/* 단체 아지트 메인 큐브 (바탕색 + 선명한 테두리 Edges 적용) */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.65, 1.6, 1.65]} />
        <meshStandardMaterial color={hideout.color} roughness={0.78} />
        <Edges scale={1.005} threshold={15} color={hideout.borderColor} />
      </mesh>

      {/* 아지트 바닥 테두리 받침 느낌의 얇은 띠 */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[1.76, 0.14, 1.76]} />
        <meshStandardMaterial color={hideout.borderColor} roughness={0.85} />
      </mesh>

      {/* 아지트 지붕 테두리 장식 띠 */}
      <mesh position={[0, 1.63, 0]}>
        <boxGeometry args={[1.76, 0.1, 1.76]} />
        <meshStandardMaterial color={hideout.borderColor} roughness={0.85} />
      </mesh>

      {/* 아지트 상단 간판 텍스트 (탐색 중에만 가볍게 표시) */}
      {isInteractionActive && (
        <Html
          position={[0, 2.02, 0]}
          center
          zIndexRange={[7, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="hideout-nameplate">{hideout.name}</div>
        </Html>
      )}

      {/* 플레이어가 가까워지면 아지트 위에 뜨는 [! E] 말풍선 */}
      {isPlayerNear && isInteractionActive && (
        <Html
          position={[0, 2.65, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            className="npc-alert-bubble"
            data-ui-interactive="true"
            aria-label={`${hideout.name} 단체 소개 보기 (단축키 E)`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(hideout);
            }}
          >
            <span>!</span>
            <span className="npc-alert-key">E</span>
          </button>
        </Html>
      )}
    </group>
  );
}
