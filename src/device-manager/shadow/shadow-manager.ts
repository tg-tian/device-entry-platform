import type { DeviceShadow } from '@tgapk/lowcode-common/device';

/**
 * 定义设备影子的统一读写接口。
 */
export interface ShadowManager {
  /**
   * 获取单个设备影子。
   * @param deviceId 设备标识。
   * @returns 匹配的设备影子，未找到时返回 undefined。
   */
  get(deviceId: string): Promise<DeviceShadow | undefined>;

  /**
   * 更新设备上报属性。
   * @param deviceId 设备标识。
   * @param state 最新上报属性。
   * @returns 更新完成后的 Promise。
   */
  updateReported(deviceId: string, state: Record<string, any>): Promise<void>;

  /**
   * 更新设备期望属性。
   * @param deviceId 设备标识。
   * @param state 最新期望属性。
   * @returns 更新完成后的 Promise。
   */
  updateDesired(deviceId: string, state: Record<string, any>): Promise<void>;

  /**
   * 更新设备在线状态。
   * @param deviceId 设备标识。
   * @param isOnline 当前在线状态。
   * @returns 更新完成后的 Promise。
   */
  updateStatus(deviceId: string, isOnline: boolean): Promise<void>;

  /**
   * 添加新设备影子。
   * @param info 设备影子数据。
   * @returns 添加完成后的 Promise。
   */
  addDevice(info: DeviceShadow): Promise<void>;

  /**
   * 删除指定设备影子。
   * @param deviceId 设备标识。
   * @returns 删除完成后的 Promise。
   */
  removeDevice(deviceId: string): Promise<void>;

  /**
   * 获取全部设备影子。
   * @returns 设备影子列表。
   */
  getAll(): Promise<DeviceShadow[]>;
}
