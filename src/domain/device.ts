import { BaseDeviceModel } from './model';
export interface Device {
  deviceId: string;
  provider: string;
  category: string;
  deviceName?: string;
  metaModel?: BaseDeviceModel;
  isAccessible: boolean;
  state: {
    reported: Record<string, any>;
    desired?: Record<string, any>;
  };
  metadata: {
    lastUpdated: number;
    isOnline: boolean;
    version: number;
  };
}
