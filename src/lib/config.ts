import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useConfig(key: string) {
  return useQuery({
    queryKey: ['config', key],
    queryFn: () => api.getConfig(key),
  });
}

export function useSetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => api.setConfig(key, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config'] }),
  });
}

export function useConfigBool(key: string, fallback = false) {
  const { data } = useConfig(key);
  if (data === null || data === undefined) return fallback;
  return data === 'true';
}
