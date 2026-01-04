// Mock API service for Purchasing Module
// Simulates API calls with delays

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get data from localStorage
const getStoredData = (key) => {
  try {
    const stored = localStorage.getItem(`purchasing_${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error reading stored ${key}:`, error);
  }
  return [];
};

// Save data to localStorage
const saveData = (key, data) => {
  localStorage.setItem(`purchasing_${key}`, JSON.stringify(data));
};

// Generate unique ID
const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const purchasingApi = {
  // ========== Suppliers ==========
  getSuppliers: async (params = {}) => {
    await delay(500);
    const suppliers = getStoredData('suppliers');
    let filtered = [...suppliers];

    // Search filter
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchTerm) ||
          s.contactPerson?.toLowerCase().includes(searchTerm) ||
          s.email?.toLowerCase().includes(searchTerm) ||
          s.phone?.includes(searchTerm)
      );
    }

    // Status filter
    if (params.status) {
      filtered = filtered.filter((s) => s.status === params.status);
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  getSupplier: async (id) => {
    await delay(300);
    const suppliers = getStoredData('suppliers');
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  },

  createSupplier: async (supplierData) => {
    await delay(800);
    const suppliers = getStoredData('suppliers');
    const newSupplier = {
      id: generateId('SUP'),
      ...supplierData,
      status: supplierData.status || 'Active',
      createdAt: new Date().toISOString(),
    };
    suppliers.push(newSupplier);
    saveData('suppliers', suppliers);
    return newSupplier;
  },

  updateSupplier: async (id, supplierData) => {
    await delay(800);
    const suppliers = getStoredData('suppliers');
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Supplier not found');
    }
    suppliers[index] = {
      ...suppliers[index],
      ...supplierData,
      updatedAt: new Date().toISOString(),
    };
    saveData('suppliers', suppliers);
    return suppliers[index];
  },

  deleteSupplier: async (id) => {
    await delay(500);
    const suppliers = getStoredData('suppliers');
    const filtered = suppliers.filter((s) => s.id !== id);
    if (filtered.length === suppliers.length) {
      throw new Error('Supplier not found');
    }
    saveData('suppliers', filtered);
    return { success: true };
  },

  // ========== Purchase Requests ==========
  getPurchaseRequests: async (params = {}) => {
    await delay(500);
    const prs = getStoredData('purchaseRequests');
    let filtered = [...prs];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.prNumber?.toLowerCase().includes(searchTerm) ||
          pr.requestedBy?.toLowerCase().includes(searchTerm) ||
          pr.department?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.status) {
      filtered = filtered.filter((pr) => pr.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  getPurchaseRequest: async (id) => {
    await delay(300);
    const prs = getStoredData('purchaseRequests');
    const pr = prs.find((p) => p.id === id);
    if (!pr) {
      throw new Error('Purchase Request not found');
    }
    return pr;
  },

  createPurchaseRequest: async (prData) => {
    await delay(800);
    const prs = getStoredData('purchaseRequests');
    const prNumber = `PR-${new Date().getFullYear()}-${String(prs.length + 1).padStart(4, '0')}`;
    const newPR = {
      id: generateId('PR'),
      prNumber,
      ...prData,
      status: prData.status || 'Draft',
      items: prData.items || [],
      createdAt: new Date().toISOString(),
    };
    prs.push(newPR);
    saveData('purchaseRequests', prs);
    return newPR;
  },

  updatePurchaseRequest: async (id, prData) => {
    await delay(800);
    const prs = getStoredData('purchaseRequests');
    const index = prs.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Purchase Request not found');
    }
    prs[index] = {
      ...prs[index],
      ...prData,
      updatedAt: new Date().toISOString(),
    };
    saveData('purchaseRequests', prs);
    return prs[index];
  },

  deletePurchaseRequest: async (id) => {
    await delay(500);
    const prs = getStoredData('purchaseRequests');
    const filtered = prs.filter((p) => p.id !== id);
    if (filtered.length === prs.length) {
      throw new Error('Purchase Request not found');
    }
    saveData('purchaseRequests', filtered);
    return { success: true };
  },

  // ========== Purchase Orders ==========
  getPurchaseOrders: async (params = {}) => {
    await delay(500);
    const pos = getStoredData('purchaseOrders');
    let filtered = [...pos];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (po) =>
          po.poNumber?.toLowerCase().includes(searchTerm) ||
          po.supplierName?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.status) {
      filtered = filtered.filter((po) => po.status === params.status);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  getPurchaseOrder: async (id) => {
    await delay(300);
    const pos = getStoredData('purchaseOrders');
    const po = pos.find((p) => p.id === id);
    if (!po) {
      throw new Error('Purchase Order not found');
    }
    return po;
  },

  createPurchaseOrder: async (poData) => {
    await delay(800);
    const pos = getStoredData('purchaseOrders');
    const poNumber = `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(4, '0')}`;
    const totalAmount = poData.items?.reduce(
      (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0),
      0
    ) || 0;
    const newPO = {
      id: generateId('PO'),
      poNumber,
      ...poData,
      totalAmount,
      status: poData.status || 'Open',
      items: poData.items || [],
      createdAt: new Date().toISOString(),
    };
    pos.push(newPO);
    saveData('purchaseOrders', pos);
    return newPO;
  },

  updatePurchaseOrder: async (id, poData) => {
    await delay(800);
    const pos = getStoredData('purchaseOrders');
    const index = pos.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Purchase Order not found');
    }
    const totalAmount = poData.items
      ? poData.items.reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0),
          0
        )
      : pos[index].totalAmount;
    pos[index] = {
      ...pos[index],
      ...poData,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };
    saveData('purchaseOrders', pos);
    return pos[index];
  },

  deletePurchaseOrder: async (id) => {
    await delay(500);
    const pos = getStoredData('purchaseOrders');
    const filtered = pos.filter((p) => p.id !== id);
    if (filtered.length === pos.length) {
      throw new Error('Purchase Order not found');
    }
    saveData('purchaseOrders', filtered);
    return { success: true };
  },

  // ========== Goods Receipt ==========
  getGoodsReceipts: async (params = {}) => {
    await delay(500);
    const grns = getStoredData('goodsReceipts');
    let filtered = [...grns];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (grn) =>
          grn.grnNumber?.toLowerCase().includes(searchTerm) ||
          grn.poNumber?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.poId) {
      filtered = filtered.filter((grn) => grn.poId === params.poId);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  getGoodsReceipt: async (id) => {
    await delay(300);
    const grns = getStoredData('goodsReceipts');
    const grn = grns.find((g) => g.id === id);
    if (!grn) {
      throw new Error('Goods Receipt not found');
    }
    return grn;
  },

  createGoodsReceipt: async (grnData) => {
    await delay(800);
    const grns = getStoredData('goodsReceipts');
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(4, '0')}`;
    const newGRN = {
      id: generateId('GRN'),
      grnNumber,
      ...grnData,
      receivingDate: grnData.receivingDate || new Date().toISOString().split('T')[0],
      items: grnData.items || [],
      createdAt: new Date().toISOString(),
    };
    grns.push(newGRN);
    saveData('goodsReceipts', grns);

    // Update PO received quantities
    if (grnData.poId) {
      const pos = getStoredData('purchaseOrders');
      const poIndex = pos.findIndex((p) => p.id === grnData.poId);
      if (poIndex !== -1) {
        const po = pos[poIndex];
        const allItemsReceived = po.items.every((item) => {
          const grnItems = grnData.items || [];
          const grnItem = grnItems.find((gi) => gi.itemId === item.id);
          const receivedQty = (grnItem?.receivedQuantity || 0) + (item.receivedQuantity || 0);
          return receivedQty >= item.quantity;
        });
        if (allItemsReceived) {
          pos[poIndex].status = 'Completed';
        } else {
          pos[poIndex].status = 'Partially Received';
        }
        saveData('purchaseOrders', pos);
      }
    }

    return newGRN;
  },

  // ========== Invoices ==========
  getInvoices: async (params = {}) => {
    await delay(500);
    const invoices = getStoredData('invoices');
    let filtered = [...invoices];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(searchTerm) ||
          inv.supplierName?.toLowerCase().includes(searchTerm) ||
          inv.poNumber?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.paymentStatus) {
      filtered = filtered.filter((inv) => inv.paymentStatus === params.paymentStatus);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  getInvoice: async (id) => {
    await delay(300);
    const invoices = getStoredData('invoices');
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  },

  createInvoice: async (invoiceData) => {
    await delay(800);
    const invoices = getStoredData('invoices');
    const newInvoice = {
      id: generateId('INV'),
      ...invoiceData,
      paymentStatus: invoiceData.paymentStatus || 'Unpaid',
      createdAt: new Date().toISOString(),
    };
    invoices.push(newInvoice);
    saveData('invoices', invoices);
    return newInvoice;
  },

  updateInvoice: async (id, invoiceData) => {
    await delay(800);
    const invoices = getStoredData('invoices');
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Invoice not found');
    }
    invoices[index] = {
      ...invoices[index],
      ...invoiceData,
      updatedAt: new Date().toISOString(),
    };
    saveData('invoices', invoices);
    return invoices[index];
  },

  deleteInvoice: async (id) => {
    await delay(500);
    const invoices = getStoredData('invoices');
    const filtered = invoices.filter((i) => i.id !== id);
    if (filtered.length === invoices.length) {
      throw new Error('Invoice not found');
    }
    saveData('invoices', filtered);
    return { success: true };
  },

  // ========== Dashboard Stats ==========
  getDashboardStats: async () => {
    await delay(500);
    const suppliers = getStoredData('suppliers');
    const prs = getStoredData('purchaseRequests');
    const pos = getStoredData('purchaseOrders');
    const invoices = getStoredData('invoices');

    return {
      totalSuppliers: suppliers.filter((s) => s.status === 'Active').length,
      openPRs: prs.filter((pr) => ['Draft', 'Submitted'].includes(pr.status)).length,
      openPOs: pos.filter((po) => ['Open', 'Partially Received'].includes(po.status)).length,
      pendingInvoices: invoices.filter(
        (inv) => ['Unpaid', 'Partially Paid'].includes(inv.paymentStatus)
      ).length,
    };
  },
};

