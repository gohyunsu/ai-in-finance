# AI 금융경제

값싼 예측의 경제학에서 금융 텍스트, 정규화 회귀, 종목 간 기대수익률까지 이어지는 슬라이드별 학습 가이드입니다. 금융을 처음 접하는 경제학부 학생이 수식의 가정과 유도 과정, 경제적 직관, 실증 연구의 판정 기준을 함께 읽을 수 있도록 구성했습니다.

**[학습 사이트](https://gohyunsu.github.io/ai-in-finance/)** · **[PDF 가이드](https://gohyunsu.github.io/ai-in-finance/study-guide.pdf)**

| 장 | 주제 | 슬라이드 |
| --- | --- | ---: |
| 01 | 값싼 예측과 AI의 경제학 | 33 |
| 02 | 금융 텍스트와 언어모형 | 30 |
| 03 | 정규화 회귀와 수익률 예측 | 62 |
| 04 | 종목 간 기대수익률과 요인 논쟁 | 65 |

사이트는 190개 슬라이드를 각각의 설명과 나란히 보여 줍니다. 슬라이드마다 생길 만한 질문과 사례를 펼쳐 볼 수 있고, 이미지 확대, 장·슬라이드 탐색, 전체 검색을 지원합니다. 95쪽 가이드 PDF는 같은 설명과 질문을 순서대로 묶어 수식과 함께 읽을 수 있습니다.

## 구성

- [content](content/) — 슬라이드별 원고
- [guide/main.tex](guide/main.tex) — 컴파일 가능한 LaTeX 문서
- [docs](docs/) — GitHub Pages 정적 사이트와 PDF
- [tools](tools/) — 사이트 생성, 이미지 변환, 구조 검증
- [WORKLOG.md](WORKLOG.md) — 구성과 검증 기록

## 로컬 빌드

Node.js 20 이상, Python 3.11 이상과 `marked`, `pypdf`, `Pillow`, Poppler, XeLaTeX이 필요합니다. 슬라이드 이미지는 로컬 자료에서 만들어집니다. 원고를 수정했다면 다음 순서로 다시 생성합니다.

```powershell
npm install
python tools/render_slides.py
node tools/build.mjs
xelatex -disable-installer -interaction=nonstopmode -halt-on-error -output-directory=guide guide/main.tex
xelatex -disable-installer -interaction=nonstopmode -halt-on-error -output-directory=guide guide/main.tex
Copy-Item guide/main.pdf docs/study-guide.pdf
node tools/check.mjs
```

로컬 웹 서버는 `python -m http.server 8765 --directory docs`로 실행할 수 있습니다.
