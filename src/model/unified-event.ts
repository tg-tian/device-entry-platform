/**
 * 描述适配器上报到平台内部的统一设备事件。
 */
export interface UnifiedEvent {
  type: 'config' | 'property' | 'event' | 'status';
  deviceId: string;
  deviceModel?: string;
  payload: any;
}
