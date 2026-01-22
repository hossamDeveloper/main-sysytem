import { Routes, Route, Navigate } from 'react-router-dom';
import { PurchasingLayout } from './PurchasingLayout';
import { PurchasingDashboard } from './PurchasingDashboard';
import { Suppliers } from './Suppliers';
import { Products } from './Products';
import { Custodies } from './Custodies';
import { PurchaseOrders } from './PurchaseOrders';
import { GoodsReceipt } from './GoodsReceipt';
import { Invoices } from './Invoices';

export function PurchasingModule() {
  return (
    <Routes>
      <Route element={<PurchasingLayout />}>
        <Route index element={<PurchasingDashboard />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="products" element={<Products />} />
        <Route path="custodies" element={<Custodies />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="goods-receipt" element={<GoodsReceipt />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="*" element={<Navigate to="/purchasing" replace />} />
      </Route>
    </Routes>
  );
}

