import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAllQcData, QcRecord } from '@/services/supabase';
import { calculateSpcLimits, predictDefect, DefectPrediction } from '@/services/qcLogic';
import { FeatureImportanceBar } from '@/components/FeatureImportanceBar';
import { triggerHaptic } from '@/utils/haptics';

export default function AiPredictionScreen() {
  // Simulator inputs
  const [temperature, setTemperature] = useState<string>('24.2');
  const [humidity, setHumidity] = useState<string>('50.0');
  const [dimension, setDimension] = useState<string>('50.05');

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [latestRecord, setLatestRecord] = useState<QcRecord | null>(null);
  const [dimensionHistory, setDimensionHistory] = useState<number[]>([]);

  // Load latest data from Supabase
  const loadLatest = useCallback(async () => {
    try {
      const records = await fetchAllQcData(20);
      if (records.length > 0) {
        const top = records[0];
        setLatestRecord(top);
        setDimensionHistory(records.map((r) => r.dimension).reverse());
      }
    } catch (e) {
      console.error('Failed to load latest record:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchInitialLatest = async () => {
      try {
        const records = await fetchAllQcData(20);
        if (active && records.length > 0) {
          const top = records[0];
          setLatestRecord(top);
          setDimensionHistory(records.map((r) => r.dimension).reverse());
        }
      } catch (e) {
        console.error('Failed to load latest record:', e);
      } finally {
        if (active) {
          setRefreshing(false);
        }
      }
    };
    fetchInitialLatest();
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLatest();
  };

  // Sync inputs with latest recorded measurement
  const syncWithLatest = () => {
    if (latestRecord) {
      setTemperature(latestRecord.temperature.toString());
      setHumidity(latestRecord.humidity.toString());
      setDimension(latestRecord.dimension.toString());
      triggerHaptic('light');
    }
  };

  // Parse simulator numbers
  const tempNum = parseFloat(temperature) || 24.0;
  const humNum = parseFloat(humidity) || 50.0;
  const dimNum = parseFloat(dimension) || 50.0;

  // Calculate SPC limits and AI prediction
  const spcLimits = calculateSpcLimits(dimensionHistory);
  const prediction: DefectPrediction = predictDefect(
    tempNum,
    humNum,
    dimNum,
    spcLimits
  );

  const isDefect = prediction.isDefect === 1;
  const isHighRisk = prediction.defectProb >= 50.0;
  const isMediumRisk = prediction.defectProb >= 25.0 && !isHighRisk;

  // Get status color palette
  const statusColor = isHighRisk ? '#EF4444' : isMediumRisk ? '#F59E0B' : '#10B981';
  const statusBg = isHighRisk ? '#FEF2F2' : isMediumRisk ? '#FFFBEB' : '#F0FDF4';
  const statusBorder = isHighRisk ? '#FCA5A5' : isMediumRisk ? '#FDE68A' : '#BBF7D0';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI 불량 예측 및 원인 분석</Text>
            <Text style={styles.headerSubtitle}>
              Random Forest 규칙 기반 확률 및 특성 기여도 추론
            </Text>
          </View>

          {latestRecord && (
            <TouchableOpacity style={styles.syncButton} onPress={syncWithLatest}>
              <Text style={styles.syncButtonText}>최신값 동기화</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION 1: Defect Probability Main Card */}
        <View style={[styles.mainCard, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={styles.probHeader}>
            <Text style={styles.probLabel}>공정 불량 발생 예측 확률</Text>
            <View style={[styles.verdictBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.verdictBadgeText}>
                {isDefect ? '🚨 불량 판정 (DEFECT)' : '✅ 정상 양품 (NORMAL)'}
              </Text>
            </View>
          </View>

          {/* Large Probability Display */}
          <View style={styles.probCenter}>
            <Text style={[styles.probNumber, { color: statusColor }]}>
              {prediction.defectProb.toFixed(1)}
              <Text style={styles.probPercent}>%</Text>
            </Text>
            <Text style={styles.riskLevelText}>
              {isHighRisk
                ? '고위험 관리선 이탈 상태'
                : isMediumRisk
                ? '주의: 환경 요인 관리 필요'
                : '안정적인 최적 공정 상태'}
            </Text>
          </View>

          {/* Probability Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(Math.max(prediction.defectProb, 2), 100)}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>

          {/* Process Condition Summary Pills */}
          <View style={styles.conditionRow}>
            <View style={styles.conditionPill}>
              <Text style={styles.conditionLabel}>온도</Text>
              <Text style={styles.conditionVal}>{tempNum.toFixed(1)}°C</Text>
            </View>
            <View style={styles.conditionPill}>
              <Text style={styles.conditionLabel}>습도</Text>
              <Text style={styles.conditionVal}>{humNum.toFixed(0)}%</Text>
            </View>
            <View style={styles.conditionPill}>
              <Text style={styles.conditionLabel}>치수</Text>
              <Text style={[styles.conditionVal, { color: '#2563EB', fontWeight: '800' }]}>
                {dimNum.toFixed(2)}mm
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: Feature Importance Horizontal Bar Chart */}
        <FeatureImportanceBar
          importance={prediction.importance}
          primaryRiskFactor={prediction.primaryRiskFactor}
        />

        {/* SECTION 3: Intelligent Cause Analysis Comment */}
        <View style={styles.card}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentTitle}>💡 지능형 원인 분석 및 가이드</Text>
            <View
              style={[
                styles.riskTag,
                { backgroundColor: statusBg, borderColor: statusBorder },
              ]}>
              <Text style={[styles.riskTagText, { color: statusColor }]}>
                {prediction.primaryRiskFactor !== 'none'
                  ? `주요인: ${
                      prediction.primaryRiskFactor === 'dimension'
                        ? '치수'
                        : prediction.primaryRiskFactor === 'temperature'
                        ? '온도'
                        : '습도'
                    }`
                  : '정상 상태'}
              </Text>
            </View>
          </View>

          <View style={styles.commentBox}>
            <Text style={styles.commentText}>{prediction.analysisComment}</Text>
          </View>

          <View style={styles.actionGuide}>
            <Text style={styles.actionGuideTitle}>🛠️ 현장 조치 권고사항</Text>
            <Text style={styles.actionGuideDesc}>
              {isDefect
                ? '• 가공 라인 즉시 일시 정지 후 툴 오프셋(Offset) 및 절삭유 공급 라인을 점검하십시오.\n• 연속 2회 이상 이탈 시 작업조장 승인 후 공정 파라미터를 재보정하십시오.'
                : '• 현재 공정 산포가 관리 상·하한선 내에서 이상적입니다. 주기적인 쿨런트 농도 확인을 유지하십시오.'}
            </Text>
          </View>
        </View>

        {/* SECTION 4: Real-time Condition Simulator */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>🎛️ 실시간 공정 조건 시뮬레이터</Text>
              <Text style={styles.cardSubtitle}>
                수치를 수정하면 AI 불량 예측 및 기여도가 즉시 계산됩니다.
              </Text>
            </View>
          </View>

          <View style={styles.simInputsRow}>
            <View style={styles.simInputGroup}>
              <Text style={styles.simLabel}>온도 (°C)</Text>
              <TextInput
                style={styles.simInput}
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.simInputGroup}>
              <Text style={styles.simLabel}>습도 (%)</Text>
              <TextInput
                style={styles.simInput}
                value={humidity}
                onChangeText={setHumidity}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.simInputGroup}>
              <Text style={styles.simLabel}>치수 (mm)</Text>
              <TextInput
                style={[styles.simInput, styles.simInputHighlight]}
                value={dimension}
                onChangeText={setDimension}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Quick presets for simulation */}
          <View style={styles.quickPresetRow}>
            <TouchableOpacity
              style={styles.quickPresetBtn}
              onPress={() => {
                setTemperature('23.8');
                setHumidity('49.0');
                setDimension('50.00');
                triggerHaptic('light');
              }}>
              <Text style={styles.quickPresetBtnText}>최적 기준값 (50.00mm)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickPresetBtn, styles.quickPresetBtnWarn]}
              onPress={() => {
                setTemperature('25.2');
                setHumidity('52.0');
                setDimension('50.55');
                triggerHaptic('light');
              }}>
              <Text style={styles.quickPresetBtnTextWarn}>치수 이탈 (50.55mm)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickPresetBtn, styles.quickPresetBtnWarn]}
              onPress={() => {
                setTemperature('31.5');
                setHumidity('76.0');
                setDimension('50.40');
                triggerHaptic('light');
              }}>
              <Text style={styles.quickPresetBtnTextWarn}>고온다습 (31.5°C)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 5: Reference Standards Guide */}
        <View style={styles.referenceCard}>
          <Text style={styles.refTitle}>📖 공정 관리 기준표 (Reference)</Text>
          <View style={styles.refTable}>
            <View style={styles.refRow}>
              <Text style={styles.refKey}>가공 치수(Dimension)</Text>
              <Text style={styles.refVal}>
                목표 50.00mm / 허용 ±0.15mm (UCL: {spcLimits.ucl} / LCL: {spcLimits.lcl})
              </Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refKey}>작업장 온도</Text>
              <Text style={styles.refVal}>최적 22.0 ~ 25.0 °C (임계 &gt; 28.0 °C)</Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refKey}>작업장 습도</Text>
              <Text style={styles.refVal}>최적 45 ~ 55 % (임계 &gt; 70 %)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  mainCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  probHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  probLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verdictBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  probCenter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  probNumber: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  probPercent: {
    fontSize: 26,
    fontWeight: '700',
  },
  riskLevelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  conditionPill: {
    alignItems: 'center',
    gap: 2,
  },
  conditionLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  conditionVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  riskTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  commentText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1E293B',
    fontWeight: '500',
  },
  actionGuide: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  actionGuideTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  actionGuideDesc: {
    fontSize: 11,
    lineHeight: 18,
    color: '#475569',
  },
  cardHeader: {
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  simInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simInputGroup: {
    flex: 1,
  },
  simLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  simInput: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  simInputHighlight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  quickPresetBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPresetBtnWarn: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  quickPresetBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  quickPresetBtnTextWarn: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C2410C',
  },
  referenceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  refTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  refTable: {
    gap: 6,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  refKey: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  refVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '500',
  },
});
