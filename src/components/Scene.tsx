import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from '../types/world';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { resolvePlayerPosition } from '../systems/collision';
import { Space } from './Space';
import { Taiko } from './Taiko';
import { Player } from './Player';
import { DestinationMarker } from './DestinationMarker';

interface SceneProps {
  /** 현재 표시할 공간 설정 */
  space: SpaceConfig;
  /** 공간에 배치할 악기 목록 */
  instruments: InstrumentConfig[];
  /** 플레이어의 위치·방향·행동을 담은 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 모바일 플로팅 조이스틱 방향 벡터 ref */
  joystickVectorRef: MutableRefObject<MoveVector>;
}

/**
 * 3D 월드 전체 장면(배경, 조명, 공간, 악기, 플레이어, 클릭 목적지 표시)을 조립하는 컴포넌트
 * @param props.space - 현재 공간 데이터
 * @param props.instruments - 악기 데이터 배열
 * @param props.playerStateRef - 플레이어 단일 상태 객체 ref
 * @param props.joystickVectorRef - 모바일 조이스틱 방향 벡터 ref
 */
export function Scene({
  space,
  instruments,
  playerStateRef,
  joystickVectorRef,
}: SceneProps) {
  // PC 키보드(WASD / 방향키) 입력 상태 추적
  const pressedKeysRef = useKeyboardInput();

  // 바닥 클릭/터치로 지정된 목적지 상태 (DestinationMarker 표시용)
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);

  // useCallback: 불필요한 함수 재생성을 막기 위해 콜백을 기억하는 Hook
  const handleGroundClick = useCallback(
    (rawPoint: [number, number]) => {
      // 장애물 안이나 광장 바깥을 클릭해도 이동 가능한 가장 가까운 지점으로 보정
      const safePoint = resolvePlayerPosition(rawPoint[0], rawPoint[1], space);
      setTargetPoint([safePoint.x, safePoint.z]);
    },
    [space]
  );

  const handleClearTarget = useCallback(() => {
    setTargetPoint(null);
  }, []);

  return (
    <>
      {/* 맑고 따뜻한 낮 하늘색 배경과 부드러운 원거리 안개 */}
      <color attach="background" args={['#cde9f6']} />
      <fog attach="fog" args={['#cde9f6', 18, 36]} />

      {/* 하늘(위)과 잔디(아래)에서 은은하게 퍼지는 반구 조명 */}
      <hemisphereLight args={['#fffdf5', '#76b569', 1.1]} />

      {/* 따뜻한 햇살 느낌의 주 조명 */}
      <directionalLight position={[6, 12, 8]} intensity={1.35} color="#fff6e0" />

      {/* 잔디 공원 공간 (바닥 클릭 이벤트 연결) */}
      <Space space={space} onGroundClick={handleGroundClick} />

      {/* 바닥 클릭/터치 시 목적지를 알려주는 반짝이는 링 */}
      <DestinationMarker target={targetPoint} />

      {/* instruments.json에 등록된 모든 타이코 배치 */}
      {instruments.map((instrument) => (
        <Taiko key={instrument.id} instrument={instrument} />
      ))}

      {/* 게스트 플레이어 캐릭터 (이동 + 2D 충돌 + 쿼터뷰 카메라 추적) */}
      <Player
        playerStateRef={playerStateRef}
        space={space}
        targetPoint={targetPoint}
        onClearTarget={handleClearTarget}
        pressedKeysRef={pressedKeysRef}
        joystickVectorRef={joystickVectorRef}
      />
    </>
  );
}
