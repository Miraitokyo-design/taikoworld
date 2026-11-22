import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import type { CanvasTexture, Group, Material, Object3D, Texture } from 'three';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {
  CharacterAppearance,
  CharacterHairStyle,
  EquippedInstrumentId,
  TaikoGroupConfig,
} from '../types/content';
import type { PlayerAction } from '../types/world';
import { GlbModel, useAssetAvailability } from './GlbModel';

interface SkinnedCharacterGlbProps {
  /** 종족 바디 GLB 파일 경로 (예: "/models/characters/char_body_rabbit.glb") */
  bodyUrl: string;
  /** 소속 단체 설정 (하피 텍스처 경로 및 기본 색상) */
  group: TaikoGroupConfig;
  /** 캐릭터 외형 (헤어, 장비 타이코 등 소켓 부착 정보) */
  appearance: CharacterAppearance;
  /** Character 컴포넌트가 실시간으로 그리는 256x256 2D 얼굴 CanvasTexture */
  faceTexture: CanvasTexture;
  /** 현재 행동 상태('idle' | 'walk' | 'play')를 60fps로 읽어오는 ref */
  actionRef: MutableRefObject<PlayerAction>;
}

/** 애니메이션 상태 전환 시 뚝 끊기지 않게 부드럽게 섞어주는 크로스페이드 시간(초) */
const CROSSFADE_SECONDS = 0.2;

/** 단체별 하피 텍스처를 중복 로드하지 않기 위한 캐시 */
const happiTextureLoader = new TextureLoader();
const happiTextureCache = new Map<string, Texture>();

/** 헤어 ID를 docs/ASSET_MODULAR_GUIDE.md 규격 GLB 경로로 변환 */
function getHairModelUrl(hair: CharacterHairStyle): string | undefined {
  if (hair === 'hair_none') return undefined;
  return `/models/characters/${hair}.glb`;
}

/** 장비 악기 ID를 docs/ASSET_MODULAR_GUIDE.md 규격 GLB 경로로 변환 */
function getInstrumentModelUrl(instrument: EquippedInstrumentId): string | undefined {
  if (instrument === 'none') return undefined;
  return `/models/instruments/inst_${instrument}.glb`;
}

/**
 * Blender에서 제작한 뼈대(Armature) 포함 캐릭터 GLB를 불러와 5-레이어 모듈화를 자동 연결하는 컴포넌트
 * - SkeletonUtils.clone을 사용해 여러 NPC가 같은 토끼/거북이 GLB를 써도 뼈대가 서로 꼬이지 않습니다.
 * - useAnimations로 Blender Action 클립(idle, walk, play_strong, play_weak)을 0.2초 크로스페이드로 부드럽게 전환합니다.
 * - Mat_Face 머티리얼에는 2D CanvasTexture 얼굴을, Mat_Happi 머티리얼에는 단체 하피 텍스처/색상을 자동 연결합니다.
 * - Socket_Head / Socket_Instrument_Chest / Socket_Hand_L / Socket_Hand_R 소켓을 찾아 헤어·악기·북채 GLB를 자동 장착합니다.
 */
export function SkinnedCharacterGlb({
  bodyUrl,
  group,
  appearance,
  faceTexture,
  actionRef,
}: SkinnedCharacterGlbProps) {
  const wrapperRef = useRef<Group>(null);
  const bachiLeftRef = useRef<Group>(null);
  const bachiRightRef = useRef<Group>(null);

  // 1) GLB 로드 & 뼈대 안전 복제 (SkeletonUtils.clone)
  const { scene, animations } = useGLTF(bodyUrl);
  const clonedScene = useMemo(() => cloneSkinnedScene(scene), [scene]);

  // 2) Blender Action 클립 바인딩 (idle, walk, play_strong, play_weak)
  const { actions } = useAnimations(animations, clonedScene);
  const currentClipRef = useRef<string | null>(null);
  const bouncePhaseRef = useRef(Math.random() * Math.PI * 2);

  // 3) 단체 하피 텍스처 파일 존재 여부 확인 (public/textures/happi/*.webp)
  const hasHappiTexture = useAssetAvailability(group.happiTexture);

  // 4) Blender 내 소켓(Empty 또는 Bone) 탐색 — 없으면 null로 안전하게 건너뜀
  const sockets = useMemo(() => {
    const findSocket = (name: string): Object3D | null =>
      clonedScene.getObjectByName(name) ?? null;

    return {
      head: findSocket('Socket_Head'),
      chest: findSocket('Socket_Instrument_Chest'),
      handL: findSocket('Socket_Hand_L'),
      handR: findSocket('Socket_Hand_R'),
    };
  }, [clonedScene]);

  // 5) Mat_Face(2D 캔버스 얼굴) 및 Mat_Happi(단체 공통 하피) 머티리얼 자동 바인딩
  useEffect(() => {
    const clonedMaterials: Material[] = [];
    let cancelled = false;

    const applyHappiToMaterial = (mat: MeshStandardMaterial) => {
      if (hasHappiTexture && group.happiTexture) {
        const cached = happiTextureCache.get(group.happiTexture);
        if (cached) {
          mat.map = cached;
          mat.color.set('#ffffff');
          mat.needsUpdate = true;
        } else {
          happiTextureLoader.load(group.happiTexture, (loadedTex) => {
            if (cancelled) return;
            loadedTex.colorSpace = SRGBColorSpace;
            // glTF 표준 UV는 flipY = false
            loadedTex.flipY = false;
            happiTextureCache.set(group.happiTexture, loadedTex);
            mat.map = loadedTex;
            mat.color.set('#ffffff');
            mat.needsUpdate = true;
          });
        }
      } else {
        // 아직 하피 텍스처 이미지가 없다면 단체 기본 색상으로 깔끔하게 채색
        mat.map = null;
        mat.color = new Color(group.happiColor);
        mat.needsUpdate = true;
      }
    };

    const bindMaterial = (original: Material, meshName: string): Material => {
      const matNameLower = original.name.toLowerCase();
      const meshNameLower = meshName.toLowerCase();

      // Layer 3: 얼굴 앞면 슬롯(Mat_Face) -> 256x256 2D CanvasTexture 자동 연결
      if (matNameLower === 'mat_face' || meshNameLower === 'mat_face') {
        const cloned = original.clone();
        if (cloned instanceof MeshStandardMaterial) {
          cloned.map = faceTexture;
          cloned.transparent = true;
          cloned.alphaTest = 0.02;
          cloned.needsUpdate = true;
        }
        clonedMaterials.push(cloned);
        return cloned;
      }

      // Layer 2: 단체 하피 슬롯(Mat_Happi) -> 단체별 512px 텍스처 또는 색상 자동 연결
      if (matNameLower === 'mat_happi' || meshNameLower === 'mat_happi') {
        const cloned = original.clone();
        if (cloned instanceof MeshStandardMaterial) {
          applyHappiToMaterial(cloned);
        }
        clonedMaterials.push(cloned);
        return cloned;
      }

      return original;
    };

    clonedScene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => bindMaterial(m, obj.name));
      } else if (obj.material) {
        obj.material = bindMaterial(obj.material, obj.name);
      }
    });

    return () => {
      cancelled = true;
      for (const mat of clonedMaterials) {
        mat.dispose();
      }
    };
  }, [clonedScene, faceTexture, group.happiColor, group.happiTexture, hasHappiTexture]);

  // 6) 매 프레임 행동 상태(actionRef)에 따라 0.2초 크로스페이드 애니메이션 + 미세 탄력감 구동
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const action = actionRef.current;

    // 상태별 우선순위 클립 탐색 (Blender에 등록한 클립 이름과 자동 매칭)
    const desiredCandidates =
      action === 'walk'
        ? ['walk', 'Walk']
        : action === 'play'
          ? ['play_strong', 'play_weak', 'play', 'Play']
          : ['idle', 'Idle'];

    let nextClipName: string | null = null;
    for (const candidate of desiredCandidates) {
      if (actions[candidate]) {
        nextClipName = candidate;
        break;
      }
    }

    // 지정 이름의 클립이 하나도 없다면 첫 번째 애니메이션 클립을 안전하게 재생
    if (!nextClipName) {
      const availableNames = Object.keys(actions);
      if (availableNames.length > 0) {
        nextClipName = availableNames[0];
      }
    }

    if (nextClipName && nextClipName !== currentClipRef.current) {
      const prevClip = currentClipRef.current ? actions[currentClipRef.current] : null;
      const nextClip = actions[nextClipName];

      if (nextClip) {
        prevClip?.fadeOut(CROSSFADE_SECONDS);
        nextClip.reset().fadeIn(CROSSFADE_SECONDS).play();
        currentClipRef.current = nextClipName;
      }
    }

    // Blender 애니메이션 위에 살짝 더해지는 귀여운 스쿼시&스트레치 보조 탄력감
    if (wrapperRef.current) {
      const smoothLerp = Math.min(delta * 12, 1);
      let targetScaleY = 1;
      let targetScaleXZ = 1;

      if (action === 'walk') {
        bouncePhaseRef.current += delta * 12.5;
        const bounce = Math.abs(Math.sin(bouncePhaseRef.current));
        targetScaleY = 0.97 + bounce * 0.05;
        targetScaleXZ = 1.015 - bounce * 0.025;
      } else if (action === 'play') {
        bouncePhaseRef.current += delta * 9.0;
        const beat = Math.abs(Math.sin(bouncePhaseRef.current));
        targetScaleY = 0.975 + beat * 0.045;
        targetScaleXZ = 1.012 - beat * 0.02;
      }

      wrapperRef.current.scale.set(
        wrapperRef.current.scale.x + (targetScaleXZ - wrapperRef.current.scale.x) * smoothLerp,
        wrapperRef.current.scale.y + (targetScaleY - wrapperRef.current.scale.y) * smoothLerp,
        wrapperRef.current.scale.z + (targetScaleXZ - wrapperRef.current.scale.z) * smoothLerp
      );
    }

    // 연주 중 타이코 계열 악기일 때만 양손 소켓의 북채(바치) GLB 표시
    const usesBachi =
      appearance.equippedInstrument !== 'fue' &&
      appearance.equippedInstrument !== 'chappa';
    const showBachi = action === 'play' && usesBachi;
    if (bachiLeftRef.current) bachiLeftRef.current.visible = showBachi;
    if (bachiRightRef.current) bachiRightRef.current.visible = showBachi;
  });

  const hairUrl = getHairModelUrl(appearance.hair);
  const instrumentUrl = getInstrumentModelUrl(appearance.equippedInstrument);
  const isChestInstrument =
    appearance.equippedInstrument === 'shaku_2' ||
    appearance.equippedInstrument === 'shaku_4' ||
    appearance.equippedInstrument === 'shaku_6' ||
    appearance.equippedInstrument === 'oki' ||
    appearance.equippedInstrument === 'shime';

  return (
    <group>
      {/* 가벼운 바닥 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 스킨드 캐릭터 본체 */}
      <group ref={wrapperRef}>
        <primitive object={clonedScene} />
      </group>

      {/* Layer 4: 헤어 파츠 GLB -> Socket_Head 소켓에 포털 부착 */}
      {sockets.head &&
        hairUrl &&
        createPortal(<GlbModel url={hairUrl} fallback={null} />, sockets.head)}

      {/* Layer 5: 어깨북/시메 GLB -> Socket_Instrument_Chest 소켓에 포털 부착 */}
      {sockets.chest &&
        isChestInstrument &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.chest)}

      {/* Layer 5: 피리(笛) GLB -> Socket_Hand_R 소켓에 포털 부착 */}
      {sockets.handR &&
        appearance.equippedInstrument === 'fue' &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handR)}

      {/* Layer 5: 차파(チャッパ) GLB -> 양손 소켓에 포털 부착 */}
      {sockets.handL &&
        appearance.equippedInstrument === 'chappa' &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handL)}
      {sockets.handR &&
        appearance.equippedInstrument === 'chappa' &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handR)}

      {/* 연주 중 양손 북채(inst_bachi.glb) -> 양손 소켓에 포털 부착 */}
      {sockets.handL &&
        createPortal(
          <group ref={bachiLeftRef} visible={false}>
            <GlbModel url="/models/instruments/inst_bachi.glb" fallback={null} />
          </group>,
          sockets.handL
        )}
      {sockets.handR &&
        createPortal(
          <group ref={bachiRightRef} visible={false}>
            <GlbModel url="/models/instruments/inst_bachi.glb" fallback={null} />
          </group>,
          sockets.handR
        )}
    </group>
  );
}
