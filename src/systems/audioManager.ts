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
 * - 尺(2,4,6), 沖, 締め, 笛(4음계), チャッパ 각 악기별 고유 합성음을 지원합니다.
 * - 추후 public/audio/taiko/에 실제 녹음 파일(.mp3)을 넣으면 사전 디코딩해 자동 교체됩니다.
 */
class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private npcGain: GainNode | null = null;
  private isMuted = false;

  /** 실제 오디오 파일(.mp3)을 미리 디코딩해 보관하는 캐시 맵 */
  private decodedBuffers = new Map<string, AudioBuffer>();

  /**
   * 브라우저 오디오 컨텍스트를 생성하고 잠금 해제(resume)하는 함수
   * - 반드시 버튼 클릭/터치 같은 사용자 동작 안에서 호출해야 iOS/모바일에서 소리가 납니다.
   */
  public async unlock(): Promise<void> {
    if (!this.context) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) return;

      this.context = new AudioCtx();

      // 전체 볼륨(음소거 제어용) 마스터 게인 노드
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.masterGain.connect(this.context.destination);

      // 공원 NPC 합주 배경 볼륨 자동 축소(덕킹)를 위한 전용 게인 노드
      this.npcGain = this.context.createGain();
      this.npcGain.gain.value = 1;
      this.npcGain.connect(this.masterGain);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * 실제 녹음 파일(.mp3)이 public/audio에 존재할 경우 미리 메모리에 디코딩해 두는 함수
   * - 파일이 아직 없는 단계에서는 에러 없이 조용히 합성음 모드로 동작합니다.
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

  /** 전체 음소거 상태를 전환하는 함수 */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.015);
    }
  }

  /** 현재 음소거 여부를 반환하는 함수 */
  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 게스트가 북 연주 모드나 악보 미리듣기에 들어가면 NPC 배경 합주 볼륨을 낮추는 덕킹(Ducking) 함수
   */
  public setNpcDucking(isDucking: boolean): void {
    if (!this.npcGain || !this.context) return;
    this.npcGain.gain.setTargetAtTime(isDucking ? 0.14 : 1, this.context.currentTime, 0.08);
  }

  /**
   * 수동 타이코 연주 모드(돈/카) 타격음을 즉시 재생하는 함수
   */
  public playTaikoHit(hitType: TaikoHitType, soundUrl?: string): void {
    const note = hitType === 'don' ? 'どん' : 'かっ';
    this.playTrackNote('oki', note, { soundUrl, isNpc: false });
  }

  /**
   * 멀티 레이어 악보의 특정 악기(尺 2/4/6, 沖, 締め, 笛, チャッパ 등)와 음표를 재생하는 핵심 함수
   * - 실제 .mp3 파일이 디코딩되어 있으면 파일을, 아직 없으면 악기별 고유 합성음을 재생합니다.
   * @param instrumentId - taikoTracks.json의 악기 ID
   * @param note - 음 기호 (예: "う", "さ", "かっ", "どん", "レ", "チャン")
   * @param options - { soundUrl, isNpc }
   */
  public playTrackNote(
    instrumentId: TrackInstrumentId,
    note: string,
    options: { soundUrl?: string; isNpc?: boolean } = {}
  ): void {
    const { soundUrl, isNpc = false } = options;

    if (!this.context || !this.masterGain || !this.npcGain) {
      if (isNpc) return;
      void this.unlock().then(() => this.playTrackNote(instrumentId, note, options));
      return;
    }

    if (this.context.state === 'suspended') {
      if (isNpc) return;
      void this.context.resume();
    }

    if (this.isMuted) return;

    // NPC 공원 합주는 npcGain(덕킹 노드)을 거쳐 은은하게(22%) 출력
    let destination: AudioNode = this.masterGain;
    if (isNpc) {
      const npcSoftGain = this.context.createGain();
      npcSoftGain.gain.value = 0.22;
      npcSoftGain.connect(this.npcGain);
      destination = npcSoftGain;
    }

    // 1) 미리 디코딩된 실제 녹음 파일(.mp3)이 있으면 지연 없이 겹침 재생
    if (soundUrl && this.decodedBuffers.has(soundUrl)) {
      const source = this.context.createBufferSource();
      source.buffer = this.decodedBuffers.get(soundUrl)!;
      source.connect(destination);
      source.start(this.context.currentTime);
      return;
    }

    // 2) 악기별 임시 Web Audio 합성음 분기
    // - 尺(2, 4, 6)은 추후 개별 음색으로 쉽게 분리할 수 있도록 별도 ID를 받되 현재는 공통 尺 음색 재생
    if (instrumentId === 'shaku_2' || instrumentId === 'shaku_4' || instrumentId === 'shaku_6') {
      this.synthesizeShaku(this.context, destination, note);
      return;
    }

    if (instrumentId === 'oki') {
      this.synthesizeOki(this.context, destination, note);
      return;
    }

    if (instrumentId === 'shime') {
      this.synthesizeShime(this.context, destination, note);
      return;
    }

    if (instrumentId === 'fue') {
      this.synthesizeFue(this.context, destination, note);
      return;
    }

    if (instrumentId === 'chappa') {
      this.synthesizeChappa(this.context, destination, note);
      return;
    }

    // 추후 추가될 서서 치는 타이코 등 기타 악기 기본 폴백
    this.synthesizeOki(this.context, destination, note);
  }

  /**
   * 尺(2, 4, 6) — 어깨에 매고 양손으로 치는 타이코 (う / さ / かっ)
   */
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

  /**
   * 沖(오키) — 어깨에 매는 큰 타이코, 묵직하고 웅장한 큰 음 (どん / かっ)
   */
  private synthesizeOki(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;

    if (note === 'かっ' || note === '카') {
      // 沖는 몸통이 커서 테두리 소리도 조금 더 굵고 묵직함
      this.synthesizeRim(ctx, destination, 820, 500, 0.5);
      return;
    }

    // 묵직한 저음 메인 바디
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

    // 가죽 타격 순간의 강렬한 어택 펀치
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

  /**
   * 締め(시메) — 바닥 台(받침대) 위에서 곡을 리드하는 높고 빠른 음 (う / さ)
   */
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

  /**
   * 笛(피리) — 4개 음계(レ / ミ / ソ / ラ)에 맞춰 연주하는 대나무 피리 선율
   */
  private synthesizeFue(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const freq = FUE_PITCH_MAP[note] ?? 783.99;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // 대나무 피리 특유의 맑은 떨림(비브라토)
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

  /**
   * チャッパ(차파) — 미니 심벌즈처럼 쨍쨍~ 울리는 금속 타악기 (チャン / チッ)
   */
  private synthesizeChappa(ctx: AudioContext, destination: AudioNode, note: string): void {
    const now = ctx.currentTime;
    const isShort = note === 'チッ';
    const duration = isShort ? 0.08 : 0.34;

    // 금속 심벌즈 특유의 비정수 배음 4개 조합으로 쨍쨍~ 한 울림 구현
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

    // 찰랑거리는 금속 노이즈 어택
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
