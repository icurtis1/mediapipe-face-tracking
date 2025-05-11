import React from 'react';
import { Camera } from 'lucide-react';

interface CameraPermissionProps {
  onRequestAccess: () => void;
}

const CameraPermission: React.FC<CameraPermissionProps> = ({ onRequestAccess }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-md text-center">
      <Camera size={32} className="text-gray-600 mb-4" />
      
      <h2 className="text-lg font-medium text-gray-800 mb-2">Camera Access Required</h2>
      
      <button
        onClick={onRequestAccess}
        className="px-4 py-2 bg-gray-800 text-white font-medium rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
      >
        Allow Camera
      </button>
    </div>
  );
};

export default CameraPermission;