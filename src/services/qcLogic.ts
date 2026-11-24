/**
 * SPC (Statistical Process Control) & AI Defect Prediction Engine
 * Ver 3.0 Mobile Implementation
 */

export interface SpcResult {
  cl: number;
  ucl: number;
  lcl: number;
  sigma: number;
  status: 'NORMAL' | 'OUT_OF_CONTROL';
  message: string;
}

export interface FeatureImportance {
  temperature: number; // percentage (0 - 100)
  humidity: number;    // percentage (0 - 100)
  dimension: number;   // percentage (0 - 100)
}

export interface DefectPrediction {
  defectProb: number;  // 0.0 - 100.0 (%)
  isDefect: 0 | 1;
  importance: FeatureImportance;
  analysisComment: string;
  primaryRiskFactor: 'dimension' | 'temperature' | 'humidity' | 'none';
}

const DEFAULT_TARGET_DIMENSION = 50.0;
const MINIMUM_SIGMA = 0.08;

/**
 * Calculate 3-Sigma Control Limits (CL, UCL, LCL) based on dimension history
 */
export function calculateSpcLimits(history: number[]): { cl: number; ucl: number; lcl: number; sigma: number } {
  const validData = history.filter((v) => typeof v === 'number' && !isNaN(v));

  if (validData.length === 0) {
    const cl = DEFAULT_TARGET_DIMENSION;
    const sigma = 0.15;
    return {
      cl: Number(cl.toFixed(3)),
      ucl: Number((cl + 3 * sigma).toFixed(3)),
      lcl: Number((cl - 3 * sigma).toFixed(3)),
      sigma: Number(sigma.toFixed(3)),
    };
  }

  // Mean (CL)
  const sum = validData.reduce((acc, cur) => acc + cur, 0);
  const cl = sum / validData.length;

  // Sample standard deviation (sigma)
  let sigma = 0.15;
  if (validData.length >= 2) {
    const variance =
      validData.reduce((acc, cur) => acc + Math.pow(cur - cl, 2), 0) / (validData.length - 1);
    sigma = Math.sqrt(variance);
  }

  // Ensure minimum sigma to prevent UCL == LCL
  if (sigma < MINIMUM_SIGMA) {
    sigma = MINIMUM_SIGMA;
  }

  const ucl = cl + 3 * sigma;
  const lcl = cl - 3 * sigma;

  return {
    cl: Number(cl.toFixed(3)),
    ucl: Number(ucl.toFixed(3)),
    lcl: Number(lcl.toFixed(3)),
    sigma: Number(sigma.toFixed(3)),
  };
}

/**
 * Evaluate single measurement dimension against SPC limits
 */
export function evaluateSpcStatus(
  dimension: number,
  limits: { cl: number; ucl: number; lcl: number }
): { status: 'NORMAL' | 'OUT_OF_CONTROL'; message: string } {
  if (dimension > limits.ucl) {
    return {
      status: 'OUT_OF_CONTROL',
      message: `치수(${dimension.toFixed(2)}mm)가 상한 관리한계선(UCL: ${limits.ucl.toFixed(2)}mm)을 초과했습니다.`,
    };
  }
  if (dimension < limits.lcl) {
    return {
      status: 'OUT_OF_CONTROL',
      message: `치수(${dimension.toFixed(2)}mm)가 하한 관리한계선(LCL: ${limits.lcl.toFixed(2)}mm) 미달입니다.`,
    };
  }
  return {
    status: 'NORMAL',
    message: `치수(${dimension.toFixed(2)}mm)가 3-Sigma 관리선 이내로 정상 제어 중입니다.`,
  };
}

/**
 * Predict Defect Probability, Feature Importance, and Generate Cause Comments
 * Mirrors the Random Forest decision logic from Ver 2.0
 */
export function predictDefect(
  temperature: number,
  humidity: number,
  dimension: number,
  spcLimits?: { cl: number; ucl: number; lcl: number }
): DefectPrediction {
  const limits = spcLimits || calculateSpcLimits([dimension]);

  // Dimension deviation from center
  const targetDim = limits.cl;
  const dimDiff = Math.abs(dimension - targetDim);
  const isOutOfLimits = dimension > limits.ucl || dimension < limits.lcl;

  // Temperature baseline: ~24.0 C, optimal tolerance: +-2.5 C
  const tempDiff = Math.abs(temperature - 24.0);

  // Humidity baseline: ~50.0 %, optimal tolerance: +-8.0 %
  const humDiff = Math.abs(humidity - 50.0);

  // Relative contribution calculation for Random Forest-like feature weighting
  // Dimension usually carries highest weight in machining/assembly
  const wDim = Math.pow(dimDiff / 0.15, 1.6) * 5.5 + 1.2;
  const wTemp = Math.pow(tempDiff / 3.0, 1.4) * 2.8 + 0.6;
  const wHum = Math.pow(humDiff / 10.0, 1.3) * 1.8 + 0.4;

  const totalW = wDim + wTemp + wHum;
  let impDim = Math.round((wDim / totalW) * 100);
  let impTemp = Math.round((wTemp / totalW) * 100);
  let impHum = 100 - (impDim + impTemp);

  // Ensure non-negative and sums to 100
  if (impHum < 0) {
    impDim += impHum;
    impHum = 0;
  }

  // Base defect probability calculation (0.0 to 100.0%)
  let rawRisk = 2.5;

  // Dimension penalty: steep increase beyond tolerance
  const dimRisk = (Math.pow(dimDiff / 0.18, 2.2) * 25.0);
  rawRisk += dimRisk;

  // Temperature penalty
  if (tempDiff > 2.5) {
    rawRisk += (tempDiff - 2.5) * 6.5;
  }

  // Humidity penalty
  if (humDiff > 10.0) {
    rawRisk += (humDiff - 10.0) * 2.2;
  }

  // Non-linear interaction penalty (high temp + high humidity leads to condensation/thermal expansion)
  if (temperature > 28.0 && humidity > 65.0) {
    rawRisk += 18.0;
  }

  // If SPC status is OUT_OF_CONTROL, ensure high risk score
  if (isOutOfLimits) {
    rawRisk = Math.max(rawRisk, 72.0 + Math.min(dimDiff * 40, 25.0));
  }

  // Clamp probability between 1.0% and 99.5%
  let defectProb = Math.min(Math.max(rawRisk, 1.2), 99.5);
  defectProb = Number(defectProb.toFixed(1));

  const isDefect: 0 | 1 = (defectProb >= 50.0 || isOutOfLimits) ? 1 : 0;

  // Determine Primary Risk Factor
  let primaryRiskFactor: 'dimension' | 'temperature' | 'humidity' | 'none' = 'none';
  if (isDefect === 1 || defectProb > 30.0) {
    if (impDim >= impTemp && impDim >= impHum) {
      primaryRiskFactor = 'dimension';
    } else if (impTemp >= impDim && impTemp >= impHum) {
      primaryRiskFactor = 'temperature';
    } else {
      primaryRiskFactor = 'humidity';
    }
  }

  // Generate intelligent cause analysis comments
  let analysisComment = '';
  if (isDefect === 1) {
    if (primaryRiskFactor === 'dimension') {
      analysisComment = `⚠️ [품질 경고] 가공 치수(${dimension.toFixed(2)}mm)가 허용 공차 및 관리한계를 이탈하여 불량 확률(${defectProb}%)이 급증했습니다. 절삭 바이트 마모 및 척 고정 공차를 즉각 점검하십시오.`;
    } else if (primaryRiskFactor === 'temperature') {
      analysisComment = `⚠️ [환경 경고] 공정 온도(${temperature.toFixed(1)}°C) 과열로 인한 열팽창 및 가공 정밀도 저하가 주 원인입니다. 절삭유 공급 압력과 공조 냉각 시스템을 확인하십시오.`;
    } else if (primaryRiskFactor === 'humidity') {
      analysisComment = `⚠️ [환경 경고] 작업장 습도(${humidity.toFixed(1)}%) 이상으로 인한 결로 및 부품 표면 산화 위험이 감지되었습니다. 제습 라인 가동 상태를 점검하십시오.`;
    } else {
      analysisComment = `⚠️ [종합 위험] 복합 환경 인자 및 치수 산포의 비정상적 변동으로 불량이 판정되었습니다. 공정 설정을 즉시 재조정하십시오.`;
    }
  } else if (defectProb >= 25.0) {
    analysisComment = `⚡ [주의 요망] 불량 확률(${defectProb}%)이 주의 기준(25%)에 도달했습니다. 치수 기여도(${impDim}%) 및 온도 변동(${temperature.toFixed(1)}°C)에 대한 실시간 추적 관리가 필요합니다.`;
  } else {
    analysisComment = `✅ [공정 정상] 3-Sigma 관리선(CL: ${limits.cl.toFixed(2)}mm) 내에서 치수가 매우 균일하며, 온·습도 환경 또한 최적 범위에서 안정적으로 유지되고 있습니다.`;
  }

  return {
    defectProb,
    isDefect,
    importance: {
      temperature: impTemp,
      humidity: impHum,
      dimension: impDim,
    },
    analysisComment,
    primaryRiskFactor,
  };
}
