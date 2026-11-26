# Taiko World — 다국어 번역 검수표 (日本語 ↔ 한국어)

> 이 문서는 `npm run i18n:review` 명령어로 [`src/locales/`](../src/locales/) 폴더의 JSON 사전을 읽어 **자동 생성**됩니다.
> 일본어와 한국어 표현이 어색한 부분을 찾으시면 해당 키 경로를 보고 `src/locales/*.json`의 `"ja"` 또는 `"ko"` 값을 바로 고치실 수 있습니다.
> 추후 영어를 추가할 때도 같은 블록 안에 `"en": "..."` 한 줄만 추가하면 됩니다.

- **총 검수 항목 수**: 420개
- **누락 번역 키**: 0건

---

## 1. UI 화면 문구 (`src/locales/ui.json`)
입장 화면, HUD, 메뉴바, 소리 설정, 캘린더, 멤버, 연주 패드, 꾸미기, 악보/작곡기 문구 (총 **256개** 항목)

| 키 경로 (수정 위치) | 🇯🇵 일본어 (`ja`, 기본) | 🇰🇷 한국어 (`ko`) |
| --- | --- | --- |
| `common.backToMenu` | ← メニュー | ← 메뉴 |
| `common.close` | 閉じる | 닫기 |
| `common.on` | ON | ON |
| `common.off` | OFF | OFF |
| `common.volume` | 音量 | 볼륨 |
| `common.closeWithKeyEOrEscPrefix` | で閉じる | 키로 닫기 |
| `common.or` | または | 또는 |
| `language.heading` | 🌐 言語設定 / 언어 | 🌐 언어 설정 / 言語 |
| `language.jaLabel` | 🇯🇵 日本語 | 🇯🇵 日本語 (일본어) |
| `language.koLabel` | 🇰🇷 한국어 | 🇰🇷 한국어 |
| `language.shortJa` | 日本語 | 日本語 |
| `language.shortKo` | 한국어 | 한국어 |
| `landing.badge` | 🥁 Taiko World | 🥁 Taiko World |
| `landing.title` | Taiko World | Taiko World |
| `landing.descriptionLine1` | あたたかな芝生広場を歩きながら | 따뜻한 잔디 공원을 돌아다니며 |
| `landing.descriptionLine2` | 和太鼓を自由に叩いてみよう！ | 직접 타이코를 두드려 보세요! |
| `landing.enterButton` | 太鼓ワールドに入る | 타이코 월드 입장 |
| `landing.audioNote` | 🔊 入場すると太鼓のサウンドが有効になります | 🔊 입장 시 북 연주 소리가 활성화됩니다 |
| `hud.menuButton` | メニュー | 메뉴 |
| `hud.customizeButton` | 🎨 きせかえ | 🎨 꾸미기 |
| `hud.circleButton` | 💬 サークル案内 | 💬 서클/문의 |
| `hud.controlHint` | スマホ：タッチで移動 · PC：WASD · E（メンバー・拠点・合奏参加）· Space（演奏） | 모바일: 화면 터치 조이스틱 · PC: WASD · E(멤버·아지트·합주) · Space(연주) |
| `hud.playInstrument` | 🥁 {name}を叩く | 🥁 {name} 연주하기 |
| `hud.ensembleJoinPrompt` | 🥁 「{title}」の合奏に参加 | 🥁 「{title}」 합주 참가하기 |
| `ensembleJam.playingStatus` | 🎵 「{title}」みんなで合奏中！ | 🎵 「{title}」 함께 합주 중! |
| `ensembleJam.primaryHit` | 🥁 ドン（強打） | 🥁 강타 |
| `ensembleJam.secondaryHit` | 🥢 カッ（縁） | 🥢 테두리 |
| `ensembleJam.kakegoe` | 📣 かけ声 | 📣 추임새 |
| `ensembleJam.leave` | ぬける | 나가기 |
| `menu.ariaLabel` | Taiko World メニュー | Taiko World 메뉴 |
| `menu.closeAria` | メニューを閉じる | 메뉴 닫기 |
| `menu.kicker` | 🌿 和太鼓3Dバーチャル広場 | 🌿 Taiko 3D 가상공간 |
| `menu.title` | メニュー | 메뉴 |
| `menu.scheduleTitle` | 演奏スケジュール | 연주 일정 캘린더 |
| `menu.scheduleNextPrefix` | 次回の本番: {date} {title} | 다음 연주: {date} {title} |
| `menu.scheduleFallbackDesc` | 月間スケジュール・体験予定をチェック | 월간 공연 및 체험 일정 확인 |
| `menu.membersTitle` | メンバー図鑑 | 멤버 정보 |
| `menu.membersDesc` | キャラクターイラストでサークルの仲間を紹介 | 캐릭터 일러스트로 서클 멤버 프로필 구경하기 |
| `menu.songsTitle` | 楽曲・パート譜 / 作曲 | 곡 정보 · 레이어 악보 / 직접 작곡 |
| `menu.songsCount` | ({count}曲) | ({count}곡) |
| `menu.songsDesc` | パート別音量・強弱の調整やオリジナル作曲 | 레이어 볼륨·강약 조절 및 나만의 타이코 곡 직접 작곡하기 |
| `menu.taikoGuideTitle` | 和太鼓の種類 · 地域団体 | 타이코 종류 · 지역 단체 소개 |
| `menu.taikoGuideDesc` | 桶胴·締·篠笛·チャッパや各団体（転太鼓舞·鶴亀会） | 어깨북·시메·피리·차파 특징과 지역 서클(転太鼓舞·鶴亀会) |
| `menu.circleTitle` | サークル紹介 · お問い合わせ / QR | 서클 소개 · 문의 / 인스타 QR |
| `menu.circleDesc` | 活動時間、Instagram QR、大学ページなど | 정기 연습 안내, 인스타그램 QR, 대학교 홈페이지 |
| `menu.environmentHeading` | 🗺️ 背景テーマ | 🗺️ 배경 테마 |
| `menu.seasonInProgress` | {emoji} {name}開催中 | {emoji} {name} 진행 중 |
| `menu.soundHeading` | 🔊 サウンド · 音量 | 🔊 소리 · 볼륨 설정 |
| `sound.openAria` | サウンド設定を開く | 소리 및 볼륨 설정 열기 |
| `sound.dialogAria` | サウンド・音量設定 | 세부 소리 및 볼륨 설정 |
| `sound.popoverTitle` | 🔊 サウンド · 音量設定 | 🔊 소리 · 볼륨 설정 |
| `sound.statusMuted` | 消音 | 꺼짐 |
| `sound.statusAll` | 音声 | 소리 |
| `sound.statusPartial` | 一部 | 일부 |
| `sound.playerLabel` | 🥁 自分の演奏音 | 🥁 직접 연주 소리 |
| `sound.playerShortDesc` | 太鼓体験 · 楽譜 · 作曲 | 북 체험 · 악보 · 작곡 |
| `sound.playerMenuDesc` | 太鼓体験 · 楽譜試聴 · 作曲 | 북 체험 · 악보 미리듣기 · 작곡 |
| `sound.npcLabel` | 👥 NPCの合奏音 | 👥 NPC 합주 소리 |
| `sound.npcShortDesc` | 広場のメンバー合奏 | 공원 멤버 배경 합주 |
| `sound.npcMenuDesc` | 広場でメンバーが集まった時の合奏 | 공원에서 멤버들이 모였을 때 합주 |
| `sound.playerVolumeAria` | 自分の演奏音量 | 직접 연주 소리 볼륨 |
| `sound.npcVolumeAria` | NPCの合奏音量 | NPC 합주 소리 볼륨 |
| `schedule.bannerAria` | 演奏スケジュールカレンダーを開く | 연주 일정 상세 캘린더 열기 |
| `schedule.bannerPill` | 📅 次の本番 | 📅 다음 연주 |
| `schedule.bannerFallback` | 演奏スケジュールを見る | 예정된 연주 일정 보기 |
| `schedule.dialogAria` | 演奏スケジュールカレンダー | 연주 일정 캘린더 |
| `schedule.kicker` | 🥁 P.Taiko 公演 · 体験案内 | 🥁 P.Taiko 공연 & 체험 안내 |
| `schedule.title` | 演奏スケジュール | 연주 일정 캘린더 |
| `schedule.closeAria` | スケジュールを閉じる | 일정 창 닫기 |
| `schedule.prevMonthAria` | 前の月 | 이전 달 |
| `schedule.nextMonthAria` | 次の月 | 다음 달 |
| `schedule.monthFormat` | {year}年{month}月 | {year}년 {month}월 |
| `schedule.emptyDay` | この日は予定された本番・イベントがありません。赤い点のある日付や下の一覧から確認できます。 | 선택한 날짜에는 예정된 연주 일정이 없습니다. 빨간 점이 표시된 날짜나 아래 다가오는 일정을 눌러 확인해 보세요! |
| `schedule.upcomingHeading` | 今後の演奏予定ショートカット | 다가오는 연주 일정 바로가기 |
| `members.directoryAria` | P.Taiko メンバー一覧 | P.Taiko 멤버 정보 목록 |
| `members.directoryKicker` | 👥 メンバー図鑑 | 👥 멤버 도감 |
| `members.directoryTitle` | サークルメンバー | 서클 멤버 |
| `members.directorySubtitle` | キャラクターカードをタップして詳しいプロフィールを見てみよう！ | 캐릭터 일러스트를 눌러 세부 프로필을 확인해 보세요! |
| `members.directoryCloseAria` | メンバー図鑑を閉じる | 멤버 도감 닫기 |
| `members.profileAriaSuffix` | のプロフィール |  멤버 프로필 |
| `members.profileCloseAria` | プロフィールを閉じる | 멤버 프로필 닫기 |
| `members.personalityLabel` | ✨ 性格 | ✨ 성격 |
| `members.traitsLabel` | 👀 特徴 | 👀 특징 |
| `members.favoriteTaikoLabel` | 🥁 お気に入りの太鼓 | 🥁 좋아하는 타이코 |
| `members.playableSongsLabel` | 🎵 演奏できる曲 | 🎵 연주 가능 곡 |
| `taikoPlay.donPop` | ドン！ | 돈! |
| `taikoPlay.kaPop` | カッ！ | 카! |
| `taikoPlay.rimAria` | 太鼓の縁を叩く（カッ） | 북 테두리 치기 (카) |
| `taikoPlay.rimLabel` | 縁 · カッ (D / K) | 테두리 · 카 (D / K) |
| `taikoPlay.centerAria` | 太鼓の中央を叩く（ドン） | 북 중앙 치기 (돈) |
| `taikoPlay.centerMain` | ドン | 돈 |
| `taikoPlay.centerSub` | 中央タップ · F / J | 중앙 탭 · F / J |
| `taikoPlay.exitButton` | ← 広場にもどる | ← 월드로 돌아가기 |
| `taikoPlay.guideText` | 二本指ですばやく連打しても音が重なって響きます！ | 두 손가락으로 빠르게 연타해도 소리가 겹쳐 울려요! |
| `taikoGuide.dialogAria` | 和太鼓の種類と地域団体の紹介 | 타이코 종류 및 지역 타이코 단체 소개 |
| `taikoGuide.kicker` | 📖 和太鼓 & 地域サークル | 📖 타이코 & 지역 서클 |
| `taikoGuide.title` | 和太鼓の種類 · 地域団体 | 타이코 종류 · 지역 단체 |
| `taikoGuide.closeAria` | 和太鼓ガイドを閉じる | 타이코 안내 창 닫기 |
| `taikoGuide.tabTypes` | 🥁 和太鼓の種類 | 🥁 타이코의 종류 |
| `taikoGuide.tabGroups` | 🏮 地域団体 | 🏮 지역 타이코 단체 |
| `taikoGuide.listenSample` | 🔊 音を聴く | 🔊 소리 듣기 |
| `taikoGuide.posturePrefix` | 構え: {posture} | 자세: {posture} |
| `taikoGuide.hereBadge` | 📍 いま見ている拠点 | 📍 지금 보고 있는 아지트 |
| `circle.kicker` | 🥁 和太鼓サークル紹介 | 🥁 타이코 서클 소개 |
| `circle.dialogAriaSuffix` | サークル紹介・お問い合わせ |  서클 소개 및 문의 |
| `circle.closeAria` | サークル紹介を閉じる | 서클 소개 창 닫기 |
| `circle.practiceLabel` | 🗓️ 定期練習 | 🗓️ 정기 연습 |
| `circle.linksHeading` | お知らせ · リンク | 소식 보기 · 바로가기 |
| `circle.instaQrAlt` | Instagram QRコード | 인스타그램 QR코드 |
| `circle.siteQrAlt` | Taiko World サイトQRコード | Taiko World 사이트 공유 QR코드 |
| `circle.instaQrFallback` | Instagram QR | 인스타그램 QR |
| `circle.siteQrFallback` | サイト QR | 이 사이트 QR |
| `customizer.dialogAria` | キャラクターきせかえ | 캐릭터 꾸미기 |
| `customizer.rotateLeft` | ↺ 回転 | ↺ 회전 |
| `customizer.rotateReset` | 正面 | 정면 |
| `customizer.rotateRight` | 回転 ↻ | 회전 ↻ |
| `customizer.poseBasic` | ⏸ 通常ポーズ | ⏸ 기본 자세 |
| `customizer.posePlay` | 🥁 演奏ポーズ | 🥁 연주 포즈 |
| `customizer.autoSaveSuffix` | 自動保存 | 자동 저장 |
| `customizer.title` | 🎨 きせかえ | 🎨 캐릭터 꾸미기 |
| `customizer.randomBtn` | 🎲 おまかせ | 🎲 랜덤 |
| `customizer.randomTitle` | ランダムできせかえ | 랜덤으로 꾸미기 |
| `customizer.doneBtn` | 完了 | 완료 |
| `customizer.tabGroup` | 🏮 団体 | 🏮 단체 |
| `customizer.tabFace` | 😊 お顔 | 😊 얼굴 |
| `customizer.tabHair` | 🎀 ヘア | 🎀 헤어 |
| `customizer.tabInstrument` | 🥁 太鼓 | 🥁 타이코 |
| `customizer.groupHint` | 団体を選ぶと、その団体の動物キャラクターとお揃いの法被（はっぴ）に着替えます。 | 단체를 선택하면 해당 단체의 동물 캐릭터와 공통 法被(하피)가 함께 적용됩니다. |
| `customizer.commonHappi` | 共通法被 | 공통 法被 |
| `customizer.eyesLabel` | 👀 目の形 | 👀 눈 모양 |
| `customizer.eyeScale` | 目の大きさ | 눈 크기 |
| `customizer.eyeY` | 目の高さ | 눈 높이 |
| `customizer.eyeSpacing` | 目の間隔 | 눈 간격 |
| `customizer.noseLabel` | 👃 鼻の形 | 👃 코 모양 |
| `customizer.noseScale` | 鼻の大きさ | 코 크기 |
| `customizer.noseY` | 鼻の高さ | 코 높이 |
| `customizer.mouthLabel` | 👄 口の形・ほっぺ | 👄 입 모양 & 볼터치 |
| `customizer.mouthScale` | 口の大きさ | 입 크기 |
| `customizer.mouthY` | 口の高さ | 입 높이 |
| `customizer.blushToggle` | 🌸 ピンクのほっぺを表示 | 🌸 분홍 볼터치 표시 |
| `customizer.copyFaceCodeBtn` | 📋 スプレッドシート用の顔コードをコピー | 📋 시트용 얼굴코드 복사 (NPC 등록용) |
| `customizer.copySuccess` | ✅ コピー完了！スプレッドシートの［얼굴코드］列に貼り付けできます。 | ✅ 복사 완료! 구글 시트 [얼굴코드] 칸에 붙여넣어 보세요. |
| `customizer.copyPrompt` | 以下の顔コードをコピーしてシートの［얼굴코드］列に貼り付けてください: | 아래 얼굴코드를 복사해 구글 시트 [얼굴코드] 칸에 붙여넣으세요: |
| `customizer.copyShown` | 📋 顔コードを表示しました。 | 📋 얼굴코드를 표시했습니다. |
| `customizer.hairHint` | うさぎの耳に重ならないヘアスタイル・飾りを試してみよう。 | 토끼 귀와 겹치지 않도록 호환 설계된 헤어·장식을 골라보세요. |
| `customizer.instrumentHint` | 好きな太鼓や鳴り物を装備して芝生広場を歩こう！ | 마음에 드는 타이코나 피리를 몸에 장비하고 잔디 공원을 돌아다녀 보세요! |
| `customizer.hair.hair_hachimaki` | 鉢巻 | 머리띠 |
| `customizer.hair.hair_bun` | お団子 | 만두머리 |
| `customizer.hair.hair_bob` | ボブ | 단발 |
| `customizer.hair.hair_spiky` | ツンツン | 뾰족헤어 |
| `customizer.hair.hair_cap` | キャップ | 모자 |
| `customizer.hair.hair_none` | なし | 없음 |
| `customizer.eyes.round` | 丸い目 | 동그란 눈 |
| `customizer.eyes.sparkle` | キラキラ目 | 반짝 눈 |
| `customizer.eyes.happy` | にっこり目 | 웃는 눈 |
| `customizer.eyes.sleepy` | おねむ目 | 나른한 눈 |
| `customizer.nose.rabbit` | うさぎ鼻 | 토끼 코 |
| `customizer.nose.dot` | まる鼻 | 동그란 코 |
| `customizer.nose.triangle` | さんかく鼻 | 삼각 코 |
| `customizer.mouth.smile` | ほほえみ | 미소 |
| `customizer.mouth.cat` | うさぎ・ねこ口 | 고양이·토끼 입 |
| `customizer.mouth.grin` | にこっと笑顔 | 활짝 웃기 |
| `customizer.mouth.calm` | おだやか | 잔잔한 입 |
| `customizer.instruments.shaku_2.label` | 尺2 | 尺2 |
| `customizer.instruments.shaku_2.desc` | 小型桶胴 · 3D対応 | 소형 어깨북 · 3D 적용 |
| `customizer.instruments.shaku_4.label` | 尺4 | 尺4 |
| `customizer.instruments.shaku_4.desc` | 標準桶胴 · 3D対応 | 중형 어깨북 · 3D 적용 |
| `customizer.instruments.shaku_5.label` | 尺5 | 尺5 |
| `customizer.instruments.shaku_5.desc` | 1尺5寸 桶胴太鼓 | 1척 5촌 어깨북 |
| `customizer.instruments.shaku_6.label` | 尺6 | 尺6 |
| `customizer.instruments.shaku_6.desc` | 大型桶胴 · 3D対応 | 대형 어깨북 · 3D 적용 |
| `customizer.instruments.oki.label` | 沖 | 沖 |
| `customizer.instruments.oki.desc` | エイサー大太鼓 · 3D対応 | 큰 어깨북 · 3D 적용 |
| `customizer.instruments.eisa.label` | エイサー | エイサー |
| `customizer.instruments.eisa.desc` | エイサー太鼓 | 에이사 어깨북 |
| `customizer.instruments.katsugi.label` | 担ぎ | 担ぎ |
| `customizer.instruments.katsugi.desc` | 担ぎ桶胴 (鶴亀会) | 카츠기태고 (鶴亀会) |
| `customizer.instruments.shime.label` | 〆 (締め) | 〆 (締め) |
| `customizer.instruments.shime.desc` | 締太鼓 · 3D対応 | 시메태고 · 3D 적용 |
| `customizer.instruments.hira.label` | 平 | 平 |
| `customizer.instruments.hira.desc` | 平太鼓 (台座) | 평태고 (받침대) |
| `customizer.instruments.chu.label` | 中 | 中 |
| `customizer.instruments.chu.desc` | 中太鼓 (鶴亀会) | 중태고 (鶴亀会) |
| `customizer.instruments.odaiko.label` | 大 | 大 |
| `customizer.instruments.odaiko.desc` | 大太鼓 (鶴亀会) | 대태고 (鶴亀会) |
| `customizer.instruments.taru.label` | たる | たる |
| `customizer.instruments.taru.desc` | 樽太鼓 (鶴亀会) | 통북 (鶴亀会) |
| `customizer.instruments.paranku.label` | パーランクー | パーランクー |
| `customizer.instruments.paranku.desc` | 片面手持ち太鼓 | 파란쿠 손북 |
| `customizer.instruments.fue.label` | 笛 | 笛 |
| `customizer.instruments.fue.desc` | 篠笛（横笛） | 대나무 피리 |
| `customizer.instruments.chappa.label` | チャッパ | チャッパ |
| `customizer.instruments.chappa.desc` | 手平鉦（小） | 미니 심벌즈 |
| `customizer.instruments.jangara.label` | ジャンガラ | ジャンガラ |
| `customizer.instruments.jangara.desc` | 大型手平鉦 | 대형 놋쇠 징 |
| `customizer.instruments.chiki.label` | チキ | チキ |
| `customizer.instruments.chiki.desc` | 当たり鉦 | 아타리가네 |
| `customizer.instruments.suzu.label` | 鈴 | 鈴 |
| `customizer.instruments.suzu.desc` | 神楽鈴・鳴り物 | 전통 방울 |
| `customizer.instruments.uchiwa.label` | うちわ | うちわ |
| `customizer.instruments.uchiwa.desc` | 演出用うちわ | 연출용 부채 |
| `customizer.instruments.none.label` | なし | 없음 |
| `customizer.instruments.none.desc` | 手ぶらで散歩 | 맨손 산책 |
| `songBook.dialogAria` | 和太鼓楽曲・パート譜・作曲 | 타이코 곡 정보 및 직접 작곡 |
| `songBook.kicker` | 🎵 マルチレイヤー和太鼓スタジオ | 🎵 멀티 레이어 타이코 스튜디오 |
| `songBook.title` | 楽曲紹介 · パート譜 | 곡 정보 · 레이어 악보 |
| `songBook.closeAria` | 楽曲画面を閉じる | 곡 정보 창 닫기 |
| `songBook.tabView` | 📚 収録曲スコア ({count}) | 📚 수록곡 악보 ({count}) |
| `songBook.tabCompose` | ✨ オリジナル作曲 | ✨ 직접 작곡하기 |
| `songBook.customBadge` | 自作 | 내 작곡 |
| `songBook.difficulty.입문` | 入門 | 입문 |
| `songBook.difficulty.보통` | 標準 | 보통 |
| `songBook.difficulty.중급` | 中級 | 중급 |
| `songBook.metaLayers` | 🎚️ 参加パート {count}種 | 🎚️ 참여 악기 {count}종 |
| `songBook.metaMinPlayers` | 👥 合奏 {count}人以上 | 👥 합주 최소 {count}명 이상 |
| `songBook.capableMembers` | 演奏可能メンバー | 연주 가능 멤버 |
| `songBook.arrangeBtn` | ✏️ この曲をアレンジして作曲する | ✏️ 이 곡을 작곡 화면에서 편곡하기 |
| `songBook.deleteBtn` | 🗑️ 削除 | 🗑️ 삭제 |
| `songBook.draftTitleDefault` | オリジナル太鼓曲 | 나의 타이코 곡 |
| `songBook.draftSubtitleDefault` | 自作マルチレイヤー口唱歌スコア | 직접 작곡한 멀티 레이어 악보 |
| `songBook.draftDescDefault` | 楽器パートと強弱を自由に組んだオリジナル合奏曲です。 | 직접 레이어와 강약을 구성해 만든 나만의 타이코 합주곡입니다. |
| `songBook.arrangeSuffix` | アレンジ | 편곡 |
| `songBook.toastLoadedToComposer` | 楽譜を作曲エディタに読み込みました！ | 악보를 작곡 화면으로 불러왔어요! |
| `songBook.toastMinOneLayer` | 最低1つの楽器パートを残してください。 | 최소 1개의 악기 레이어는 남겨두어야 해요. |
| `songBook.toastCleared` | すべての音符と強弱記号をリセットしました。 | 모든 음표와 강약 표현을 비웠습니다. |
| `songBook.toastSaved` | 「{title}」を保存しました！ | "{title}" 곡을 저장했어요! |
| `songBook.toastExportComing` | 📤 書き出し機能は今後のアップデートで追加予定です！ | 📤 내 곡 내보내기 기능은 추후 업데이트될 예정입니다! |
| `songBook.toastDeleted` | 保存した自作楽曲を削除しました。 | 저장된 커스텀 곡을 삭제했습니다. |
| `songBook.composerSongTitleLabel` | 曲タイトル | 곡 제목 |
| `songBook.composerSongTitlePlaceholder` | 例: 夏祭りリズム | 예: 여름 축제 리듬 |
| `songBook.composerMeasuresLabel` | 小節数 | 마디 길이 |
| `songBook.composerMeasureChip` | {count}小節 | {count}마디 |
| `songBook.composerMinPlayersLabel` | 最低合奏人数 | 최소 합주 인원 |
| `songBook.composerMinPlayersChip` | {count}人+ | {count}명+ |
| `songBook.composerTracksLabel` | 楽器パート選択（タップで追加・削除） | 악기 레이어 선택 (눌러서 추가 · 제거) |
| `songBook.composerBrushLabel` | 編集ツール（強弱・クレッシェンド等を選んでマスをタップ） | 편집 도구 (강약 · 점점 크게/작게 표현을 골라 칸을 눌러 적용) |
| `songBook.tools.note` | 🎵 音符入力 | 🎵 음표 찍기 |
| `songBook.tools.strong` | 🔥 強く (f) | 🔥 강하게 (f) |
| `songBook.tools.weak` | 🍃 弱く (p) | 🍃 약하게 (p) |
| `songBook.tools.cresc` | 📈 だんだん強く (<) | 📈 점점 크게 (<) |
| `songBook.tools.decresc` | 📉 だんだん弱く (>) | 📉 점점 작게 (>) |
| `songBook.tools.normal` | ⬜ 通常 | ⬜ 보통 |
| `songBook.btnStop` | ⏹ 停止 | ⏹ 연주 정지 |
| `songBook.btnPlayCustom` | ▶ 自作曲を再生 | ▶ 내 곡 연주 듣기 |
| `songBook.btnPlayView` | ▶ スコアを再生 | ▶ 레이어 악보 연주 듣기 |
| `songBook.btnSave` | 💾 保存 | 💾 내 곡 저장 |
| `songBook.btnExport` | 📤 書き出し | 📤 내 곡 내보내기 |
| `songBook.btnClear` | 🗑️ クリア | 🗑️ 비우기 |
| `songBook.scoreHeadingCompose` | 左スライダーで音量調整 · タップで音符/強弱入力（右クリックで消去） | 좌측 슬라이더로 레이어 볼륨 조절 · 칸 클릭으로 음표/강약 입력 (우클릭 지우기) |
| `songBook.scoreHeadingView` | 左スライダーでパート別音量調整 · f(強) p(弱) <(強く) >(弱く) | 좌측 슬라이더로 레이어 볼륨 조절 · f(강) p(약) <(점점 크게) >(점점 작게) |
| `songBook.rulerCorner` | 小節 · 音量 | 마디 · 볼륨 |
| `songBook.measureCell` | {num}小節 | {num}마디 |
| `songBook.unmute` | ミュート解除 | 소리 켜기 |
| `songBook.mute` | ミュート | 음소거 |
| `songBook.volumeAria` | 音量 | 볼륨 |
| `songBook.scoreLegend` | f(強く) · p(弱く) · <(だんだん強く) · >(だんだん弱く) — 再生とNPC合奏に反映されます | f(강하게) · p(약하게) · <(점점 크게) · >(점점 작게) — 실제 재생과 NPC 합주에 모두 반영됩니다 |

## 2. 타이코 종류 · 지역 단체 안내 (`src/locales/taikoGuide.json`)
타이코 10종 구조/자세/설명 및 転太鼓舞·鶴亀会 소개글 (총 **78개** 항목)

| 키 경로 (수정 위치) | 🇯🇵 일본어 (`ja`, 기본) | 🇰🇷 한국어 (`ko`) |
| --- | --- | --- |
| `intro` | 和太鼓は、皮の張り方（紐締めと鋲打ち）、胴の形、担ぐ・台に据えるといった構え方によって音色や役割が大きく変わります。転太鼓舞と鶴亀会が実際に使っている和太鼓・鳴り物を、重なる呼び名も含めてわかりやすくまとめました。 | 타이코(和太鼓)는 가죽을 고정하는 방식(밧줄 조임 vs 징 박기), 통 모양, 그리고 메거나 받침대에 세우는 연주 자세에 따라 소리·역할이 크게 달라집니다. 転太鼓舞와 鶴亀会가 사용하는 실제 악기 종류를 겹치는 호칭까지 함께 알기 쉽게 정리했습니다. |
| `editNotice` | ※ 転太鼓舞・鶴亀会の実保有リストをもとに重複名称（尺＝担ぎ、沖＝エイサー、中・大＝長胴太鼓）を整理し、構造と演奏スタイルを解説しています。 | ※ 転太鼓舞·鶴亀会의 실제 보유 악기 목록을 기준으로 중복 명칭(尺=担ぎ, 沖=エイサー, 中·大=長胴太鼓)을 통합하고 세부 구조·연주 자세 설명을 정리했습니다. |
| `instruments.guide_okedo_shaku.name` | 尺 (2 · 4 · 5 · 6) · 担ぎ | 尺 (2 · 4 · 5 · 6) · 担ぎ |
| `instruments.guide_okedo_shaku.reading` | 桶胴太鼓（おけどうだいこ）· 担ぎ太鼓（転太鼓舞 · 鶴亀会 共通） | 오케도 다이코 · 카츠기태고 (転太鼓舞 · 鶴亀会 공통) |
| `instruments.guide_okedo_shaku.posture` | 肩紐で左腰に斜めに担いで両面打ち / または2据台·6据台（桶立台）に縦置き演奏 | 어깨 끈으로 왼쪽 허리에 비스듬히 메고(카츠기) 양면 타격 / 또는 2据台·6据台(桶立台)에 세로 거치 |
| `instruments.guide_okedo_shaku.role` | 動きのある振付と豊かな音域・リズムの厚みを生み出す軽量太鼓 | 이동 안무와 풍성한 음역대 리듬·화음을 채우는 핵심 경량 타이코 |
| `instruments.guide_okedo_shaku.soundsLabel` | 基本口唱歌: う · さ · かっ（1尺2寸〜6寸の口径差） | 기본 음: う · さ · かっ (1척 2·4·5·6촌 지름별 음고 차이) |
| `instruments.guide_okedo_shaku.description` | 桶のように組んだ木胴の両面に皮を当て、調べ紐で締め上げる軽量な「桶胴太鼓」です。転太鼓舞では口径に合わせて尺2（約36cm）・尺4（約42cm）・尺5（約45cm）・尺6（約48cm）と呼び、鶴亀会の「担ぎ」は同じ桶胴を肩から下げて両面を叩く奏法を指します。2据台・6据台（桶立台）に据えて上から打つこともあります。 | 나무 널빤지를 통으로 엮고 주황·흰색 밧줄(調べ紐)로 양쪽 가죽을 조여 만든 가벼운 '오케도 다이코(桶胴太鼓)'입니다. 転太鼓舞는 북면 지름에 따라 尺2(약 36cm)·尺4(약 42cm)·尺5(약 45cm)·尺6(약 48cm)로 부르며, 鶴亀会의 '担ぎ(카츠기)'는 같은 오케도 다이코를 어깨에 비스듬히 메고 양면을 동시에 치는 연주 방식을 뜻합니다. 2据台·6据台(桶立台) 틀에 세워 위에서 두드리기도 합니다. |
| `instruments.guide_oki_eisa.name` | 沖 · エイサー（沖縄エイサー大太鼓） | 沖 · エイサー (沖縄エイサー大太鼓) |
| `instruments.guide_oki_eisa.reading` | おき · オキナワエイサーオオダイコ（転太鼓舞） | 오키 · 오키나와 에이사 대북 (転太鼓舞) |
| `instruments.guide_oki_eisa.posture` | 布紐を肩に掛け、左手で太鼓の上縁を支えながら右手の太バチ1本で跳躍・演舞打ち | 천 끈을 어깨에 걸고 왼손으로 북 테두리를 잡은 채 오른손 굵은 채 1개로 도약·춤과 함께 타격 |
| `instruments.guide_oki_eisa.role` | 沖縄エイサーならではのダイナミックな演舞と力強い低音 | 오키나와 에이사 특유의 역동적인 도약 군무와 깊은 저음 울림 |
| `instruments.guide_oki_eisa.soundsLabel` | 基本口唱歌: どん · かっ（大小サイズ展開あり） | 기본 음: どん · かっ (크기별 대/소 구분) |
| `instruments.guide_oki_eisa.description` | 現場では「沖」とも「エイサー」とも呼ばれますが、同じ沖縄エイサーの伝統的な大太鼓です。朱塗りの胴に黒鋲で牛皮を張り、両手打ちの担ぎ桶胴とは違って左手で胴の縁を直接押さえて角度を決め、右手の太めのバチ1本で力強く打ちながら踊り跳ねるのが特徴です。 | 현장에서 '沖(오키)'와 'エイサー(에이사)'로 불리지만 같은 오키나와 에이사 전통 대북(エイサー大太鼓)입니다. 붉은색 칠을 한 나무 통 양면에 검은 징(鋲)으로 소가죽을 팽팽히 고정해 두드리며, 카츠기(양손 타격)와 달리 왼손으로 북 상단을 직접 잡아 각도를 조절하고 오른손의 굵은 바치 하나로 힘차게 내리치며 역동적으로 춤추는 것이 특징입니다. |
| `instruments.guide_shime.name` | 〆 · 締め（締め太鼓） | 〆 · 締め (締め太鼓) |
| `instruments.guide_shime.reading` | しめだいこ（転太鼓舞 · 鶴亀会 共通） | 시메다이코 (転太鼓舞 · 鶴亀会 공통) |
| `instruments.guide_shime.posture` | 立奏（〆立足·〆立ち足）または座奏（〆座足·〆座り足）の台に載せて演奏 | 입식(〆立足·〆立ち足) 또는 좌식(〆座足·〆座り足) 받침대에 올려 연주 |
| `instruments.guide_shime.role` | 曲全体のテンポ・拍・緊張感を引っ張るリード（指揮）役 | 곡 전체의 박자·속도·긴장감을 이끄는 리드(지휘) 타이코 |
| `instruments.guide_shime.soundsLabel` | 基本口唱歌: う · さ（高く歯切れのよい高音） | 기본 음: う · さ (높고 또렷한 스타카토 고음) |
| `instruments.guide_shime.description` | 平たい木胴の両面に厚手の革を当て、ロープで強く締め上げた小型の太鼓です。張り具合が非常に強いためバチの跳ね返りがよく、細かい連打や速い刻みで合奏全体のリズムを安定させます。 | 납작한 원통 양면에 두꺼운 테두리 가죽을 밧줄로 아주 강하게 당겨 조인 작은 북입니다. 가죽 장력이 높아 북채가 튕겨 오르는 반발력이 좋고 소리가 멀리 또렷하게 퍼져, 빠른 연타(츠쿠톤 등)와 전체 합주의 박자 기준을 잡아주는 역할을 합니다. |
| `instruments.guide_nagado.name` | 中 · 大（長胴太鼓 · 宮太鼓） | 中 · 大 (長胴太鼓 · 나가도 다이코) |
| `instruments.guide_nagado.reading` | ちゅうだいこ · おおだいこ / ながどうだいこ（鶴亀会 · 広場中央の体験太鼓） | 중태고 · 대태고 / 궁태고 (鶴亀会 · 광장 중앙 체험북) |
| `instruments.guide_nagado.posture` | 中足 · 大足 · 大据足（X型台）· 斜め置台 · 三宅台に据えて演奏 | 中足 · 大足 · 大据足(X형 거치대) · 斜め置台(경사대) · 三宅台(미야케대) 위에 거치해 연주 |
| `instruments.guide_nagado.role` | 舞台に重厚感をもたらし、腹の底まで響く伝統的な大低音 | 무대의 무게감과 가슴까지 울리는 정통 저음·폭발적 에너지 |
| `instruments.guide_nagado.soundsLabel` | 基本口唱歌: どん · かっ（重厚な響き） | 기본 음: どん · かっ (중후한 동굴 울림) |
| `instruments.guide_nagado.description` | くり抜きや集成の厚い木胴に牛皮を鋲で打ち留め、側面に環（カン）が付いた正統派の和太鼓です。鶴亀会の「中」は合奏の中核を、「大」は圧倒的な重低音を支えます。低い台に斜めに据える「大足」、高いX型台の「大据足／斜め置台」、低く伏せて両側から打つ「三宅台」など台座によって構えが変わります。 | 큰 통나무를 파내거나 두껍게 엮은 통 양면에 가죽을 검은 징(鋲打ち)으로 단단히 박아 넣고 측면에 고리(カン)가 달린 정통 일본 북입니다. 鶴亀会에서 쓰는 '中(중태고)'은 합주의 든든한 중심 허리를, '大(대태고)'는 압도적인 저음을 담당합니다. 받침대에 따라 낮게 비스듬히 두거나(大足), X형 지지대에 높게 기울여 치거나(大据足/斜め置台), 낮게 눕혀 양쪽에서 정권 자세로 내리칩니다(三宅台). |
| `instruments.guide_hira.name` | 平（平太鼓） | 平 (平太鼓) |
| `instruments.guide_hira.reading` | ひらだいこ（転太鼓舞） | 히라다이코 · 평태고 (転太鼓舞) |
| `instruments.guide_hira.posture` | 平太鼓用の低台または斜め台に据えて演奏 | 평태고 전용 낮거나 비스듬한 받침대에 거치해 연주 |
| `instruments.guide_hira.role` | やわらかく広がるあたたかな中低音の余韻 | 부드럽고 넓게 깔리는 따뜻한 중저음 여운 |
| `instruments.guide_hira.soundsLabel` | 基本口唱歌: どん · かっ | 기본 음: どん · かっ |
| `instruments.guide_hira.description` | 長胴太鼓と同じ鋲打ち構造ながら、胴の奥行きを浅く平たく仕上げた太鼓です。口径が広く角の取れた温かい余韻が長く残るため、篠笛などの旋律パートとも心地よく溶け合います。 | 나가도 다이코와 같은 징 박기 구조이지만 몸통 길이(깊이)를 얇고 납작하게 만들어 넓적한 접시처럼 생긴 북입니다. 가죽 지름이 넓어 깊고 부드러운 울림과 포근한 잔향을 만들어 주며, 피리·선율 파트와 조화를 이루는 곡에서 특히 빛납니다. |
| `instruments.guide_taru.name` | たる（樽太鼓 · 大 · 小） | たる (樽太鼓 · 大 · 小) |
| `instruments.guide_taru.reading` | たるだいこ（鶴亀会） | 타루 다이코 · 통북 (鶴亀会) |
| `instruments.guide_taru.posture` | 低めの台や木枠に据えて演奏 | 낮은 받침대나 바닥 틀에 세워두고 연주 |
| `instruments.guide_taru.role` | 乾いたキレのある個性的な樽鳴りアクセント | 경쾌하고 톡 쏘는 나무 통 울림 포인트 |
| `instruments.guide_taru.soundsLabel` | 基本口唱歌: どん · とん · かっ（大·小サイズ） | 기본 음: どん · とん · かっ (大·小 크기 구분) |
| `instruments.guide_taru.description` | 竹のタガを巻いた酒樽のような木桶を使ったユニークな太鼓です。大・小2種類のサイズがあり、一般的な長胴太鼓よりも立ち上がりが速く軽快な響きで楽曲にアクセントを加えます。 | 일본 술통(사케다루)처럼 대나무 띠(タガ)로 둘러 엮은 나무 통을 개조·제작한 독특한 개성의 북입니다. 大·小 두 가지 크기가 있으며 일반 통나무 북보다 울림이 건조하고 단단해, 리듬 악센트나 경쾌한 앙상블 파트를 돋보이게 합니다. |
| `instruments.guide_paranku.name` | パーランクー | パーランクー |
| `instruments.guide_paranku.reading` | ぱーらんくー · 沖縄手持ち片面太鼓（転太鼓舞） | 파란쿠 · 오키나와 손북 (転太鼓舞) |
| `instruments.guide_paranku.posture` | 左手で枠を握り、右手の木バチ1本で踊りながら打つ | 왼손으로 북 뒤편 테두리를 쥐고 오른손 나무 채 1개로 춤추며 타격 |
| `instruments.guide_paranku.role` | 高い機動力を活かした群舞と軽やかな「とん」の音 | 작고 가벼운 기동성을 살린 춤·군무·통통 튀는 리듬 |
| `instruments.guide_paranku.soundsLabel` | 基本口唱歌: とん · かっ（約21cm前後の小型片面太鼓） | 기본 음: とん · かっ (21cm 전후 소형 한 면 북) |
| `instruments.guide_paranku.description` | 沖縄のエイサーに欠かせない片面張りの手持ち太鼓です。直径21cmほどの赤い木枠の片側だけに革を鋲打ちし、裏側は抜けていて非常に軽いため、踊りや回転を交えながら明るく跳ねるリズムを刻みます。 | 오키나와 에이사에서 빼놓을 수 없는 한 면(片面) 손북입니다. 지름 약 21cm 안팎의 붉은 얇은 나무 틀 한쪽에만 가죽을 징으로 고정하고 반대쪽은 뚫려 있어, 아주 가볍고 '통!' 하는 밝은 중음과 테두리('かっ') 소리를 낼 수 있습니다. 손에 든 채 회전·도약하는 군무에서 활약합니다. |
| `instruments.guide_fue.name` | 笛（篠笛 · しのぶえ） | 笛 (篠笛 · 시노부에) |
| `instruments.guide_fue.reading` | しのぶえ · 日本伝統の横笛 | 후에 · 일본 전통 대나무 피리 |
| `instruments.guide_fue.posture` | 両手で構えて横に吹く横笛 | 두 손으로 가로로 쥐고 입에 대어 부는 횡적(가로피리) |
| `instruments.guide_fue.role` | 打楽器の迫力に澄んだメロディを乗せる花形パート | 타악기 합주 위에 서정적이고 흥겨운 멜로디(선율)를 입히는 역할 |
| `instruments.guide_fue.soundsLabel` | アプリ対応11音階: ド · レ · ミ · ファ · ソ · ラ · シ · ド↑ · レ↑ · ミ↑ · ソ↑ | 앱 지원 11음계: ド · レ · ミ · ファ · ソ · ラ · シ · ド↑ · レ↑ · ミ↑ · ソ↑ |
| `instruments.guide_fue.description` | 篠竹に指孔を開け漆や籐で仕上げた日本の横笛です。力強い太鼓の音色を突き抜けて届く澄んだ高音が特徴で、お祭りらしい賑やかな旋律から冬の叙情的なメロディまで楽曲の表情を豊かに彩ります。 | 대나무에 지공을 뚫어 옻·실로 마감한 일본 전통 가로피리(시노부에)입니다. 힘찬 북소리 사이를 뚫고 지나가는 맑고 높은 음색 덕분에 축제 분위기의 흥겨운 곡부터 서정적인 캐롤·겨울 멜로디까지 곡의 분위기를 주도합니다. |
| `instruments.guide_metal_percussion.name` | チャッパ · ジャンガラ · チキ | チャッパ · ジャンガラ · チキ |
| `instruments.guide_metal_percussion.reading` | 金属打楽器 3種（転太鼓舞 · 鶴亀会 共通） | 금속 타악기 3종 (転太鼓舞 · 鶴亀会 공통) |
| `instruments.guide_metal_percussion.posture` | 両手で打ち合わせる（チャッパ·ジャンガラ）/ 片手で持ち小バチで叩く（チキ） | 양손으로 맞부딪히거나(チャッパ·ジャンガラ) 한 손으로 잡고 작은 채로 타격(チキ) |
| `instruments.guide_metal_percussion.role` | 金属ならではの華やかな響きと細かな拍の刻み | 금속의 화려한 여운과 축제 리듬의 날카로운 박자 쪼개기 |
| `instruments.guide_metal_percussion.soundsLabel` | チャッパ(小) · ジャンガラ(大) · チキ(当たり鉦) | チャッパ(소형 쨍~) · ジャンガラ(대형 좡~) · チキ(소형 꽹과리 치키-콘) |
| `instruments.guide_metal_percussion.description` | 革の太鼓とは異なる金属のきらびやかな響きを加える3つの楽器です。① チャッパは手のひら大の真鍮シンバルで歯切れよい「チッ」と華やかな「チャン」を鳴らし、② ジャンガラはさらに大きく重厚な「ジャーン」という余韻を響かせ、③ チキ（当たり鉦）は小さな金属の鉦を撞木で叩き祭り囃子のビートをくっきり刻みます。 | 가죽 북과는 다른 금속 특유의 화려한 소리를 더하는 3총사입니다. ① チャッパ(차파)는 손바닥 크기의 놋쇠 미니 심벌즈로 밀착('チッ')과 개방('チャン') 음색을 만들고, ② ジャンガラ(쟝가라)는 그보다 크고 두꺼운 대형 놋쇠 심벌즈/징으로 묵직한 'ジャーン' 여운을 울리며, ③ チキ(치키/아타리가네)는 작은 놋쇠 꽹과리를 뿔·나무 채로 두드려 축제 하야시 박자를 선명하게 쪼개 줍니다. |
| `instruments.guide_props.name` | 鈴 · うちわ | 鈴 · うちわ |
| `instruments.guide_props.reading` | すず · うちわ（転太鼓舞） | 스즈(방울) · 우치와(부채) (転太鼓舞) |
| `instruments.guide_props.posture` | 手に持って振る・演舞の小道具として活用 | 손에 쥐고 흔들거나 안무 소품으로 활용 |
| `instruments.guide_props.role` | 澄んだ鈴の音とステージを彩るダイナミックな演出 | 맑고 영롱한 방울 소리와 화려한 무대 시각 퍼포먼스 |
| `instruments.guide_props.soundsLabel` | 鈴（シャン） · うちわ（演舞·パフォーマンス小道具） | 鈴(シャン·방울) · うちわ(안무·바람·퍼포먼스 소품) |
| `instruments.guide_props.description` | 曲の導入やクリスマス・冬の演出で涼やかな響きを添える伝統の「鈴」と、大きな和風の団扇を力強く振って動きのラインと迫力を際立たせるステージ小道具「うちわ」です。 | 곡의 시작이나 클라이맥스·겨울 테마에서 맑고 찰랑이는 소리로 시선을 끄는 전통 방울 '鈴(스즈)'과, 둥글고 커다란 전통 부채를 힘차게 휘두르며 춤의 선과 박력을 강조하는 연출 소품 'うちわ(우치와)'입니다. |
| `localGroups.group_tentaikomai.name` | 転太鼓舞 | 転太鼓舞 |
| `localGroups.group_tentaikomai.reading` | てんたいこまい | 텐타이코마이 |
| `localGroups.group_tentaikomai.affiliation` | 造形大学 和太鼓サークル | 조형대학 타이코 서클 |
| `localGroups.group_tentaikomai.tagline` | 造形的な感性とダイナミックな動きが響き合う和太鼓サークル | 조형적 감각과 역동적인 움직임이 어우러지는 타이코 서클 |
| `localGroups.group_tentaikomai.description` | 造形大学の学生を中心に活動する和太鼓サークルです。桶胴太鼓 尺（2・4・5・6）、沖縄エイサー太鼓（沖・エイサー）、パーランクー、平太鼓、締太鼓、チャッパ・ジャンガラ・チキ、鈴・うちわなど多彩な編成で躍動感あふれる舞台をお届けしています。 | 조형대학 학생들을 중심으로 구성된 타이코 서클입니다. 오케도 다이코 尺(2·4·5·6), 오키나와 에이사북(沖·エイサー), パーランクー, 平, 〆, チャッパ·ジャンガラ·チキ, 鈴·うちわ 등 다채로운 악기와 소품으로 역동적인 안무와 입체적인 무대를 선보입니다. |
| `localGroups.group_tentaikomai.tags[0]` | 造形大学 | 조형대학 |
| `localGroups.group_tentaikomai.tags[1]` | うさぎキャラ | 토끼 캐릭터 |
| `localGroups.group_tentaikomai.tags[2]` | 尺 · 沖(エイサー) · パーランクー · 平 | 尺 · 沖(エイサー) · パーランクー · 平 |
| `localGroups.group_tsurukamekai.name` | 鶴亀会 | 鶴亀会 |
| `localGroups.group_tsurukamekai.reading` | つるかめかい | 츠루카메카이 |
| `localGroups.group_tsurukamekai.affiliation` | 技術大学 和太鼓サークル | 기술대학 타이코 서클 |
| `localGroups.group_tsurukamekai.tagline` | 息の合ったアンサンブルと迫力ある響きを届ける和太鼓サークル | 탄탄한 합주 호흡과 박력 있는 울림을 전하는 타이코 서클 |
| `localGroups.group_tsurukamekai.description` | 技術大学の学生を中心に活動する和太鼓サークルです。長胴太鼓の中・大をはじめ、担ぎ桶胴、樽太鼓（大・小）、締太鼓、チャッパ・ジャンガラ・チキなど重厚な編成と緻密なリズム構成で地域のお祭りや交流公演を盛り上げています。 | 기술대학 학생들을 중심으로 구성된 타이코 서클입니다. 나가도 다이코 中·大와 카츠기 오케도(担ぎ), 타루 통북(たる 大·小), 〆, チャッパ·ジャンガラ·チキ 등 탄탄한 편성과 정교한 리듬 구성으로 지역 행사와 교류 공연에서 박력 있는 무대를 만들어가고 있습니다. |
| `localGroups.group_tsurukamekai.tags[0]` | 技術大学 | 기술대학 |
| `localGroups.group_tsurukamekai.tags[1]` | かめキャラ | 거북이 캐릭터 |
| `localGroups.group_tsurukamekai.tags[2]` | 中 · 大 · 担ぎ · たる | 中 · 大 · 担ぎ · たる |

## 3. 서클 · 배경/시즌 테마 · 악곡 · 트랙 (`src/locales/content.json`)
서클 안내, 배경 테마 4종, 시즌 테마 7종, 수록곡 4곡, 18개 악기 트랙 설명 (총 **86개** 항목)

| 키 경로 (수정 위치) | 🇯🇵 일본어 (`ja`, 기본) | 🇰🇷 한국어 (`ko`) |
| --- | --- | --- |
| `circle.name` | Taiko | Taiko |
| `circle.tagline` | みんなで叩いて楽しむ和太鼓サークル | 함께 두드리고 즐기는 타이코 서클 |
| `circle.description` | 太鼓を初めて握る初心者の方も大歓迎です！週1回集まって思いきり和太鼓を叩き、お祭りや小さな本番に向けて一緒に準備を楽しむあたたかなサークルです。 | 악기를 처음 잡아보는 초보자도 환영합니다! 주 1회 모여 신나게 북을 두드리고, 축제와 작은 공연을 함께 준비하는 따뜻한 동아리입니다. |
| `circle.practiceInfo` | 毎週土曜日 14:00 〜 17:00 | 매주 토요일 14:00 ~ 17:00 |
| `circle.links.instagram` | Instagramを見る | 인스타그램 구경하기 |
| `circle.links.university` | 大学ホームページへ | 대학교 홈페이지 바로가기 |
| `circle.instagramQrCaption` | Instagram QR | 인스타그램 QR |
| `circle.siteQrCaption` | Taiko World サイトQR | Taiko World 사이트 QR |
| `groups.group_tentaikomai.affiliation` | 造形大学 和太鼓サークル | 조형대학 타이코 서클 |
| `groups.group_tentaikomai.speciesLabel` | うさぎ | 토끼 |
| `groups.group_tsurukamekai.affiliation` | 技術大学 和太鼓サークル | 기술대학 타이코 서클 |
| `groups.group_tsurukamekai.speciesLabel` | かめ | 거북이 |
| `environments.park_grass.name` | 芝生広場 | 잔디 공원 |
| `environments.park_grass.description` | 柔らかな陽ざしが降り注ぐ基本の屋外芝生広場 | 따뜻한 햇살이 내리쬐는 기본 야외 잔디 광장 |
| `environments.practice_room.name` | 練習室 | 연습실 |
| `environments.practice_room.description` | 木の床と落ち着いた照明が心地よい室内練習スペース | 원목 마루와 아늑한 조명이 돋보이는 실내 연습 공간 |
| `environments.snow_field.name` | 雪の広場 | 눈오는 들판 |
| `environments.snow_field.description` | 真っ白な雪が積もり雪の結晶が舞う冬の広場 | 하얀 눈이 소복이 쌓이고 눈송이가 흩날리는 겨울 들판 |
| `environments.sunset_plaza.name` | 夕焼け広場 | 노을 광장 |
| `environments.sunset_plaza.description` | 練習の締めくくりにぴったりの温かな夕暮れの公園 | 하루 연습을 마무리하는 따뜻한 저녁 노을빛 공원 |
| `themes.default.name` | 通常 | 기본 |
| `themes.christmas.name` | クリスマス | 크리스마스 |
| `themes.christmas.bannerText` | Merry Christmas! 🎄 | Merry Christmas! 🎄 |
| `themes.christmas.bannerSubText` | 和太鼓でキャロルを一緒に叩いてみよう | 타이코로 캐롤을 함께 연주해 봐요 |
| `themes.winter.name` | 冬シーズン | 겨울 시즌 |
| `themes.graduation.name` | 卒業式 | 졸업식 |
| `themes.graduation.bannerText` | ご卒業おめでとうございます！ 🌸 | 졸업을 축하합니다! 🌸 |
| `themes.graduation.bannerSubText` | 一緒に太鼓を叩いてくれてありがとう | 함께 북을 두드려줘서 정말 고마웠어요 |
| `themes.entrance.name` | 入学式 | 입학식 |
| `themes.entrance.bannerText` | ご入学おめでとうございます！ 🌱 | 입학을 환영합니다! 🌱 |
| `themes.entrance.bannerSubText` | 和太鼓体験いつでも遊びに来てください | 타이코 서클 체험 언제든 놀러 오세요 |
| `themes.summer.name` | 夏休み | 여름방학 |
| `themes.summer.bannerText` | 爽やかな夏休み 🌻 | 시원한 여름방학 🌻 |
| `themes.summer.bannerSubText` | 熱く楽しく響く和太鼓の一打！ | 뜨겁고 신나게 울리는 타이코 한 판! |
| `themes.obon.name` | お盆祭り | 오봉 축제 |
| `themes.obon.bannerText` | お盆夏祭り 🏮 | 오봉 여름 축제 🏮 |
| `themes.obon.bannerSubText` | 夜空の提灯の下でみんなで合奏しよう | 밤하늘 등불 아래 다 함께 합주해요 |
| `instruments.taiko_nagado_01.name` | 長胴太鼓 | 타이코 |
| `songs.song_matsuri.title` | 祭り太鼓 | 축제 한마당 (마츠리) |
| `songs.song_matsuri.subtitle` | 全パートが重なり合う賑やかなオープニング合奏曲 | 전 파트가 어우러지는 신나는 오프닝 합주곡 |
| `songs.song_matsuri.description` | 締太鼓の軽快なリードに尺4のリズム、沖太鼓の重低音、篠笛の明るい音階（レ〜ミ↑）とチャッパが一体となる代表曲です。 | 시메의 빠른 리드 위로 尺(4)의 리듬, 沖의 웅장한 저음, 확장된 피리 음계(レ~ミ↑)의 흥겨운 축제 선율과 チャッパ가 어우러지는 대표곡입니다. |
| `songs.song_kaze.title` | 風の響き | 바람의 울림 (카제) |
| `songs.song_kaze.subtitle` | 篠笛の高音域（ド〜ソ↑）と尺2・締・チャッパの爽やかな4人編成 | 피리 고음역(ド~ソ↑)과 尺(2)·시메·차파의 경쾌한 4인 앙상블 |
| `songs.song_kaze.description` | 4人以上が集まると演奏する清涼感ある楽曲です。風のように低いドから高いソ↑へ駆け上がり、すっと引いていく笛の旋律と強弱表現が見どころです。 | 4명 이상이 모였을 때 연주하는 청량한 편성입니다. 바람처럼 저음 ド에서 높은 ソ↑까지 날아오르며 잦아드는 피리 멜로디와 강약 표현이 포인트입니다. |
| `songs.song_daichi.title` | 大地の鼓動 | 대지의 북소리 (다이치) |
| `songs.song_daichi.subtitle` | 沖・尺6・締太鼓の上へ雄大に広がる篠笛アレンジ | 沖와 尺(6)·시메 위로 낮고 장엄하게 울려 퍼지는 피리 편곡 |
| `songs.song_daichi.description` | 重厚な大地の太鼓の上へ、低音のド・レ・ファから高音のド↑・レ↑へと伸び上がる篠笛を乗せ、ドラマチックなクレッシェンドを作り上げました。 | 묵직한 대지의 북소리 위로 저음 ド·レ·ファ에서 시작해 웅장한 高音 ド↑·レ↑까지 뻗어 나가는 피리 선율을 더해 극적인 크레센도를 완성했습니다. |
| `songs.song_carol_taiko.title` | ジングルベル太鼓 🎄 | 징글벨 타이코 (크리스마스 캐롤 🎄) |
| `songs.song_carol_taiko.subtitle` | 鈴・篠笛（オクターブ盛り上がり）・締・尺4・沖・チャッパの6重奏16小節 | 썰매 방울(鈴)·피리(옥타브 클라이맥스)·締め·尺4·沖·チャッパ 6중주 16마디 완곡 |
| `songs.song_carol_taiko.description` | 澄んだ鈴と篠笛で始まる1番から、2番では高音オクターブの笛（ミ↑・ソ↑・ド↑）と締・尺4・沖・チャッパが総登場し華やかなフィナーレを迎える16小節フル構成のクリスマス曲です。 | 맑은 썰매 방울(鈴)과 피리(笛)가 여는 1절에서 시작해, 2절에는 높은 옥타브 피리(ミ↑·ソ↑·ド↑)와 締め·尺4·沖·チャッパ가 모두 어우러져 화려한 크리스마스 피날레로 마무리되는 16마디 완곡 타이코 캐롤입니다. |
| `tracks.fue.fullName` | 笛（篠笛） | 笛 (시노부에 · 피리) |
| `tracks.fue.summary` | 主旋律を奏でる竹の横笛（11音階：ド〜ソ↑） | 전체 멜로디를 연주하는 대나무 피리 (전체 11음계: ド·レ·ミ·ファ·ソ·ラ·シ·ド↑·レ↑·ミ↑·ソ↑) |
| `tracks.shime.fullName` | 〆 · 締め（締太鼓） | 〆 · 締め (시메다이코) |
| `tracks.shime.summary` | 紐で強く締めた小型太鼓 ― 立奏/座奏台で曲のテンポを牽引（う·さ） | 끈으로 강하게 조인 소형 북 — 입식(〆立足)/좌식(〆座足) 받침대에서 곡의 박자·속도를 리드 (う·さ) |
| `tracks.shaku_2.fullName` | 尺2（桶胴太鼓 · 約36cm） | 尺2 (桶胴太鼓 · 약 36cm) |
| `tracks.shaku_2.summary` | 1尺2寸の桶胴太鼓 ― 肩担ぎや2据台（桶立台）で軽快な高音（う·さ·かっ） | 1척 2촌 크기 오케도 다이코 — 어깨 카츠기 또는 2据台(桶立台)에 올려 연주하는 밝고 경쾌한 고음 (う·さ·かっ) |
| `tracks.shaku_4.fullName` | 尺4（桶胴太鼓 · 約42cm） | 尺4 (桶胴太鼓 · 약 42cm) |
| `tracks.shaku_4.summary` | 1尺4寸の桶胴太鼓 ― 担ぎ奏法で踊りながら叩く定番サイズ（う·さ·かっ） | 1척 4촌 크기 오케도 다이코 — 어깨 카츠기로 춤추며 두드리기에 가장 균형 잡힌 표준형 (う·さ·かっ) |
| `tracks.shaku_5.fullName` | 尺5（桶胴太鼓 · 約45cm） | 尺5 (桶胴太鼓 · 약 45cm) |
| `tracks.shaku_5.summary` | 1尺5寸の桶胴太鼓 ― 担ぎ・据え置き兼用で豊かな中音（う·さ·かっ） | 1척 5촌 크기 오케도 다이코 — 카츠기와 거치 겸용으로 풍성한 중음을 내는 어깨북 (う·さ·かっ) |
| `tracks.shaku_6.fullName` | 尺6（桶胴太鼓 · 約48cm） | 尺6 (桶胴太鼓 · 약 48cm) |
| `tracks.shaku_6.summary` | 1尺6寸の桶胴太鼓 ― 肩担ぎや6据台（桶立台）で迫力の低音（う·さ·かっ） | 1척 6촌 크기 오케도 다이코 — 어깨 카츠기 또는 6据台(桶立台)에 세워 치는 박력 있는 저음 (う·さ·かっ) |
| `tracks.oki.fullName` | 沖 · エイサー（沖縄エイサー大太鼓） | 沖 · エイサー (오키나와 에이사 대북) |
| `tracks.oki.summary` | 左手で太鼓の縁を支え右手の1本バチで跳びながら打つ大太鼓（どん·かっ） | 왼손으로 붉은 징북 테두리를 잡고 오른손 1바치로 도약하며 치는 오키나와 에이사 대북 (どん·かっ) |
| `tracks.eisa.fullName` | エイサー · 小型（沖縄エイサー変型） | エイサー · 소형 (오키나와 에이사북 변형) |
| `tracks.eisa.summary` | 沖と同じ沖縄エイサー鋲打ち太鼓のサイズ違いパート（どん·かっ） | 沖와 같은 오키나와 에이사 징북 계열의 소형/사이즈 변형 파트 (どん·かっ) |
| `tracks.katsugi.fullName` | 担ぎ（担ぎ桶胴 · 鶴亀会） | 担ぎ (카츠기 오케도 · 鶴亀会) |
| `tracks.katsugi.summary` | 尺と同じ桶胴太鼓を肩紐で左腰に下げ両面を打つ鶴亀会パート（う·さ·かっ） | 尺과 같은 桶胴太鼓를 어깨 끈으로 왼쪽 허리에 메고 양면 타격하는 鶴亀会 카츠기 파트 (う·さ·かっ) |
| `tracks.hira.fullName` | 平（平太鼓） | 平 (平太鼓 · 평태고) |
| `tracks.hira.summary` | 鋲打ちの平たく広い打面から温かく伸びる中低音（どん·かっ） | 징으로 고정한 납작하고 넓은 북면에서 따뜻하고 긴 중저음 여운이 퍼지는 평태고 (どん·かっ) |
| `tracks.chu.fullName` | 中（長胴太鼓 · 中太鼓 · 鶴亀会） | 中 (長胴太鼓 · 중태고 · 鶴亀会) |
| `tracks.chu.summary` | 中足台に据えて打つ長胴太鼓の中型モデル ― 合奏の要（どん·かっ） | 中足 받침대에 올려 서서 치는 長胴太鼓 중형 모델 — 합주의 든든한 중심 허리 (どん·かっ) |
| `tracks.odaiko.fullName` | 大（長胴太鼓 · 大太鼓 · 鶴亀会） | 大 (長胴太鼓 · 대태고 · 鶴亀会) |
| `tracks.odaiko.summary` | 大足·大据足(X型台)·三宅台に据える大型長胴太鼓 ― 腹に響く重低音（どん·かっ） | 大足·大据足(X형대)·三宅台에 거치하는 대형 長胴太鼓 — 가슴까지 울리는 깊은 저음 (どん·かっ) |
| `tracks.taru.fullName` | たる（樽太鼓 · 鶴亀会） | たる (樽太鼓 · 통북 · 鶴亀会) |
| `tracks.taru.summary` | 樽型（大/小）の乾いた硬質な木鳴りでアクセントを生む太鼓（どん·とん·かっ） | 술통 모양(大/小)으로 건조하고 단단한 통 울림 포인트를 만들어 내는 타루 타이코 (どん·とん·かっ) |
| `tracks.paranku.fullName` | パーランクー（手持ち片面太鼓） | パーランクー (파란쿠 손북 · 転太鼓舞) |
| `tracks.paranku.summary` | 左手で赤い片面太鼓（約21cm）を持ち右手バチ1本で踊り打つ軽快な響き（とん·かっ） | 왼손으로 붉은 한 면 손북(약 21cm)을 잡고 오른손 나무 채 1개로 춤추며 치는 경쾌한 리듬 (とん·かっ) |
| `tracks.chappa.fullName` | チャッパ（小型手平鉦） | チャッパ (차파 · 미니 심벌즈) |
| `tracks.chappa.summary` | 両手で打ち合わせて華やかに響かせる真鍮シンバル（チャン·チッ） | 양손에 들고 맞부딪혀 쨍쨍~ 울리는 금속 타악기(チャン·チッ) |
| `tracks.jangara.fullName` | ジャンガラ（大型手平鉦） | ジャンガラ (쟝가라 · 대형 심벌즈) |
| `tracks.jangara.summary` | チャッパより大ぶりで重厚に「ジャーン」と響き渡る真鍮鉦（ジャーン·チッ） | 차파보다 크고 묵직하게 좡~ 울려 퍼지는 놋쇠 타악기 (ジャーン·チッ) |
| `tracks.chiki.fullName` | チキ（当たり鉦） | チキ (치키 · 아타리가네) |
| `tracks.chiki.summary` | 小さな真鍮の鉦を撞木で打ち、祭りの拍をくっきり刻む（チキ·コン） | 작은 놋쇠 징을 채로 두드려 축제 박자를 선명하게 쪼개는 타악기 (チキ·コン) |
| `tracks.suzu.fullName` | 鈴（すず · 転太鼓舞） | 鈴 (스즈 · 방울 · 転太鼓舞) |
| `tracks.suzu.summary` | 振って澄んだ音色で華やぎを添える伝統の鈴（シャン） | 흔들어 맑고 영롱한 샤랑~ 소리로 축제 분위기를 더하는 방울 (シャン) |
