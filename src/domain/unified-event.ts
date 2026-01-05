export interface UnifiedEvent {
  type: 'config' | 'property' | 'event';
  deviceId: string;
  payload: any;
}
