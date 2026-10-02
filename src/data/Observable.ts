export type Listener = () => void;

/**
 * Minimal snapshot store compatible with React's `useSyncExternalStore`.
 * Repositories extend this so ViewModels can subscribe without global state libs.
 */
export abstract class Observable<TSnapshot> {
  private listeners = new Set<Listener>();

  protected abstract snapshot: TSnapshot;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): TSnapshot => this.snapshot;

  protected setSnapshot(next: TSnapshot): void {
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
