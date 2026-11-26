import { Component, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyRimLightToObject } from '../utils/rimLight';

interface GlbModelProps {
  /** public/ 폴더 기준 GLB 파일 경로 (예: "/models/instruments/inst_taiko_nagado.glb") */
  url?: string;
  /** GLB 파일이 아직 없거나 로딩 중일 때 대신 보여줄 임시 도형 컴포넌트 */
  fallback: ReactNode;
  /** 스케일 배율 (기본값 1 = Blender 1m) */
  scale?: number;
  /** 외곽선이 은은하게 빛나는 경량 프레넬 림라이트 적용 여부 (기본값 false) */
  rimLight?: boolean;
}

/**
 * 이미 존재 여부를 확인한 에셋(.glb / .webp / .png) URL 캐시 맵
 * - 같은 경로를 여러 캐릭터/컴포넌트가 동시에 확인해도 네트워크 HEAD 요청은 딱 1번만 보냅니다.
 */
const assetAvailabilityCache = new Map<string, boolean>();
const assetAvailabilityInFlight = new Map<string, Promise<boolean>>();

/**
 * 지정된 정적 에셋 URL이 실제 파일로 존재하는지(HTML 폴백이 아닌지) 확인하는 비동기 함수
 * @param targetUrl - public/ 기준 파일 경로
 * @returns 실제 바이너리/이미지 파일이 존재하면 true
 */
export function checkAssetAvailable(targetUrl: string): Promise<boolean> {
  if (assetAvailabilityCache.has(targetUrl)) {
    return Promise.resolve(assetAvailabilityCache.get(targetUrl)!);
  }

  const existing = assetAvailabilityInFlight.get(targetUrl);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      const res = await fetch(targetUrl, { method: 'HEAD' });
      const contentType = res.headers.get('content-type') ?? '';
      // Vite/Vercel 정적 호스팅에서 없는 경로는 200 + text/html(index.html)을 반환할 수 있어 content-type을 함께 검사
      const valid = res.ok && !contentType.includes('text/html');
      assetAvailabilityCache.set(targetUrl, valid);
      return valid;
    } catch {
      assetAvailabilityCache.set(targetUrl, false);
      return false;
    } finally {
      assetAvailabilityInFlight.delete(targetUrl);
    }
  })();

  assetAvailabilityInFlight.set(targetUrl, request);
  return request;
}

/**
 * 에셋 파일 존재 여부를 구독하는 경량 React Hook
 * - 파일이 아직 없으면 false를 유지하고, Blender 에셋이 추가되면 true로 전환됩니다.
 * @param url - 확인할 public/ 기준 파일 경로
 * @returns 파일 존재 여부
 */
export function useAssetAvailability(url?: string): boolean {
  const [isAvailable, setIsAvailable] = useState<boolean>(() =>
    url ? assetAvailabilityCache.get(url) ?? false : false
  );

  useEffect(() => {
    if (!url) {
      setIsAvailable(false);
      return;
    }

    if (assetAvailabilityCache.has(url)) {
      setIsAvailable(assetAvailabilityCache.get(url)!);
      return;
    }

    let cancelled = false;
    void checkAssetAvailable(url).then((valid) => {
      if (!cancelled) {
        setIsAvailable(valid);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return isAvailable;
}

/**
 * GLB 로드 실패 시 앱 전체가 멈추지 않고 임시 모델(fallback)로 안전하게 복구하는 에러 경계
 */
export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  public state = { hasError: false };

  public static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 실제 GLB 파일을 drei의 useGLTF로 불러와 복제(clone)해 렌더링하는 내부 컴포넌트
 * - 정적 모델(공간·아지트·소품·무기)용으로 clone(true)을 사용합니다.
 * - 뼈대가 있는 스킨드 캐릭터는 SkinnedCharacterGlb(SkeletonUtils.clone)를 사용합니다.
 */
function LoadedGlbMesh({
  url,
  scale = 1,
  rimLight = false,
}: {
  url: string;
  scale?: number;
  rimLight?: boolean;
}) {
  const { scene } = useGLTF(url);

  // 원본 GLTF 캐시를 보호하기 위해 씬을 복제하고, 옵션이 켜진 경우에만 경량 림라이트를 주입
  const { clonedScene, rimMaterials } = useMemo(() => {
    const cloned = scene.clone(true);
    const applied = rimLight ? applyRimLightToObject(cloned) : [];
    return { clonedScene: cloned, rimMaterials: applied };
  }, [scene, rimLight]);

  useEffect(() => {
    return () => {
      for (const mat of rimMaterials) {
        mat.dispose();
      }
    };
  }, [rimMaterials]);

  return <primitive object={clonedScene} scale={scale} />;
}

/**
 * Blender에서 내보낸 정적 GLB 3D 에셋을 안전하게 불러오고, 파일이 아직 없으면 임시 모델(fallback)을 보여주는 래퍼 컴포넌트
 * - 제작자님이 Blender 에셋을 public/models/에 넣기만 하면 코드 수정 없이 바로 교체됩니다.
 */
export function GlbModel({ url, fallback, scale = 1, rimLight = false }: GlbModelProps) {
  const isAvailable = useAssetAvailability(url);

  if (!url || !isAvailable) {
    return <>{fallback}</>;
  }

  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedGlbMesh url={url} scale={scale} rimLight={rimLight} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
