import { Suspense, memo, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import type {
  CharacterAppearance,
  CharacterHairStyle,
  CharacterSpecies,
  EquippedInstrumentId,
  TaikoGroupConfig,
} from '../types/content';
import type { PlayerAction } from '../types/world';
import { getTaikoGroupById } from '../utils/characterAppearance';
import {
  FACE_CANVAS_SIZE,
  drawFaceToCanvas,
} from '../systems/faceCanvasRenderer';
import type { FaceExpression } from '../systems/faceCanvasRenderer';
import { GlbModel, ModelErrorBoundary, useAssetAvailability } from './GlbModel';
import { SkinnedCharacterGlb } from './SkinnedCharacterGlb';

interface CharacterProps {
  /** 5-레이어 모듈식 캐릭터 외형 (소속 단체·헤어·장비 악기·2D 캔버스 얼굴) */
  appearance: CharacterAppearance;
  /** 현재 행동 상태('idle' | 'walk' | 'play')를 60fps로 읽어오는 ref */
  actionRef: MutableRefObject<PlayerAction>;
  /** 플레이어가 가까이 왔을 때 살짝 고개를 돌리는 Y축 각도 ref (NPC용, 선택) */
  headLookYawRef?: MutableRefObject<number>;
  /** 걸음 속도 배율 ref (플레이어 근접 시 느린 걸음에 맞춰 걷기 모션 속도 조절, 선택) */
  walkSpeedScaleRef?: MutableRefObject<number>;
}

/**
 * Layer 4: 헤어 / 머리 장식 파츠 컴포넌트 (Socket_Head 기준)
 * - 토끼 귀(정수리 좌우)와 겹치지 않도록 앞·뒤·테두리 위주로 배치해
 *   토끼와 거북이 두 종족 모두 자연스럽게 호환됩니다.
 */
export function CharacterHairPart({
  hair,
  group,
  species,
}: {
  hair: CharacterHairStyle;
  group: TaikoGroupConfig;
  species: CharacterSpecies;
}) {
  switch (hair) {
    case 'hair_none':
      return null;

    case 'hair_bun':
      // 뒤쪽 만두머리 + 단체색 리본 (토끼 귀를 가리지 않도록 뒤쪽에 배치)
      return (
        <group position={[0, 1.07, -0.22]}>
          <mesh>
            <sphereGeometry args={[0.105, 12, 12]} />
            <meshStandardMaterial color="#352a24" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.095, 0.024, 8, 16]} />
            <meshStandardMaterial color={group.happiColor} roughness={0.7} />
          </mesh>
        </group>
      );

    case 'hair_cap':
      // 둥근 미니 베레/캡 스타일 (토끼는 귀 사이 앞쪽, 거북이는 정수리에 자연스럽게 착용)
      return (
        <group position={[0, species === 'rabbit' ? 1.14 : 1.15, species === 'rabbit' ? 0.07 : 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.2, 0.1, 14]} />
            <meshStandardMaterial color={group.happiColor} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.04, 0.14]} rotation={[0.16, 0, 0]}>
            <boxGeometry args={[0.24, 0.032, 0.14]} />
            <meshStandardMaterial color={group.happiBorderColor} roughness={0.8} />
          </mesh>
        </group>
      );

    case 'hair_spiky':
      // 앞머리 뾰족 헤어 + 노란 이마 밴드
      return (
        <group>
          <mesh position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.252, 0.028, 8, 20]} />
            <meshStandardMaterial color={group.obiColor} roughness={0.7} />
          </mesh>
          <mesh position={[-0.06, 1.19, 0.13]} rotation={[0.35, 0, 0.26]}>
            <coneGeometry args={[0.06, 0.16, 6]} />
            <meshStandardMaterial color="#2f2a28" roughness={0.85} />
          </mesh>
          <mesh position={[0.06, 1.2, 0.12]} rotation={[0.32, 0, -0.24]}>
            <coneGeometry args={[0.06, 0.17, 6]} />
            <meshStandardMaterial color="#2f2a28" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.21, 0.15]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.055, 0.15, 6]} />
            <meshStandardMaterial color="#2f2a28" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'hair_bob':
      // 귀여운 단발 앞머리 + 양옆 옆머리 (정수리 귀 자리는 비워둠)
      return (
        <group>
          {/* 앞머리 */}
          <mesh position={[0, 1.11, 0.17]} rotation={[0.22, 0, 0]}>
            <boxGeometry args={[0.32, 0.09, 0.1]} />
            <meshStandardMaterial color="#46342a" roughness={0.85} />
          </mesh>
          {/* 왼쪽 옆머리 */}
          <mesh position={[-0.22, 0.97, 0.04]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.06, 0.16, 6, 8]} />
            <meshStandardMaterial color="#46342a" roughness={0.85} />
          </mesh>
          {/* 오른쪽 옆머리 */}
          <mesh position={[0.22, 0.97, 0.04]} rotation={[0, 0, -0.12]}>
            <capsuleGeometry args={[0.06, 0.16, 6, 8]} />
            <meshStandardMaterial color="#46342a" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'hair_hachimaki':
    default:
      // 전통 타이코 머리띠(하치마키) + 뒤 매듭
      return (
        <group>
          <mesh position={[0, 1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.254, 0.032, 8, 22]} />
            <meshStandardMaterial color="#e04f3e" roughness={0.7} />
          </mesh>
          <mesh position={[-0.04, 1.07, -0.26]} rotation={[0.45, 0, 0.25]}>
            <boxGeometry args={[0.04, 0.14, 0.02]} />
            <meshStandardMaterial color="#fff7eb" roughness={0.75} />
          </mesh>
          <mesh position={[0.04, 1.07, -0.26]} rotation={[0.45, 0, -0.25]}>
            <boxGeometry args={[0.04, 0.14, 0.02]} />
            <meshStandardMaterial color="#e04f3e" roughness={0.75} />
          </mesh>
        </group>
      );
  }
}

/**
 * Layer 5 (몸통 부착): 카츠기(担ぎ) 자세로 캐릭터 왼쪽 허리(+X, 보는 사람 기준 오른쪽)에 비스듬히 매는 어깨북(尺 2/4/6, 沖)
 * - 북 GLB 모델 자체는 정중앙 원점(0, 0, 0)을 유지하고, 여기서 위치·각도와 사선 어깨 끈만 적용합니다.
 * - public/models/instruments/inst_shaku_2.glb 등이 존재하면 실제 Blender GLB를 자동 표시합니다.
 */
export function CharacterChestInstrument({
  instrument,
}: {
  instrument: EquippedInstrumentId;
}) {
  if (
    instrument === 'shaku_2' ||
    instrument === 'shaku_4' ||
    instrument === 'shaku_5' ||
    instrument === 'shaku_6' ||
    instrument === 'oki' ||
    instrument === 'eisa' ||
    instrument === 'katsugi'
  ) {
    // 북 크기별 왼쪽 허리(+X) 배치 오프셋 (큰 북일수록 몸통과 겹치지 않게 바깥/앞으로 여유 확보)
    const sizeMap = {
      shaku_2: {
        radius: 0.135,
        depth: 0.15,
        bodyColor: '#b56734',
        pos: [0.25, 0.4, 0.2] as [number, number, number],
      },
      shaku_4: {
        radius: 0.16,
        depth: 0.17,
        bodyColor: '#a85a2b',
        pos: [0.28, 0.39, 0.21] as [number, number, number],
      },
      shaku_5: {
        radius: 0.173,
        depth: 0.18,
        bodyColor: '#9f5227',
        pos: [0.295, 0.385, 0.215] as [number, number, number],
      },
      shaku_6: {
        radius: 0.185,
        depth: 0.19,
        bodyColor: '#964c24',
        pos: [0.31, 0.38, 0.22] as [number, number, number],
      },
      katsugi: {
        radius: 0.18,
        depth: 0.21,
        bodyColor: '#1f2937',
        pos: [0.31, 0.38, 0.22] as [number, number, number],
      },
      eisa: {
        radius: 0.2,
        depth: 0.22,
        bodyColor: '#a62c2b',
        pos: [0.325, 0.375, 0.225] as [number, number, number],
      },
      oki: {
        radius: 0.22,
        depth: 0.23,
        bodyColor: '#8b2e24',
        pos: [0.34, 0.37, 0.23] as [number, number, number],
      },
    } as const;
    const spec = sizeMap[instrument];
    const glbUrl = `/models/instruments/inst_${instrument}.glb`;

    // 카츠기 자세 회전: 앞쪽 가죽면(-X)이 정면-오른쪽(+Z, -X)을 향하면서 약간 위를 보도록 비스듬히 기울임
    const slungRotation: [number, number, number] = [0.12, 0.58, -0.34];

    const placeholderDrum = (
      <group position={spec.pos} rotation={slungRotation}>
        {/* 북 나무 몸통 (X축 방향 원기둥) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[spec.radius, spec.radius, spec.depth, 16]} />
          <meshStandardMaterial color={spec.bodyColor} roughness={0.72} />
        </mesh>

        {/* 앞면(-X) 가죽 북면 */}
        <mesh position={[-spec.depth / 2 - 0.004, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[spec.radius * 0.9, spec.radius * 0.9, 0.01, 16]} />
          <meshStandardMaterial color="#f8edd8" roughness={0.8} />
        </mesh>

        {/* 뒷면(+X) 가죽 북면 */}
        <mesh position={[spec.depth / 2 + 0.004, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[spec.radius * 0.9, spec.radius * 0.9, 0.01, 16]} />
          <meshStandardMaterial color="#f8edd8" roughness={0.8} />
        </mesh>
      </group>
    );

    return (
      <group>
        {/* 오른쪽 어깨(-X)에서 왼쪽 허리 북(+X)으로 대각선으로 내려오는 천 스트랩(어깨 끈) */}
        <mesh
          position={[0.04, 0.55, 0.05]}
          rotation={[0.28, 0.22, -0.78]}
          scale={[1.02, 1.32, 0.78]}
        >
          <torusGeometry args={[0.27, 0.022, 8, 24]} />
          <meshStandardMaterial color="#23304f" roughness={0.85} />
        </mesh>

        {/* 실제 Blender GLB(존재 시 자동 로드 — 왼쪽 허리 카츠기 자세로 배치) */}
        <group position={spec.pos} rotation={slungRotation}>
          <GlbModel url={glbUrl} fallback={null} />
        </group>

        {/* GLB가 없을 때만 임시 도형 표시 */}
        <FallbackWhenMissing url={glbUrl} fallback={placeholderDrum} />
      </group>
    );
  }

  return null;
}

/**
 * Layer 5 (바닥 받침대형): 締め(〆), 平, 中, 大, たる처럼 바닥 y = 0에 받침대를 두고 치는 악기
 * - public/models/instruments/inst_*.glb의 원점이 바닥(y = 0)이므로 캐릭터 앞쪽 바닥에 그대로 배치합니다.
 */
export function CharacterFloorInstrument({
  instrument,
}: {
  instrument: EquippedInstrumentId;
}) {
  if (
    instrument !== 'shime' &&
    instrument !== 'hira' &&
    instrument !== 'chu' &&
    instrument !== 'odaiko' &&
    instrument !== 'taru'
  ) {
    return null;
  }

  const glbUrl = `/models/instruments/inst_${instrument}.glb`;
  const specMap = {
    shime: { radius: 0.155, depth: 0.1, y: 0.36, z: 0.48, color: '#c94632' },
    hira: { radius: 0.24, depth: 0.12, y: 0.44, z: 0.56, color: '#9c522b' },
    chu: { radius: 0.24, depth: 0.3, y: 0.52, z: 0.62, color: '#7e3b24' },
    odaiko: { radius: 0.31, depth: 0.38, y: 0.62, z: 0.68, color: '#6b291e' },
    taru: { radius: 0.2, depth: 0.32, y: 0.46, z: 0.56, color: '#8f6237' },
  } as const;
  const spec = specMap[instrument];

  const placeholderFloorDrum = (
    <group position={[0, spec.y, 0]} rotation={[0.48, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[spec.radius, spec.radius, spec.depth, 16]} />
        <meshStandardMaterial color={spec.color} roughness={0.76} />
      </mesh>
      <mesh position={[0, 0, spec.depth / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[spec.radius * 0.9, spec.radius * 0.9, 0.01, 16]} />
        <meshStandardMaterial color="#fbf2e0" roughness={0.78} />
      </mesh>
    </group>
  );

  // 大(odaiko)와 中(chu)는 전용 GLB가 아직 없을 때 광장용 나가도 다이코(inst_taiko_nagado.glb)를 크기별로 자동 공유
  const effectiveFallback =
    instrument === 'odaiko' || instrument === 'chu' ? (
      <GlbModel
        url="/models/instruments/inst_taiko_nagado.glb"
        scale={instrument === 'odaiko' ? 0.85 : 0.72}
        fallback={placeholderFloorDrum}
      />
    ) : (
      placeholderFloorDrum
    );

  return (
    <group position={[0, 0, spec.z]}>
      <GlbModel url={glbUrl} fallback={effectiveFallback} />
    </group>
  );
}

/** 지정 URL의 GLB가 존재하지 않을 때만 fallback 도형을 그리는 경량 헬퍼 */
function FallbackWhenMissing({
  url,
  fallback,
}: {
  url: string;
  fallback: ReactNode;
}) {
  const exists = useAssetAvailability(url);
  if (exists) return null;
  return <>{fallback}</>;
}

/**
 * 플레이어와 NPC가 함께 사용하는 5-레이어 모듈식 동물 캐릭터 컴포넌트
 * - Layer 1: 단체별 고정 동물 종족 바디 (転太鼓舞 = 토끼, 鶴亀会 = 거북이)
 * - Layer 2: 단체 공통 法被(하피) 의상 + 깃 테두리 + 허리띠
 * - Layer 3: 256x256 2D CanvasTexture 얼굴 (자동 눈 깜빡임 + 연주 표정 전환)
 * - Layer 4: 헤어 / 머리 장식 파츠 (Socket_Head)
 * - Layer 5: 장비 타이코 / 악기 (어깨북, 시메, 피리, 차파, 연주용 바치)
 * - 스쿼시&스트레치 + 토끼 귀 시간차 흔들림(오버랩)으로 귀여운 움직임을 구현합니다.
 */
export const Character = memo(function Character({
  appearance,
  actionRef,
  headLookYawRef,
  walkSpeedScaleRef,
}: CharacterProps) {
  const group = getTaikoGroupById(appearance.groupId);
  const { species } = group;
  const { face, hair, equippedInstrument } = appearance;

  // public/models/characters/char_body_rabbit.glb 또는 char_body_turtle.glb 존재 여부 자동 감지
  const hasBodyGlb = useAssetAvailability(group.bodyModelPath);
  // public/models/characters/char_happi_base.glb 공통 하피 의상 GLB 존재 여부 자동 감지
  const hasHappiGlb = useAssetAvailability('/models/characters/char_happi_base.glb');

  // 애니메이션 제어용 3D 그룹 ref
  const bodyGroupRef = useRef<Group>(null);
  const headGroupRef = useRef<Group>(null);
  const leftEarRef = useRef<Group>(null);
  const rightEarRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const bachiLeftRef = useRef<Group>(null);
  const bachiRightRef = useRef<Group>(null);

  // 각 캐릭터마다 겹치지 않는 애니메이션 위상 & 자동 깜빡임 타이머
  const animPhaseRef = useRef(Math.random() * Math.PI * 2);
  const blinkTimerRef = useRef(1.5 + Math.random() * 3.2);
  const isBlinkingRef = useRef(false);
  const lastExpressionRef = useRef<FaceExpression>('idle');

  // Layer 3: 2D CanvasTexture 생성 (GLB 전환 시 새 텍스처로 flipY를 최초 업로드 전에 확정, 언마운트 시 GPU 메모리 해제)
  const faceResources = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_CANVAS_SIZE;
    canvas.height = FACE_CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    // glTF 표준 UV는 flipY = false, 임시 SphereGeometry는 flipY = true
    texture.flipY = !hasBodyGlb;
    return { canvas, ctx, texture };
  }, [hasBodyGlb]);

  useEffect(() => {
    return () => {
      faceResources.texture.dispose();
    };
  }, [faceResources]);

  // 얼굴 커스터마이징 설정이 바뀌거나 GLB <-> 임시 모델 전환 시 2D 캔버스 그림 갱신
  useEffect(() => {
    if (!faceResources.ctx) return;
    drawFaceToCanvas(faceResources.ctx, face, {
      isBlinking: isBlinkingRef.current,
      expression: lastExpressionRef.current,
      backgroundColor: hasBodyGlb ? group.bodyColor : undefined,
    });
    faceResources.texture.needsUpdate = true;
  }, [face, faceResources, group.bodyColor, hasBodyGlb]);

  // 북채(바치)를 쓰는 악기인지 판별 (피리·차파·쟝가라·방울·부채는 자체 손 악기/소품 사용)
  const usesBachi =
    equippedInstrument !== 'fue' &&
    equippedInstrument !== 'chappa' &&
    equippedInstrument !== 'jangara' &&
    equippedInstrument !== 'suzu' &&
    equippedInstrument !== 'uchiwa';

  // 왼쪽 허리에 비스듬히 매는 카츠기 어깨북(尺 2·4·5·6, 沖, エイサー, 担ぎ) 여부
  const isSideSlungTaiko =
    equippedInstrument === 'shaku_2' ||
    equippedInstrument === 'shaku_4' ||
    equippedInstrument === 'shaku_5' ||
    equippedInstrument === 'shaku_6' ||
    equippedInstrument === 'oki' ||
    equippedInstrument === 'eisa' ||
    equippedInstrument === 'katsugi';

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const action = actionRef.current;

    // 1) 자동 눈 깜빡임 + 행동 기반 표정 전환 (실제 Blender GLB와 임시 캐릭터 모두 공통으로 동작!)
    const targetExpression: FaceExpression =
      action === 'play' ? 'play' : 'idle';
    let faceNeedsRedraw = false;

    if (targetExpression !== lastExpressionRef.current) {
      lastExpressionRef.current = targetExpression;
      faceNeedsRedraw = true;
    }

    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      if (isBlinkingRef.current) {
        isBlinkingRef.current = false;
        blinkTimerRef.current = 2.4 + Math.random() * 2.8;
      } else {
        isBlinkingRef.current = true;
        blinkTimerRef.current = 0.13;
      }
      faceNeedsRedraw = true;
    }

    if (faceNeedsRedraw && faceResources.ctx) {
      drawFaceToCanvas(faceResources.ctx, face, {
        isBlinking: isBlinkingRef.current,
        expression: lastExpressionRef.current,
        backgroundColor: hasBodyGlb ? group.bodyColor : undefined,
      });
      faceResources.texture.needsUpdate = true;
    }

    // 실제 Blender 스킨드 GLB가 활성화되어 있으면 모션은 SkinnedCharacterGlb가 전담
    if (hasBodyGlb) return;

    if (!bodyGroupRef.current || !leftArmRef.current || !rightArmRef.current) {
      return;
    }

    // 2) 부드러운 로우폴리 동작 (스쿼시&스트레치 + 아장아장 걸음 + 팔/다리/귀 시간차 모션)
    const smoothLerp = Math.min(delta * 12, 1);

    let targetBodyY = 0;
    let targetBodyRotZ = 0;
    let targetScaleY = 1;
    let targetScaleXZ = 1;
    let targetLeftArmX = 0;
    let targetRightArmX = 0;
    let targetLeftArmZ = 0;
    // 왼쪽 허리에 어깨북을 메고 있을 때는 캐릭터 왼팔(+X)을 살짝 바깥으로 열어 북과 겹치지 않게 보정
    let targetRightArmZ = isSideSlungTaiko ? 0.34 : 0;
    let targetLeftLegX = 0;
    let targetRightLegX = 0;
    let targetHeadRotZ = 0;
    let targetEarSwing = 0;

    if (action === 'walk') {
      // 걷기: 통통 뛰는 발걸음 + 좌우 갸웃거림 (플레이어가 가까이 와서 느리게 걸을 때는 모션 속도도 맞춰 천천히!)
      const speedScale = walkSpeedScaleRef?.current ?? 1;
      const walkCadence = 0.45 + 0.55 * speedScale;
      animPhaseRef.current += delta * 12.5 * walkCadence;
      const phase = animPhaseRef.current;
      const bounce = Math.abs(Math.sin(phase));
      const strideAmp = 0.55 + 0.45 * speedScale;

      targetBodyY = bounce * 0.085 * strideAmp;
      targetBodyRotZ = Math.sin(phase) * 0.065 * strideAmp;
      targetScaleY = 0.95 + bounce * 0.09 * strideAmp;
      targetScaleXZ = 1.03 - bounce * 0.05 * strideAmp;

      targetLeftArmX = Math.sin(phase) * 0.55 * strideAmp;
      targetRightArmX = -Math.sin(phase) * 0.55 * strideAmp;
      targetLeftLegX = -Math.sin(phase) * 0.58 * strideAmp;
      targetRightLegX = Math.sin(phase) * 0.58 * strideAmp;
      targetHeadRotZ = -Math.sin(phase) * 0.05 * strideAmp;
      // 토끼 귀는 몸의 바운스보다 약 0.6라디안 늦게 팔랑거림 (오버랩 모션)
      targetEarSwing = Math.sin(phase - 0.6) * 0.24 * strideAmp;
    } else if (action === 'play') {
      // 연주: 리듬에 맞춰 고개 끄덕임 + 악기별 팔 동작
      animPhaseRef.current += delta * 9.0;
      const phase = animPhaseRef.current;
      const beat = Math.abs(Math.sin(phase));

      targetBodyY = beat * 0.045;
      targetScaleY = 0.96 + beat * 0.07;
      targetScaleXZ = 1.02 - beat * 0.035;
      targetHeadRotZ = Math.sin(phase * 0.5) * 0.08;
      targetEarSwing = Math.sin(phase - 0.5) * 0.3;

      if (equippedInstrument === 'fue') {
        // 피리 연주: 양팔을 입 쪽으로 올려 가로로 부는 자세
        targetLeftArmX = -1.15 + Math.sin(phase * 0.5) * 0.08;
        targetRightArmX = -1.25 + Math.sin(phase * 0.5) * 0.08;
      } else if (equippedInstrument === 'chappa' || equippedInstrument === 'jangara') {
        // 차파·쟝가라 연주: 양팔을 앞으로 모아 박자에 맞춰 짝짝 맞부딪힘
        targetLeftArmX = -0.95 + Math.sin(phase) * 0.38;
        targetRightArmX = -0.95 + Math.sin(phase) * 0.38;
      } else if (equippedInstrument === 'suzu' || equippedInstrument === 'uchiwa') {
        // 방울·부채: 신나게 팔을 들어 좌우로 흔듦
        targetLeftArmX = -0.5 + Math.sin(phase) * 0.3;
        targetRightArmX = -1.25 + Math.sin(phase * 1.4) * 0.45;
      } else if (isSideSlungTaiko) {
        // 카츠기 어깨북 연주: 오른팔(-X)이 왼쪽 허리 북 앞면으로 대각선 스윙, 왼팔(+X)이 바깥면 리듬 타격
        targetLeftArmX = -0.95 + Math.sin(phase) * 0.65;
        targetLeftArmZ = 0.42;
        targetRightArmX = -0.78 - Math.sin(phase) * 0.52;
        targetRightArmZ = 0.24;
      } else {
        // 일반 타이코(시메 등) 연주: 양팔이 번갈아 위아래로 힘차게 타격
        targetLeftArmX = -0.88 + Math.sin(phase) * 0.62;
        targetRightArmX = -0.88 - Math.sin(phase) * 0.62;
      }
    } else {
      // 대기(idle): 포근한 숨쉬기 + 토끼 귀 살짝 까딱임
      animPhaseRef.current += delta * 2.5;
      const phase = animPhaseRef.current;
      const breath = Math.sin(phase);

      targetBodyY = breath * 0.01;
      targetScaleY = 1 + breath * 0.022;
      targetScaleXZ = 1 - breath * 0.012;
      targetEarSwing = Math.sin(phase - 0.5) * 0.09;
    }

    // 부드러운 보간(Lerp)으로 상태 전환 시 뚝 끊기지 않게 처리
    bodyGroupRef.current.position.y +=
      (targetBodyY - bodyGroupRef.current.position.y) * smoothLerp;
    bodyGroupRef.current.rotation.z +=
      (targetBodyRotZ - bodyGroupRef.current.rotation.z) * smoothLerp;
    bodyGroupRef.current.scale.set(
      bodyGroupRef.current.scale.x +
        (targetScaleXZ - bodyGroupRef.current.scale.x) * smoothLerp,
      bodyGroupRef.current.scale.y +
        (targetScaleY - bodyGroupRef.current.scale.y) * smoothLerp,
      bodyGroupRef.current.scale.z +
        (targetScaleXZ - bodyGroupRef.current.scale.z) * smoothLerp
    );

    leftArmRef.current.rotation.x +=
      (targetLeftArmX - leftArmRef.current.rotation.x) * smoothLerp;
    leftArmRef.current.rotation.z +=
      (targetLeftArmZ - leftArmRef.current.rotation.z) * smoothLerp;
    rightArmRef.current.rotation.x +=
      (targetRightArmX - rightArmRef.current.rotation.x) * smoothLerp;
    rightArmRef.current.rotation.z +=
      (targetRightArmZ - rightArmRef.current.rotation.z) * smoothLerp;

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x +=
        (targetLeftLegX - leftLegRef.current.rotation.x) * smoothLerp;
      rightLegRef.current.rotation.x +=
        (targetRightLegX - rightLegRef.current.rotation.x) * smoothLerp;
    }

    if (headGroupRef.current) {
      const targetHeadYaw = headLookYawRef?.current ?? 0;
      headGroupRef.current.rotation.y +=
        (targetHeadYaw - headGroupRef.current.rotation.y) * smoothLerp;
      headGroupRef.current.rotation.z +=
        (targetHeadRotZ - headGroupRef.current.rotation.z) * smoothLerp;
    }

    if (leftEarRef.current && rightEarRef.current) {
      leftEarRef.current.rotation.x +=
        (-0.08 + targetEarSwing - leftEarRef.current.rotation.x) * smoothLerp;
      rightEarRef.current.rotation.x +=
        (-0.08 + targetEarSwing * 0.85 - rightEarRef.current.rotation.x) * smoothLerp;
    }

    // 북채(바치)는 타이코 계열 악기일 때 연주 중에만 표시
    const showBachi = action === 'play' && usesBachi;
    if (bachiLeftRef.current) bachiLeftRef.current.visible = showBachi;
    if (bachiRightRef.current) bachiRightRef.current.visible = showBachi;
  });

  const placeholderCharacter = (
    <group>
      {/* 가벼운 블롭 그림자 (바닥 y = 0.015 고정) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* Layer 5 (바닥 받침대형): 시메다이코(締め) GLB — 바닥 y = 0에 안정적으로 배치 */}
      <CharacterFloorInstrument instrument={equippedInstrument} />

      {/* 공통 애니메이션(스쿼시&스트레치 + 바운스)이 적용되는 캐릭터 본체 */}
      <group ref={bodyGroupRef}>
        {/* 왼발 / 오른발 (종족 피부색 + 어두운 버선/타비 신발) */}
        <group ref={leftLegRef} position={[-0.12, 0.2, 0]}>
          <mesh position={[0, -0.1, 0.01]}>
            <boxGeometry args={[0.135, 0.19, 0.18]} />
            <meshStandardMaterial color="#343440" roughness={0.82} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.12, 0.2, 0]}>
          <mesh position={[0, -0.1, 0.01]}>
            <boxGeometry args={[0.135, 0.19, 0.18]} />
            <meshStandardMaterial color="#343440" roughness={0.82} />
          </mesh>
        </group>

        {/* Layer 2: 단체 공통 法被(하피) 몸통 */}
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.54, 14]} />
          <meshStandardMaterial color={group.happiColor} roughness={0.76} />
        </mesh>

        {/* 法被 아래단 테두리 띠 */}
        <mesh position={[0, 0.23, 0]}>
          <cylinderGeometry args={[0.276, 0.284, 0.06, 14]} />
          <meshStandardMaterial color={group.happiBorderColor} roughness={0.8} />
        </mesh>

        {/* 法被 앞 깃(에리) V자 포인트 */}
        <mesh position={[-0.06, 0.56, 0.22]} rotation={[0.08, 0, -0.22]}>
          <boxGeometry args={[0.055, 0.34, 0.04]} />
          <meshStandardMaterial color={group.happiBorderColor} roughness={0.78} />
        </mesh>
        <mesh position={[0.06, 0.56, 0.22]} rotation={[0.08, 0, 0.22]}>
          <boxGeometry args={[0.055, 0.34, 0.04]} />
          <meshStandardMaterial color={group.happiBorderColor} roughness={0.78} />
        </mesh>

        {/* 허리띠(오비) */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.258, 0.268, 0.095, 14]} />
          <meshStandardMaterial color={group.obiColor} roughness={0.7} />
        </mesh>

        {/* Layer 1 (등 특징): 토끼 꼬리 vs 거북이 등껍질 (Socket_Back) */}
        {species === 'rabbit' ? (
          // 몽실몽실한 둥근 토끼 꼬리
          <mesh position={[0, 0.3, -0.27]}>
            <sphereGeometry args={[0.095, 10, 10]} />
            <meshStandardMaterial color={group.bodyColor} roughness={0.85} />
          </mesh>
        ) : (
          // 귀여운 로우폴리 거북이 등껍질 + 밝은 테두리 림 + 작은 꼬리
          <group position={[0, 0.49, -0.2]}>
            <mesh scale={[1.0, 1.15, 0.72]}>
              <dodecahedronGeometry args={[0.26, 1]} />
              <meshStandardMaterial color={group.accentColor} roughness={0.72} flatShading />
            </mesh>
            <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[1.02, 1.0, 1.16]}>
              <torusGeometry args={[0.23, 0.036, 8, 16]} />
              <meshStandardMaterial color="#dfd0a8" roughness={0.82} />
            </mesh>
            <mesh position={[0, -0.24, -0.07]} rotation={[0.6, 0, 0]}>
              <coneGeometry args={[0.045, 0.11, 6]} />
              <meshStandardMaterial color={group.bodyColor} roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* Layer 5: 가슴/허리 앞쪽 장비 타이코 (Socket_Instrument_Chest) */}
        <CharacterChestInstrument instrument={equippedInstrument} />

        {/* 왼팔 + 손 + 북채(바치) / 차파(좌) */}
        <group ref={leftArmRef} position={[-0.28, 0.65, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.068, 0.075, 0.28, 8]} />
            <meshStandardMaterial color={group.happiColor} roughness={0.76} />
          </mesh>
          <mesh position={[0, -0.29, 0]}>
            <sphereGeometry args={[0.066, 10, 10]} />
            <meshStandardMaterial color={group.bodyColor} roughness={0.78} />
          </mesh>
          {/* 연주 중 표시되는 왼손 나무 북채 */}
          <group ref={bachiLeftRef} visible={false} position={[0, -0.29, 0.14]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.026, 0.35, 6]} />
              <meshStandardMaterial color="#e8c891" roughness={0.7} />
            </mesh>
          </group>
          {/* 차파·쟝가라 장비 시 왼손 금속 심벌즈 */}
          {(equippedInstrument === 'chappa' || equippedInstrument === 'jangara') && (
            <mesh position={[0.05, -0.29, 0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry
                args={[
                  equippedInstrument === 'jangara' ? 0.115 : 0.085,
                  equippedInstrument === 'jangara' ? 0.115 : 0.085,
                  0.016,
                  14,
                ]}
              />
              <meshStandardMaterial color="#e4b73d" metalness={0.55} roughness={0.35} />
            </mesh>
          )}
          {/* 파란쿠(パーランクー) / 치키(チキ) 장비 시 왼손 소형 타악기 */}
          {equippedInstrument === 'paranku' && (
            <group position={[0.04, -0.29, 0.12]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.11, 0.11, 0.045, 14]} />
                <meshStandardMaterial color="#c94632" roughness={0.75} />
              </mesh>
              <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.098, 0.098, 0.008, 14]} />
                <meshStandardMaterial color="#f8edd8" roughness={0.8} />
              </mesh>
            </group>
          )}
          {equippedInstrument === 'chiki' && (
            <mesh position={[0.04, -0.29, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.075, 0.065, 0.035, 14]} />
              <meshStandardMaterial color="#d4a73d" metalness={0.65} roughness={0.32} />
            </mesh>
          )}
        </group>

        {/* 오른팔 + 손 + 북채(바치) / 피리(笛) / 차파·쟝가라 / 방울(鈴) / 부채(うちわ) */}
        <group ref={rightArmRef} position={[0.28, 0.65, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.068, 0.075, 0.28, 8]} />
            <meshStandardMaterial color={group.happiColor} roughness={0.76} />
          </mesh>
          <mesh position={[0, -0.29, 0]}>
            <sphereGeometry args={[0.066, 10, 10]} />
            <meshStandardMaterial color={group.bodyColor} roughness={0.78} />
          </mesh>
          {/* 연주 중 표시되는 오른손 나무 북채 */}
          <group ref={bachiRightRef} visible={false} position={[0, -0.29, 0.14]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.026, 0.35, 6]} />
              <meshStandardMaterial color="#e8c891" roughness={0.7} />
            </mesh>
          </group>
          {/* 피리(笛) 장비 시 가로 대나무 피리 */}
          {equippedInstrument === 'fue' && (
            <group position={[-0.08, -0.28, 0.1]} rotation={[0, 0, Math.PI / 2]}>
              <mesh>
                <cylinderGeometry args={[0.016, 0.018, 0.42, 8]} />
                <meshStandardMaterial color="#d9b46c" roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.019, 0.019, 0.03, 8]} />
                <meshStandardMaterial color="#b53b2a" roughness={0.7} />
              </mesh>
            </group>
          )}
          {/* 차파·쟝가라 장비 시 오른손 금속 심벌즈 */}
          {(equippedInstrument === 'chappa' || equippedInstrument === 'jangara') && (
            <mesh position={[-0.05, -0.29, 0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry
                args={[
                  equippedInstrument === 'jangara' ? 0.115 : 0.085,
                  equippedInstrument === 'jangara' ? 0.115 : 0.085,
                  0.016,
                  14,
                ]}
              />
              <meshStandardMaterial color="#e4b73d" metalness={0.55} roughness={0.35} />
            </mesh>
          )}
          {/* 방울(鈴) 장비 시 전통 방울 */}
          {equippedInstrument === 'suzu' && (
            <group position={[0, -0.29, 0.12]} rotation={[0.5, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[0.018, 0.02, 0.16, 8]} />
                <meshStandardMaterial color="#a83228" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color="#f2c94c" metalness={0.65} roughness={0.3} />
              </mesh>
            </group>
          )}
          {/* 부채(うちわ) 장비 시 전통 원형 부채 */}
          {equippedInstrument === 'uchiwa' && (
            <group position={[0, -0.28, 0.14]} rotation={[0.45, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[0.014, 0.014, 0.14, 6]} />
                <meshStandardMaterial color="#d9b46c" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.012, 16]} />
                <meshStandardMaterial color="#fff8eb" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.15, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.006, 14]} />
                <meshStandardMaterial color="#d94b38" roughness={0.8} />
              </mesh>
            </group>
          )}
        </group>

        {/* 머리 + 종족 귀 + 2D CanvasTexture 얼굴 + 헤어 파츠 */}
        <group ref={headGroupRef}>
          {/* 머리 기본 구 */}
          <mesh position={[0, 0.98, 0]}>
            <sphereGeometry args={[0.26, 18, 16]} />
            <meshStandardMaterial color={group.bodyColor} roughness={0.78} />
          </mesh>

          {/* Layer 1 (머리 특징): 토끼 긴 귀 (시간차 오버랩 흔들림 적용) */}
          {species === 'rabbit' && (
            <>
              <group ref={leftEarRef} position={[-0.1, 1.19, -0.02]} rotation={[-0.08, 0, 0.14]}>
                <mesh position={[0, 0.14, 0]} scale={[0.72, 1.35, 0.5]}>
                  <capsuleGeometry args={[0.068, 0.13, 6, 10]} />
                  <meshStandardMaterial color={group.bodyColor} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.13, 0.026]} scale={[0.45, 1.05, 0.25]}>
                  <capsuleGeometry args={[0.058, 0.11, 6, 8]} />
                  <meshStandardMaterial color={group.accentColor} roughness={0.82} />
                </mesh>
              </group>
              <group ref={rightEarRef} position={[0.1, 1.19, -0.02]} rotation={[-0.08, 0, -0.14]}>
                <mesh position={[0, 0.14, 0]} scale={[0.72, 1.35, 0.5]}>
                  <capsuleGeometry args={[0.068, 0.13, 6, 10]} />
                  <meshStandardMaterial color={group.bodyColor} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.13, 0.026]} scale={[0.45, 1.05, 0.25]}>
                  <capsuleGeometry args={[0.058, 0.11, 6, 8]} />
                  <meshStandardMaterial color={group.accentColor} roughness={0.82} />
                </mesh>
              </group>
            </>
          )}

          {/* Layer 3: 2D CanvasTexture 얼굴 (머리 앞면 곡률에 밀착되는 Mat_Face 구면 패치) */}
          <mesh name="Mat_Face" position={[0, 0.98, 0]}>
            <sphereGeometry
              args={[
                0.264,
                16,
                12,
                Math.PI / 2 - 0.58,
                1.16,
                Math.PI / 2 - 0.52,
                1.04,
              ]}
            />
            <meshBasicMaterial
              map={faceResources.texture}
              transparent
              alphaTest={0.02}
              depthWrite={false}
            />
          </mesh>

          {/* Layer 4: 교체 가능한 헤어 / 머리 장식 파츠 (Socket_Head) */}
          <CharacterHairPart hair={hair} group={group} species={species} />
        </group>
      </group>
    </group>
  );

  // Blender 종족 바디 GLB가 public/models/characters/에 준비되어 있으면
  // 자동으로 스킨드 애니메이션 캐릭터(SkeletonUtils.clone + 0.2초 크로스페이드)로 교체
  if (hasBodyGlb && group.bodyModelPath) {
    return (
      <ModelErrorBoundary fallback={placeholderCharacter}>
        <Suspense fallback={placeholderCharacter}>
          <SkinnedCharacterGlb
            key={hasHappiGlb ? 'with-happi' : 'body-only'}
            bodyUrl={group.bodyModelPath}
            happiUrl={hasHappiGlb ? '/models/characters/char_happi_base.glb' : undefined}
            group={group}
            appearance={appearance}
            faceTexture={faceResources.texture}
            actionRef={actionRef}
            headLookYawRef={headLookYawRef}
            walkSpeedScaleRef={walkSpeedScaleRef}
          />
        </Suspense>
      </ModelErrorBoundary>
    );
  }

  return placeholderCharacter;
});
