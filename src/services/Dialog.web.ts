import type { ConfirmOptions } from './Dialog';

export type { ConfirmOptions };

/** Web dialogs (react-native-web's Alert does nothing). Same API as Dialog.ts. */
export const Dialog = {
  notify(title: string, message: string): void {
    window.alert(`${title}\n\n${message}`);
  },

  confirm(title: string, message: string, _options: ConfirmOptions): Promise<boolean> {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  },
};
