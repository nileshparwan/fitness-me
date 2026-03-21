import { toast } from "sonner";

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return fallback;
}

type ToastFeedbackMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string;
};

export function withToastFeedback<T>(promise: Promise<T>, messages: ToastFeedbackMessages<T>) {
  void toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (error) => getActionErrorMessage(error, messages.error),
  });
  return promise;
}
