import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import FaceMeshView from './components/FaceMeshView';

function App() {
  const [isCdnAvailable, setIsCdnAvailable] = useState(true);
  const [isCheckingCdn, setIsCheckingCdn] = useState(true);

  // Check CDN availability on component mount
  useEffect(() => {
    const checkCdnAvailability = async () => {
      setIsCheckingCdn(true);
      try {
        // Check the MediaPipe face mesh file availability
        const faceMeshResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
          { method: 'HEAD' }
        );
        
        // Check the camera utils file availability
        const cameraResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          { method: 'HEAD' }
        );
        
        // Check the drawing utils file availability
        const drawingResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          { method: 'HEAD' }
        );
        
        setIsCdnAvailable(faceMeshResponse.ok && cameraResponse.ok && drawingResponse.ok);
      } catch (error) {
        console.error('Error checking CDN availability:', error);
        setIsCdnAvailable(false);
      } finally {
        setIsCheckingCdn(false);
      }
    };

    checkCdnAvailability();
    
    // Check availability periodically
    const intervalId = setInterval(checkCdnAvailability, 60000); // every minute
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white text-gray-800 p-3 shadow-sm border-b border-gray-100">
        <div className="container mx-auto flex items-center">
          <div className="flex items-center space-x-2">
            <Camera size={18} className="text-gray-600" />
            <h1 className="text-lg font-medium">Face Landmark</h1>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto flex-1 p-4 flex flex-col items-center justify-center">
        {!isCheckingCdn && !isCdnAvailable && (
          <div className="w-full max-w-2xl mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start">
            <div>
              <p className="text-sm">
                We're having trouble connecting to the required resources. Please check your internet connection.
              </p>
            </div>
          </div>
        )}
        
        <div className="overflow-hidden rounded-md">
          <FaceMeshView />
        </div>
      </main>
    </div>
  );
}

export default App;