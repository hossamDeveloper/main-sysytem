import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mini-erp-storage';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const readAll = () => {
  if (typeof window === 'undefined') return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const writeAll = (data) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export function useERPStorage(collectionName) {
  const [data, setData] = useState(() => {
    const allData = readAll();
    return allData[collectionName] || [];
  });

  useEffect(() => {
    const allData = readAll();
    allData[collectionName] = data;
    writeAll(allData);
  }, [collectionName, data]);

  const addItem = (item) => {
    setData((prev) => [...prev, item]);
  };

  const updateItem = (id, updatedItem, idField = 'id') => {
    setData((prev) =>
      prev.map((item) => (item[idField] === id ? { ...item, ...updatedItem } : item))
    );
  };

  const deleteItem = (id, idField = 'id') => {
    setData((prev) => prev.filter((item) => item[idField] !== id));
  };

  const replaceAll = (items) => {
    setData(items);
  };

  return {
    data,
    addItem,
    updateItem,
    deleteItem,
    replaceAll,
  };
}

