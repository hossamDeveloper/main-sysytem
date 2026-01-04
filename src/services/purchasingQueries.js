import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasingApi } from './purchasingApi';

// ========== Suppliers ==========
export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => purchasingApi.getSuppliers(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => purchasingApi.getSupplier(id),
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateSupplier(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Purchase Requests ==========
export const usePurchaseRequests = (params = {}) => {
  return useQuery({
    queryKey: ['purchaseRequests', params],
    queryFn: () => purchasingApi.getPurchaseRequests(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePurchaseRequest = (id) => {
  return useQuery({
    queryKey: ['purchaseRequest', id],
    queryFn: () => purchasingApi.getPurchaseRequest(id),
    enabled: !!id,
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createPurchaseRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updatePurchaseRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequest', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeletePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deletePurchaseRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Purchase Orders ==========
export const usePurchaseOrders = (params = {}) => {
  return useQuery({
    queryKey: ['purchaseOrders', params],
    queryFn: () => purchasingApi.getPurchaseOrders(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePurchaseOrder = (id) => {
  return useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => purchasingApi.getPurchaseOrder(id),
    enabled: !!id,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updatePurchaseOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Goods Receipt ==========
export const useGoodsReceipts = (params = {}) => {
  return useQuery({
    queryKey: ['goodsReceipts', params],
    queryFn: () => purchasingApi.getGoodsReceipts(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useGoodsReceipt = (id) => {
  return useQuery({
    queryKey: ['goodsReceipt', id],
    queryFn: () => purchasingApi.getGoodsReceipt(id),
    enabled: !!id,
  });
};

export const useCreateGoodsReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createGoodsReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Invoices ==========
export const useInvoices = (params = {}) => {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => purchasingApi.getInvoices(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useInvoice = (id) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => purchasingApi.getInvoice(id),
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Dashboard Stats ==========
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => purchasingApi.getDashboardStats(),
    staleTime: 1 * 60 * 1000,
  });
};

