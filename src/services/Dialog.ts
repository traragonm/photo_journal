import { Alert } from 'react-native';

export interface ConfirmOptions {
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Cross-platform dialogs. Native uses Alert; `Dialog.web.ts` uses the browser's
 * dialogs because react-native-web's Alert is a no-op.
 */
export const Dialog = {
  notify(title: string, message: string): void {
    Alert.alert(title, message);
  },

  confirm(title: string, message: string, options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: options.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: options.confirmLabel,
            style: options.destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  },
};
