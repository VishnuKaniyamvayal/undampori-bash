type Listener<T> = (payload: T) => void

/** Minimal typed event emitter. */
export class EventBus<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {}

  /** Subscribe; returns an unsubscribe function. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners[type]
    if (!set) {
      set = new Set()
      this.listeners[type] = set
    }
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    this.listeners[type]?.forEach((listener) => listener(payload))
  }

  clear(): void {
    this.listeners = {}
  }
}
