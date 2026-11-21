import type { InstrumentSounds } from '../types/world';

/** 타이코 타격 종류: 돈(중앙 강타) / 카(테두리 약타) */
export type TaikoHitType = 'don' | 'ka';

/**
 * Web Audio API 기반 경량 오디오 매니저 클래스
 * - iOS/모바일 브라우저 정책에 맞춰 첫 사용자 터치([타이코 월드 입장]) 시 오디오를 활성화합니다.
 * - 같은 북소리를 연타해도 이전 소리가 끊기지 않고 겹쳐 재생됩니다.
 * - 1단계 프로토타입에서는 녹음 파일이 없어도 Web Audio 합성음으로 즉시 돈/카 소리를 들려주고,
 *   추후 실제 .mp3 파일이 준비되면 메모리에 사전 디코딩해 지연 없이 재생합니다.
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

      // 추후 2단계 NPC 배경 연주 볼륨 자동 축소(덕킹)를 위한 전용 게인 노드
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
   * - 파일이 아직 없는 프로토타입 단계에서는 에러 없이 조용히 합성음 모드로 동작합니다.
   * @param sounds - instruments.json의 { don, ka } 오디오 파일 경로
   */
  public async preloadTaikoSounds(sounds: InstrumentSounds): Promise<void> {
    if (!this.context) return;

    const urls = [sounds.don, sounds.ka];
    await Promise.all(
      urls.map(async (url) => {
        if (this.decodedBuffers.has(url)) return;
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const contentType = response.headers.get('content-type') ?? '';
          // Vite 개발 서버가 없는 파일 요청에 index.html을 반환하는 경우 걸러냄
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

  /**
   * 전체 음소거 상태를 전환하는 함수
   * @param muted - true면 음소거, false면 소리 켜기
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.015);
    }
  }

  /**
   * 현재 음소거 여부를 반환하는 함수
   */
  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 연주 모드 진입 시 NPC 배경 연주 소리를 자동으로 줄여주는 덕킹(Ducking) 함수
   * - 2단계 NPC 연주 오디오가 추가되면 자동으로 효과가 적용됩니다.
   * @param isDucking - true면 배경 연주 볼륨을 20%로 낮춤
   */
  public setNpcDucking(isDucking: boolean): void {
    if (!this.npcGain || !this.context) return;
    this.npcGain.gain.setTargetAtTime(isDucking ? 0.2 : 1, this.context.currentTime, 0.08);
  }

  /**
   * 타이코 타격음(돈/카)을 즉시 재생하는 함수 (연타 시 겹침 재생 지원)
   * @param hitType - 'don'(북 중앙) 또는 'ka'(북 테두리)
   * @param soundUrl - 선택적 실제 오디오 파일 경로 (디코딩되어 있으면 파일 재생)
   */
  public playTaikoHit(hitType: TaikoHitType, soundUrl?: string): void {
    // 혹시 잠금 해제 전 직접 호출되더라도 안전하게 활성화 시도
    if (!this.context || !this.masterGain) {
      void this.unlock().then(() => this.playTaikoHit(hitType, soundUrl));
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    if (this.isMuted) return;

    // 1) 미리 디코딩된 실제 녹음 파일이 있다면 지연 없이 겹침 재생
    if (soundUrl && this.decodedBuffers.has(soundUrl)) {
      const source = this.context.createBufferSource();
      source.buffer = this.decodedBuffers.get(soundUrl)!;
      source.connect(this.masterGain);
      source.start(this.context.currentTime);
      return;
    }

    // 2) 프로토타입 단계: Web Audio API로 임시 타이코 소리 합성
    if (hitType === 'don') {
      this.synthesizeDon(this.context, this.masterGain);
    } else {
      this.synthesizeKa(this.context, this.masterGain);
    }
  }

  /**
   * '돈(Don)' — 북 중앙의 묵직하고 울림 있는 저음 타격음 합성
   */
  private synthesizeDon(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;

    // 묵직한 북 가죽 저음 울림 (높은 음에서 낮은 음으로 빠르게 떨어지며 타격감 생성)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(165, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(58, now + 0.14);
    bodyOsc.frequency.exponentialRampToValueAtTime(44, now + 0.42);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.85, now + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.46);

    // 북채가 가죽에 닿는 순간의 짧은 어택(펀치감) 레이어
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(290, now);
    punchOsc.frequency.exponentialRampToValueAtTime(95, now + 0.055);

    punchGain.gain.setValueAtTime(0.42, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    punchOsc.connect(punchGain);
    punchGain.connect(destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.08);
  }

  /**
   * '카(Ka)' — 북 나무 테두리를 때리는 경쾌하고 짧은 고음 타격음 합성
   */
  private synthesizeKa(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;

    // 나무 테두리의 짧고 단단한 공명음
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(980, now);
    woodOsc.frequency.exponentialRampToValueAtTime(620, now + 0.05);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.48, now + 0.002);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    woodOsc.connect(woodGain);
    woodGain.connect(destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.1);

    // 딱! 하고 부딪히는 짧은 노이즈(딱딱한 채 소리)
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
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noiseSource.start(now);
  }
}

/** 앱 전체에서 공유하는 단일 오디오 매니저 인스턴스 */
export const audioManager = new AudioManager();
