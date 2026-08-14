// src/pages/adminAsst/components/InventoryList.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, Trash2, Package, AlertCircle } from 'lucide-react';

interface InventoryListProps {
  inventory: any[];
  onAddInventory: () => void;
  onDeleteItem: (id: string) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({
  inventory,
  onAddInventory,
  onDeleteItem,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inventory Items</h3>
        <button
          onClick={onAddInventory}
          className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-all flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {inventory?.map((item: any) => {
        const remaining = (item.quantity_added || 0) - (item.quantity_distributed || 0);
        const isLow = remaining <= (item.minimum_stock || 0);
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 ${
              isLow ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {item.item_name}
                  </span>
                  {isLow && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" />
                      Low Stock
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{item.category}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 dark:text-gray-300">Remaining: <strong>{remaining}</strong></span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500 dark:text-gray-400">Min: {item.minimum_stock || 0}</span>
                </div>
              </div>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      })}
      {(!inventory || inventory.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No inventory items found</div>
      )}
    </div>
  );
};

export default InventoryList;
