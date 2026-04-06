import type { BaseDeviceModel } from '@lowcode/shared-contracts/device-model';

export interface DeviceMapper {
  metaModel: BaseDeviceModel;
  deviceModel: string;
  provider: string;
  propertyMap: Record<string, any>;
  mapProperties(rawProps: any): Record<string, any>;
  mapEvents(rawEvent: any): Record<string, any>;
 
}
