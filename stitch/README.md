# Stitch 작업 가이드

## 파일 구성

| 파일 | 설명 | Stitch에 던질 순서 |
|------|------|-----------------|
| `mockup-reference.html` | 픽셀 레트로 디자인 레퍼런스 (홈 화면) | 1번 먼저 |
| `spec-01-backtest.md` | 전략 검증 페이지 스펙 | 2번 |
| `spec-02-leaderboard.md` | AI 리더보드 페이지 스펙 | 3번 |
| `spec-03-order-input.md` | 주문 입력 페이지 스펙 | 4번 |

---

## Stitch 작업 순서

1. **mockup-reference.html 먼저 업로드** → 디자인 스타일 학습
2. **spec 파일 하나씩 업로드** → 해당 페이지 디자인 생성
3. 각 페이지 export (HTML)
4. 이 프로젝트에 가져와서 TSX 변환

---

## 작업 결과물 위치

Stitch에서 export한 HTML 파일은 이 폴더에 저장:
```
stitch/
  output-backtest.html
  output-leaderboard.html
  output-order-input.html
```

---

## 주의사항

- 색상은 반드시 스펙 파일의 Hex 값 그대로 사용
- border-radius 없음 (모든 모서리 직각)
- 폰트 3종 구분:
  - Press Start 2P → UI 라벨, 버튼, 타이틀
  - JetBrains Mono → 숫자, 가격, 퍼센트
  - Pretendard → 한글 본문, 설명
