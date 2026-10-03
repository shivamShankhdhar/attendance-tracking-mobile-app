import { create } from 'zustand';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: AlertType;
  confirmText: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: undefined,
  message: '',
  type: 'info',
  confirmText: 'Got It',
  cancelText: undefined,
  onConfirm: undefined,
  onCancel: undefined,

  showAlert: (options: AlertOptions) => {
    set({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      confirmText: options.confirmText || (options.type === 'error' ? 'Dismiss' : 'Got It'),
      cancelText: options.cancelText,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  },

  hideAlert: () => {
    set({ isOpen: false });
  },
}));

/**
 * Procedural helper to show bottom-sheet alert anywhere in the app
 */
export const showAlert = (options: AlertOptions) => {
  useAlertStore.getState().showAlert(options);
};

export const showError = (message: string, title: string = 'Notice') => {
  useAlertStore.getState().showAlert({
    title,
    message,
    type: 'error',
    confirmText: 'Dismiss',
  });
};

export const showSuccess = (message: string, title: string = 'Success') => {
  useAlertStore.getState().showAlert({
    title,
    message,
    type: 'success',
    confirmText: 'Great!',
  });
};

export const showConfirm = (options: {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: AlertType;
}) => {
  useAlertStore.getState().showAlert({
    title: options.title || 'Confirm',
    message: options.message,
    type: options.type || 'warning',
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    onConfirm: options.onConfirm,
    onCancel: options.onCancel,
  });
};
