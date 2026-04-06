export interface UnifiedEvent {
  type: 'config' | 'property' | 'event' | 'status';
  deviceId: string;
  deviceModel?: string;
  payload: any;
}
