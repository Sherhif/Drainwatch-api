export type ApiResponseShape<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export type ApiErrorShape = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
};
