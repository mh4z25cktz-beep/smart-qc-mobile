# 필수 준수 규칙 (Cloud Web Ver 2.0)
1. 클라우드 배포 호환성: Vercel 서버리스 파이썬 환경(`@vercel/python`)에서 무거운 로컬 GUI/의존성 없이 가볍고 안전하게 구동.
2. 데이터베이스 연동 안정성: Supabase REST API(`apikey`, `Bearer`)를 활용하며, 네트워크 지연 또는 테이블 미생성 시에도 서비스가 다운되지 않도록 인메모리 폴백 캐시 보장.
3. 입력 및 예외 처리: 프론트엔드 실시간 유효성 검사 및 백엔드 Pydantic 기반 입력 검증으로 예외(HTTP 400 등) 안전 차단.
4. 핵심 알고리즘 보존: 전통적 SPC(3-Sigma) 관리한계선 및 Random Forest Feature Importance 기반 지능형 원인 분석 코멘트 유지.
