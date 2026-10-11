import Constants from 'expo-constants';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://127.0.0.1:8000';

export interface PredictionAlternative {
  sign: string;
  confidence: number;
}

export interface PredictionResult {
  status: 'ok' | 'low_confidence' | 'not_ready' | 'error';
  sign?: string;
  display?: string;
  confidence?: number;
  accepted?: boolean;
  model_version?: string;
  message?: string;
  alternatives?: PredictionAlternative[];
}

export async function predictSign(
  imageBase64: string,
  language: string = 'en',
): Promise<PredictionResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, language }),
    });

    if (res.status === 503) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      return { status: 'not_ready', message: body.detail ?? 'Model not ready.' };
    }
    if (!res.ok) {
      return { status: 'error', message: `Server error (${res.status})` };
    }
    return (await res.json()) as PredictionResult;
  } catch {
    return { status: 'error', message: 'Network error — is the backend running?' };
  }
}