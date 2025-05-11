import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { 
  FACEMESH_TESSELATION, 
  FACEMESH_RIGHT_EYE, 
  FACEMESH_LEFT_EYE, 
  FACEMESH_RIGHT_EYEBROW, 
  FACEMESH_LEFT_EYEBROW, 
  FACEMESH_FACE_OVAL, 
  FACEMESH_LIPS 
} from '@mediapipe/face_mesh';

interface UseFaceMeshOptions {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

export interface FaceMeshState {
  isReady: boolean;
  isRunning: boolean;
  error: string | null;
}

export const useFaceMesh = ({ videoElement, canvasElement, onLoadingStateChange }: UseFaceMeshOptions) => {
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<faceMesh.FaceMesh | null>(null);
  const initializingRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  
  const [state, setState] = useState<FaceMeshState>({
    isReady: false,
    isRunning: false,
    error: null
  });

  // Handle results from face mesh
  const onResults = useCallback((results: faceMesh.Results) => {
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Save the current context state
    ctx.save();
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Mirror the canvas to match the mirrored video feed
    ctx.scale(-1, 1);
    ctx.translate(-canvasElement.width, 0);
    
    // Only draw landmarks when we have results
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      for (const landmarks of results.multiFaceLandmarks) {
        // Draw the face mesh tesselation with minimal prominence
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: 'rgba(192, 192, 192, 0.2)', lineWidth: 0.5 });
        
        // Draw facial features with thin lines and transparency
        drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: 'rgba(255, 48, 48, 0.5)', lineWidth: 1 });
        drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: 'rgba(255, 48, 48, 0.5)', lineWidth: 1 });
        drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: 'rgba(48, 255, 48, 0.5)', lineWidth: 1 });
        drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYEBROW, { color: 'rgba(48, 255, 48, 0.5)', lineWidth: 1 });
        drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: 'rgba(224, 224, 224, 0.5)', lineWidth: 1 });
        drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: 'rgba(255, 128, 128, 0.5)', lineWidth: 1 });
        
        // Draw smaller, semi-transparent landmark points
        drawLandmarks(ctx, landmarks, { color: 'rgba(48, 112, 255, 0.5)', lineWidth: 0.5, radius: 1 });
      }
    }

    // Restore context to remove transformations
    ctx.restore();
  }, [canvasElement]);

  // Initialize the face mesh
  const initFaceMesh = useCallback(async () => {
    if (!videoElement || !canvasElement || initializingRef.current) return;
    
    try {
      // Set flag to prevent concurrent initialization
      initializingRef.current = true;
      console.log("Initializing FaceMesh");
      
      // Initialize face mesh instance if not already created
      if (!faceMeshRef.current) {
        faceMeshRef.current = new faceMesh.FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        faceMeshRef.current.onResults(onResults);
      }

      setState(prev => ({ ...prev, isReady: true, error: null }));
    } catch (error) {
      console.error('Error initializing face mesh:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize face detection'
      }));
    } finally {
      initializingRef.current = false;
    }
  }, [videoElement, canvasElement, onResults]);

  // Start the camera and face mesh
  const startFaceMesh = useCallback(async () => {
    if (!videoElement || !canvasElement || state.isRunning || startingRef.current) return;
    
    try {
      // Set flag to prevent concurrent starts
      startingRef.current = true;
      if (onLoadingStateChange) onLoadingStateChange(true);
      
      // Initialize face mesh if needed
      if (!state.isReady) {
        await initFaceMesh();
      }
      
      // Wait a moment to ensure video is fully loaded and ready
      const waitForVideo = () => {
        return new Promise<void>((resolve) => {
          if (videoElement.readyState >= 2) {
            resolve();
          } else {
            const handler = () => {
              videoElement.removeEventListener('loadeddata', handler);
              resolve();
            };
            videoElement.addEventListener('loadeddata', handler);
          }
        });
      };
      
      await waitForVideo();
      
      // Initialize camera if not already created
      if (!cameraRef.current) {
        console.log("Creating camera instance");
        cameraRef.current = new Camera(videoElement, {
          onFrame: async () => {
            if (faceMeshRef.current && videoElement) {
              try {
                await faceMeshRef.current.send({ image: videoElement });
              } catch (error) {
                console.error("Error sending frame to facemesh:", error);
              }
            }
          },
          width: 640,
          height: 480
        });
      }
      
      console.log("Starting camera");
      await cameraRef.current.start();
      setState(prev => ({ ...prev, isRunning: true, error: null }));
      console.log("Camera started successfully");
    } catch (error) {
      console.error('Error starting camera:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start camera'
      }));
    } finally {
      startingRef.current = false;
      if (onLoadingStateChange) onLoadingStateChange(false);
    }
  }, [videoElement, canvasElement, state.isReady, state.isRunning, initFaceMesh, onLoadingStateChange]);

  // Stop the camera and face mesh
  const stopFaceMesh = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Clean up resources
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, []);

  // Initialize face mesh when video element is available
  useEffect(() => {
    if (videoElement && canvasElement && !state.isReady && !initializingRef.current) {
      initFaceMesh();
    }
  }, [videoElement, canvasElement, initFaceMesh, state.isReady]);

  return {
    state,
    startFaceMesh,
    stopFaceMesh
  };
};