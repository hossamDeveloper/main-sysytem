import { useQuery } from '@tanstack/react-query';
import { authApi } from './authApi';

// React Query hook for fetching current user
export const useCurrentUser = (token) => {
  return useQuery({
    queryKey: ['currentUser', token],
    queryFn: () => authApi.getCurrentUser(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};

