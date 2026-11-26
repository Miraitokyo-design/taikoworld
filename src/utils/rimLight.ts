import { Color, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { MeshStandardMaterial } from 'three';

/**
 * 경량 프레넬 림라이트(외곽선 빛남) 옵션
 */
export interface RimLightOptions {
  /** 가장자리 빛남 색상 (기본값: 따뜻한 햇살 톤 #fff6df) */
  color?: string;
  /** 가장자리 빛남 세기 (기본값: 0.34 — 과하지 않고 은은한 정도) */
  strength?: number;
  /** 가장자리 집중도 지수 (클수록 외곽선 끄트머리에만 얇게 맺힘, 기본값: 2.6) */
  power?: number;
}

const DEFAULT_RIM_COLOR = '#fff6df';
const DEFAULT_RIM_STRENGTH = 0.34;
const DEFAULT_RIM_POWER = 2.6;

type RimTaggedMaterial = MeshStandardMaterial & {
  _taikoRimLightApplied?: boolean;
};

/**
 * 단일 MeshStandardMaterial에 경량 프레넬 림라이트(외곽선 빛남)를 주입하는 함수
 * - 추가 텍스처(0KB)나 추가 렌더링 패스 없이 GPU 셰이더에서 시선-표면 각도(N·V)만 1줄 계산합니다.
 * - customProgramCacheKey를 통일해 수많은 캐릭터가 공유해도 WebGL 셰이더를 재컴파일하지 않습니다.
 * @param material - 효과를 적용할 Three.js 재질
 * @param options - 림라이트 색상·세기·집중도 옵션
 */
export function applyRimLightToMaterial(
  material: Material,
  options?: RimLightOptions
): void {
  if (!(material instanceof MeshStandardMaterial)) return;
  const tagged = material as RimTaggedMaterial;
  // 동일 인스턴스 중복 감싸기만 방지 (clone()으로 새로 복제된 재질은 onBeforeCompile이 초기화되므로 재적용 필요)
  if (tagged._taikoRimLightApplied) return;

  const rimColor = new Color(options?.color ?? DEFAULT_RIM_COLOR);
  const rimStrength = options?.strength ?? DEFAULT_RIM_STRENGTH;
  const rimPower = options?.power ?? DEFAULT_RIM_POWER;

  // 동일 재질 인스턴스에 셰이더 훅이 두 번 감싸지지 않도록 플래그 기록
  tagged._taikoRimLightApplied = true;
  // 동일한 프로그램 캐시 키로 셰이더 컴파일 비용을 최소화
  material.customProgramCacheKey = () => 'taiko_rim_light_v1';

  const prevOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prevOnBeforeCompile.call(material, shader, renderer);

    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.uniforms.uRimPower = { value: rimPower };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimPower;`
      )
      .replace(
        '#include <opaque_fragment>',
        `float rimNdotV = clamp(dot(normalize(geometryNormal), normalize(geometryViewDir)), 0.0, 1.0);
float rimFactor = pow(1.0 - rimNdotV, uRimPower) * uRimStrength;
outgoingLight += uRimColor * rimFactor;
#include <opaque_fragment>`
      );
  };

  material.needsUpdate = true;
}

/**
 * 3D 오브젝트 트리 전체의 MeshStandardMaterial을 안전 복제한 뒤 경량 림라이트를 적용하는 함수
 * - 원본 GLTF 캐시 재질이 오염되지 않도록 각 재질을 clone()해 적용합니다.
 * - 언마운트 시 메모리 누수 없이 정리할 수 있도록 복제된 재질 배열을 반환합니다.
 * @param root - 림라이트를 적용할 3D 루트 오브젝트
 * @param options - 림라이트 색상·세기·집중도 옵션
 * @returns 추후 dispose()할 복제된 재질 배열
 */
export function applyRimLightToObject(
  root: Object3D,
  options?: RimLightOptions
): Material[] {
  const clonedMaterials: Material[] = [];
  const clonedByOriginal = new Map<Material, Material>();

  const cloneAndApply = (original: Material): Material => {
    const cached = clonedByOriginal.get(original);
    if (cached) return cached;

    if (!(original instanceof MeshStandardMaterial)) {
      return original;
    }

    const cloned = original.clone();
    applyRimLightToMaterial(cloned, options);
    clonedByOriginal.set(original, cloned);
    clonedMaterials.push(cloned);
    return cloned;
  };

  root.traverse((obj) => {
    if (!(obj instanceof Mesh) || !obj.material) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((mat) => cloneAndApply(mat));
    } else {
      obj.material = cloneAndApply(obj.material);
    }
  });

  return clonedMaterials;
}
