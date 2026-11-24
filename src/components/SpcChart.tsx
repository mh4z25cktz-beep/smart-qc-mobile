import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';

interface SpcChartProps {
  data: number[]; // Dimension values in chronological order
  ucl: number;
  cl: number;
  lcl: number;
}

export const SpcChart: React.FC<SpcChartProps> = ({ data, ucl, cl, lcl }) => {
  const [containerWidth, setContainerWidth] = useState<number>(300);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const chartHeight = 170;
  const paddingHorizontal = 28;
  const usableWidth = Math.max(containerWidth - paddingHorizontal * 2, 80);

  // If no data, render placeholder
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>표시할 SPC 측정 데이터가 없습니다.</Text>
      </View>
    );
  }

  // Calculate Y min and max to encompass UCL, LCL, and all data points
  const allValues = [...data, ucl, cl, lcl];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin;
  const margin = Math.max(range * 0.15, 0.08);
  const yMin = rawMin - margin;
  const yMax = rawMax + margin;
  const ySpan = Math.max(yMax - yMin, 0.1);

  const getYPos = (val: number) => {
    const ratio = (yMax - val) / ySpan;
    return Math.max(0, Math.min(chartHeight, ratio * chartHeight));
  };

  const getXPos = (index: number) => {
    if (data.length <= 1) return paddingHorizontal + usableWidth / 2;
    return paddingHorizontal + (index / (data.length - 1)) * usableWidth;
  };

  const uclY = getYPos(ucl);
  const clY = getYPos(cl);
  const lclY = getYPos(lcl);

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {/* Control Limit Legends */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>UCL: {ucl.toFixed(2)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>CL: {cl.toFixed(2)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>LCL: {lcl.toFixed(2)}</Text>
        </View>
      </View>

      {/* Main Chart Canvas Area */}
      <View style={[styles.canvas, { height: chartHeight }]}>
        {/* UCL Line */}
        <View style={[styles.guideLine, styles.uclLine, { top: uclY }]} />
        <Text style={[styles.lineLabel, { top: Math.max(0, uclY - 14), color: '#EF4444' }]}>
          UCL
        </Text>

        {/* CL Line */}
        <View style={[styles.guideLine, styles.clLine, { top: clY }]} />
        <Text style={[styles.lineLabel, { top: Math.max(0, clY - 14), color: '#10B981' }]}>
          CL
        </Text>

        {/* LCL Line */}
        <View style={[styles.guideLine, styles.lclLine, { top: lclY }]} />
        <Text style={[styles.lineLabel, { top: Math.max(0, lclY - 14), color: '#EF4444' }]}>
          LCL
        </Text>

        {/* Connecting Lines between points */}
        {data.map((val, idx) => {
          if (idx === 0) return null;
          const prevVal = data[idx - 1];
          const x1 = getXPos(idx - 1);
          const y1 = getYPos(prevVal);
          const x2 = getXPos(idx);
          const y2 = getYPos(val);

          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;

          return (
            <View
              key={`line-${idx}`}
              style={{
                position: 'absolute',
                left: cx - length / 2,
                top: cy - 1,
                width: length,
                height: 2,
                backgroundColor: '#93C5FD',
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Data Point Markers */}
        {data.map((val, idx) => {
          const x = getXPos(idx);
          const y = getYPos(val);
          const isOut = val > ucl || val < lcl;
          const isLatest = idx === data.length - 1;
          const isSelected = selectedIdx === idx;

          return (
            <React.Fragment key={`point-${idx}`}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedIdx(isSelected ? null : idx)}
                style={[
                  styles.pointTouchArea,
                  {
                    left: x - 14,
                    top: y - 14,
                  },
                ]}>
                <View
                  style={[
                    styles.pointCircle,
                    isOut ? styles.outPoint : styles.normalPoint,
                    (isLatest || isSelected) && styles.highlightPoint,
                  ]}>
                  {isOut && <View style={styles.outInnerDot} />}
                </View>
              </TouchableOpacity>

              {/* Tooltip for selected or latest point */}
              {(isSelected || (selectedIdx === null && isLatest)) && (
                <View
                  style={[
                    styles.tooltip,
                    {
                      left: Math.max(6, Math.min(containerWidth - 76, x - 35)),
                      top: Math.max(2, y - 32),
                      backgroundColor: isOut ? '#FEE2E2' : '#EFF6FF',
                      borderColor: isOut ? '#EF4444' : '#3B82F6',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.tooltipText,
                      { color: isOut ? '#DC2626' : '#1D4ED8' },
                    ]}>
                    #{idx + 1}: {val.toFixed(2)}
                  </Text>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Axis Footer */}
      <View style={styles.axisFooter}>
        <Text style={styles.axisText}>과거 시점 (#{1})</Text>
        <Text style={styles.axisText}>최근 측정 (#{data.length})</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  canvas: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    overflow: 'hidden',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  uclLine: {
    borderTopWidth: 1,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
  },
  clLine: {
    borderTopWidth: 1.5,
    borderColor: '#10B981',
  },
  lclLine: {
    borderTopWidth: 1,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
  },
  lineLabel: {
    position: 'absolute',
    right: 6,
    fontSize: 10,
    fontWeight: '700',
  },
  pointTouchArea: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pointCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  normalPoint: {
    backgroundColor: '#2563EB',
    borderColor: '#FFFFFF',
  },
  outPoint: {
    backgroundColor: '#EF4444',
    borderColor: '#FEE2E2',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  highlightPoint: {
    transform: [{ scale: 1.2 }],
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 20,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  axisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  axisText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
