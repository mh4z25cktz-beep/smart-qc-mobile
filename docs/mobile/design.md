# 시스템 및 아키텍처 설계 (Mobile App Ver 3.0)

## 1. 기술 스택 (Expo 크로스플랫폼 모바일 앱)
- [수정] Mobile Framework: React Native (Expo SDK, TypeScript), Expo Router (하단 2-Tab 내비게이션)
- [유지] Cloud DB: Supabase (PostgreSQL / PostgREST REST API - 기존 웹과 동일 인스턴스 및 `qc_data` 테이블 공유)
- [수정] Visualization: 모바일 반응형 SPC X-bar 관리도 및 특성 중요도(Feature Importance) 가로 막대 차트 컴포넌트
- [수정] Analytics & ML Engine: 클라이언트 TypeScript 기반 3-Sigma SPC 통계 산출 및 Random Forest 의사결정 규칙/특성 중요도 추론 로직
- [신규] Mobile UX & Hardware Feedback: `expo-haptics` (이상치 감지 진동 피드백), `SafeAreaView`, 숫자 전용 키패드(`decimal-pad`), 당겨서 새로고침(`RefreshControl`)

## 2. 모듈 분리 구조
- [수정] `app/(tabs)/index.tsx` (탭 1 - 공정 수집 & 실시간 SPC 관리도)
  - 공정 데이터(온도, 습도, 치수) 모바일 입력 폼 및 실시간 Supabase 저장
  - 최근 측정치 기반 SPC X-bar 관리도(CL, UCL, LCL) 시각화 및 품질 이력 카드 리스트
- [수정] `app/(tabs)/explore.tsx` 또는 `analysis.tsx` (탭 2 - AI 불량 예측 & 원인 분석)
  - 입력 공정 조건에 대한 불량 확률(`defect_prob`) 및 정상/불량(`is_defect`) 예측 결과 카드
  - 변수별 특성 중요도(Feature Importance) 시각화 및 지능형 원인 분석 코멘트 출력
- [수정] `services/supabase.ts` (기존 `db.py` 모바일 이식)
  - Supabase REST API 연동 (`checkSupabaseConnection`, `insertQcData`, `fetchAllQcData`, `fetchDimensionHistory`, `clearAllQcData`) 및 통신 단절 대비 인메모리 폴백 캐시
- [수정] `services/qcLogic.ts` (기존 `logic.py` 모바일 이식)
  - SPC 통계(CL, UCL, LCL, `spc_status`) 산출 및 불량 확률 예측/특성 중요도 분석 로직

## 3. 데이터베이스 스키마 ([유지] 기존 웹 `qc_data` 테이블 동일)
- 테이블명: `qc_data`
- 컬럼 구성: `id` (BIGINT, PK), `timestamp` (TIMESTAMPTZ), `temperature` (FLOAT8), `humidity` (FLOAT8), `dimension` (FLOAT8), `spc_status` (TEXT), `defect_prob` (FLOAT8), `is_defect` (INT)
