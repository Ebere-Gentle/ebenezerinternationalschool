// src/pages/adminAsst/components/CollectionsList.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { HandHelping, Trash2, Plus, Calendar, User, Package } from 'lucide-react';
import dayjs from 'dayjs';

interface CollectionsListProps {
  collections: any[];
  students: any[];
  onAddCollection: () => void;
  onDeleteCollection: (id: string) => void;
}

const CollectionsList: React.FC<CollectionsListProps> = ({
  collections,
  students,
  onAddCollection,
  onDeleteCollection,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Collections</h3>
        <button
          onClick={onAddCollection}
          className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-all flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {collections?.slice(0, 10).map((collection: any) => (
        <motion.div
          key={collection.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {collection.student_name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Package className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{collection.item_name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">×{collection.quantity}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {collection.class_at_collection}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{dayjs(collection.collection_date).format('MMM D, YYYY')}</span>
              </div>
            </div>
            <button
              onClick={() => onDeleteCollection(collection.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
      {(!collections || collections.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No collections found</div>
      )}
    </div>
  );
};

export default CollectionsList;
