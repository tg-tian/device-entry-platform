export interface UnifiedEvent {
  type: 'config' | 'property' | 'event';
  deviceId: string;
  deviceModel?: string;
  payload: any;
}
