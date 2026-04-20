import mqtt from 'mqtt';
import { IoTAdapter } from '../iot-adapter';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { UnifiedEvent } from '../../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';
import { DeviceMapper } from '../device-mapper';
import { MapperLoader } from '../mapper-loader';

/**
 * 基于 MQTT 协议处理设备发现、属性上报和命令下发。
 */
export class MqttAdapter extends IoTAdapter {
  private client: mqtt.MqttClient | undefined;
  private config: ProviderConfig;
  private deviceMappers: Map<string, DeviceMapper | null> = new Map();
  private rawDeviceConfigs: Map<string, any> = new Map();
  private mapperLoader: MapperLoader;

  /**
   * 创建 MQTT 适配器。
   * @param config 供应商的 MQTT 接入配置。
   */
  constructor(config: ProviderConfig) {
    super(config.provider);
    this.config = config;
    this.mapperLoader = new MapperLoader();
  }

  /**
   * 建立 MQTT 连接并订阅设备主题。
   * @returns 初始化完成后的 Promise 或同步结果。
   */
  init(): void {
    console.log(`[MqttAdapter] Initializing connection to ${this.config.communication.baseUrl}`);
    this.client = mqtt.connect(this.config.communication.baseUrl);
    this.client.on('connect', () => {
      console.log('[MqttAdapter] Connected to MQTT broker');
    });
    this.client.on('error', (err) => {
      console.error('[MqttAdapter] Connection error:', err);
    });
    this.client.on('reconnect', () => {
      console.log('[MqttAdapter] Reconnecting...');
    });
    this.client.removeAllListeners('message');
    const topics = [
      'devices/+/config',
      'devices/+/property',
      'devices/+/events'
    ];
    this.client.subscribe(topics, (err) => {
      if (err) console.error('[MqttAdapter] Subscribe error:', err);
    });
    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }

  /**
   * 按主题类型分发 MQTT 消息。
   * @param topic MQTT 主题。
   * @param payload MQTT 消息体。
   * @returns 消息处理完成后的 Promise。
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const parts = topic.split('/');
      if (parts.length < 3 || parts[0] !== 'devices') {
        console.warn(`[MqttAdapter] Ignored topic format: ${topic}`);
        return;
      }
      const deviceId = parts[1];
      const messageType = parts[2];
      if (messageType === 'config') {
        await this.discoverDevice(deviceId, payload);
      } else if (messageType === 'property') {
        this.updateDeviceStates(deviceId, payload);
      } else {
        this.reportEvent(deviceId, payload);
      }
    } catch (e) {
      console.error('[MqttAdapter] Failed to process message', e);
    }
  }

  /**
   * 处理设备配置消息并建立设备映射器。
   * @param deviceId 设备标识。
   * @param payload 配置消息体。
   * @returns 设备发现处理完成后的 Promise。
   */
  async discoverDevice(deviceId: string, payload: Buffer): Promise<void> {
    const msgStr = payload.toString();
    const raw = JSON.parse(msgStr);
    this.rawDeviceConfigs.set(deviceId, raw);
    await this.applyMapperForDevice(deviceId, raw);
  }

  private async applyMapperForDevice(deviceId: string, rawDevice: any): Promise<void> {
    const selectedMapper = await this.mapperLoader.loadMapper(rawDevice, this.config);
    let payload: any;

    if (selectedMapper) {
      this.deviceMappers.set(deviceId, selectedMapper);
      payload = { ...rawDevice, isAccessible: true, metaModel: selectedMapper.metaModel };
    } else {
      this.deviceMappers.delete(deviceId);
      payload = { ...rawDevice, isAccessible: false, metaModel: undefined };
    }

    const event: UnifiedEvent = {
      type: 'config',
      deviceId,
      payload
    };
    this.eventCallback!(event);
  }

  /**
   * 处理设备属性上报并映射成统一属性结构。
   * @param deviceId 设备标识。
   * @param payload 属性消息体。
   * @returns 无返回值。
   */
  updateDeviceStates(deviceId: string, payload: Buffer): void {
    const msgStr = payload.toString();
    let raw = JSON.parse(msgStr);
    const mapper = this.deviceMappers.get(deviceId);
    if (!mapper) {
      return;
    }
    raw = mapper.mapProperties(raw);
    const event: UnifiedEvent = {
      type: 'property',
      deviceId: deviceId,
      payload: raw
    };
    this.eventCallback!(event);
  }

  /**
   * 处理设备事件上报并映射成统一事件结构。
   * @param deviceId 设备标识。
   * @param payload 事件消息体。
   * @returns 无返回值。
   */
  reportEvent(deviceId: string, payload: Buffer): void {
    const msgStr = payload.toString();
    let raw = JSON.parse(msgStr);
    const mapper = this.deviceMappers.get(deviceId);
    if (!mapper) {
      return;
    }
    raw = mapper.mapEvents(raw);
    const event: UnifiedEvent = {
      type: 'event',
      deviceId: deviceId,
      deviceModel: mapper.metaModel.modelId,
      payload: raw
    };
    this.eventCallback!(event);
  }

  /**
   * 通过设备映射器执行具体命令下发。
   * @param command 待发送的设备命令。
   * @returns 无返回值。
   */
  sendDeviceCommand(command: DeviceCommand): void {
    const mapper = this.deviceMappers.get(command.deviceId);
    if (!mapper) {
      return;
    }
    (mapper as any)[command.action](command.deviceId, command.params);
  }

  async refreshMapperLibrary(): Promise<void> {
    console.log(`[MqttAdapter] Refreshing mapper library for provider: ${this.provider}`);
    this.deviceMappers.clear();
    for (const [deviceId, rawConfig] of this.rawDeviceConfigs.entries()) {
      await this.applyMapperForDevice(deviceId, rawConfig);
    }
  }
}
