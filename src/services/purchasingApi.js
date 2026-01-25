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
    const pos = getStoredData('purchaseOrders');
    const custodies = getStoredData('custodies');
    
    // Get the purchase order
    const po = pos.find((p) => p.id === grnData.poId);
    if (!po) {
      throw new Error('Purchase Order not found');
    }

    // Calculate total amount received
    const receivedItems = grnData.items || [];
    let totalReceivedAmount = 0;
    receivedItems.forEach((grnItem) => {
      const poItem = po.items.find((item) => item.id === grnItem.itemId);
      if (poItem) {
        totalReceivedAmount += (grnItem.receivedQuantity || 0) * (poItem.price || 0);
      }
    });

    // Check if PO has a custody linked and deduct from it
    let custodyDeduction = null;
    if (po.custodyId) {
      const custodyIndex = custodies.findIndex((c) => c.id === po.custodyId);
      if (custodyIndex !== -1) {
        const custody = custodies[custodyIndex];
        const currentSpent = parseFloat(custody.spentAmount) || 0;
        const currentRemaining = parseFloat(custody.remainingAmount) || (parseFloat(custody.amount) - currentSpent);
        
        if (totalReceivedAmount > currentRemaining) {
          throw new Error(`مبلغ الاستلام (${totalReceivedAmount.toFixed(2)}) أكبر من المتبقي في العهدة (${currentRemaining.toFixed(2)})`);
        }

        // Update custody spent and remaining amounts
        custodies[custodyIndex].spentAmount = currentSpent + totalReceivedAmount;
        custodies[custodyIndex].remainingAmount = currentRemaining - totalReceivedAmount;
        custodies[custodyIndex].updatedAt = new Date().toISOString();
        
        saveData('custodies', custodies);

        custodyDeduction = {
          custodyId: custody.id,
          custodyNumber: custody.custodyNumber,
          employeeName: custody.employeeName,
          amountDeducted: totalReceivedAmount,
          remainingAfterDeduction: currentRemaining - totalReceivedAmount,
        };
      }
    }

    const grnNumber = `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(4, '0')}`;
    const newGRN = {
      id: generateId('GRN'),
      grnNumber,
      ...grnData,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      totalReceivedAmount,
      custodyDeduction, // Include custody deduction info
      receivingDate: grnData.receivingDate || new Date().toISOString().split('T')[0],
      items: receivedItems.map((item) => {
        const poItem = po.items.find((pi) => pi.id === item.itemId);
        return {
          ...item,
          price: poItem?.price || 0,
          totalAmount: (item.receivedQuantity || 0) * (poItem?.price || 0),
        };
      }),
      createdAt: new Date().toISOString(),
    };
    grns.push(newGRN);
    saveData('goodsReceipts', grns);

    // Update PO received quantities and status
    if (grnData.poId) {
      const poIndex = pos.findIndex((p) => p.id === grnData.poId);
      if (poIndex !== -1) {
        // Update received quantities in PO items
        pos[poIndex].items = pos[poIndex].items.map((item) => {
          const grnItem = receivedItems.find((gi) => gi.itemId === item.id);
          const prevReceived = item.receivedQuantity || 0;
          const newReceived = prevReceived + (grnItem?.receivedQuantity || 0);
          return {
            ...item,
            receivedQuantity: newReceived,
          };
        });

        const allItemsReceived = pos[poIndex].items.every(
          (item) => (item.receivedQuantity || 0) >= item.quantity
        );
        
        if (allItemsReceived) {
          pos[poIndex].status = 'Completed';
        } else {
          pos[poIndex].status = 'Partially Received';
        }
        pos[poIndex].updatedAt = new Date().toISOString();
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

  // ========== Products ==========
  getProducts: async (params = {}) => {
    await delay(500);
    const products = getStoredData('products');
    let filtered = [...products];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm) ||
          p.category?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.category) {
      filtered = filtered.filter((p) => p.category === params.category);
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

  getProduct: async (id) => {
    await delay(300);
    const products = getStoredData('products');
    const product = products.find((p) => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  createProduct: async (productData) => {
    await delay(800);
    const products = getStoredData('products');
    const newProduct = {
      id: generateId('PROD'),
      ...productData,
      createdAt: new Date().toISOString(),
    };
    products.push(newProduct);
    saveData('products', products);
    return newProduct;
  },

  updateProduct: async (id, productData) => {
    await delay(800);
    const products = getStoredData('products');
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Product not found');
    }
    products[index] = {
      ...products[index],
      ...productData,
      updatedAt: new Date().toISOString(),
    };
    saveData('products', products);
    return products[index];
  },

  deleteProduct: async (id) => {
    await delay(500);
    const products = getStoredData('products');
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) {
      throw new Error('Product not found');
    }
    saveData('products', filtered);
    return { success: true };
  },

  // ========== Supplier Products ==========
  getSupplierProducts: async (supplierId, params = {}) => {
    await delay(500);
    const supplierProducts = getStoredData('supplierProducts');
    let filtered = supplierProducts.filter((sp) => sp.supplierId === supplierId);

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      const products = getStoredData('products');
      filtered = filtered.filter((sp) => {
        const product = products.find((p) => p.id === sp.productId);
        return product?.name?.toLowerCase().includes(searchTerm);
      });
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

  getProductSuppliers: async (productId) => {
    await delay(500);
    const supplierProducts = getStoredData('supplierProducts');
    const suppliers = getStoredData('suppliers');
    const products = getStoredData('products');
    
    const product = products.find((p) => p.id === productId);
    const relatedSPs = supplierProducts.filter((sp) => sp.productId === productId);
    
    const result = relatedSPs.map((sp) => {
      const supplier = suppliers.find((s) => s.id === sp.supplierId);
      return {
        ...sp,
        supplierName: supplier?.name,
        productName: product?.name,
      };
    });

    const prices = result.map((r) => parseFloat(r.price) || 0);
    return {
      suppliers: result,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgPrice:
        prices.length > 0
          ? prices.reduce((sum, p) => sum + p, 0) / prices.length
          : 0,
    };
  },

  createSupplierProduct: async (supplierProductData) => {
    await delay(800);
    const supplierProducts = getStoredData('supplierProducts');
    const existing = supplierProducts.find(
      (sp) =>
        sp.supplierId === supplierProductData.supplierId &&
        sp.productId === supplierProductData.productId
    );
    if (existing) {
      throw new Error('This product already exists for this supplier');
    }
    const newSP = {
      id: generateId('SUPPROD'),
      ...supplierProductData,
      price: parseFloat(supplierProductData.price) || 0,
      createdAt: new Date().toISOString(),
    };
    supplierProducts.push(newSP);
    saveData('supplierProducts', supplierProducts);
    return newSP;
  },

  updateSupplierProduct: async (id, supplierProductData) => {
    await delay(800);
    const supplierProducts = getStoredData('supplierProducts');
    const index = supplierProducts.findIndex((sp) => sp.id === id);
    if (index === -1) {
      throw new Error('Supplier Product not found');
    }
    supplierProducts[index] = {
      ...supplierProducts[index],
      ...supplierProductData,
      price: parseFloat(supplierProductData.price) || supplierProducts[index].price,
      updatedAt: new Date().toISOString(),
    };
    saveData('supplierProducts', supplierProducts);
    return supplierProducts[index];
  },

  deleteSupplierProduct: async (id) => {
    await delay(500);
    const supplierProducts = getStoredData('supplierProducts');
    const filtered = supplierProducts.filter((sp) => sp.id !== id);
    if (filtered.length === supplierProducts.length) {
      throw new Error('Supplier Product not found');
    }
    saveData('supplierProducts', filtered);
    return { success: true };
  },

  // ========== Standard Prices ==========
  getStandardPrices: async (params = {}) => {
    await delay(500);
    const standardPrices = getStoredData('standardPrices');
    let filtered = [...standardPrices];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      const products = getStoredData('products');
      filtered = filtered.filter((sp) => {
        const product = products.find((p) => p.id === sp.productId);
        return product?.name?.toLowerCase().includes(searchTerm);
      });
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

  getStandardPrice: async (productId) => {
    await delay(300);
    const standardPrices = getStoredData('standardPrices');
    return standardPrices.find((sp) => sp.productId === productId) || null;
  },

  createOrUpdateStandardPrice: async (standardPriceData) => {
    await delay(800);
    const standardPrices = getStoredData('standardPrices');
    const existingIndex = standardPrices.findIndex(
      (sp) => sp.productId === standardPriceData.productId
    );

    const standardPrice = {
      id: existingIndex >= 0 ? standardPrices[existingIndex].id : generateId('STD'),
      productId: standardPriceData.productId,
      price: parseFloat(standardPriceData.price) || 0,
      calculationMethod: standardPriceData.calculationMethod || 'manual',
      allowedVariance: parseFloat(standardPriceData.allowedVariance) || 0,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      standardPrices[existingIndex] = standardPrice;
    } else {
      standardPrice.createdAt = new Date().toISOString();
      standardPrices.push(standardPrice);
    }

    saveData('standardPrices', standardPrices);
    return standardPrice;
  },

  // ========== Custodies ==========
  getCustodies: async (params = {}) => {
    await delay(500);
    const custodies = getStoredData('custodies');
    let filtered = [...custodies];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.custodyNumber?.toLowerCase().includes(searchTerm) ||
          c.title?.toLowerCase().includes(searchTerm) ||
          c.employeeName?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.status) {
      filtered = filtered.filter((c) => c.status === params.status);
    }

    if (params.employeeId) {
      filtered = filtered.filter((c) => c.employeeId === params.employeeId);
    }

    if (params.dateFrom) {
      filtered = filtered.filter((c) => c.issueDate >= params.dateFrom);
    }

    if (params.dateTo) {
      filtered = filtered.filter((c) => c.issueDate <= params.dateTo);
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

  getCustody: async (id) => {
    await delay(300);
    const custodies = getStoredData('custodies');
    const custody = custodies.find((c) => c.id === id);
    if (!custody) {
      throw new Error('Custody not found');
    }
    return custody;
  },

  createCustody: async (custodyData) => {
    await delay(800);
    const custodies = getStoredData('custodies');
    const custodyNumber = `CST-${new Date().getFullYear()}-${String(custodies.length + 1).padStart(4, '0')}`;
    const amount = parseFloat(custodyData.amount) || 0;
    const newCustody = {
      id: generateId('CST'),
      custodyNumber,
      ...custodyData,
      amount,
      spentAmount: 0, // Track spent amount
      remainingAmount: amount, // Track remaining amount
      status: 'Issued',
      issueDate: custodyData.issueDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    custodies.push(newCustody);
    saveData('custodies', custodies);
    return newCustody;
  },

  updateCustody: async (id, custodyData) => {
    await delay(800);
    const custodies = getStoredData('custodies');
    const index = custodies.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Custody not found');
    }
    custodies[index] = {
      ...custodies[index],
      ...custodyData,
      amount: custodyData.amount !== undefined ? parseFloat(custodyData.amount) : custodies[index].amount,
      updatedAt: new Date().toISOString(),
    };
    saveData('custodies', custodies);
    return custodies[index];
  },

  closeCustody: async (id) => {
    await delay(500);
    const custodies = getStoredData('custodies');
    const index = custodies.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Custody not found');
    }
    custodies[index].status = 'Closed';
    custodies[index].closedAt = new Date().toISOString();
    saveData('custodies', custodies);
    return custodies[index];
  },

  // ========== Custody Clearance ==========
  getCustodyClearances: async (params = {}) => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    let filtered = [...clearances];

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(
        (cc) =>
          cc.clearanceNumber?.toLowerCase().includes(searchTerm) ||
          cc.custodyNumber?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.status) {
      filtered = filtered.filter((cc) => cc.status === params.status);
    }

    if (params.custodyId) {
      filtered = filtered.filter((cc) => cc.custodyId === params.custodyId);
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

  getCustodyClearance: async (id) => {
    await delay(300);
    const clearances = getStoredData('custodyClearances');
    const clearance = clearances.find((cc) => cc.id === id);
    if (!clearance) {
      throw new Error('Custody Clearance not found');
    }
    return clearance;
  },

  createCustodyClearance: async (clearanceData) => {
    await delay(800);
    const clearances = getStoredData('custodyClearances');
    const clearanceNumber = `CC-${new Date().getFullYear()}-${String(clearances.length + 1).padStart(4, '0')}`;
    
    // Calculate totals and price comparisons
    const items = clearanceData.items || [];
    const processedItems = items.map((item) => {
      const supplierProduct = getStoredData('supplierProducts').find(
        (sp) => sp.id === item.supplierProductId
      );
      const standardPrice = getStoredData('standardPrices').find(
        (sp) => sp.productId === item.productId
      );

      const enteredPrice = parseFloat(item.price) || 0;
      const supplierPrice = parseFloat(supplierProduct?.price) || 0;
      const standardPriceValue = parseFloat(standardPrice?.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const total = enteredPrice * quantity;

      const priceDiffFromSupplier = enteredPrice - supplierPrice;
      const priceDiffFromStandard = enteredPrice - standardPriceValue;
      const priceDiffPercentFromSupplier =
        supplierPrice > 0 ? ((priceDiffFromSupplier / supplierPrice) * 100).toFixed(2) : 0;
      const priceDiffPercentFromStandard =
        standardPriceValue > 0 ? ((priceDiffFromStandard / standardPriceValue) * 100).toFixed(2) : 0;

      // Check variance
      const allowedVariance = parseFloat(standardPrice?.allowedVariance) || 0;
      const isWithinVariance = Math.abs(parseFloat(priceDiffPercentFromStandard)) <= allowedVariance;
      const needsApproval = !isWithinVariance || enteredPrice > supplierPrice;

      return {
        ...item,
        productId: item.productId,
        supplierId: item.supplierId,
        supplierProductId: item.supplierProductId,
        quantity,
        price: enteredPrice,
        total,
        supplierPrice,
        standardPrice: standardPriceValue,
        priceDiffFromSupplier,
        priceDiffFromStandard,
        priceDiffPercentFromSupplier: parseFloat(priceDiffPercentFromSupplier),
        priceDiffPercentFromStandard: parseFloat(priceDiffPercentFromStandard),
        isWithinVariance,
        needsApproval,
        itemStatus: 'Pending',
      };
    });

    const totalAmount = processedItems.reduce((sum, item) => sum + (item.total || 0), 0);

    const newClearance = {
      id: generateId('CC'),
      clearanceNumber,
      custodyId: clearanceData.custodyId,
      clearanceDate: clearanceData.clearanceDate || new Date().toISOString().split('T')[0],
      items: processedItems,
      totalAmount,
      status: 'Draft',
      notes: clearanceData.notes || '',
      createdAt: new Date().toISOString(),
    };

    clearances.push(newClearance);
    saveData('custodyClearances', clearances);
    return newClearance;
  },

  updateCustodyClearance: async (id, clearanceData) => {
    await delay(800);
    const clearances = getStoredData('custodyClearances');
    const index = clearances.findIndex((cc) => cc.id === id);
    if (index === -1) {
      throw new Error('Custody Clearance not found');
    }

    // Recalculate if items changed
    if (clearanceData.items) {
      const items = clearanceData.items;
      const processedItems = items.map((item) => {
        const supplierProduct = getStoredData('supplierProducts').find(
          (sp) => sp.id === item.supplierProductId
        );
        const standardPrice = getStoredData('standardPrices').find(
          (sp) => sp.productId === item.productId
        );

        const enteredPrice = parseFloat(item.price) || 0;
        const supplierPrice = parseFloat(supplierProduct?.price) || 0;
        const standardPriceValue = parseFloat(standardPrice?.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const total = enteredPrice * quantity;

        const priceDiffFromSupplier = enteredPrice - supplierPrice;
        const priceDiffFromStandard = enteredPrice - standardPriceValue;
        const priceDiffPercentFromSupplier =
          supplierPrice > 0 ? ((priceDiffFromSupplier / supplierPrice) * 100).toFixed(2) : 0;
        const priceDiffPercentFromStandard =
          standardPriceValue > 0 ? ((priceDiffFromStandard / standardPriceValue) * 100).toFixed(2) : 0;

        const allowedVariance = parseFloat(standardPrice?.allowedVariance) || 0;
        const isWithinVariance = Math.abs(parseFloat(priceDiffPercentFromStandard)) <= allowedVariance;
        const needsApproval = !isWithinVariance || enteredPrice > supplierPrice;

        return {
          ...item,
          quantity,
          price: enteredPrice,
          total,
          supplierPrice,
          standardPrice: standardPriceValue,
          priceDiffFromSupplier,
          priceDiffFromStandard,
          priceDiffPercentFromSupplier: parseFloat(priceDiffPercentFromSupplier),
          priceDiffPercentFromStandard: parseFloat(priceDiffPercentFromStandard),
          isWithinVariance,
          needsApproval,
          itemStatus: item.itemStatus || 'Pending',
        };
      });

      const totalAmount = processedItems.reduce((sum, item) => sum + (item.total || 0), 0);
      clearanceData.items = processedItems;
      clearanceData.totalAmount = totalAmount;
    }

    clearances[index] = {
      ...clearances[index],
      ...clearanceData,
      updatedAt: new Date().toISOString(),
    };
    saveData('custodyClearances', clearances);
    return clearances[index];
  },

  approveClearanceItem: async (clearanceId, itemId, approvedPrice = null) => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    const clearance = clearances.find((cc) => cc.id === clearanceId);
    if (!clearance) {
      throw new Error('Custody Clearance not found');
    }

    const item = clearance.items.find((item) => item.id === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (approvedPrice !== null) {
      item.price = parseFloat(approvedPrice);
      item.total = item.price * item.quantity;
      // Recalculate differences
      item.priceDiffFromSupplier = item.price - item.supplierPrice;
      item.priceDiffFromStandard = item.price - item.standardPrice;
    }

    item.itemStatus = 'Approved';
    item.approvedAt = new Date().toISOString();

    saveData('custodyClearances', clearances);
    return clearance;
  },

  rejectClearanceItem: async (clearanceId, itemId, reason = '') => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    const clearance = clearances.find((cc) => cc.id === clearanceId);
    if (!clearance) {
      throw new Error('Custody Clearance not found');
    }

    const item = clearance.items.find((item) => item.id === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    item.itemStatus = 'Rejected';
    item.rejectionReason = reason;
    item.rejectedAt = new Date().toISOString();

    saveData('custodyClearances', clearances);
    return clearance;
  },

  submitCustodyClearance: async (id) => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    const index = clearances.findIndex((cc) => cc.id === id);
    if (index === -1) {
      throw new Error('Custody Clearance not found');
    }
    clearances[index].status = 'Under Review';
    saveData('custodyClearances', clearances);
    return clearances[index];
  },

  approveCustodyClearance: async (id) => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    const index = clearances.findIndex((cc) => cc.id === id);
    if (index === -1) {
      throw new Error('Custody Clearance not found');
    }
    clearances[index].status = 'Approved';
    clearances[index].approvedAt = new Date().toISOString();
    saveData('custodyClearances', clearances);
    return clearances[index];
  },

  rejectCustodyClearance: async (id, reason = '') => {
    await delay(500);
    const clearances = getStoredData('custodyClearances');
    const index = clearances.findIndex((cc) => cc.id === id);
    if (index === -1) {
      throw new Error('Custody Clearance not found');
    }
    clearances[index].status = 'Rejected';
    clearances[index].rejectionReason = reason;
    clearances[index].rejectedAt = new Date().toISOString();
    saveData('custodyClearances', clearances);
    return clearances[index];
  },

  // ========== Dashboard Stats ==========
  getDashboardStats: async () => {
    await delay(500);
    const suppliers = getStoredData('suppliers');
    const custodies = getStoredData('custodies');
    const clearances = getStoredData('custodyClearances');
    const products = getStoredData('products');
    const standardPrices = getStoredData('standardPrices');

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthCustodies = custodies.filter((c) => c.issueDate?.startsWith(currentMonth));
    const currentMonthClearances = clearances.filter((c) =>
      c.clearanceDate?.startsWith(currentMonth)
    );

    const totalIssuedThisMonth = currentMonthCustodies.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );
    const totalClearedThisMonth = currentMonthClearances
      .filter((c) => c.status === 'Approved')
      .reduce((sum, c) => sum + (parseFloat(c.totalAmount) || 0), 0);

    const openCustodies = custodies.filter((c) => c.status === 'Issued').length;

    // Price variance alerts
    const varianceAlerts = clearances.filter((cc) => {
      return cc.items?.some(
        (item) =>
          item.needsApproval &&
          (item.itemStatus === 'Pending' || item.itemStatus === 'Under Review')
      );
    }).length;

    return {
      totalSuppliers: suppliers.filter((s) => s.status === 'Active').length,
      totalProducts: products.length,
      totalStandardPrices: standardPrices.length,
      totalIssuedThisMonth: totalIssuedThisMonth.toFixed(2),
      totalClearedThisMonth: totalClearedThisMonth.toFixed(2),
      openCustodies,
      priceVarianceAlerts: varianceAlerts,
      openPRs: 0, // Deprecated
      openPOs: 0, // Deprecated
      pendingInvoices: 0, // Deprecated
    };
  },
};

