import { useRef, useState, useEffect, useCallback } from 'react';

// Import types so TypeScript doesn't complain
interface FaceLandmarkerResult {
  faceLandmarks: any[];
  faceBlendshapes?: any[];
  facialTransformationMatrixes?: any[];
}

interface FaceLandmarkerOptions {
  baseOptions: {
    modelAssetPath: string;
    delegate: 'GPU' | 'CPU';
  };
  runningMode: 'IMAGE' | 'VIDEO';
  outputFaceBlendshapes?: boolean;
  numFaces?: number;
  minFaceDetectionConfidence?: number;
  minFacePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

interface UseFaceLandmarkerOptions {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onError?: (error: Error) => void;
}

export interface FaceLandmarkerState {
  isReady: boolean;
  isRunning: boolean;
  error: string | null;
  cdnAvailable: boolean;
}

// Create a global promise to avoid multiple instances trying to load the same modules
let visionPromise: Promise<any> | null = null;

export const useFaceLandmarker = ({ 
  videoElement, 
  canvasElement, 
  onLoadingStateChange,
  onError
}: UseFaceLandmarkerOptions) => {
  const faceLandmarkerRef = useRef<any>(null);
  const drawingUtilsRef = useRef<any>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const initializingRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const [state, setState] = useState<FaceLandmarkerState>({
    isReady: false,
    isRunning: false,
    error: null,
    cdnAvailable: true
  });

  // Check CDN availability
  const checkCdnAvailability = useCallback(async () => {
    try {
      const wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_wasm_internal.js';
      const modelPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
      
      // Try to fetch both the WASM and model files
      const results = await Promise.all([
        fetch(wasmPath, { method: 'HEAD' }),
        fetch(modelPath, { method: 'HEAD' })
      ]);
      
      const available = results.every(r => r.ok);
      setState(prev => ({ ...prev, cdnAvailable: available }));
      return available;
    } catch (error) {
      console.error('Error checking CDN availability:', error);
      setState(prev => ({ ...prev, cdnAvailable: false }));
      return false;
    }
  }, []);

  // Initialize vision module
  const initVisionModule = useCallback(async () => {
    if (!state.cdnAvailable) {
      throw new Error('MediaPipe CDN is not available. Please check your internet connection.');
    }

    try {
      // Load the vision module if not already loaded
      if (!visionPromise) {
        if (typeof window !== 'undefined') {
          // Check if the vision module is available from a global script tag
          if (window.vision) {
            return window.vision;
          }
          
          console.log("Importing vision module");
          visionPromise = import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');
        } else {
          throw new Error('Cannot load vision module: window is not defined');
        }
      }
      
      const vision = await visionPromise;
      return vision.default || vision;
    } catch (error) {
      console.error('Failed to load vision module:', error);
      throw new Error('Failed to load the MediaPipe vision module. Please check your internet connection.');
    }
  }, [state.cdnAvailable]);

  // Initialize FaceLandmarker
  const initFaceLandmarker = useCallback(async () => {
    if (!canvasElement || initializingRef.current) return;
    
    try {
      // Set flag to prevent concurrent initialization
      initializingRef.current = true;
      console.log("Initializing FaceLandmarker");
      
      // Check CDN availability first
      const isCdnAvailable = await checkCdnAvailability();
      if (!isCdnAvailable) {
        throw new Error('MediaPipe CDN is not available. Please check your internet connection.');
      }
      
      // Load the vision module
      const vision = await initVisionModule();
      
      // Get the required classes
      const { FaceLandmarker, DrawingUtils, FilesetResolver } = vision;
      
      // Store DrawingUtils for later use
      drawingUtilsRef.current = DrawingUtils;
      
      // Resolve the vision tasks
      console.log("Resolving FilesetResolver");
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      // Create the FaceLandmarker instance
      console.log("Creating FaceLandmarker");
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
      
      setState(prev => ({ ...prev, isReady: true, error: null }));
      console.log("FaceLandmarker initialized successfully");
    } catch (error) {
      console.error('Error initializing FaceLandmarker:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize face detection';
      setState(prev => ({ ...prev, error: errorMessage }));
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      initializingRef.current = false;
    }
  }, [canvasElement, checkCdnAvailability, initVisionModule, onError]);

  // Function to handle frame processing
  const processVideoFrame = useCallback(async () => {
    if (!videoElement || !canvasElement || !faceLandmarkerRef.current || !state.isRunning) return;
    
    try {
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;
      
      // Only process new frames
      if (lastVideoTimeRef.current !== videoElement.currentTime) {
        lastVideoTimeRef.current = videoElement.currentTime;
        
        // Ensure canvas dimensions match video
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // Mirror the canvas to match the mirrored video feed
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvasElement.width, 0);
        
        // Detect landmarks
        const startTimeMs = performance.now();
        
        // Ensure video is ready
        if (videoElement.readyState >= 2) {
          const results = faceLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);
          
          // Draw landmarks if available
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const vision = await initVisionModule();
            const { FaceLandmarker } = vision;
            const DrawingUtils = drawingUtilsRef.current;
            const drawingUtils = new DrawingUtils(ctx);
            
            for (const landmarks of results.faceLandmarks) {
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                { color: "#C0C0C070", lineWidth: 0.5 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                { color: "#FF3030", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
                { color: "#30FF30", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                { color: "#FF3030", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
                { color: "#30FF30", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                { color: "#E0E0E0", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_LIPS,
                { color: "#FF9090", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
                { color: "#FF3030", lineWidth: 1 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
                { color: "#30FF30", lineWidth: 1 }
              );
            }
          }
        }
        
        // Restore the canvas context
        ctx.restore();
      }
      
      // Continue the detection loop
      if (state.isRunning) {
        animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);
      }
    } catch (error) {
      console.error('Error in detection loop:', error);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      setState(prev => ({ 
        ...prev, 
        isRunning: false,
        error: error instanceof Error ? error.message : 'Error in face detection loop'
      }));
      if (onError) onError(error instanceof Error ? error : new Error('Error in face detection loop'));
    }
  }, [videoElement, canvasElement, state.isRunning, initVisionModule, onError]);

  // Start face detection
  const startFaceLandmarker = useCallback(async () => {
    if (!videoElement || !canvasElement || !state.isReady || state.isRunning || startingRef.current) return;
    
    try {
      // Set flag to prevent concurrent starts
      startingRef.current = true;
      if (onLoadingStateChange) onLoadingStateChange(true);
      
      console.log("Starting face detection");
      
      // Start the detection loop
      setState(prev => ({ ...prev, isRunning: true, error: null }));
      
      // Start the frame processing loop
      animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);
      
    } catch (error) {
      console.error('Error starting face detection:', error);
      setState(prev => ({ 
        ...prev, 
        isRunning: false,
        error: error instanceof Error ? error.message : 'Failed to start face detection'
      }));
      if (onError) onError(error instanceof Error ? error : new Error('Failed to start face detection'));
    } finally {
      startingRef.current = false;
      if (onLoadingStateChange) onLoadingStateChange(false);
    }
  }, [videoElement, canvasElement, state.isReady, state.isRunning, processVideoFrame, onLoadingStateChange, onError]);

  // Stop face detection
  const stopFaceLandmarker = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Initialize when component mounts and monitor CDN availability
  useEffect(() => {
    // Check CDN availability immediately and then at intervals
    checkCdnAvailability();
    
    // Check CDN availability periodically (every 30 seconds)
    const interval = setInterval(checkCdnAvailability, 30000);
    
    return () => {
      clearInterval(interval);
      stopFaceLandmarker();
    };
  }, [checkCdnAvailability, stopFaceLandmarker]);

  // Initialize FaceLandmarker when video and canvas elements are available
  useEffect(() => {
    if (videoElement && canvasElement && !state.isReady && !initializingRef.current) {
      initFaceLandmarker();
    }
  }, [videoElement, canvasElement, initFaceLandmarker, state.isReady]);

  return {
    state,
    startFaceLandmarker,
    stopFaceLandmarker,
    checkCdnAvailability
  };
};