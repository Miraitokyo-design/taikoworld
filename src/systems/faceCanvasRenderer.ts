import type { CharacterFaceConfig } from '../types/content';

/** 2D 얼굴 캔버스 표준 해상도 (256x256px — 모바일 메모리 절감 & 또렷한 표현) */
export const FACE_CANVAS_SIZE = 256;

/** 캐릭터 행동에 따라 자동으로 바뀌는 2D 표정 모드 */
export type FaceExpression = 'idle' | 'play' | 'happy';

/**
 * 2D 캔버스(256x256) 위에 캐릭터의 눈·코·입·볼터치를 그려 넣는 렌더러 함수
 * - 3D 메쉬를 추가하지 않고 2D CanvasTexture 1장으로 얼굴 커스터마이징과
 *   자동 눈 깜빡임·연주 표정을 폴리곤 증가 0으로 구현합니다.
 * - 추후 public/images/faces/*.png 손그림 파츠를 도입할 때도 이 함수에서 이미지로 교체할 수 있습니다.
 * @param ctx - 2D 캔버스 드로잉 컨텍스트
 * @param face - 눈·코·입 모양, 크기, 위치가 담긴 얼굴 커스터마이징 설정
 * @param options - 현재 눈 깜빡임 여부 및 행동 기반 표정 모드
 */
export function drawFaceToCanvas(
  ctx: CanvasRenderingContext2D,
  face: CharacterFaceConfig,
  options: {
    isBlinking: boolean;
    expression: FaceExpression;
    /** Blender GLB의 Mat_Face처럼 얼굴 메쉬 자체에 칠해질 때 사용할 피부 배경색 (미지정 시 투명 배경) */
    backgroundColor?: string;
  }
): void {
  const size = FACE_CANVAS_SIZE;
  const centerX = size / 2;

  // 이전 프레임 그림을 초기화 (GLB 얼굴 슬롯일 때는 피부색으로 채워 구멍이 뚫리지 않게 하고, 임시 구면 패치일 때는 투명하게 비움)
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  const { isBlinking, expression } = options;

  // 1) 볼터치 (배경층에 먼저 은은하게 그림 — 연주/기쁨 표정일 때 조금 더 생기 있게)
  if (face.blush || expression === 'play' || expression === 'happy') {
    const blushY = 148 + face.eyeY * 0.5;
    const blushOffset = 66 + face.eyeSpacing * 0.5;
    const blushAlpha = expression === 'play' || expression === 'happy' ? 0.58 : 0.42;

    ctx.save();
    ctx.fillStyle = `rgba(255, 134, 148, ${blushAlpha})`;
    ctx.beginPath();
    ctx.ellipse(centerX - blushOffset, blushY, 22, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + blushOffset, blushY, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2) 눈 그리기 (좌/우 대칭, 눈 크기·상하 위치·간격 반영)
  const eyeCenterY = 108 + face.eyeY;
  const eyeHalfGap = 46 + face.eyeSpacing;
  const eyeScale = face.eyeScale;

  drawSingleEye(ctx, centerX - eyeHalfGap, eyeCenterY, eyeScale, face.eyes, isBlinking, expression, -1);
  drawSingleEye(ctx, centerX + eyeHalfGap, eyeCenterY, eyeScale, face.eyes, isBlinking, expression, 1);

  // 3) 코 그리기
  const noseY = 144 + face.noseY;
  drawNose(ctx, centerX, noseY, face.noseScale, face.nose);

  // 4) 입 그리기 (연주/기쁨 중에는 신나게 벌린 입 표정으로 자동 전환)
  const mouthY = 176 + face.mouthY;
  drawMouth(ctx, centerX, mouthY, face.mouthScale, face.mouth, expression);
}

/**
 * 한쪽 눈을 지정 좌표에 그리는 보조 함수
 */
function drawSingleEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  style: CharacterFaceConfig['eyes'],
  isBlinking: boolean,
  expression: FaceExpression,
  side: -1 | 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#2d2320';
  ctx.fillStyle = '#2d2320';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 자동 눈 깜빡임 중이면 부드럽게 감은 곡선 표시
  if (isBlinking) {
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(0, -3, 14, Math.PI * 0.16, Math.PI * 0.84, false);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 연주·기쁨 중이거나 happy 스타일일 때는 웃는 반달 눈(^ ^)
  if (expression === 'happy' || style === 'happy') {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 6, 15, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'sleepy') {
    // 나른하고 포근한 반쯤 감은 눈
    ctx.beginPath();
    ctx.ellipse(0, 3, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // 윗눈꺼풀 일자 라인
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(16, -4);
    ctx.stroke();
    // 작은 하이라이트
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4 * side, 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (style === 'sparkle' || expression === 'play') {
    // 초롱초롱 반짝이는 큰 눈 (연주 중에도 신난 눈빛으로 자동 강조)
    ctx.beginPath();
    ctx.ellipse(0, 0, 14.5, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // 큰 하이라이트 + 작은 보조 하이라이트
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.5, -5.5, 5.2, 0, Math.PI * 2);
    ctx.arc(5, 5.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 기본 동그란 구슬 눈(round)
  ctx.beginPath();
  ctx.ellipse(0, 0, 12.5, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-3.8, -4.8, 4.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 코를 지정 좌표에 그리는 보조 함수
 */
function drawNose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  style: CharacterFaceConfig['nose']
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (style === 'rabbit') {
    // 토끼에 잘 어울리는 분홍 역삼각 코
    ctx.fillStyle = '#e58a99';
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(0, -7, 8, -4);
    ctx.quadraticCurveTo(4, 5, 0, 6);
    ctx.quadraticCurveTo(-4, 5, -8, -4);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'triangle') {
    // 앙증맞은 갈색 작은 삼각 코
    ctx.fillStyle = '#5e4338';
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(7, -3);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
  } else {
    // 깔끔한 동그란 점 코(dot)
    ctx.fillStyle = '#5e4338';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.2, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 입을 지정 좌표에 그리는 보조 함수
 */
function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  style: CharacterFaceConfig['mouth'],
  expression: FaceExpression
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#4a3128';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 연주 중이거나 기쁨/활짝 웃는 입(grin)일 때: 신나게 벌린 D 모양 입
  if (expression === 'play' || expression === 'happy' || style === 'grin') {
    ctx.fillStyle = '#e66c75';
    ctx.beginPath();
    ctx.moveTo(-17, -4);
    ctx.quadraticCurveTo(0, -6, 17, -4);
    ctx.quadraticCurveTo(14, 18, 0, 18);
    ctx.quadraticCurveTo(-14, 18, -17, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 입 안쪽 혀 포인트
    ctx.fillStyle = '#ff9ea6';
    ctx.beginPath();
    ctx.ellipse(0, 11, 8.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (style === 'cat') {
    // 귀여운 고양이/토끼 ω 모양 입
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(-8, 10, 0, 0);
    ctx.quadraticCurveTo(8, 10, 16, -2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'calm') {
    // 온화하고 잔잔한 일자 미소
    ctx.beginPath();
    ctx.moveTo(-12, 1);
    ctx.quadraticCurveTo(0, 5, 12, 1);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 기본 반달 미소(smile)
  ctx.beginPath();
  ctx.moveTo(-15, -2);
  ctx.quadraticCurveTo(0, 13, 15, -2);
  ctx.stroke();
  ctx.restore();
}
