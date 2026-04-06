import mqtt from 'mqtt';
import { IoTAdapter } from '../iot-adapter';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { UnifiedEvent } from '../../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';
import { DeviceMapper} from '../device-mapper';
import { MapperLoader } from '../mapper-loader';

export class MqttAdapter extends IoTAdapter {
  private client: mqtt.MqttClient | undefined;
  private config: ProviderConfig;
  private deviceMappers: Map<string, DeviceMapper | null> = new Map();
  private mapperLoader: MapperLoader;

  constructor(config: ProviderConfig) {
    super(config.provider);
    this.config = config;
    this.mapperLoader = new MapperLoader();
  }

  init(){
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

   private async handleMessage(topic: string, payload: Buffer) {
    try {
      const parts = topic.split('/');
      if (parts.length < 3 || parts[0] !== 'devices') {
         console.warn(`[MqttAdapter] Ignored topic format: ${topic}`);
         return;
      }
      const deviceId = parts[1];
      const messageType = parts[2];
      if (messageType === 'config')
        await this.discoverDevice(deviceId,payload);
      else if (messageType === 'property')
        this.updateDeviceStates(deviceId,payload);
      else
        this.reportEvent(deviceId,payload);
    } catch (e) {
      console.error('[MqttAdapter] Failed to process message', e);
    }
  }

  async discoverDevice(deviceId: string, payload: Buffer){
      const msgStr = payload.toString();
      let raw = JSON.parse(msgStr);
      let selectedMapper = await this.mapperLoader.loadMapper(raw, this.config);
      
      if (selectedMapper) {
        this.deviceMappers.set(deviceId, selectedMapper);
        raw = {...raw, isAccessible: true, metaModel: selectedMapper.metaModel};
      } else {
        raw = {...raw, isAccessible: false};  
      }
      
      const event: UnifiedEvent = {
        type: "config",
        deviceId: deviceId,
        payload: raw
      };
      this.eventCallback!(event);
  }

  updateDeviceStates(deviceId: string, payload: Buffer){
      const msgStr = payload.toString();
      let raw = JSON.parse(msgStr);
      const mapper = this.deviceMappers.get(deviceId);
      if (!mapper)
        return;
      raw = mapper.mapProperties(raw);
      const event: UnifiedEvent = {
        type: "property",
        deviceId: deviceId,
        payload: raw
      };
      this.eventCallback!(event);
  }

  reportEvent(deviceId: string, payload: Buffer){
      const msgStr = payload.toString();
      let raw = JSON.parse(msgStr);
      const mapper = this.deviceMappers.get(deviceId);
      if (!mapper)
        return;
      raw = mapper.mapEvents(raw);
      const event: UnifiedEvent = {
        type: "event",
        deviceId: deviceId,
        deviceModel: mapper.metaModel.modelId,
        payload: raw
      };
      this.eventCallback!(event);
  }
  
  sendDeviceCommand(command : DeviceCommand){
      const mapper = this.deviceMappers.get(command.deviceId);
      if (!mapper)
        return;
      (mapper as any)[command.action](command.deviceId, command.params);
  }
  
}
