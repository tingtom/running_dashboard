import { ToastProvider, ToastViewport } from './toast';

export const Toaster = () => {
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  );
};
