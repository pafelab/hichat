import React, { useState } from 'react';
import { getFullFaceDescription } from '../faceService';

const UploadView: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    setLogs([]);

    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        addLog(`Processing ${file.name}...`);

        // 1. Detect faces locally
        const detections = await getFullFaceDescription(file);

        if (detections.length === 0) {
            addLog(`No faces found in ${file.name}, skipping.`);
            continue;
        }

        addLog(`Found ${detections.length} faces in ${file.name}. Uploading...`);

        // 2. Prepare data
        const descriptors = detections.map(d => Array.from(d.descriptor));
        const formData = new FormData();
        formData.append('file', file);
        formData.append('descriptors', JSON.stringify(descriptors));

        // 3. Upload
        const response = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
            addLog(`Successfully uploaded ${file.name}`);
        } else {
            addLog(`Failed to upload ${file.name}`);
        }

      } catch (err) {
        console.error(err);
        addLog(`Error processing ${file.name}`);
      }
    }

    setUploading(false);
    addLog('Done!');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Photos (Indexing)</h2>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-900">
           Select photos to add to the gallery
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFiles}
          disabled={uploading}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none"
        />
      </div>

      <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
        {logs.map((log, i) => <div key={i}>{log}</div>)}
        {uploading && <div className="text-blue-500">Processing...</div>}
      </div>
    </div>
  );
};

export default UploadView;
