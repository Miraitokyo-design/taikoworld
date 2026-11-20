import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { InstrumentConfig, PlayerState, SpaceConfig } from '../types/world';
import { Space } from './Space';
import { Taiko } from './Taiko';
import { Player } from './Player';

interface SceneProps {
  /** 현재 표시할 공간 설정 */
  space: SpaceConfig;
  /** 공간에 배치할 악기 목록 */
  instruments: InstrumentConfig[];
  /** 플레이어 현재 상태 */
  playerState: PlayerState;
}

/**
 * 동물의 숲 스타일 쿼터뷰(위에서 비스듬히 내려다보는 시점) 카메라 방향을 맞추는 컴포넌트
 * - useThree 훅으로 Three.js 카메라 객체를 가져와 광장 중앙을 바라보게 설정합니다.
 */
function QuarterViewCameraSetup() {
  const { camera } = useThree();

  // 첫 렌더링 시 카메라가 잔디 광장 중심(0, 0.4, 0.5)을 비스듬히 바라보도록 고정
  useEffect(() => {
    camera.lookAt(0, 0.4, 0.5);
  }, [camera]);

  return null;
}

/**
 * 3D 월드 전체 장면(배경, 조명, 카메라, 공간, 악기, 플레이어)을 조립하는 컴포넌트
 * @param props.space - 현재 공간 데이터
 * @param props.instruments - 악기 데이터 배열
 * @param props.playerState - 플레이어 단일 상태 객체
 */
export function Scene({ space, instruments, playerState }: SceneProps) {
  return (
    <>
      {/* 맑고 따뜻한 낮 하늘색 배경과 부드러운 원거리 안개 */}
      <color attach="background" args={['#cde9f6']} />
      <fog attach="fog" args={['#cde9f6', 18, 36]} />

      {/* 쿼터뷰 카메라 시선 설정 */}
      <QuarterViewCameraSetup />

      {/* 하늘(위)과 잔디(아래)에서 은은하게 퍼지는 반구 조명 */}
      <hemisphereLight args={['#fffdf5', '#76b569', 1.1]} />

      {/* 따뜻한 햇살 느낌의 주 조명 */}
      <directionalLight position={[6, 12, 8]} intensity={1.35} color="#fff6e0" />

      {/* 잔디 공원 공간 */}
      <Space space={space} />

      {/* instruments.json에 등록된 모든 타이코 배치 */}
      {instruments.map((instrument) => (
        <Taiko key={instrument.id} instrument={instrument} />
      ))}

      {/* 게스트 플레이어 캐릭터 */}
      <Player playerState={playerState} />
    </>
  );
}
