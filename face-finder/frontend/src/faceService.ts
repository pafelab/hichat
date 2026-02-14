import * as faceapi from 'face-api.js';

export const loadModels = async () => {
  const MODEL_URL = '/models';
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
};

export const getFullFaceDescription = async (blob: Blob) => {
  // Create an HTMLImageElement from the Blob
  const img = await faceapi.bufferToImage(blob);

  // Detect all faces
  const detections = await faceapi.detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
};

export const getSingleFaceDescription = async (blob: Blob) => {
    const img = await faceapi.bufferToImage(blob);
    const detection = await faceapi.detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
}
