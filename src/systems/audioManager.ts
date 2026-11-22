import type { TrackInstrumentId } from '../types/content';
import type { InstrumentSounds } from '../types/world';

/** 타이코 수동 연주 타격 종류: 돈(중앙 강타) / 카(테두리 약타) */
export type TaikoHitType = 'don' | 'ka';

/**
 * 笛(시노부에 · 피리) 전체 11음계 -> 주파수(Hz) 매핑 표
 * - C5(ド) ~ G6(ソ↑)까지 기본 7음계와 시노부에 특유의 맑은 고음역(↑)을 모두 지원합니다.
 */
const FUE_PITCH_MAP: Record<string, number> = {
  ド: 523.25,
  レ: 587.33,
  ミ: 659.25,
  ファ: 698.46,
  ソ: 783.99,
  ラ: 880.0,
  シ: 987.77,
  'ド↑': 1046.5,
  'レ↑': 1174.66,
  'ミ↑': 1318.51,
  'ソ↑': 1567.98,
};

/**
 * Web Audio API 기반 경량 오디오 매니저 클래스
 * - 직접 연주·악보 소리(playerGain)와 NPC 배경 합주 소리(npcEnabledGain)를 분리해 개별 ON/OFF 및 볼륨(0~100%) 조절을 지원합니다.
 * - 메뉴나 팝업 창, 연주 모드가 열리면 NPC 합주 배경 볼륨만 자동으로 낮춥니다(덕킹).
 * - 각 레이어 볼륨과 강약 표현(점점 크게/작게/강하게/약하게)을 volume 배율로 정확히 반영합니다.
 */
class AudioManager {
  private context: AudioContext | null = null;
  private playerGain: GainNode | null = null;
  private npcEnabledGain: GainNode | null = null;
  private npcDuckingGain: GainNode | null = null;

  private isPlayerSoundOn = true;
  private isNpcSoundOn = true;
  private playerVolume = 0.9;
  private npcVolume = 0.85;
  private isNpcDucking = false;

  /** 실제 오디오 파일(.mp3)을 미리 디코딩해 보관하는 캐시 맵 */
  private decodedBuffers = new Map<string, AudioBuffer>();
  /** 타격/심벌 합성 시 매번 새 버퍼를 만들지 않고 재사용하는 공용 화이트노이즈 버퍼 */
  private sharedNoiseBuffer: AudioBuffer | null = null;

  /**
   * 공용 0.5초 화이트노이즈 버퍼를 1회만 생성해 메모리 재할당(GC)을 줄이는 도우미 함수
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.sharedNoiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.sharedNoiseBuffer = buffer;
    }
    return this.sharedNoiseBuffer;
  }

  /**
   * 브라우저 오디오 컨텍스트를 생성하고 잠금 해제(resume)하는 함수
   */
  public async unlock(): Promise<void> {
    if (!this.context) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) return;

      this.context = new AudioCtx();

      // 1) 직접 연주 및 악보 미리듣기 전용 채널
      this.playerGain = this.context.createGain();
      this.playerGain.gain.value = this.isPlayerSoundOn ? this.playerVolume : 0;
      this.playerGain.connect(this.context.destination);

      // 2) NPC 공원 합주 전용 채널: [ON/OFF + 볼륨 게인] -> [팝업·연주 모드 덕킹 게인] -> 출력
      this.npcDuckingGain = this.context.createGain();
      this.npcDuckingGain.gain.value = this.isNpcDucking ? 0.2 : 1;
      this.npcDuckingGain.connect(this.context.destination);

      this.npcEnabledGain = this.context.createGain();
      this.npcEnabledGain.gain.value = this.isNpcSoundOn ? this.npcVolume : 0;
      this.npcEnabledGain.connect(this.npcDuckingGain);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * 실제 녹음 파일(.mp3)이 public/audio에 존재할 경우 미리 메모리에 디코딩해 두는 함수
   */
  public async preloadSoundUrls(urls: Array<string | undefined>): Promise<void> {
    if (!this.context) return;

    const uniqueUrls = Array.from(
      new Set(urls.filter((url): url is string => Boolean(url && url.trim())))
    );

    await Promise.all(
      uniqueUrls.map(async (url) => {
        if (this.decodedBuffers.has(url)) return;
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('text/html')) return;

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
          this.decodedBuffers.set(url, audioBuffer);
        } catch {
          // 파일이 아직 없거나 디코딩 불가 시 합성음 fallback 사용
        }
      })
    );
  }

  /** 악기(instruments.json)의 돈/카 사운드를 사전 로딩하는 편의 함수 */
  public async preloadTaikoSounds(sounds: InstrumentSounds): Promise<void> {
    await this.preloadSoundUrls([sounds.don, sounds.ka]);
  }

  /**
   * 직접 연주(북 체험·악보 미리듣기·작곡) 소리 ON/OFF 설정
   */
  public setPlayerSoundEnabled(enabled: boolean): void {
    this.isPlayerSoundOn = enabled;
    if (this.playerGain && this.context) {
      this.playerGain.gain.setTargetAtTime(
        enabled ? this.playerVolume : 0,
        this.context.currentTime,
        0.015
      );
    }
  }

  /**
   * 직접 연주(북 체험·악보 미리듣기·작곡) 마스터 볼륨 설정 (0.0 ~ 1.0)
   */
  public setPlayerVolume(volume: number): void {
    this.playerVolume = Math.max(0, Math.min(1, volume));
    if (this.playerGain && this.context) {
      this.playerGain.gain.setTargetAtTime(
        this.isPlayerSoundOn ? this.playerVolume : 0,
        this.context.currentTime,
        0.015
      );
    }
  }

  /**
   * NPC 공원 합주 배경 소리 ON/OFF 설정
   */
  public setNpcSoundEnabled(enabled: boolean): void {
    this.isNpcSoundOn = enabled;
    if (this.npcEnabledGain && this.context) {
      this.npcEnabledGain.gain.setTargetAtTime(
        enabled ? this.npcVolume : 0,
        this.context.currentTime,
        0.02
      );
    }
  }

  /**
   * NPC 공원 합주 배경 마스터 볼륨 설정 (0.0 ~ 1.0)
   */
  public setNpcVolume(volume: number): void {
    this.npcVolume = Math.max(0, Math.min(1, volume));
    if (this.npcEnabledGain && this.context) {
      this.npcEnabledGain.gain.setTargetAtTime(
        this.isNpcSoundOn ? this.npcVolume : 0,
        this.context.currentTime,
        0.02
      );
    }
  }

  /**
   * 메뉴나 팝업 창, 북 연주 모드가 열렸을 때 NPC 배경 합주 볼륨을 부드럽게 줄여주는 덕킹(Ducking) 함수
   * @param isDucking - true면 배경 합주 볼륨을 20%로 낮춤
   */
  public setNpcDucking(isDucking: boolean): void {
    this.isNpcDucking = isDucking;
    if (!this.npcDuckingGain || !this.context) return;
    this.npcDuckingGain.gain.setTargetAtTime(
      isDucking ? 0.2 : 1,
      this.context.currentTime,
      0.08
    );
  }

  /**
   * 수동 타이코 연주 모드(돈/카) 타격음을 즉시 재생하는 함수
   */
  public playTaikoHit(hitType: TaikoHitType, soundUrl?: string): void {
    const note = hitType === 'don' ? 'どん' : 'かっ';
    this.playTrackNote('oki', note, { soundUrl, isNpc: false, volume: 1 });
  }

  /**
   * 멀티 레이어 악보의 특정 악기와 음표를 지정 볼륨(레이어 볼륨 * 다이나믹 배율)으로 재생하는 핵심 함수
   * @param instrumentId - taikoTracks.json의 악기 ID
   * @param note - 음 기호 (예: "う", "さ", "かっ", "どん", "レ", "チャン")
   * @param options - { soundUrl, isNpc, volume }
   */
  public playTrackNote(
    instrumentId: TrackInstrumentId,
    note: string,
    options: { soundUrl?: string; isNpc?: boolean; volume?: number } = {}
  ): void {
    const { soundUrl, isNpc = false, volume = 1 } = options;

    if (isNpc && !this.isNpcSoundOn) return;
    if (!isNpc && !this.isPlayerSoundOn) return;

    if (!this.context || !this.playerGain || !this.npcEnabledGain) {
      if (isNpc) return;
      void this.unlock().then(() => this.playTrackNote(instrumentId, note, options));
      return;
    }

    if (this.context.state === 'suspended') {
      if (isNpc) return;
      void this.context.resume();
    }

    // 최종 음량 노드: NPC 합주는 기본 24% 배경음 크기 * 곡의 다이나믹/레이어 볼륨
    const baseBus = isNpc ? this.npcEnabledGain : this.playerGain;
    const noteGain = this.context.createGain();
    const clampedVolume = Math.max(0.03, Math.min(1.6, volume));
    noteGain.gain.value = isNpc ? clampedVolume * 0.24 : clampedVolume;
    noteGain.connect(baseBus);

    // 1) 미리 디코딩된 실제 녹음 파일(.mp3)이 있으면 지연 없이 겹침 재생
    if (soundUrl && this.decodedBuffers.has(soundUrl)) {
      const source = this.context.createBufferSource();
      source.buffer = this.decodedBuffers.get(soundUrl)!;
      source.connect(noteGain);
      source.start(this.context.currentTime);
      return;
    }

    // 2) 악기별 임시 Web Audio 합성음 분기 (転太鼓舞 · 鶴亀会 전체 보유 악기 대응)
    if (
      instrumentId === 'shaku_2' ||
      instrumentId === 'shaku_4' ||
      instrumentId === 'shaku_5' ||
      instrumentId === 'shaku_6' ||
      instrumentId === 'katsugi'
    ) {
      this.synthesizeShaku(this.context, noteGain, note);
      return;
    }

    if (
      instrumentId === 'oki' ||
      instrumentId === 'eisa' ||
      instrumentId === 'odaiko' ||
      instrumentId === 'chu' ||
      instrumentId === 'hira'
    ) {
      this.synthesizeOki(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'paranku' || instrumentId === 'taru') {
      this.synthesizeParanku(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'shime') {
      this.synthesizeShime(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'fue') {
      this.synthesizeFue(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'chappa' || instrumentId === 'jangara') {
      this.synthesizeChappa(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'chiki' || instrumentId === 'suzu') {
      this.synthesizeChikiOrSuzu(this.context, noteGain, instrumentId, note);
      return;
    }

    this.synthesizeOki(this.context, noteGain, note);
  }

  /** 尺(2, 4, 6) — 어깨에 매고 양손으로 치는 타이코 (う / さ / かっ) */
  private synthesizeShaku(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;

    if (note === 'かっ' || note === '카') {
      this.synthesizeRim(ctx, destination, 1020, 650, 0.42);
      return;
    }

    const isSa = note === 'さ' || note === '사';
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isSa ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isSa ? 225 : 185, now);
    osc.frequency.exponentialRampToValueAtTime(isSa ? 105 : 84, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isSa ? 0.46 : 0.56, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isSa ? 0.16 : 0.24));

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** 沖(오키) — 어깨에 매는 큰 타이코, 묵직하고 웅장한 큰 음 (どん / かっ) */
  private synthesizeOki(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;

    if (note === 'かっ' || note === '카') {
      this.synthesizeRim(ctx, destination, 820, 500, 0.5);
      return;
    }

    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(142, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
    bodyOsc.frequency.exponentialRampToValueAtTime(36, now + 0.54);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.95, now + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.6);

    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(260, now);
    punchOsc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    punchGain.gain.setValueAtTime(0.45, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    punchOsc.connect(punchGain);
    punchGain.connect(destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.09);
  }

  /** 締め(시메) — 바닥 台(받침대) 위에서 곡을 리드하는 높고 빠른 음 (う / さ) */
  private synthesizeShime(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const isSa = note === 'さ' || note === '사';

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSa ? 470 : 395, now);
    osc.frequency.exponentialRampToValueAtTime(isSa ? 265 : 220, now + 0.075);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isSa ? 0.36 : 0.42, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** 笛(피리) — 전체 11음계(ド ~ ソ↑)에 맞춰 연주하는 대나무 피리 선율 (부드러운 배음 포함) */
  private synthesizeFue(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const freq = FUE_PITCH_MAP[note] ?? 783.99;

    // 기본음(Sine) + 시노부에 특유의 맑은 2배음(약한 Triangle)을 살짝 섞어 자연스러운 음색 구현
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);
    overtoneGain.gain.setValueAtTime(0.14, now);

    // 고음역(ド↑ 이상)은 살짝 부드럽게 볼륨 보정해 귀가 따갑지 않게 조절
    const peakGain = freq >= 1000 ? 0.19 : 0.24;

    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5.6, now);
    vibratoGain.gain.setValueAtTime(freq * 0.009, now);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibratoGain.connect(overtone.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.035);
    gain.gain.setValueAtTime(peakGain * 0.88, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(destination);

    osc.start(now);
    overtone.start(now);
    vibrato.start(now);
    osc.stop(now + 0.44);
    overtone.stop(now + 0.44);
    vibrato.stop(now + 0.44);
  }

  /** チャッパ(차파) — 미니 심벌즈처럼 쨍쨍~ 울리는 금속 타악기 (チャン / チッ) */
  private synthesizeChappa(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const isShort = note === 'チッ';
    const duration = isShort ? 0.08 : 0.34;

    const partials = [2780, 3690, 4860, 6120];
    for (const freq of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isShort ? 0.045 : 0.055, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(2400, now);

      osc.connect(highpass);
      highpass.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    // 공용 화이트노이즈 버퍼 재사용 (매 타격마다 메모리 할당 방지)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isShort ? 0.2 : 0.24, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  /** パーランクー(파란쿠 손북) · たる(통북) — 경쾌하게 통통 울리는 타격음 (とん / どん / かっ) */
  private synthesizeParanku(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;

    if (note === 'かっ' || note === '카') {
      this.synthesizeRim(ctx, destination, 1180, 740, 0.4);
      return;
    }

    const isLow = note === 'どん';
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isLow ? 210 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(isLow ? 102 : 165, now + 0.11);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** チキ(아타리가네/치키) · 鈴(방울) — 맑고 또렷한 금속 울림 (チキ / コン / シャン) */
  private synthesizeChikiOrSuzu(
    ctx: AudioContext,
    destination: AudioNode,
    instrumentId: TrackInstrumentId,
    note: string
  ): void {
    const now = ctx.currentTime;
    const isSuzu = instrumentId === 'suzu' || note === 'シャン';
    const baseFreqs = isSuzu
      ? [2960, 4186, 5274]
      : note === 'コン'
        ? [1120, 2240]
        : [1640, 3120];
    const duration = isSuzu ? 0.3 : 0.16;

    for (const freq of baseFreqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isSuzu ? 0.1 : 0.15, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  }

  /** 공통 나무 테두리(かっ) 타격음 보조 합성 함수 */
  private synthesizeRim(
    ctx: AudioContext,
    destination: AudioNode,
    startFreq: number,
    endFreq: number,
    peakGain: number
  ): void {
    const now = ctx.currentTime;

    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(startFreq, now);
    woodOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    woodOsc.connect(woodGain);
    woodGain.connect(destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.1);

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(peakGain * 1.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.06);
  }
}

/** 앱 전체에서 공유하는 단일 오디오 매니저 인스턴스 */
export const audioManager = new AudioManager();
