
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  audioData?: string; // Base64 PCM data
}

export interface UserSettings {
  aiName: string;
  userName: string;
}
