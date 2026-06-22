import { DeviceState } from '../../domain/enums/DeviceState.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';

type StateTransitionHandler = (fromState: DeviceState, toState: DeviceState) => void;

const RESET_DELAY_MS = 3000;
const ERROR_RECOVERY_DELAY_MS = 5000;

const ALLOWED_TRANSITIONS: Record<DeviceState, DeviceState[]> = {
  [DeviceState.IDLE]: [DeviceState.READING, DeviceState.OFFLINE],
  [DeviceState.READING]: [DeviceState.PROCESSING, DeviceState.ERROR, DeviceState.OFFLINE],
  [DeviceState.PROCESSING]: [DeviceState.GRANTED, DeviceState.DENIED, DeviceState.OFFLINE],
  [DeviceState.GRANTED]: [DeviceState.IDLE, DeviceState.OFFLINE],
  [DeviceState.DENIED]: [DeviceState.IDLE, DeviceState.OFFLINE],
  [DeviceState.ERROR]: [DeviceState.IDLE, DeviceState.OFFLINE],
  [DeviceState.OFFLINE]: [DeviceState.IDLE],
};

export class DeviceStateMachine {
  private currentState: DeviceState = DeviceState.IDLE;
  private readonly transitionHandlers: StateTransitionHandler[] = [];

  constructor(private readonly logger: IAccessLogger) {}

  getCurrentState(): DeviceState {
    return this.currentState;
  }

  onTransition(handler: StateTransitionHandler): void {
    this.transitionHandlers.push(handler);
  }

  onTicketDetected(): void {
    this.transition(DeviceState.READING);
  }

  onReadSuccess(): void {
    this.transition(DeviceState.PROCESSING);
  }

  onReadFailure(): void {
    this.transition(DeviceState.ERROR);
  }

  onAccessGranted(): void {
    this.transition(DeviceState.GRANTED);
    this.scheduleReset(RESET_DELAY_MS);
  }

  onAccessDenied(): void {
    this.transition(DeviceState.DENIED);
    this.scheduleReset(RESET_DELAY_MS);
  }

  onReset(): void {
    this.transition(DeviceState.IDLE);
  }

  onRecovery(): void {
    this.transition(DeviceState.IDLE);
  }

  onConnectionLost(): void {
    this.transition(DeviceState.OFFLINE);
  }

  onReconnected(): void {
    this.transition(DeviceState.IDLE);
  }

  forceReset(): void {
    this.currentState = DeviceState.IDLE;
    this.logger.debug('DeviceStateMachine', 'State force-reset to IDLE');
  }

  private transition(toState: DeviceState): void {
    const fromState = this.currentState;
    const allowedTargets = ALLOWED_TRANSITIONS[fromState];

    if (!allowedTargets.includes(toState)) {
      this.logger.warn('DeviceStateMachine', 'Invalid transition attempted', {
        from: fromState,
        to: toState,
      });
      return;
    }

    this.currentState = toState;
    this.logger.debug('DeviceStateMachine', 'State transitioned', {
      from: fromState,
      to: toState,
    });

    this.transitionHandlers.forEach((handler) => handler(fromState, toState));
  }

  private scheduleReset(delayMs: number): void {
    setTimeout(() => {
      if (
        this.currentState === DeviceState.GRANTED ||
        this.currentState === DeviceState.DENIED
      ) {
        this.onReset();
      }
    }, delayMs);
  }

  scheduleErrorRecovery(): void {
    setTimeout(() => {
      if (this.currentState === DeviceState.ERROR) {
        this.onRecovery();
      }
    }, ERROR_RECOVERY_DELAY_MS);
  }
}
