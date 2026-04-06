import { UnifiedEvent } from '../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';

export abstract class IoTAdapter {
  protected eventCallback: (event: UnifiedEvent) => void = () => {};
  public readonly provider: string;

  constructor(provider: string) {
    this.provider = provider;
  }

  abstract init():void;
  //abstract discoverDevices():void;
  //abstract registerDevice(device : any):void;
  abstract sendDeviceCommand(command: DeviceCommand):void;

  setEventHandler(callback: (event: UnifiedEvent) => void): void {
    this.eventCallback = callback;
  }
}
