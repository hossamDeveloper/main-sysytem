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
      queryClient.invalidateQueries({ queryKey: ['custodies'] }); // Invalidate custodies to reflect deduction
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateGoodsReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateGoodsReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteGoodsReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteGoodsReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
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

// ========== Products ==========
export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => purchasingApi.getProducts(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useProduct = (id) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => purchasingApi.getProduct(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// ========== Supplier Products ==========
export const useSupplierProducts = (supplierId, params = {}) => {
  return useQuery({
    queryKey: ['supplierProducts', supplierId, params],
    queryFn: () => purchasingApi.getSupplierProducts(supplierId, params),
    enabled: !!supplierId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProductSuppliers = (productId) => {
  return useQuery({
    queryKey: ['productSuppliers', productId],
    queryFn: () => purchasingApi.getProductSuppliers(productId),
    enabled: !!productId,
  });
};

export const useCreateSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createSupplierProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productSuppliers'] });
    },
  });
};

export const useUpdateSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateSupplierProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productSuppliers'] });
    },
  });
};

export const useDeleteSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteSupplierProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productSuppliers'] });
    },
  });
};

// ========== Standard Prices ==========
export const useStandardPrices = (params = {}) => {
  return useQuery({
    queryKey: ['standardPrices', params],
    queryFn: () => purchasingApi.getStandardPrices(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useStandardPrice = (productId) => {
  return useQuery({
    queryKey: ['standardPrice', productId],
    queryFn: () => purchasingApi.getStandardPrice(productId),
    enabled: !!productId,
  });
};

export const useCreateOrUpdateStandardPrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createOrUpdateStandardPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standardPrices'] });
      queryClient.invalidateQueries({ queryKey: ['standardPrice'] });
    },
  });
};

// ========== Custodies ==========
export const useCustodies = (params = {}) => {
  return useQuery({
    queryKey: ['custodies', params],
    queryFn: () => purchasingApi.getCustodies(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCustody = (id) => {
  return useQuery({
    queryKey: ['custody', id],
    queryFn: () => purchasingApi.getCustody(id),
    enabled: !!id,
  });
};

export const useCreateCustody = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createCustody(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateCustody = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateCustody(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useCloseCustody = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.closeCustody(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteCustody = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.deleteCustody(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

// ========== Custody Clearances ==========
export const useCustodyClearances = (params = {}) => {
  return useQuery({
    queryKey: ['custodyClearances', params],
    queryFn: () => purchasingApi.getCustodyClearances(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCustodyClearance = (id) => {
  return useQuery({
    queryKey: ['custodyClearance', id],
    queryFn: () => purchasingApi.getCustodyClearance(id),
    enabled: !!id,
  });
};

export const useCreateCustodyClearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchasingApi.createCustodyClearance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateCustodyClearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasingApi.updateCustodyClearance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useApproveClearanceItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clearanceId, itemId, approvedPrice }) =>
      purchasingApi.approveClearanceItem(clearanceId, itemId, approvedPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useRejectClearanceItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clearanceId, itemId, reason }) =>
      purchasingApi.rejectClearanceItem(clearanceId, itemId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useSubmitCustodyClearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.submitCustodyClearance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useApproveCustodyClearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => purchasingApi.approveCustodyClearance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
      queryClient.invalidateQueries({ queryKey: ['custodies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useRejectCustodyClearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => purchasingApi.rejectCustodyClearance(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custodyClearances'] });
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

