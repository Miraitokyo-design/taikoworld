import { useEffect, useState } from 'react';
import type { MemberConfig } from '../../types/content';

interface MemberProfileModalProps {
  /** 클릭/터치로 선택된 서클 NPC 멤버 데이터 */
  member: MemberConfig;
  /** 프로필 카드 닫기 콜백 */
  onClose: () => void;
}

/**
 * 실제 2D 캐릭터 일러스트 파일(public/images/characters/*.webp)이 아직 없을 때
 * 멤버의 파츠 색상과 머리 스타일에 맞춰 자동으로 그려주는 귀여운 SVG 임시 일러스트 컴포넌트
 * - 3단계에서 실제 일러스트 파일을 넣으면 코드 수정 없이 자동으로 실제 이미지로 전환됩니다.
 */
function PlaceholderCharacterPortrait({ member }: { member: MemberConfig }) {
  const { color, head } = member.parts;

  return (
    <svg
      viewBox="0 0 120 120"
      className="member-portrait-svg"
      role="img"
      aria-label={`${member.nickname} 임시 캐릭터 일러스트`}
    >
      {/* 따뜻한 원형 배경 */}
      <circle cx="60" cy="60" r="58" fill="#fff5e4" />
      <circle cx="60" cy="60" r="52" fill={color} opacity="0.16" />

      {/* 하피 상의(어깨/몸통) */}
      <path d="M24 118 C26 88, 38 78, 60 78 C82 78, 94 88, 96 118 Z" fill={color} />
      {/* 하피 깃 포인트 */}
      <path d="M48 79 L60 98 L72 79" fill="none" stroke="#fff8eb" strokeWidth="4" />

      {/* 얼굴 */}
      <circle cx="60" cy="54" r="24" fill="#ffe0bd" />

      {/* 파츠별 머리 스타일 (head_a ~ head_d) */}
      {head === 'head_b' && (
        <g>
          {/* 상투(만두머리) + 리본 */}
          <circle cx="60" cy="24" r="10" fill="#3a2f2a" />
          <rect x="49" y="30" width="22" height="5" rx="2.5" fill={color} />
        </g>
      )}
      {head === 'head_c' && (
        <g>
          {/* 둥근 캡 모자 */}
          <path d="M36 44 C38 26, 82 26, 84 44 Z" fill={color} />
          <rect x="34" y="42" width="52" height="6" rx="3" fill="#3d352e" />
        </g>
      )}
      {head === 'head_d' && (
        <g>
          {/* 뾰족 헤어 + 노란 이마 밴드 */}
          <polygon points="44,34 52,18 58,32" fill="#2f2a28" />
          <polygon points="56,32 66,16 74,34" fill="#2f2a28" />
          <rect x="36" y="37" width="48" height="6" rx="3" fill="#f6c445" />
        </g>
      )}
      {(head === 'head_a' || !['head_b', 'head_c', 'head_d'].includes(head)) && (
        /* 전통 빨간 하치마키 머리띠 */
        <rect x="36" y="36" width="48" height="7" rx="3.5" fill="#e04f3e" />
      )}

      {/* 눈, 볼터치, 미소 */}
      <circle cx="51" cy="55" r="3" fill="#2b2623" />
      <circle cx="69" cy="55" r="3" fill="#2b2623" />
      <ellipse cx="44" cy="61" rx="4" ry="2.4" fill="#ff9b9b" opacity="0.55" />
      <ellipse cx="76" cy="61" rx="4" ry="2.4" fill="#ff9b9b" opacity="0.55" />
      <path
        d="M54 63 Q60 69 66 63"
        fill="none"
        stroke="#6b4432"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 3D 공간의 NPC 멤버를 클릭/터치했을 때 열리는 미니 프로필 카드 팝업 컴포넌트
 * - 개인정보 보호 규칙에 따라 닉네임, 캐릭터 일러스트, 가벼운 서클 프로필만 표시합니다.
 * @param props.member - 선택된 멤버 정보 객체
 * @param props.onClose - 팝업 닫기 핸들러
 */
export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  // 실제 일러스트 파일이 아직 없을 때 임시 SVG 초상화로 부드럽게 전환하는 상태
  const [imageFailed, setImageFailed] = useState(false);

  // 다른 NPC를 열었을 때 이미지 로드 상태를 초기화
  useEffect(() => {
    setImageFailed(false);
  }, [member.id]);

  // ESC 키로 프로필 카드 닫기 지원
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { profile } = member;

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.nickname} 멤버 프로필`}
    >
      <div
        className="modal-card member-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 상단 닫기 버튼 + 프로필 헤더 */}
        <div className="modal-header member-modal-header">
          <div className="member-header-main">
            {/* 캐릭터 일러스트 원형 프레임 */}
            <div
              className="member-avatar-frame"
              style={{ borderColor: member.parts.color }}
            >
              {!imageFailed ? (
                <img
                  src={member.illustration}
                  alt={`${member.nickname} 캐릭터 일러스트`}
                  className="member-portrait-img"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <PlaceholderCharacterPortrait member={member} />
              )}
            </div>

            <div>
              <div
                className="member-role-badge"
                style={{ backgroundColor: member.parts.color }}
              >
                🥁 {member.role}
              </div>
              <h2 className="modal-title member-nickname">{member.nickname}</h2>
              <div className="member-exp-text">
                {profile.experience}
                {profile.status ? ` / ${profile.status}` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="멤버 프로필 닫기"
          >
            ✕
          </button>
        </div>

        {/* 멤버 한마디 말풍선 */}
        <div className="member-oneliner-bubble">
          <span className="member-quote-mark" aria-hidden="true">
            “
          </span>
          <span>{profile.oneLiner}</span>
          <span className="member-quote-mark" aria-hidden="true">
            ”
          </span>
        </div>

        {/* 멤버 프로필 상세 항목 리스트 */}
        <dl className="member-profile-list">
          <div className="member-profile-row">
            <dt className="member-profile-label">✨ 성격</dt>
            <dd className="member-profile-value">{profile.personality}</dd>
          </div>
          <div className="member-profile-row">
            <dt className="member-profile-label">👀 특징</dt>
            <dd className="member-profile-value">{profile.traits}</dd>
          </div>
          <div className="member-profile-row">
            <dt className="member-profile-label">🥁 좋아하는 타이코</dt>
            <dd className="member-profile-value">{profile.favoriteTaiko}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
