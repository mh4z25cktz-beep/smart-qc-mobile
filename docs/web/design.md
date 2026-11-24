# 시스템 및 아키텍처 설계 (Cloud Web Ver 2.0)
## 1. 기술 스택 (Vercel 클라우드 웹 배포)
- Backend: FastAPI (Python ASGI 비동기 프레임워크)
- Cloud DB: Supabase (PostgreSQL / PostgREST REST API)
- Frontend: HTML5, CSS3, JavaScript (ES6+), Chart.js (실시간 반응형 관리도)
- ML: scikit-learn (Random Forest Classifier & Feature Importance)
- Deployment: Vercel Serverless Function (`api/index.py`, `vercel.json`)
## 2. 모듈 분리 구조 (MVC 패턴)
- main.py: FastAPI 웹 엔드포인트 및 단일 페이지 산업용 웹 대시보드 렌더링
  - 탭 1: 공정 데이터 수집, 실시간 SPC X-bar 관리도(Chart.js), 품질 이력 테이블
  - 탭 2: AI 불량 예측, Random Forest 특성 중요도(Feature Importance) 분석 및 원인 코멘트
- db.py: Supabase 클라우드 데이터베이스 연결 및 CRUD (네트워크 단절 시 인메모리 폴백 보장)
- logic.py: SPC 통계(CL, UCL, LCL) 산출 및 Random Forest 머신러닝 불량 예측/특성 중요도 로직
- api/index.py: Vercel Serverless Function 배포 엔트리포인트
- requirements.txt & vercel.json: Vercel 클라우드 빌드 및 라우팅 설정 파일
