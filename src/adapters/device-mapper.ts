import { BaseDeviceModel } from '../domain/model';

export interface DeviceMapper {
  metaModel: BaseDeviceModel;
  deviceModel: string;
  provider: string;
  propertyMap: Record<string, string>;
  match(rawDevice: any): boolean;
  mapProperties(rawProps: any): Record<string, any>;
  mapEvent(rawEvent: any): any | null;
 
}
