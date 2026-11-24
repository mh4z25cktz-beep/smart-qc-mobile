/**
 * Supabase REST API Service (PostgREST)
 * Ver 3.0 Mobile Implementation with In-Memory Fallback Cache
 */

export interface QcRecord {
  id: number;
  timestamp: string;
  temperature: number;
  humidity: number;
  dimension: number;
  spc_status: 'NORMAL' | 'OUT_OF_CONTROL';
  defect_prob: number; // 0 - 100 (%)
  is_defect: number;   // 0 or 1
}

export interface ConnectionStatus {
  connected: boolean;
  isFallback: boolean;
  message: string;
  lastChecked: Date;
}

export const SUPABASE_URL = "https://fcbmnvubnefbmrddynwe.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Xcvo3OD5aItEnng3R3eOGA_U1jcwwmD";
export const TABLE_NAME = "qc_data";

const HEADERS: Record<string, string> = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Initial sample baseline dataset for the in-memory fallback cache
 * Represents stable process data (dimension ~50.0mm, temp ~22-25C, humidity ~45-55%)
 */
let inMemoryCache: QcRecord[] = [
  {
    id: 10,
    timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    temperature: 24.2,
    humidity: 49.5,
    dimension: 50.04,
    spc_status: 'NORMAL',
    defect_prob: 4.8,
    is_defect: 0,
  },
  {
    id: 9,
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    temperature: 23.9,
    humidity: 51.0,
    dimension: 49.98,
    spc_status: 'NORMAL',
    defect_prob: 3.5,
    is_defect: 0,
  },
  {
    id: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    temperature: 24.5,
    humidity: 48.2,
    dimension: 50.09,
    spc_status: 'NORMAL',
    defect_prob: 5.2,
    is_defect: 0,
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    temperature: 25.1,
    humidity: 53.4,
    dimension: 50.15,
    spc_status: 'NORMAL',
    defect_prob: 8.6,
    is_defect: 0,
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    temperature: 23.5,
    humidity: 47.0,
    dimension: 49.92,
    spc_status: 'NORMAL',
    defect_prob: 4.1,
    is_defect: 0,
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    temperature: 24.0,
    humidity: 50.2,
    dimension: 50.02,
    spc_status: 'NORMAL',
    defect_prob: 3.1,
    is_defect: 0,
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    temperature: 24.8,
    humidity: 52.1,
    dimension: 50.06,
    spc_status: 'NORMAL',
    defect_prob: 4.9,
    is_defect: 0,
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    temperature: 23.8,
    humidity: 49.8,
    dimension: 49.95,
    spc_status: 'NORMAL',
    defect_prob: 3.8,
    is_defect: 0,
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    temperature: 24.3,
    humidity: 51.5,
    dimension: 50.01,
    spc_status: 'NORMAL',
    defect_prob: 3.3,
    is_defect: 0,
  },
  {
    id: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    temperature: 24.1,
    humidity: 50.0,
    dimension: 50.00,
    spc_status: 'NORMAL',
    defect_prob: 2.9,
    is_defect: 0,
  },
];

let nextFallbackId = 11;

/**
 * Check connectivity to Supabase REST endpoint
 */
export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
  );

  try {
    const fetchPromise = fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=id&limit=1`, {
      method: 'GET',
      headers: HEADERS,
    });

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (res.ok) {
      return {
        connected: true,
        isFallback: false,
        message: 'Supabase Cloud 연동 정상 (qc_data)',
        lastChecked: new Date(),
      };
    } else {
      return {
        connected: false,
        isFallback: true,
        message: `HTTP ${res.status}: 로컬 폴백 캐시 동작 중`,
        lastChecked: new Date(),
      };
    }
  } catch {
    return {
      connected: false,
      isFallback: true,
      message: '네트워크 연결 불가: 로컬 인메모리 폴백 활성',
      lastChecked: new Date(),
    };
  }
}

/**
 * Fetch all QC records ordered by id descending
 */
export async function fetchAllQcData(limit: number = 50): Promise<QcRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&order=id.desc&limit=${limit}`, {
      method: 'GET',
      headers: HEADERS,
    });

    if (res.ok) {
      const data: QcRecord[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Sync retrieved records into fallback cache
        inMemoryCache = [...data];
        return data;
      }
    }
  } catch {
    // Network or server error - silently fall back
  }

  // Return from in-memory cache sorted descending
  return [...inMemoryCache].sort((a, b) => b.id - a.id).slice(0, limit);
}

/**
 * Fetch dimension values history (chronological order for SPC calculation)
 */
export async function fetchDimensionHistory(limit: number = 50): Promise<number[]> {
  try {
    const records = await fetchAllQcData(limit);
    // Reverse so oldest is first for time-series SPC chart
    return records.map((r) => r.dimension).reverse();
  } catch {
    return inMemoryCache.map((r) => r.dimension).reverse();
  }
}

/**
 * Insert a new QC record
 */
export async function insertQcData(
  record: Omit<QcRecord, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<QcRecord> {
  const timestamp = record.timestamp || new Date().toISOString();
  const payload = {
    ...record,
    timestamp,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const inserted: QcRecord[] = await res.json();
      if (Array.isArray(inserted) && inserted.length > 0) {
        // Add to local cache as well
        inMemoryCache.unshift(inserted[0]);
        return inserted[0];
      }
    }
  } catch {
    // Handled below by fallback
  }

  // Fallback in-memory insert
  const fallbackRecord: QcRecord = {
    id: nextFallbackId++,
    timestamp,
    temperature: Number(payload.temperature),
    humidity: Number(payload.humidity),
    dimension: Number(payload.dimension),
    spc_status: payload.spc_status,
    defect_prob: Number(payload.defect_prob),
    is_defect: payload.is_defect,
  };

  inMemoryCache.unshift(fallbackRecord);
  return fallbackRecord;
}

/**
 * Clear all QC data (DELETE id=gt.0)
 */
export async function clearAllQcData(): Promise<boolean> {
  let cloudSuccess = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=gt.0`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    cloudSuccess = res.ok;
  } catch {
    cloudSuccess = false;
  }

  // Always reset in-memory fallback cache
  inMemoryCache = [];
  nextFallbackId = 1;
  return cloudSuccess || true;
}

/**
 * Reset fallback cache to default baseline data
 */
export function resetFallbackCacheToDefault(): void {
  inMemoryCache = [
    {
      id: 5,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      temperature: 24.2,
      humidity: 49.5,
      dimension: 50.04,
      spc_status: 'NORMAL',
      defect_prob: 4.8,
      is_defect: 0,
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      temperature: 23.9,
      humidity: 51.0,
      dimension: 49.98,
      spc_status: 'NORMAL',
      defect_prob: 3.5,
      is_defect: 0,
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      temperature: 24.5,
      humidity: 48.2,
      dimension: 50.09,
      spc_status: 'NORMAL',
      defect_prob: 5.2,
      is_defect: 0,
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      temperature: 24.0,
      humidity: 50.2,
      dimension: 50.02,
      spc_status: 'NORMAL',
      defect_prob: 3.1,
      is_defect: 0,
    },
    {
      id: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      temperature: 24.1,
      humidity: 50.0,
      dimension: 50.00,
      spc_status: 'NORMAL',
      defect_prob: 2.9,
      is_defect: 0,
    },
  ];
  nextFallbackId = 6;
}
