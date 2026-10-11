import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryEntry {
  id: string;
  sign: string;
  confidence: number;
  timestamp: number;
}

const KEY = '@abhivyakti/history';
const MAX = 50;

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const current = await loadHistory();
  const next = [entry, ...current].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}