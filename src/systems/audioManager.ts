import type { TrackInstrumentId } from '../types/content';
import type { InstrumentSounds } from '../types/world';

/** 타이코 수동 연주 타격 종류: 돈(중앙 강타) / 카(테두리 약타) */
export type TaikoHitType = 'don' | 'ka';

/**
 * 笛(피리) 음계 -> 주파수(Hz) 매핑 표
 * - 현재 4개 기본 음계(レ, ミ, ソ, ラ)를 지원하며, 추후 음계를 늘릴 때 항목만 추가하면 됩니다.
 */
const FUE_PITCH_MAP: Record<string, number> = {
  レ: 587.33,
  ミ: 659.25,
  ソ: 783.99,
  ラ: 880.0,
};

/**
 * Web Audio API 기반 경량 오디오 매니저 클래스
 * - 직접 연주·악보 소리(playerGain)와 NPC 배경 합주 소리(npcEnabledGain)를 분리해 개별 ON/OFF를 지원합니다.
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
  private isNpcDucking = false;

  /** 실제 오디오 파일(.mp3)을 미리 디코딩해 보관하는 캐시 맵 */
  private decodedBuffers = new Map<string, AudioBuffer>();

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
      this.playerGain.gain.value = this.isPlayerSoundOn ? 1 : 0;
      this.playerGain.connect(this.context.destination);

      // 2) NPC 공원 합주 전용 채널: [ON/OFF 게인] -> [팝업·연주 모드 덕킹 게인] -> 출력
      this.npcDuckingGain = this.context.createGain();
      this.npcDuckingGain.gain.value = this.isNpcDucking ? 0.2 : 1;
      this.npcDuckingGain.connect(this.context.destination);

      this.npcEnabledGain = this.context.createGain();
      this.npcEnabledGain.gain.value = this.isNpcSoundOn ? 1 : 0;
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
      this.playerGain.gain.setTargetAtTime(enabled ? 1 : 0, this.context.currentTime, 0.015);
    }
  }

  /**
   * NPC 공원 합주 배경 소리 ON/OFF 설정
   */
  public setNpcSoundEnabled(enabled: boolean): void {
    this.isNpcSoundOn = enabled;
    if (this.npcEnabledGain && this.context) {
      this.npcEnabledGain.gain.setTargetAtTime(
        enabled ? 1 : 0,
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

    // 2) 악기별 임시 Web Audio 합성음 분기
    if (instrumentId === 'shaku_2' || instrumentId === 'shaku_4' || instrumentId === 'shaku_6') {
      this.synthesizeShaku(this.context, noteGain, note);
      return;
    }

    if (instrumentId === 'oki') {
      this.synthesizeOki(this.context, noteGain, note);
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

    if (instrumentId === 'chappa') {
      this.synthesizeChappa(this.context, noteGain, note);
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

  /** 笛(피리) — 4개 음계(レ / ミ / ソ / ラ)에 맞춰 연주하는 대나무 피리 선율 */
  private synthesizeFue(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const freq = FUE_PITCH_MAP[note] ?? 783.99;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5.6, now);
    vibratoGain.gain.setValueAtTime(7.5, now);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.setValueAtTime(0.21, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    vibrato.start(now);
    osc.stop(now + 0.44);
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

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

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

    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

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
  }
}

/** 앱 전체에서 공유하는 단일 오디오 매니저 인스턴스 */
export const audioManager = new AudioManager();
