import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface AsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncOperation<T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const { toast } = useToast();

  const execute = useCallback(async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await operation(...args);
      
      setState({
        data: result,
        loading: false,
        error: null
      });

      if (options.showSuccessToast !== false) {
        toast({
          title: "Success",
          description: options.successMessage || "Operation completed successfully",
        });
      }

      options.onSuccess?.(result);
      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      setState({
        data: null,
        loading: false,
        error: errorObj
      });

      if (options.showErrorToast !== false) {
        toast({
          title: "Error",
          description: options.errorMessage || errorObj.message,
          variant: "destructive",
        });
      }

      options.onError?.(errorObj);
      throw errorObj;
    }
  }, [operation, options, toast]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.error && !state.data
  };
}