import mqtt from 'mqtt';
import { DeviceMapper} from '../device-mapper';
import { ProviderConfig } from '../../domain/provider-config';
import { BaseDeviceModel } from '../../domain/model';

export class MqttACMapper implements DeviceMapper {
  metaModel : BaseDeviceModel;
  deviceModel = 'HAIER-AC-1001';
  provider = 'mqtt';
  private client: mqtt.MqttClient;
  private cfg: ProviderConfig;
  propertyMap: Record<string, any> = {
    current_temperature: 'tempCurrent',
    temperature: 'tempTarget',
    hvac_mode: {
      _to: 'hvacMode',
      _map: {
        0: 'cool',
        1: 'heat',
        2: 'fan',
        3: 'dry',
        4: 'auto'
      }
    },
  };

  eventMap: Record<string, any> = {
    sys_error: {
      _to: 'error',
      code: 'code',
      msg: 'message'
    },
    filter_warn: {
      _to: 'filterAlert',
      op_hours: 'hoursUsed'
    },
    comp_status: {
      _to: 'compressorStatus',
      val: {
        _to: 'status',
        _map: {
          0: 'off',
          1: 'on',
          2: 'defrosting'
        }
      }
    },
  };

  constructor(config: ProviderConfig , metaModel: BaseDeviceModel) {
    this.cfg = config;
    this.metaModel = metaModel;
    this.client = mqtt.connect(this.cfg.communication.baseUrl);
  }

  private processMapping(sourceData: any, mapping: any): Record<string, any> {
    const mappedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(sourceData)) {
      const fieldMapping = mapping[key];
      if (!fieldMapping) {
        mappedData[key] = value;
        continue; 
      }
      if (typeof fieldMapping === 'string') {
        mappedData[fieldMapping] = value;
      } else if (typeof fieldMapping === 'object') {
        const targetKey = fieldMapping._to;
        if (fieldMapping._map) {
          mappedData[targetKey] = fieldMapping._map[value as any] ?? value;
        } else {
          mappedData[targetKey] = value;
        }
      }
    }
    return mappedData;
  }

  mapProperties(rawProps: any): Record<string, any> {
    return this.processMapping(rawProps, this.propertyMap);
  }

  // mapProperties(rawProps: any): Record<string, any> {
  //   const mapped: Record<string, any> = {};
  //   for (const [key, value] of Object.entries(rawProps)) {
  //     const target = this.propertyMap[key as keyof typeof this.propertyMap];
  //     if (target) {
  //       mapped[target] = value;
  //     } else {
  //       mapped[key] = value;
  //     }
  //   }
  //   return mapped;
  // }

  mapEvents(rawEvent: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawEvent)) {
      if (this.eventMap[key]) {
        const mapping = this.eventMap[key];
        const targetEventName = mapping._to || key;
        result[targetEventName] = this.processMapping(value, mapping);
      }
    }
    return result;
  }

  setMode(deviceId: string, args: { mode: string }): void {
    const modeMap: Record<string, number> = {
      'cool': 0,
      'heat': 1,
      'fan': 2,
      'dry': 3,
      'auto': 4
    };
    const modeVal = modeMap[args.mode];
    if (modeVal !== undefined) {
      const payload = { action: 'setMode', args: { mode: modeVal } };
      this.client.publish(`devices/${deviceId}/command`, JSON.stringify(payload));
    }
  }
  setTemperature(deviceId: string, args: { temp: number }): void {
    const payload = { action: 'setTemperature', args };
    this.client.publish(`devices/${deviceId}/command`, JSON.stringify(payload));
  }
}
