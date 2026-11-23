import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import {
  AnimationClip,
  Bone,
  Color,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  SRGBColorSpace,
  Skeleton,
  SkinnedMesh,
  TextureLoader,
  VectorKeyframeTrack,
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
import {
  CharacterChestInstrument,
  CharacterFloorInstrument,
  CharacterHairPart,
} from './Character';
import { GlbModel, useAssetAvailability } from './GlbModel';

interface SkinnedCharacterGlbProps {
  /** 종족 바디 GLB 파일 경로 (예: "/models/characters/char_body_rabbit.glb") */
  bodyUrl: string;
  /** 공통 하피 의상 GLB 파일 경로 (예: "/models/characters/char_happi_base.glb", 선택) */
  happiUrl?: string;
  /** 소속 단체 설정 (하피 텍스처 경로 및 기본 색상) */
  group: TaikoGroupConfig;
  /** 캐릭터 외형 (헤어, 장비 타이코 등 소켓 부착 정보) */
  appearance: CharacterAppearance;
  /** Character 컴포넌트가 실시간으로 그리는 256x256 2D 얼굴 CanvasTexture */
  faceTexture: CanvasTexture;
  /** 현재 행동 상태('idle' | 'walk' | 'play')를 60fps로 읽어오는 ref */
  actionRef: MutableRefObject<PlayerAction>;
  /** 플레이어 근접 시 살짝 고개를 돌리는 Y축 각도 ref (선택) */
  headLookYawRef?: MutableRefObject<number>;
  /** 플레이어 근접 시 걸음 애니메이션 속도 배율 ref (선택) */
  walkSpeedScaleRef?: MutableRefObject<number>;
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
 * GLB에 아직 'walk' 클립만 있고 'idle' 또는 'play' 클립이 없을 때,
 * T-포즈(양팔 수평 벌림)나 제자리 걸음 대신 자연스러운 차렷 대기('idle')와
 * 양팔 연주('play') 클립을 Rigify 본 구조에 맞춰 자동 생성하는 보조 함수
 */
function buildFallbackAnimationClips(
  rootScene: Object3D,
  existingClips: AnimationClip[]
): AnimationClip[] {
  const hasIdle = existingClips.some((c) => /^idle$/i.test(c.name));
  const hasPlay = existingClips.some((c) => /^play(_strong|_weak)?$/i.test(c.name));
  if (hasIdle && hasPlay) {
    return existingClips;
  }

  const bones: Bone[] = [];
  rootScene.traverse((obj) => {
    if (obj instanceof Bone) {
      bones.push(obj);
    }
  });

  const result = [...existingClips];

  // 1) 'idle' 클립 자동 합성: 양발은 안정적으로 땅을 딛고, T-포즈 양팔만 자연스럽게 옆구리로 내린 차렷 숨쉬기 자세
  if (!hasIdle && bones.length > 0) {
    const idleTracks: (QuaternionKeyframeTrack | VectorKeyframeTrack)[] = [];
    const times = [0, 1.2, 2.4];

    for (const bone of bones) {
      const p = bone.position;
      idleTracks.push(
        new VectorKeyframeTrack(
          `${bone.name}.position`,
          times,
          [p.x, p.y, p.z, p.x, p.y, p.z, p.x, p.y, p.z]
        )
      );

      let q0 = bone.quaternion.clone();
      let q1 = bone.quaternion.clone();

      if (bone.name === 'DEF-upper_arm.L') {
        q0 = new Quaternion(-0.0282, -0.0057, -0.9382, 0.3448).normalize();
        q1 = new Quaternion(-0.0282, -0.0057, -0.932, 0.361).normalize();
      } else if (bone.name === 'DEF-upper_arm.R') {
        q0 = new Quaternion(-0.0426, -0.0001, 0.9424, 0.3316).normalize();
        q1 = new Quaternion(-0.0426, -0.0001, 0.936, 0.349).normalize();
      } else if (bone.name === 'DEF-forearm.L') {
        q0 = new Quaternion(0.3121, -0.0055, 0.0018, 0.95).normalize();
        q1 = q0.clone();
      } else if (bone.name === 'DEF-forearm.R') {
        q0 = new Quaternion(0.3121, 0.0056, -0.0018, 0.95).normalize();
        q1 = q0.clone();
      } else if (bone.name === 'DEF-ear.L') {
        // 토끼 왼쪽 귀 살짝 까딱임
        const sway = new Quaternion().setFromAxisAngle(
          { x: 1, y: 0, z: 0 } as never,
          0.045
        );
        q1 = q0.clone().multiply(sway).normalize();
      } else if (bone.name === 'DEF-ear.R') {
        // 토끼 오른쪽 귀 살짝 까딱임
        const sway = new Quaternion().setFromAxisAngle(
          { x: 1, y: 0, z: 0 } as never,
          -0.04
        );
        q1 = q0.clone().multiply(sway).normalize();
      }

      idleTracks.push(
        new QuaternionKeyframeTrack(
          `${bone.name}.quaternion`,
          times,
          [q0.x, q0.y, q0.z, q0.w, q1.x, q1.y, q1.z, q1.w, q0.x, q0.y, q0.z, q0.w]
        )
      );
    }

    result.push(new AnimationClip('idle', 2.4, idleTracks));
  }

  // 2) 'play' 클립 자동 합성: 다리는 땅에 고정하고 양팔을 번갈아 앞으로 흔들며 타격하는 연주 자세
  if (!hasPlay && bones.length > 0) {
    const playTracks: (QuaternionKeyframeTrack | VectorKeyframeTrack)[] = [];
    const times = [0, 0.28, 0.56];

    for (const bone of bones) {
      const p = bone.position;
      playTracks.push(
        new VectorKeyframeTrack(
          `${bone.name}.position`,
          times,
          [p.x, p.y, p.z, p.x, p.y, p.z, p.x, p.y, p.z]
        )
      );

      let qA = bone.quaternion.clone();
      let qB = bone.quaternion.clone();

      if (bone.name === 'DEF-upper_arm.L') {
        qA = new Quaternion(0.2198, -0.2798, -0.8193, 0.4496).normalize();
        qB = new Quaternion(0.0999, -0.1798, -0.8692, 0.4496).normalize();
      } else if (bone.name === 'DEF-upper_arm.R') {
        qA = new Quaternion(0.0999, 0.1798, 0.8692, 0.4496).normalize();
        qB = new Quaternion(0.2198, 0.2798, 0.8193, 0.4496).normalize();
      } else if (bone.name === 'DEF-forearm.L') {
        qA = new Quaternion(0.5809, -0.0601, 0.03, 0.8112).normalize();
        qB = new Quaternion(0.4223, -0.0503, 0.0201, 0.9049).normalize();
      } else if (bone.name === 'DEF-forearm.R') {
        qA = new Quaternion(0.4223, 0.0503, -0.0201, 0.9049).normalize();
        qB = new Quaternion(0.5809, 0.0601, -0.03, 0.8112).normalize();
      } else if (bone.name === 'DEF-ear.L' || bone.name === 'DEF-ear.R') {
        const bounce = new Quaternion().setFromAxisAngle(
          { x: 1, y: 0, z: 0 } as never,
          0.11
        );
        qB = qA.clone().multiply(bounce).normalize();
      }

      playTracks.push(
        new QuaternionKeyframeTrack(
          `${bone.name}.quaternion`,
          times,
          [qA.x, qA.y, qA.z, qA.w, qB.x, qB.y, qB.z, qB.w, qA.x, qA.y, qA.z, qA.w]
        )
      );
    }

    result.push(new AnimationClip('play', 0.56, playTracks));
  }

  return result;
}

/**
 * Blender에서 제작한 뼈대(Armature) 포함 캐릭터 GLB를 불러와 5-레이어 모듈화를 자동 연결하는 컴포넌트
 * - SkeletonUtils.clone을 사용해 여러 NPC가 같은 토끼/거북이 GLB를 써도 뼈대가 서로 꼬이지 않습니다.
 * - char_body_rabbit.glb(바디)와 char_happi_base.glb(하피 의상)가 분리되어 있을 때 동일한 40개 DEF-* 뼈대에 자동 결합합니다.
 * - useAnimations로 Blender Action 클립(idle, walk, play_strong, play_weak)을 0.2초 크로스페이드로 부드럽게 전환합니다.
 * - Mat_Face 머티리얼에는 2D CanvasTexture 얼굴을, Mat_Happi 머티리얼에는 단체 하피 텍스처/색상을 자동 연결합니다.
 * - Socket_Head / Socket_Instrument_Chest / Socket_Hand_L / Socket_Hand_R 소켓을 찾아 헤어·악기·북채 GLB를 자동 장착합니다.
 */
export function SkinnedCharacterGlb({
  bodyUrl,
  happiUrl,
  group,
  appearance,
  faceTexture,
  actionRef,
  headLookYawRef,
  walkSpeedScaleRef,
}: SkinnedCharacterGlbProps) {
  const wrapperRef = useRef<Group>(null);
  const bachiLeftRef = useRef<Group>(null);
  const bachiRightRef = useRef<Group>(null);
  const currentHeadYawRef = useRef(0);

  // 1) 바디 GLB 및(존재 시) 공통 하피 의상 GLB 로드 & 동일한 뼈대(Skeleton)로 결합
  const gltfResult = useGLTF(happiUrl ? [bodyUrl, happiUrl] : [bodyUrl]);
  const bodyGltf = Array.isArray(gltfResult) ? gltfResult[0] : gltfResult;
  const happiGltf =
    Array.isArray(gltfResult) && gltfResult.length > 1 ? gltfResult[1] : null;

  const { clonedScene, mergedAnimations } = useMemo(() => {
    const baseScene = cloneSkinnedScene(bodyGltf.scene);

    // 아직 Blender에 'idle' / 'play' 액션이 없고 'walk'만 있을 때를 대비해 보조 클립 합성
    const clips = buildFallbackAnimationClips(baseScene, bodyGltf.animations);

    // baseScene 안에 이미 하피 메쉬(char_happi_base / Mat_Happi)가 포함되어 있는지 확인
    let hasBuiltInHappi = false;
    let rigContainer: Object3D = baseScene;
    baseScene.traverse((obj) => {
      if (obj instanceof SkinnedMesh && obj.parent) {
        rigContainer = obj.parent;
      }
      if (
        obj.name.toLowerCase().includes('happi') ||
        (obj instanceof Mesh &&
          (Array.isArray(obj.material)
            ? obj.material.some((m) => m.name.toLowerCase() === 'mat_happi')
            : obj.material?.name.toLowerCase() === 'mat_happi'))
      ) {
        hasBuiltInHappi = true;
      }
    });

    // char_happi_base.glb가 분리되어 있다면 SkinnedMesh를 복제해 baseScene의 동일 이름 Bone들에 바인딩
    if (happiGltf && !hasBuiltInHappi) {
      const clonedHappiScene = cloneSkinnedScene(happiGltf.scene);
      const happiMeshes: SkinnedMesh[] = [];
      clonedHappiScene.traverse((obj) => {
        if (obj instanceof SkinnedMesh) {
          happiMeshes.push(obj);
        }
      });

      for (const happiMesh of happiMeshes) {
        const sharedBones = happiMesh.skeleton.bones.map((origBone) => {
          const matched = baseScene.getObjectByName(origBone.name);
          return matched instanceof Bone ? matched : origBone;
        });
        const sharedSkeleton = new Skeleton(
          sharedBones,
          happiMesh.skeleton.boneInverses
        );
        happiMesh.bind(sharedSkeleton, happiMesh.bindMatrix);
        rigContainer.add(happiMesh);
      }
    }

    return { clonedScene: baseScene, mergedAnimations: clips };
  }, [bodyGltf.animations, bodyGltf.scene, happiGltf]);

  // 2) Blender Action 클립 바인딩 (idle, walk, play_strong, play_weak)
  const { actions } = useAnimations(mergedAnimations, clonedScene);
  const currentClipRef = useRef<string | null>(null);
  const bouncePhaseRef = useRef(Math.random() * Math.PI * 2);

  // 3) 단체 하피 외부 텍스처 파일 존재 여부 확인 (public/textures/happi/*.webp)
  const hasHappiTexture = useAssetAvailability(group.happiTexture);

  // 4) Blender 내 소켓(Empty 또는 Bone) 탐색 — Rigify의 머리 본(DEF-spine.006)과 왼팔 본(DEF-upper_arm.L)도 함께 연결
  const sockets = useMemo(() => {
    const findSocket = (name: string): Object3D | null =>
      clonedScene.getObjectByName(name) ?? null;

    return {
      head: findSocket('Socket_Head'),
      chest: findSocket('Socket_Instrument_Chest'),
      handL: findSocket('Socket_Hand_L'),
      handR: findSocket('Socket_Hand_R'),
      back: findSocket('Socket_Back'),
      headBone: findSocket('DEF-spine.006') ?? findSocket('Head'),
      leftUpperArm: findSocket('DEF-upper_arm.L'),
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
      } else if (mat.map) {
        // GLB 내부에 이미 베이크된 하피 텍스처(happi_tentaikomai 등)가 내장되어 있다면 지우지 않고 보존
        mat.color.set('#ffffff');
        mat.needsUpdate = true;
      } else {
        // 내장/외부 텍스처가 모두 없을 때만 단체 기본 색상으로 채색
        mat.map = null;
        mat.color = new Color(group.happiColor);
        mat.needsUpdate = true;
      }
    };

    const bindMaterial = (original: Material, meshName: string): Material => {
      const matNameLower = original.name.toLowerCase();
      const meshNameLower = meshName.toLowerCase();

      // Layer 3: 얼굴 앞면 슬롯(Mat_Face) -> 피부 배경색이 채워진 256x256 2D CanvasTexture 자동 연결
      if (matNameLower === 'mat_face' || meshNameLower === 'mat_face') {
        const cloned = original.clone();
        if (cloned instanceof MeshStandardMaterial) {
          cloned.map = faceTexture;
          cloned.color.set('#ffffff');
          cloned.transparent = false;
          cloned.alphaTest = 0;
          cloned.needsUpdate = true;
        }
        clonedMaterials.push(cloned);
        return cloned;
      }

      // Layer 2: 단체 하피 슬롯(Mat_Happi) -> 내장/외부 512px 텍스처 또는 단체 색상 자동 연결
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

  const hairUrl = getHairModelUrl(appearance.hair);
  const instrumentUrl = getInstrumentModelUrl(appearance.equippedInstrument);
  const isChestInstrument =
    appearance.equippedInstrument === 'shaku_2' ||
    appearance.equippedInstrument === 'shaku_4' ||
    appearance.equippedInstrument === 'shaku_5' ||
    appearance.equippedInstrument === 'shaku_6' ||
    appearance.equippedInstrument === 'oki' ||
    appearance.equippedInstrument === 'eisa' ||
    appearance.equippedInstrument === 'katsugi';
  const isFloorInstrument =
    appearance.equippedInstrument === 'shime' ||
    appearance.equippedInstrument === 'hira' ||
    appearance.equippedInstrument === 'chu' ||
    appearance.equippedInstrument === 'odaiko' ||
    appearance.equippedInstrument === 'taru';
  const isDualHandInstrument =
    appearance.equippedInstrument === 'chappa' ||
    appearance.equippedInstrument === 'jangara';
  const isLeftHandInstrument =
    appearance.equippedInstrument === 'paranku' ||
    appearance.equippedInstrument === 'chiki';
  const isRightHandInstrument =
    appearance.equippedInstrument === 'fue' ||
    appearance.equippedInstrument === 'suzu' ||
    appearance.equippedInstrument === 'uchiwa';

  // 6) 매 프레임 행동 상태(actionRef)에 따라 0.2초 크로스페이드 애니메이션 + 시선/어깨북 팔 간격/미세 탄력감 구동
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const action = actionRef.current;

    // 상태별 우선순위 클립 탐색 (Blender 액션 또는 자동 합성 클립과 매칭)
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

    // 걷기 중 플레이어가 가까이 있으면 Blender 걷기 클립 재생 속도(timeScale)도 자연스럽게 늦춤
    const activeClipAction = currentClipRef.current
      ? actions[currentClipRef.current]
      : null;
    if (activeClipAction) {
      const speedScale = walkSpeedScaleRef?.current ?? 1;
      activeClipAction.timeScale =
        action === 'walk' ? 0.45 + 0.55 * speedScale : 1;
    }

    // 왼쪽 허리(+X)에 카츠기 어깨북을 메고 있을 때는 캐릭터 왼팔(DEF-upper_arm.L)을 살짝 바깥으로 벌려 북과 겹치지 않게 보정
    if (sockets.leftUpperArm && isChestInstrument && action !== 'play') {
      sockets.leftUpperArm.rotateZ(-0.22);
    }

    // 머리 본(DEF-spine.006 / Head)이 있으면 플레이어 근접 시 살짝 고개를 돌리는 시선 처리 적용 (mixer 업데이트 직후 가산)
    if (sockets.headBone) {
      const targetYaw = headLookYawRef?.current ?? 0;
      currentHeadYawRef.current +=
        (targetYaw - currentHeadYawRef.current) * Math.min(delta * 10, 1);
      if (Math.abs(currentHeadYawRef.current) > 0.001) {
        sockets.headBone.rotateY(currentHeadYawRef.current);
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
        targetScaleY = 0.985 + bounce * 0.03;
        targetScaleXZ = 1.01 - bounce * 0.015;
      } else if (action === 'play') {
        bouncePhaseRef.current += delta * 9.0;
        const beat = Math.abs(Math.sin(bouncePhaseRef.current));
        targetScaleY = 0.975 + beat * 0.045;
        targetScaleXZ = 1.012 - beat * 0.02;
      } else {
        bouncePhaseRef.current += delta * 2.5;
        const breath = Math.sin(bouncePhaseRef.current);
        targetScaleY = 1 + breath * 0.014;
        targetScaleXZ = 1 - breath * 0.008;
      }

      wrapperRef.current.scale.set(
        wrapperRef.current.scale.x + (targetScaleXZ - wrapperRef.current.scale.x) * smoothLerp,
        wrapperRef.current.scale.y + (targetScaleY - wrapperRef.current.scale.y) * smoothLerp,
        wrapperRef.current.scale.z + (targetScaleXZ - wrapperRef.current.scale.z) * smoothLerp
      );
    }

    // 연주 중 타이코 계열 악기일 때만 양손 소켓의 북채(바치) 표시
    const usesBachi =
      appearance.equippedInstrument !== 'fue' &&
      appearance.equippedInstrument !== 'chappa' &&
      appearance.equippedInstrument !== 'jangara' &&
      appearance.equippedInstrument !== 'suzu' &&
      appearance.equippedInstrument !== 'uchiwa';
    const showBachi = action === 'play' && usesBachi;
    if (bachiLeftRef.current) bachiLeftRef.current.visible = showBachi;
    if (bachiRightRef.current) bachiRightRef.current.visible = showBachi;
  });

  // 아직 GLB 파일이 준비되지 않은 소형 손 악기/북채용 임시 메쉬
  const bachiFallbackMesh = (
    <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.02, 0.024, 0.34, 6]} />
      <meshStandardMaterial color="#e8c891" roughness={0.7} />
    </mesh>
  );

  return (
    <group>
      {/* 가벼운 바닥 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 스킨드 캐릭터 본체 + 공통 하피 */}
      <group ref={wrapperRef}>
        <primitive object={clonedScene} />
      </group>

      {/* Layer 5: 바닥 받침대형 타이코(締め·平·中·大·たる) -> 캐릭터 앞 바닥 y = 0에 배치 */}
      {isFloorInstrument && (
        <CharacterFloorInstrument instrument={appearance.equippedInstrument} />
      )}

      {/* Layer 4: 헤어 파츠 GLB -> Socket_Head([0, 1.15, 0]) 소켓에 포털 부착 (GLB가 아직 없는 헤어는 위치 보정된 임시 파츠 표시) */}
      {sockets.head &&
        hairUrl &&
        createPortal(
          <GlbModel
            url={hairUrl}
            fallback={
              <group position={[0, -1.11, 0]}>
                <CharacterHairPart
                  hair={appearance.hair}
                  group={group}
                  species={group.species}
                />
              </group>
            }
          />,
          sockets.head
        )}

      {/* Layer 5: 카츠기 어깨북(尺 2·4·5·6, 沖 등) + 대각선 어깨 끈 -> Socket_Instrument_Chest([0, 0.56, 0.24])에 포털 부착 */}
      {sockets.chest &&
        isChestInstrument &&
        createPortal(
          <group position={[0, -0.56, -0.24]}>
            <CharacterChestInstrument instrument={appearance.equippedInstrument} />
          </group>,
          sockets.chest
        )}

      {/* Layer 5: 오른손 휴대 악기/소품(笛·鈴·うちわ) -> Socket_Hand_R */}
      {sockets.handR &&
        isRightHandInstrument &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handR)}

      {/* Layer 5: 왼손 휴대 악기(パーランクー·チキ) -> Socket_Hand_L */}
      {sockets.handL &&
        isLeftHandInstrument &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handL)}

      {/* Layer 5: 양손 금속 타악기(チャッパ·ジャンガラ) -> 양손 소켓 */}
      {sockets.handL &&
        isDualHandInstrument &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handL)}
      {sockets.handR &&
        isDualHandInstrument &&
        instrumentUrl &&
        createPortal(<GlbModel url={instrumentUrl} fallback={null} />, sockets.handR)}

      {/* 연주 중 양손 북채(inst_bachi.glb) -> 양손 소켓에 포털 부착 */}
      {sockets.handL &&
        createPortal(
          <group ref={bachiLeftRef} visible={false}>
            <GlbModel
              url="/models/instruments/inst_bachi.glb"
              fallback={bachiFallbackMesh}
            />
          </group>,
          sockets.handL
        )}
      {sockets.handR &&
        createPortal(
          <group ref={bachiRightRef} visible={false}>
            <GlbModel
              url="/models/instruments/inst_bachi.glb"
              fallback={bachiFallbackMesh}
            />
          </group>,
          sockets.handR
        )}
    </group>
  );
}
