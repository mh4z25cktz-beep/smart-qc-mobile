import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchAllQcData,
  insertQcData,
  clearAllQcData,
  checkSupabaseConnection,
  resetFallbackCacheToDefault,
  QcRecord,
  ConnectionStatus,
} from '@/services/supabase';
import {
  calculateSpcLimits,
  evaluateSpcStatus,
  predictDefect,
} from '@/services/qcLogic';
import { SpcChart } from '@/components/SpcChart';
import { triggerHaptic } from '@/utils/haptics';

export default function ProcessSpcScreen() {
  // Input fields
  const [temperature, setTemperature] = useState<string>('24.2');
  const [humidity, setHumidity] = useState<string>('50.0');
  const [dimension, setDimension] = useState<string>('50.05');

  // Data & State
  const [records, setRecords] = useState<QcRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [connection, setConnection] = useState<ConnectionStatus>({
    connected: false,
    isFallback: true,
    message: '연결 상태 확인 중...',
    lastChecked: new Date(),
  });
  const [lastSavedStatus, setLastSavedStatus] = useState<{
    status: 'NORMAL' | 'OUT_OF_CONTROL';
    isDefect: number;
    prob: number;
    message: string;
  } | null>(null);

  // Load connection and data
  const loadData = useCallback(async () => {
    try {
      const [connStatus, data] = await Promise.all([
        checkSupabaseConnection(),
        fetchAllQcData(50),
      ]);
      setConnection(connStatus);
      setRecords(data);
    } catch (e) {
      console.error('Failed to load QC data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchInitialData = async () => {
      try {
        const [connStatus, data] = await Promise.all([
          checkSupabaseConnection(),
          fetchAllQcData(50),
        ]);
        if (active) {
          setConnection(connStatus);
          setRecords(data);
        }
      } catch (e) {
        console.error('Failed to load QC data:', e);
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    fetchInitialData();
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate SPC limits based on stored history
  const dimensionHistory = records.map((r) => r.dimension).reverse();
  const spcLimits = calculateSpcLimits(dimensionHistory);

  // Handle Save Measurement
  const handleSave = async () => {
    const tempNum = parseFloat(temperature);
    const humNum = parseFloat(humidity);
    const dimNum = parseFloat(dimension);

    if (isNaN(tempNum) || isNaN(humNum) || isNaN(dimNum)) {
      Alert.alert('입력 오류', '온도, 습도, 치수를 모두 올바른 숫자로 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      // 1. SPC & AI Evaluation
      const spcEval = evaluateSpcStatus(dimNum, spcLimits);
      const prediction = predictDefect(tempNum, humNum, dimNum, spcLimits);

      const isAnomaly = spcEval.status === 'OUT_OF_CONTROL' || prediction.isDefect === 1;

      // 2. Hardware Haptic Feedback
      if (isAnomaly) {
        await triggerHaptic('warning');
      } else {
        await triggerHaptic('success');
      }

      // 3. Supabase or Local Insert
      const newRecord = await insertQcData({
        temperature: tempNum,
        humidity: humNum,
        dimension: dimNum,
        spc_status: spcEval.status,
        defect_prob: prediction.defectProb,
        is_defect: prediction.isDefect,
      });

      // 4. Update UI State
      setRecords((prev) => [newRecord, ...prev]);
      setLastSavedStatus({
        status: spcEval.status,
        isDefect: prediction.isDefect,
        prob: prediction.defectProb,
        message: isAnomaly
          ? `[이상 감지] ${spcEval.message}`
          : `[정상 저장] ${spcEval.message}`,
      });

      // Reset preset if desired or keep last input
    } catch (e: any) {
      Alert.alert('저장 오류', e?.message || '공정 데이터 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Clear All Data
  const handleClearAll = () => {
    Alert.alert(
      '데이터 초기화',
      '저장된 모든 공정 측정 이력을 영구 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await clearAllQcData();
            await triggerHaptic('heavy');
            await loadData();
          },
        },
      ]
    );
  };

  // Handle Reset to Demo baseline
  const handleResetDemo = async () => {
    resetFallbackCacheToDefault();
    await triggerHaptic('light');
    await loadData();
  };

  // Apply Quick Preset
  const applyPreset = (t: string, h: string, d: string) => {
    setTemperature(t);
    setHumidity(h);
    setDimension(d);
    triggerHaptic('light');
  };

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
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>스마트 품질 공정 관리</Text>
            <Text style={styles.headerSubtitle}>실시간 모바일 SPC & 클라우드 연동</Text>
          </View>

          {/* Connection Status Badge */}
          <TouchableOpacity
            style={[
              styles.connectionBadge,
              connection.connected ? styles.connGreen : styles.connYellow,
            ]}
            onPress={loadData}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: connection.connected ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={styles.connText}>
              {connection.connected ? 'Supabase 연동' : '폴백 캐시'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Detailed Connection Bar */}
        <View style={styles.connectionDetailBar}>
          <Text style={styles.connectionDetailText} numberOfLines={1}>
            {connection.message}
          </Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.refreshLink}>새로고침</Text>
          </TouchableOpacity>
        </View>

        {/* Last Saved Status Alert Banner */}
        {lastSavedStatus && (
          <View
            style={[
              styles.statusBanner,
              lastSavedStatus.status === 'OUT_OF_CONTROL' || lastSavedStatus.isDefect === 1
                ? styles.bannerOut
                : styles.bannerNormal,
            ]}>
            <Text style={styles.bannerEmoji}>
              {lastSavedStatus.status === 'OUT_OF_CONTROL' || lastSavedStatus.isDefect === 1
                ? '⚠️'
                : '✅'}
            </Text>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>
                {lastSavedStatus.status === 'OUT_OF_CONTROL'
                  ? '관리한계선 이탈 (OUT OF CONTROL)'
                  : '정상 판정 (NORMAL)'}
              </Text>
              <Text style={styles.bannerDesc}>{lastSavedStatus.message}</Text>
            </View>
          </View>
        )}

        {/* SECTION 1: Input Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📥 모바일 공정 데이터 수집</Text>
            <Text style={styles.cardBadge}>현장 측정치</Text>
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => applyPreset('24.2', '50.0', '50.02')}>
              <Text style={styles.presetText}>🟢 정상 (50.02mm)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, styles.presetWarning]}
              onPress={() => applyPreset('25.5', '53.0', '50.62')}>
              <Text style={styles.presetWarnText}>🔴 치수 이상 (50.62mm)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, styles.presetWarning]}
              onPress={() => applyPreset('32.0', '78.0', '50.35')}>
              <Text style={styles.presetWarnText}>🔥 고온다습 이상</Text>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>온도 (°C)</Text>
              <TextInput
                style={styles.input}
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="decimal-pad"
                placeholder="24.0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>습도 (%)</Text>
              <TextInput
                style={styles.input}
                value={humidity}
                onChangeText={setHumidity}
                keyboardType="decimal-pad"
                placeholder="50.0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>치수 (mm)</Text>
              <TextInput
                style={[styles.input, styles.inputHighlight]}
                value={dimension}
                onChangeText={setDimension}
                keyboardType="decimal-pad"
                placeholder="50.00"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            disabled={saving}
            onPress={handleSave}
            activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>💾 공정 데이터 측정 저장</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 2: SPC Control Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>📈 실시간 SPC X-bar 관리도</Text>
              <Text style={styles.cardSubtitle}>
                3-Sigma 관리한계 (표본수: {records.length}건, σ: {spcLimits.sigma.toFixed(3)})
              </Text>
            </View>
            <View
              style={[
                styles.spcStatusPill,
                records.length > 0 && records[0].spc_status === 'OUT_OF_CONTROL'
                  ? styles.pillOut
                  : styles.pillNormal,
              ]}>
              <Text
                style={[
                  styles.spcStatusText,
                  records.length > 0 && records[0].spc_status === 'OUT_OF_CONTROL'
                    ? styles.pillOutText
                    : styles.pillNormalText,
                ]}>
                {records.length > 0
                  ? records[0].spc_status === 'OUT_OF_CONTROL'
                    ? '⚠️ 이탈'
                    : '✅ 정상'
                  : '대기'}
              </Text>
            </View>
          </View>

          <SpcChart
            data={dimensionHistory}
            ucl={spcLimits.ucl}
            cl={spcLimits.cl}
            lcl={spcLimits.lcl}
          />
        </View>

        {/* SECTION 3: Recent Measurement History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 최근 품질 측정 이력</Text>
            <Text style={styles.historyCount}>총 {records.length}건</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color="#2563EB" />
          ) : records.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>기록된 측정 이력이 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {records.slice(0, 8).map((record) => {
                const isOut = record.spc_status === 'OUT_OF_CONTROL';
                const isDef = record.is_defect === 1;

                return (
                  <View key={record.id} style={styles.historyItem}>
                    <View style={styles.itemLeft}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemId}>#{record.id}</Text>
                        <View
                          style={[
                            styles.miniBadge,
                            isOut ? styles.miniBadgeOut : styles.miniBadgeNormal,
                          ]}>
                          <Text
                            style={[
                              styles.miniBadgeText,
                              isOut ? styles.miniTextOut : styles.miniTextNormal,
                            ]}>
                            {record.spc_status}
                          </Text>
                        </View>
                        {isDef && (
                          <View style={styles.miniDefectBadge}>
                            <Text style={styles.miniDefectText}>불량</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemTimestamp}>
                        {new Date(record.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View style={styles.itemRight}>
                      <Text style={[styles.itemDimension, isOut && styles.itemDimAlert]}>
                        {record.dimension.toFixed(2)} mm
                      </Text>
                      <Text style={styles.itemEnv}>
                        {record.temperature.toFixed(1)}°C / {record.humidity.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.demoButton} onPress={handleResetDemo}>
              <Text style={styles.demoButtonText}>샘플 데이터 복원</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>전체 초기화</Text>
            </TouchableOpacity>
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
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  connGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  connYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  connectionDetailBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectionDetailText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  refreshLink: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginLeft: 8,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  bannerNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  bannerOut: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  bannerEmoji: {
    fontSize: 20,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  presetWarnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2410C',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputHighlight: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  submitButton: {
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  spcStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillNormal: {
    backgroundColor: '#DCFCE7',
  },
  pillOut: {
    backgroundColor: '#FEE2E2',
  },
  spcStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillNormalText: {
    color: '#15803D',
  },
  pillOutText: {
    color: '#B91C1C',
  },
  historyCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyList: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemLeft: {
    gap: 4,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeNormal: {
    backgroundColor: '#DCFCE7',
  },
  miniBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  miniTextNormal: {
    color: '#15803D',
  },
  miniTextOut: {
    color: '#B91C1C',
  },
  miniDefectBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniDefectText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  itemTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemDimension: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  itemDimAlert: {
    color: '#EF4444',
  },
  itemEnv: {
    fontSize: 11,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
