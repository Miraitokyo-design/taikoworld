interface LandingOverlayProps {
  /** 사용자가 [타이코 월드 입장] 버튼을 눌렀을 때 실행되는 콜백 */
  onEnter: () => void;
}

/**
 * 첫 방문 시 표시되는 입장 화면(Landing) 컴포넌트
 * - iOS/모바일 브라우저는 사용자의 첫 터치(클릭) 없이는 소리를 낼 수 없으므로,
 *   입장 버튼을 누르는 순간 오디오 시스템을 안전하게 활성화하기 위해 필요합니다.
 * @param props.onEnter - 입장 버튼 클릭 핸들러
 */
export function LandingOverlay({ onEnter }: LandingOverlayProps) {
  return (
    <div className="landing-overlay" data-ui-interactive="true">
      <div className="landing-card">
        <div className="landing-badge">🥁 P.Taiko 3D 가상공간</div>
        <h1 className="landing-title">Taiko World</h1>
        <p className="landing-desc">
          따뜻한 잔디 공원을 돌아다니며
          <br />
          직접 타이코를 두드려 보세요!
        </p>

        {/* 이 버튼 클릭이 브라우저 오디오를 켜는 첫 사용자 동작이 됩니다 */}
        <button type="button" className="landing-enter-btn" onClick={onEnter}>
          타이코 월드 입장
        </button>

        <p className="landing-audio-note">🔊 입장 시 북 연주 소리가 활성화됩니다</p>
      </div>
    </div>
  );
}
