# Vercel 배포 `npm install` 빌드 오류 해결 및 배포 최적화 계획

GitHub 저장소를 연결해 Vercel에서 배포할 때 발생하는 `Build Failed: Command "npm install" exited with 1` 오류의 근본 원인을 해결하고, 로컬(AI Studio)과 외부 프로덕션(Vercel) 양쪽 환경에서 모두 오류 없이 설치·빌드되도록 구성을 개선합니다.

### User Review & Critical Decisions

> [!IMPORTANT]
> **오류 발생 원인 진단 (`Command "npm install" exited with 1`)**
> 1. **샌드박스 전용 상위 버전 명시 문제**: 현재 프로젝트 설정에 `vite: "^8.3.0"`, `typescript: "^7.0.2"`, `dotenv: "^17.2.3"`, `@google/genai: "^2.4.0"`, `@types/react: "^19.3.0"` 등 외부 공개 npm 레지스트리(`registry.npmjs.org`)에 존재하지 않거나 버전 체계가 다른 번호가 고정되어 있어 Vercel 서버에서 `npm install` 시 `ETARGET` / `No matching version found` 오류가 발생합니다.
> 2. **Peer Dependency 충돌**: `esbuild` 버전과 `vite` 간의 Peer Dependency 범위 충돌로 인해 표준 `npm install` 실행 시 `ERESOLVE` 에러가 발생합니다.
> 3. **불필요한 서버/백엔드 의존성 포함**: 순수 프론트엔드 학습 앱에서 사용하지 않는 `express`, `dotenv`, `@google/genai`, `tsx` 등의 패키지가 포함되어 설치 실패 요인을 만들고 있습니다.

- **핵심 해결 방향**:
  - 사용하지 않는 불필요 패키지를 제거하고, 필수 패키지들의 버전 범위를 AI Studio 환경과 외부 공개 npm 레지스트리 양쪽 모두 호환되는 유연한 범위(`>=` 또는 호환 버전)로 조정합니다.
  - `.npmrc` 파일(`legacy-peer-deps=true`)과 Vercel 설치 명령어(`npm install --legacy-peer-deps`)를 설정하여 의존성 트리 충돌을 원천 차단합니다.

---

### 1. Overview & Core Concept

- **What It Does**: GitHub에 코드를 푸시했을 때 Vercel의 자동 빌드 파이프라인(`npm install` → `npm run build` → `dist` 정적 서빙)이 중단 없이 한 번에 통과하도록 패키지 의존성과 배포 설정을 표준화합니다.
- **Key Value**: 별도의 수동 설정 없이도 GitHub 연동만으로 즉시 Vercel 프로덕션 도메인(`*.vercel.app`)에 배포됩니다.

---

### 2. User Experience & Visual Design

- **기존 앱 기능 및 디자인 100% 유지**:
  - 첫 화면의 한국어 / 스페인어(`Español`) 언어 선택 게이트 및 철저한 단일 언어 분리 인터페이스 유지
  - 개역한글판(한국어) 및 Reina Valeria 1960(스페인어) 성구 원문, 에콰도르 스페인어(`es-EC`) 발음 듣기, 2단계 정답 확인, 타이핑 검증, 집중공부 탭, 고급학습기능(학습팁 노트 및 오답률 배지) 등 모든 학습 기능 유지

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: 호환 가능한 의존성 버전 범위 적용 및 미사용 패키지 정리**
  - *Chosen Approach*: 앱에서 실제로 사용하는 프론트엔드 패키지(`react`, `react-dom`, `lucide-react`, `motion`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `typescript`, `@types/*`)만 남기고, 버전 표기를 공개 npm과 AI Studio 모두 만족하는 범위(`>=` 및 메이저 호환 범위)로 변경합니다.
  - *Why*: AI Studio 프리뷰 환경의 기존 설치본을 깨뜨리지 않으면서 동시에 외부 Vercel 서버가 표준 npm에서 안정적인 최신 버전을 내려받을 수 있습니다.
- **Decision 2: Peer Dependency 충돌 방지 설정 (`.npmrc` & `vercel.json`)**
  - *Chosen Approach*: `.npmrc`에 `legacy-peer-deps=true`를 추가하고 Vercel 설정에 `"installCommand": "npm install --legacy-peer-deps"`를 명시합니다.
  - *Why*: React 19와 관련 플러그인 설치 시 npm의 엄격한 Peer Dependency 검사로 인해 빌드가 중단되는 현상을 방지합니다.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Repository Push                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Build Pipeline                        │
│                                                                 │
│  1. Install Step (`npm install --legacy-peer-deps` + `.npmrc`)  │
│     └── 호환 버전 범위 해석 (Public npm & AI Studio 모두 호환)  │
│                                                                 │
│  2. Build Step (`npm run build` -> `vite build`)                │
│     └── `dist/index.html` 및 정적 에셋 번들 생성                │
│                                                                 │
│  3. Routing Step (`rewrites: /(.*) -> /index.html`)             │
│     └── 404 NOT_FOUND 방지 및 SPA 정상 렌더링                   │
└─────────────────────────────────────────────────────────────────┘
```
