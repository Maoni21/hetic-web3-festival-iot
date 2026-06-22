import { DomainError } from './DomainError.js';

export class DeviceOfflineError extends DomainError {
  readonly code = 'DEVICE_OFFLINE';

  constructor(deviceId: string) {
    super(`Device ${deviceId} is offline and cannot process requests`);
  }
}
