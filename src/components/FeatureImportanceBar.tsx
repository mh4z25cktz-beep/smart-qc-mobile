import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FeatureImportance } from '@/services/qcLogic';

interface FeatureImportanceBarProps {
  importance: FeatureImportance;
  primaryRiskFactor?: 'dimension' | 'temperature' | 'humidity' | 'none';
}

export const FeatureImportanceBar: React.FC<FeatureImportanceBarProps> = ({
  importance,
  primaryRiskFactor = 'none',
}) => {
  const items = [
    {
      key: 'dimension',
      label: '치수 편차 (Dimension)',
      icon: '📏',
      value: importance.dimension,
      color: '#2563EB',
      bgColor: '#DBEAFE',
      isPrimary: primaryRiskFactor === 'dimension',
    },
    {
      key: 'temperature',
      label: '공정 온도 (Temperature)',
      icon: '🌡️',
      value: importance.temperature,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      isPrimary: primaryRiskFactor === 'temperature',
    },
    {
      key: 'humidity',
      label: '작업 습도 (Humidity)',
      icon: '💧',
      value: importance.humidity,
      color: '#06B6D4',
      bgColor: '#CFFAFE',
      isPrimary: primaryRiskFactor === 'humidity',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>변수별 특성 중요도 (Feature Importance)</Text>
        <Text style={styles.subtext}>Random Forest 기여율 %</Text>
      </View>

      <View style={styles.barList}>
        {items.map((item) => (
          <View key={item.key} style={styles.barItem}>
            <View style={styles.labelRow}>
              <View style={styles.titleWithIcon}>
                <Text style={styles.icon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>주요 원인</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.percentageText, { color: item.color }]}>
                {item.value}%
              </Text>
            </View>

            {/* Horizontal Track & Bar */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(Math.max(item.value, 4), 100)}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  barList: {
    gap: 12,
  },
  barItem: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  primaryBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '700',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
