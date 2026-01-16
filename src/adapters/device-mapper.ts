import { BaseDeviceModel } from '../domain/model';

export interface DeviceMapper {
  metaModel: BaseDeviceModel;
  deviceModel: string;
  provider: string;
  propertyMap: Record<string, string>;
  mapProperties(rawProps: any): Record<string, any>;
  mapEvent(rawEvent: any): any | null;
 
}
