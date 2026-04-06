import type { BaseDeviceModel } from '@tgapk/lowcode-common/device-model';

export interface DeviceMapper {
  metaModel: BaseDeviceModel;
  deviceModel: string;
  provider: string;
  propertyMap: Record<string, any>;
  mapProperties(rawProps: any): Record<string, any>;
  mapEvents(rawEvent: any): Record<string, any>;
 
}
