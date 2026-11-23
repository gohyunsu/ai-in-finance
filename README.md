# AI 금융경제

값싼 예측의 경제학에서 금융 텍스트, 정규화 회귀, 종목 간 기대수익률, 레버리지 ETF, 머신러닝 실증, 채권 위험프리미엄, 뉴스와 언어모형까지 이어지는 슬라이드별 학습 사이트입니다. 금융을 처음 접하는 경제학부 학생이 수식의 가정과 유도 과정, 경제적 직관, 실증 연구의 판정 기준을 함께 읽을 수 있도록 구성했습니다.

**[학습 사이트](https://gohyunsu.github.io/ai-in-finance/)**

| 장 | 주제 | 슬라이드 |
| --- | --- | ---: |
| Session 1A | 값싼 예측과 AI의 경제학 | 33 |
| Session 1B | 금융 텍스트와 언어모형 | 30 |
| Session 2 | 정규화 회귀와 수익률 예측 | 62 |
| Session 4A | 종목 간 기대수익률과 요인 논쟁 | 65 |
| Leveraged ETFs | 레버리지 ETF와 시장 미시구조 | 61 |
| Session 4B | 수익률 예측의 도구 | 43 |
| Session 4C | 머신러닝으로 본 횡단면 수익률 | 37 |
| Session 5 | 채권 위험프리미엄과 머신러닝 | 78 |
| Session 6A | 뉴스와 수익률, 언어모형에게 묻기 | 58 |

사이트는 467개 슬라이드를 각각의 설명과 나란히 보여 줍니다. 주요 개념에서 추가 질문과 사례를 펼쳐 볼 수 있고, 이미지 확대 중 이전·다음 슬라이드 이동, 장·슬라이드 탐색, 전체 검색을 지원합니다.

## 구성

- [content](content/) — 슬라이드별 원고
- [docs](docs/) — GitHub Pages 정적 사이트
- [tools](tools/) — 사이트 생성, 이미지 변환, 구조 검증
- [WORKLOG.md](WORKLOG.md) — 구성과 검증 기록

## 로컬 빌드

Node.js 20 이상과 `marked`가 필요합니다. 원고를 수정했다면 다음 순서로 사이트를 다시 생성합니다.

```powershell
npm install
node tools/build.mjs
node tools/check.mjs
```

새 슬라이드 이미지를 만들 때는 로컬 강의자료와 Python 3.11 이상, `pypdf`, `Pillow`, Poppler를 준비한 뒤 `python tools/render_slides.py`를 먼저 실행합니다. 같은 쪽수의 자료가 갱신되었다면 `python tools/render_slides.py --only session-5 --force`처럼 해당 장의 이미지를 새로 만듭니다. 원본 강의자료는 공개 저장소에 포함하지 않습니다.

로컬 웹 서버는 `python -m http.server 8765 --directory docs`로 실행할 수 있습니다.
