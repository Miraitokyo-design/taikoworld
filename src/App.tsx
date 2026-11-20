import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from './types/world';
import { Scene } from './components/Scene';
import { VirtualJoystick } from './components/ui/VirtualJoystick';

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 3D 좌표 튜플 타입([x, y, z])으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];

/**
 * Taiko World 최상위 앱 컴포넌트
 * - 데이터 파일(spaces.json, instruments.json)을 불러와 3D 캔버스에 전달합니다.
 * - 플레이어 상태(위치·방향·행동)와 모바일 조이스틱 입력을 useRef로 관리해 60fps 이동을 부드럽게 유지합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const currentSpace = spaces[0];

  // 플레이어 상태 단일 객체: 매 프레임 업데이트되어도 React 전체가 다시 그려지지 않게 useRef로 관리
  const playerStateRef = useRef<PlayerState>({
    position: [...currentSpace.spawnPoint],
    // 북이 있는 뒤쪽(-Z)을 바라보도록 180도(Math.PI) 회전
    rotationY: Math.PI,
    action: 'idle',
  });

  // 모바일 플로팅 조이스틱과 3D Player 루프가 공유하는 방향 벡터 ref
  const joystickVectorRef = useRef<MoveVector>({ x: 0, z: 0 });

  const [spawnX, , spawnZ] = currentSpace.spawnPoint;

  return (
    <>
      {/* 3D 그래픽을 그리는 캔버스: 모바일 성능 예산에 따라 픽셀 배율(dpr)을 최대 2로 제한 */}
      <Canvas
        dpr={[1, 2]}
        camera={{
          position: [spawnX, 8.2, spawnZ + 9.2],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
      >
        <Scene
          space={currentSpace}
          instruments={instruments}
          playerStateRef={playerStateRef}
          joystickVectorRef={joystickVectorRef}
        />
      </Canvas>

      {/* 모바일 화면 터치 시 손가락 위치에 나타나는 플로팅 가상 조이스틱 */}
      <VirtualJoystick joystickVectorRef={joystickVectorRef} />

      {/* 현재 공간 이름과 조작 안내를 보여주는 가벼운 하단 배지 */}
      <div className="space-badge">
        <span>🌿 {currentSpace.name}</span>
        <span className="space-badge-hint">
          모바일: 화면 터치 조이스틱 · PC: WASD/클릭
        </span>
      </div>
    </>
  );
}

export default App;
