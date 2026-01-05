import mqtt from 'mqtt';
import { DeviceMapper} from '../device-mapper';
import { ThermostatModel } from '../../domain/model';
import { ProviderConfig } from '../../domain/provider-config';

export class MqttThermostatMapper implements DeviceMapper {
  metaModel = ThermostatModel;
  deviceModel = 'MI-THERMO-S01';
  provider = 'mqtt';
  private client: mqtt.MqttClient;
  private cfg: ProviderConfig;
  propertyMap: Record<string, string> = {
    temperature: 'tempCurrent',
  };
  constructor(config: ProviderConfig) {
    this.cfg = config;
    this.client = mqtt.connect(this.cfg.communication.baseUrl);
  }
  match(rawDevice: any): boolean {
    return rawDevice.provider === this.provider
      && rawDevice.category === this.metaModel.category
      && rawDevice.model === this.deviceModel;
  }
  
  mapProperties(rawProps: any): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawProps)) {
      const target = this.propertyMap[key as keyof typeof this.propertyMap];
      if (target) {
        mapped[target] = value;
      } else {
        mapped[key] = value;
      }
    }
    return mapped;
  }
  
  mapEvent(rawEvent: any): any | null {
    if (rawEvent?.event === 'overheat') {
      return {
        event: 'overheating',
        value: { level: rawEvent.value },
        timestamp: rawEvent.ts || Date.now()
      };
    }
    return null;
  }
}
