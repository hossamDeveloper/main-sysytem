import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementApi } from './userManagementApi';

// Query hook to get all users
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userManagementApi.getUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Query hook to get single user
export const useUser = (userId) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userManagementApi.getUser(userId),
    enabled: !!userId,
  });
};

// Mutation hook to create user
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) => userManagementApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Mutation hook to update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userData }) =>
      userManagementApi.updateUser(userId, userData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
};

// Mutation hook to delete user
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => userManagementApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Mutation hook to update permissions
export const useUpdatePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, permissions }) =>
      userManagementApi.updatePermissions(userId, permissions),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
};

