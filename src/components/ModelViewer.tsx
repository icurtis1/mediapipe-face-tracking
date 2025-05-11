import React, { useState, useEffect } from 'react';

interface ModelViewerProps {
  modelPath: string;
  width?: number;
  height?: number;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ 
  modelPath, 
  width = 400, 
  height = 400 
}) => {
  const [modelUrl, setModelUrl] = useState<string>(modelPath);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkModelExists = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(modelPath, { method: 'HEAD' });
        
        if (!response.ok) {
          setError(`Model file could not be loaded: ${response.status}`);
        } else {
          setError(null);
        }
      } catch (err) {
        setError('Error checking model file');
        console.error('Error checking model file:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkModelExists();
  }, [modelPath]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="animate-pulse text-center">
          <p>Loading model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 p-4 rounded-lg" style={{ width, height }}>
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading model</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2">
            Make sure you've uploaded your .glb file to the public/models directory
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      <model-viewer
        src={modelUrl}
        alt="3D model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: '100%', height: '100%' }}
      ></model-viewer>
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-70 px-2 py-1 rounded text-xs">
        {modelPath.split('/').pop()}
      </div>
    </div>
  );
};

export default ModelViewer;