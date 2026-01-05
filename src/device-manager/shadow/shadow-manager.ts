import { DeviceShadow } from '../../domain/device-shadow';

export interface ShadowManager {
  get(deviceId: string): Promise<DeviceShadow | undefined>;
  updateReported(deviceId: string, state: Record<string, any>): Promise<void>;
  updateDesired(deviceId: string, state: Record<string, any>): Promise<void>;
  updateStatus(deviceId: string, isOnline: boolean): Promise<void>;
  addDevice(info: DeviceShadow): Promise<void>;
  removeDevice(deviceId: string): Promise<void>;
  getAll(): Promise<DeviceShadow[]>;
}
