import React from 'react';

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  onConfirm?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alert;