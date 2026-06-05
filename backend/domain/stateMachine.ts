/**
 * Core interface for State Machine functionality.
 */

export interface TransitionGuardContext {
  [key: string]: any;
}

export type GuardFunction<TContext extends TransitionGuardContext = TransitionGuardContext> = (
  context: TContext
) => boolean | Promise<boolean>;

export interface TransitionConfig<TStatus extends string, TContext extends TransitionGuardContext = TransitionGuardContext> {
  from: TStatus | TStatus[];
  to: TStatus;
  guards?: GuardFunction<TContext>[];
  onTransition?: (context: TContext) => void | Promise<void>;
}

export interface StateMachineConfig<TStatus extends string, TContext extends TransitionGuardContext = TransitionGuardContext> {
  initialState: TStatus;
  transitions: TransitionConfig<TStatus, TContext>[];
}

export class StateMachine<TStatus extends string, TContext extends TransitionGuardContext = TransitionGuardContext> {
  private config: StateMachineConfig<TStatus, TContext>;

  constructor(config: StateMachineConfig<TStatus, TContext>) {
    this.config = config;
  }

  public getValidTransitions(currentStatus: TStatus): TStatus[] {
    const validTos = new Set<TStatus>();
    for (const t of this.config.transitions) {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      if (fromStates.includes(currentStatus)) {
        validTos.add(t.to);
      }
    }
    return Array.from(validTos);
  }

  public async canTransition(currentStatus: TStatus, toStatus: TStatus, context: TContext): Promise<boolean> {
    const transition = this.findTransition(currentStatus, toStatus);
    if (!transition) {
      return false;
    }

    if (transition.guards && transition.guards.length > 0) {
      for (const guard of transition.guards) {
        const passed = await guard(context);
        if (!passed) return false;
      }
    }

    return true;
  }

  public async transition(currentStatus: TStatus, toStatus: TStatus, context: TContext): Promise<void> {
    const can = await this.canTransition(currentStatus, toStatus, context);
    if (!can) {
      throw new Error(`Invalid transition from ${currentStatus} to ${toStatus} or guards failed.`);
    }

    const transition = this.findTransition(currentStatus, toStatus);
    if (transition?.onTransition) {
      await transition.onTransition(context);
    }
  }

  private findTransition(fromStatus: TStatus, toStatus: TStatus): TransitionConfig<TStatus, TContext> | undefined {
    return this.config.transitions.find((t) => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(fromStatus) && t.to === toStatus;
    });
  }
}
