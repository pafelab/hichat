import React, { useState } from 'react';
import { getSingleFaceDescription } from '../faceService';

interface MatchResult {
  filename: string;
  distance: number;
}

const SearchView: React.FC = () => {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    // Preview
    setPreview(URL.createObjectURL(file));
    setResults([]);
    setError(null);
    setSearching(true);

    try {
      // 1. Detect face
      const detection = await getSingleFaceDescription(file);

      if (!detection) {
        setError("No face detected in the input image. Please try another one.");
        setSearching(false);
        return;
      }

      // 2. Search
      const descriptor = Array.from(detection.descriptor);

      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.matches);
      }

    } catch (err) {
      console.error(err);
      setError("An error occurred during search.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Find My Photos</h2>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-900">
           Upload a selfie to find matching photos
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
        />
      </div>

      {preview && (
        <div className="mb-6 text-center">
            <img src={preview} alt="Query" className="h-32 mx-auto rounded-full object-cover border-4 border-blue-500" />
            <p className="text-sm text-gray-500 mt-2">Scanning this face...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          {error}
        </div>
      )}

      {searching && <div className="text-center text-blue-600 animate-pulse">Searching the database...</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((match, idx) => (
          <div key={idx} className="relative group">
            <img
              src={`http://localhost:3000/uploads/${match.filename}`}
              alt="Match"
              className="w-full h-48 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
               Match Score: {match.distance.toFixed(3)} (Lower is better)
            </div>
          </div>
        ))}
      </div>

      {!searching && results.length === 0 && preview && !error && (
        <p className="text-center text-gray-500">No matches found.</p>
      )}
    </div>
  );
};

export default SearchView;
