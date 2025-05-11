# MediaPipe Face Landmark Detection

A real-time face landmark detection application built with React, TypeScript, and MediaPipe. This project serves as both a standalone application and a robust foundation for building more complex face-driven applications. Whether you're looking to implement basic facial tracking or create advanced face-driven experiences, this codebase provides the essential building blocks.

<img src="./public/media/demo.gif" alt="Demo" width="800" />

## Features

- 🎯 Real-time face detection and landmark tracking
- 🕸️ Face mesh visualization with customizable styles
- 📹 Webcam integration with permission handling
- 🔄 Automatic CDN availability checking
- ⚡ Built with performance in mind
- 🎨 Clean, modern UI with Tailwind CSS

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety and better developer experience
- **MediaPipe** - ML-powered face detection and landmark tracking
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Next-generation frontend tooling

## About MediaPipe

[MediaPipe](https://developers.google.com/mediapipe) is Google's open-source framework for building multimodal (e.g. video, audio, etc.), cross platform (e.g. Android, iOS, web, edge devices) applied ML pipelines. This project specifically uses:

- **Face Mesh** - Estimates 468 3D face landmarks in real-time
- **Camera Utils** - Handles camera input and processing
- **Drawing Utils** - Provides utilities for rendering landmarks and connections

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mediapipe-face-landmark.git
   cd mediapipe-face-landmark
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/         # React components
│   ├── CameraPermission.tsx
│   ├── FaceMeshView.tsx
│   └── ModelViewer.tsx
├── hooks/             # Custom React hooks
│   ├── useFaceLandmarker.ts
│   └── useFaceMesh.ts
├── App.tsx           # Main application component
└── main.tsx         # Application entry point
```

## How It Works

1. **Camera Access**: The application requests camera permission and initializes the webcam feed.

2. **Face Detection**: MediaPipe's Face Mesh model processes each video frame to detect faces.

3. **Landmark Detection**: For each detected face, 468 landmarks are identified.

4. **Visualization**: The landmarks and connections are rendered on a canvas overlay:
   - Face mesh tesselation (light gray)
   - Eyes and eyebrows (red/green)
   - Face oval (white)
   - Lips (pink)

5. **Real-time Updates**: The process continues in real-time, updating the visualization with each new video frame.

## Performance Considerations

- GPU acceleration when available
- Efficient canvas rendering
- Automatic resource cleanup
- CDN availability monitoring
- Error handling and recovery

## Building on This Project

This codebase is designed to be a springboard for more sophisticated face-driven applications. Here are some potential extensions:

<img src="./public/media/example.gif" alt="Example" width="800" />

- **3D Face Effects**: Use the detected landmarks to drive morph targets (blendshapes) on 3D character models
- **Face Filters**: Create Snapchat-style AR filters using the precise landmark data
- **Expression Recognition**: Analyze landmark positions to detect facial expressions
- **Virtual Try-On**: Build virtual makeup or accessory try-on experiences
- **Motion Capture**: Use facial movements to animate 3D characters in real-time
- **Interactive Art**: Create artistic visualizations that respond to facial movements

Test out this creative site I built which uses face tracking [HERE](https://the-vibez.netlify.app)

## Browser Support

This application works best in modern browsers that support:
- WebGL
- WebAssembly
- `getUserMedia` API
- Canvas API

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) for their excellent ML tools
- [React](https://reactjs.org/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for the build tool