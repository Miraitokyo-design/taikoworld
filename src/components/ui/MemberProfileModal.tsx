import { useEffect, useState } from 'react';
import type { MemberConfig, SongConfig } from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
import { getTaikoGroupById } from '../../utils/characterAppearance';

interface MemberProfileModalProps {
  /** 클릭/터치 또는 E 키로 선택된 서클 NPC 멤버 데이터 */
  member: MemberConfig;
  /** 연주 가능 곡 제목을 표시하기 위한 전체 곡 목록 */
  songs: SongConfig[];
  /** 프로필 카드 닫기 콜백 */
  onClose: () => void;
}

/**
 * 실제 2D 캐릭터 일러스트 파일(public/images/characters/*.webp)이 아직 없을 때
 * 멤버의 소속 단체(토끼/거북이 종족 + 하피 색상)와 헤어 스타일에 맞춰 그려주는 SVG 임시 일러스트
 */
function PlaceholderCharacterPortrait({ member }: { member: MemberConfig }) {
  const group = getTaikoGroupById(member.appearance.groupId);
  const { hair } = member.appearance;
  const color = group.happiColor;

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

      {/* 거북이 종족일 때 어깨 뒤로 살짝 보이는 등껍질 */}
      {group.species === 'turtle' && (
        <ellipse cx="60" cy="94" rx="40" ry="22" fill={group.accentColor} />
      )}

      {/* 단체 공통 하피 상의 */}
      <path d="M24 118 C26 88, 38 78, 60 78 C82 78, 94 88, 96 118 Z" fill={color} />
      {/* 하피 깃 포인트 */}
      <path
        d="M48 79 L60 98 L72 79"
        fill="none"
        stroke={group.happiBorderColor}
        strokeWidth="4.5"
      />

      {/* 토끼 종족일 때 머리 위로 올라온 긴 귀 */}
      {group.species === 'rabbit' && (
        <g>
          <ellipse cx="47" cy="24" rx="7" ry="18" transform="rotate(-10 47 24)" fill={group.bodyColor} />
          <ellipse cx="47" cy="25" rx="3.5" ry="12" transform="rotate(-10 47 25)" fill={group.accentColor} />
          <ellipse cx="73" cy="24" rx="7" ry="18" transform="rotate(10 73 24)" fill={group.bodyColor} />
          <ellipse cx="73" cy="25" rx="3.5" ry="12" transform="rotate(10 73 25)" fill={group.accentColor} />
        </g>
      )}

      {/* 얼굴 (종족 피부/털 색상) */}
      <circle cx="60" cy="56" r="24" fill={group.bodyColor} />

      {/* 파츠별 머리 스타일 */}
      {hair === 'hair_bun' && (
        <g>
          <circle cx="60" cy="28" r="9" fill="#3a2f2a" />
          <rect x="50" y="33" width="20" height="4.5" rx="2.2" fill={color} />
        </g>
      )}
      {hair === 'hair_cap' && (
        <g>
          <path d="M38 46 C40 31, 80 31, 82 46 Z" fill={color} />
          <rect x="36" y="44" width="48" height="5.5" rx="2.7" fill={group.happiBorderColor} />
        </g>
      )}
      {hair === 'hair_spiky' && (
        <g>
          <polygon points="45,38 52,24 58,36" fill="#2f2a28" />
          <polygon points="56,36 65,23 73,38" fill="#2f2a28" />
          <rect x="36" y="39" width="48" height="5.5" rx="2.7" fill={group.obiColor} />
        </g>
      )}
      {hair === 'hair_bob' && (
        <g>
          <path d="M36 52 C38 35, 82 35, 84 52 L80 46 L40 46 Z" fill="#46342a" />
          <rect x="34" y="48" width="7" height="18" rx="3.5" fill="#46342a" />
          <rect x="79" y="48" width="7" height="18" rx="3.5" fill="#46342a" />
        </g>
      )}
      {hair === 'hair_hachimaki' && (
        <rect x="36" y="38" width="48" height="6.5" rx="3.2" fill="#e04f3e" />
      )}

      {/* 눈, 볼터치, 미소 */}
      <circle cx="51" cy="57" r="3.2" fill="#2b2623" />
      <circle cx="69" cy="57" r="3.2" fill="#2b2623" />
      <ellipse cx="44" cy="63" rx="4.2" ry="2.4" fill="#ff9b9b" opacity="0.55" />
      <ellipse cx="76" cy="63" rx="4.2" ry="2.4" fill="#ff9b9b" opacity="0.55" />
      <path
        d="M54 65 Q60 71 66 65"
        fill="none"
        stroke="#6b4432"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 멤버 프로필 카드와 멤버 도감 목록에서 공용으로 사용하는 원형 캐릭터 아바타 컴포넌트
 * - 실제 일러스트 파일이 있으면 이미지를, 아직 없으면 단체·종족 맞춤형 SVG 초상화를 표시합니다.
 */
export function MemberAvatar({
  member,
  size = 'large',
}: {
  member: MemberConfig;
  size?: 'small' | 'large';
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const group = getTaikoGroupById(member.appearance.groupId);

  useEffect(() => {
    setImageFailed(false);
  }, [member.id]);

  return (
    <div
      className={`member-avatar-frame ${
        size === 'small' ? 'member-avatar-frame--small' : ''
      }`}
      style={{ borderColor: group.happiColor }}
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
  );
}

/**
 * 3D 공간의 NPC 멤버를 클릭/터치하거나 E 키를 눌렀을 때 열리는 미니 프로필 카드 팝업 컴포넌트
 * - 열기와 마찬가지로 PC에서 E 키(또는 ESC)를 눌러 바로 닫을 수 있습니다.
 * @param props.member - 선택된 멤버 정보 객체
 * @param props.onClose - 팝업 닫기 핸들러
 */
export function MemberProfileModal({
  member,
  songs,
  onClose,
}: MemberProfileModalProps) {
  const { t } = useI18n();

  // E 키 또는 ESC 키로 프로필 카드 닫기 지원 (한글 입력 상태에서도 event.code로 동작)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyE') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { profile } = member;
  const group = getTaikoGroupById(member.appearance.groupId);
  const memberSongs = songs.filter((song) => member.playableSongs.includes(song.id));

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.nickname}${t('members.profileAriaSuffix')}`}
    >
      <div
        className="modal-card member-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 상단 닫기 버튼 + 프로필 헤더 */}
        <div className="modal-header member-modal-header">
          <div className="member-header-main">
            <MemberAvatar member={member} size="large" />

            <div>
              <div
                className="member-role-badge"
                style={{ backgroundColor: group.happiColor }}
              >
                {group.species === 'rabbit' ? '🐰' : '🐢'} {group.name} · {member.role}
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
            aria-label={t('members.profileCloseAria')}
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
            <dt className="member-profile-label">{t('members.personalityLabel')}</dt>
            <dd className="member-profile-value">{profile.personality}</dd>
          </div>
          <div className="member-profile-row">
            <dt className="member-profile-label">{t('members.traitsLabel')}</dt>
            <dd className="member-profile-value">{profile.traits}</dd>
          </div>
          <div className="member-profile-row">
            <dt className="member-profile-label">{t('members.favoriteTaikoLabel')}</dt>
            <dd className="member-profile-value">{profile.favoriteTaiko}</dd>
          </div>
          {memberSongs.length > 0 && (
            <div className="member-profile-row">
              <dt className="member-profile-label">{t('members.playableSongsLabel')}</dt>
              <dd className="member-profile-value">
                <div className="member-song-chips">
                  {memberSongs.map((song) => (
                    <span key={song.id} className="member-song-chip">
                      {song.title.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          )}
        </dl>

        {/* PC 단축키 안내 푸터 (모바일 터치 기기에서는 자동 숨김) */}
        <div className="modal-key-hint">
          <span className="key-cap key-cap--dark">E</span> {t('common.or')}{' '}
          <span className="key-cap key-cap--dark">ESC</span>{' '}
          {t('common.closeWithKeyEOrEscPrefix')}
        </div>
      </div>
    </div>
  );
}
