import { useEffect } from 'react';
import type { MemberConfig } from '../../types/content';
import { getTaikoGroupById } from '../../utils/characterAppearance';
import { MemberAvatar } from './MemberProfileModal';

interface MemberDirectoryModalProps {
  /** members.json 또는 구글 시트에서 불러온 전체 서클 멤버 목록 */
  members: MemberConfig[];
  /** 캐릭터 일러스트 카드를 선택했을 때 상세 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
  /** 메뉴로 돌아가기 콜백 */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 메뉴바의 [멤버 정보]에서 열리는 컴팩트 캐릭터 일러스트 도감 모달 컴포넌트
 * - 추후 15~20명 이상으로 늘어나도 한 화면에 많은 멤버를 한눈에 볼 수 있도록
 *   캐릭터 일러스트 + 이름 + 소속 단체만 깔끔한 그리드로 표시합니다.
 * - 일러스트 카드를 누르면 해당 멤버의 상세 프로필 카드(MemberProfileModal)가 열립니다.
 */
export function MemberDirectoryModal({
  members,
  onSelectMember,
  onBackToMenu,
  onClose,
}: MemberDirectoryModalProps) {
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

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="P.Taiko 멤버 정보 목록"
    >
      <div
        className="modal-card directory-modal-card directory-modal-card--grid"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">👥 P.Taiko 멤버 도감</div>
            <h2 className="modal-title">서클 멤버</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={onBackToMenu}
              >
                ← 메뉴
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="멤버 도감 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="directory-subtitle">
          캐릭터 일러스트를 눌러 세부 프로필을 확인해 보세요!
        </p>

        {/* 한 화면에 최대한 많은 멤버를 한눈에 보여주는 일러스트 중심 컴팩트 그리드 */}
        <div className="directory-grid">
          {members.map((member) => {
            const group = getTaikoGroupById(member.appearance.groupId);
            return (
              <button
                key={member.id}
                type="button"
                className="directory-card-btn"
                onClick={() => onSelectMember(member)}
                aria-label={`${member.nickname} (${group.name}) 세부 정보 보기`}
              >
                <div className="directory-card-avatar">
                  <MemberAvatar member={member} size="small" />
                </div>
                <span className="directory-card-name">{member.nickname}</span>
                <span
                  className="directory-card-group"
                  style={{ backgroundColor: group.happiColor }}
                >
                  {group.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
