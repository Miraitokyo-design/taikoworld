import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import type { InstrumentConfig, PlayerState, SpaceConfig } from './types/world';
import { Scene } from './components/Scene';

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 3D 좌표 튜플 타입([x, y, z])으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];

/**
 * Taiko World 최상위 앱 컴포넌트
 * - 데이터 파일(spaces.json, instruments.json)을 불러와 3D 캔버스에 전달합니다.
 * - 플레이어 상태는 추후 이동/멀티플레이 확장을 위해 단일 객체(useState)로 관리합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const currentSpace = spaces[0];

  // React의 useState 훅: 화면에 반영되어야 하는 상태(여기서는 플레이어 위치/방향/행동)를 기억합니다.
  const [playerState] = useState<PlayerState>({
    position: [...currentSpace.spawnPoint],
    // 북이 있는 뒤쪽(-Z)을 바라보도록 180도(Math.PI) 회전
    rotationY: Math.PI,
    action: 'idle',
  });

  return (
    <>
      {/* 3D 그래픽을 그리는 캔버스: 모바일 성능 예산에 따라 픽셀 배율(dpr)을 최대 2로 제한 */}
      <Canvas
        dpr={[1, 2]}
        camera={{
          position: [0, 8.5, 10.5],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
      >
        <Scene
          space={currentSpace}
          instruments={instruments}
          playerState={playerState}
        />
      </Canvas>

      {/* 현재 공간 이름을 보여주는 가벼운 하단 안내 배지 */}
      <div className="space-badge">🌿 {currentSpace.name} · 프로토타입</div>
    </>
  );
}

export default App;
