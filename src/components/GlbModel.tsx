import { Component, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';

interface GlbModelProps {
  /** public/ 폴더 기준 GLB 파일 경로 (예: "/models/instruments/inst_taiko_nagado.glb") */
  url?: string;
  /** GLB 파일이 아직 없거나 로딩 중일 때 대신 보여줄 임시 도형 컴포넌트 */
  fallback: ReactNode;
  /** 스케일 배율 (기본값 1 = Blender 1m) */
  scale?: number;
}

/**
 * 이미 존재 여부를 확인한 GLB URL 캐시 맵
 * - 같은 경로를 여러 번 HEAD 요청하지 않도록 메모리에 기억합니다.
 */
const glbAvailabilityCache = new Map<string, boolean>();

/**
 * GLB 로드 실패 시 앱 전체가 멈추지 않고 임시 모델(fallback)로 안전하게 복구하는 에러 경계
 */
class ModelErrorBoundary extends Component<
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
 * - clone(true)를 사용해 같은 GLB를 여러 위치에 배치해도 서로 충돌하지 않습니다.
 */
function LoadedGlbMesh({ url, scale = 1 }: { url: string; scale?: number }) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clonedScene} scale={scale} />;
}

/**
 * Blender에서 내보낸 GLB 3D 에셋을 안전하게 불러오고, 파일이 아직 없으면 임시 모델(fallback)을 보여주는 래퍼 컴포넌트
 * - Vite/Vercel 정적 호스팅에서는 없는 파일 요청 시 index.html(text/html)을 반환할 수 있으므로
 *   먼저 가벼운 HEAD 요청으로 실제 GLB 파일 존재 여부를 확인한 뒤 useGLTF를 호출합니다.
 * - 덕분에 제작자님이 Blender 에셋을 하나씩 public/models/에 넣을 때마다 코드 수정 없이 바로 교체됩니다!
 */
export function GlbModel({ url, fallback, scale = 1 }: GlbModelProps) {
  const [isAvailable, setIsAvailable] = useState<boolean>(() =>
    url ? glbAvailabilityCache.get(url) ?? false : false
  );

  useEffect(() => {
    if (!url) {
      setIsAvailable(false);
      return;
    }

    if (glbAvailabilityCache.has(url)) {
      setIsAvailable(glbAvailabilityCache.get(url)!);
      return;
    }

    let cancelled = false;

    async function checkGlbExists(targetUrl: string) {
      try {
        const res = await fetch(targetUrl, { method: 'HEAD' });
        const contentType = res.headers.get('content-type') ?? '';
        // 200 응답이면서 HTML 폴백 페이지가 아닌 실제 바이너리(.glb)일 때만 로드 허용
        const valid = res.ok && !contentType.includes('text/html');
        glbAvailabilityCache.set(targetUrl, valid);
        if (!cancelled) {
          setIsAvailable(valid);
        }
      } catch {
        glbAvailabilityCache.set(targetUrl, false);
        if (!cancelled) {
          setIsAvailable(false);
        }
      }
    }

    void checkGlbExists(url);

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || !isAvailable) {
    return <>{fallback}</>;
  }

  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedGlbMesh url={url} scale={scale} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
