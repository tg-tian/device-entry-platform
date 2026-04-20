import { UnifiedEvent } from '../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';

/**
 * 定义设备接入适配器的统一能力。
 */
export abstract class IoTAdapter {
  protected eventCallback: (event: UnifiedEvent) => void = () => {};
  public readonly provider: string;

  /**
   * 创建适配器基类。
   * @param provider 适配器所属供应商标识。
   */
  constructor(provider: string) {
    this.provider = provider;
  }

  /**
   * 初始化适配器与外部连接。
   * @returns 初始化完成后的 Promise 或同步结果。
   */
  abstract init(): void | Promise<void>;

  /**
   * 向设备下发控制命令。
   * @param command 待执行的设备命令。
   * @returns 命令发送完成后的 Promise 或同步结果。
   */
  abstract sendDeviceCommand(command: DeviceCommand): void | Promise<void>;

  /**
   * 注册适配器事件回调。
   * @param callback 统一事件处理函数。
   * @returns 无返回值。
   */
  setEventHandler(callback: (event: UnifiedEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * 在运行时刷新设备映射器库并重新应用到当前设备。
   * @returns 刷新完成后的 Promise 或同步结果。
   */
  refreshMapperLibrary(): void | Promise<void> {
    // 默认适配器无需处理，子类按需覆盖。
  }
}
