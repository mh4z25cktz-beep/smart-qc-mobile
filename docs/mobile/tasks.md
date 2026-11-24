# 개발 단계별 태스크 (Mobile App Ver 3.0)

- [x] Task 1: [신규] Expo 모바일 프로젝트(`smart-qc-mobile`) 초기화 및 문서 체계(`docs/web`, `docs/mobile`) 분리 구축
- [x] Task 2: [수정] 기존 `db.py` 기반 Supabase REST API 연동 모듈(`services/supabase.ts`) 및 인메모리 폴백 캐시 구현
- [x] Task 3: [수정] 기존 `logic.py` 기반 SPC(3-Sigma) 관리한계선 및 AI 불량 예측/특성 중요도 모듈(`services/qcLogic.ts`) 구현
- [x] Task 4: [수정] 모바일 최적화 하단 2-Tab 대시보드 UI 구현 (탭 1: 공정 데이터 수집 및 SPC 관리도 / 탭 2: AI 불량 예측 및 원인 분석)
- [x] Task 5: [신규] 모바일 UX 고도화 (SafeArea 노치 대응, 숫자 키패드, 당겨서 새로고침, 이상치 감지 Haptic 진동 피드백)
- [x] Task 6: [신규] Expo Go 실기기 연동 및 기존 배포 웹(`smart-qc-web`)과의 실시간 데이터 양방향 동기화 검증
