import mqtt from 'mqtt';
import { DeviceMapper } from '../device-mapper';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import type { BaseDeviceModel } from '@tgapk/lowcode-common/device-model';

/**
 * 为空调设备提供 MQTT 属性、事件与命令映射。
 */
export class MqttACMapper implements DeviceMapper {
  metaModel: BaseDeviceModel;
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
    }
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
    }
  };

  /**
   * 创建空调设备映射器。
   * @param config 供应商接入配置。
   * @param metaModel 设备元模型定义。
   */
  constructor(config: ProviderConfig, metaModel: BaseDeviceModel) {
    this.cfg = config;
    this.metaModel = metaModel;
    this.client = mqtt.connect(this.cfg.communication.baseUrl);
  }

  /**
   * 按映射规则转换原始属性或事件字段。
   * @param sourceData 原始数据对象。
   * @param mapping 字段映射规则。
   * @returns 转换后的统一数据对象。
   */
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

  /**
   * 将设备属性转换为平台统一属性结构。
   * @param rawProps 设备原始属性数据。
   * @returns 映射后的属性对象。
   */
  mapProperties(rawProps: any): Record<string, any> {
    return this.processMapping(rawProps, this.propertyMap);
  }

  /**
   * 将设备事件转换为平台统一事件结构。
   * @param rawEvent 设备原始事件数据。
   * @returns 映射后的事件对象。
   */
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

  /**
   * 下发空调模式设置命令。
   * @param deviceId 设备标识。
   * @param args 模式参数，mode 为目标模式。
   * @returns 无返回值。
   */
  setMode(deviceId: string, args: { mode: string }): void {
    const modeMap: Record<string, number> = {
      cool: 0,
      heat: 1,
      fan: 2,
      dry: 3,
      auto: 4
    };
    const modeVal = modeMap[args.mode];
    if (modeVal !== undefined) {
      const payload = { action: 'setMode', args: { mode: modeVal } };
      this.client.publish(`devices/${deviceId}/command`, JSON.stringify(payload));
    }
  }

  /**
   * 下发空调温度设置命令。
   * @param deviceId 设备标识。
   * @param args 温度参数，temp 为目标温度。
   * @returns 无返回值。
   */
  setTemperature(deviceId: string, args: { temp: number }): void {
    const payload = { action: 'setTemperature', args };
    this.client.publish(`devices/${deviceId}/command`, JSON.stringify(payload));
  }
}
