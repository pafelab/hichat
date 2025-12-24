import { useEffect, useState } from 'react';
import UploadView from './components/UploadView';
import SearchView from './components/SearchView';
import { loadModels } from './faceService';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels()
      .then(() => {
        setLoading(false);
        console.log("Models loaded");
      })
      .catch((err) => {
        console.error("Failed to load models:", err);
        setError("Failed to load AI models. Please check your network or console.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading AI Models...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
            Face Finder AI
        </h1>

        <div className="space-y-8">
            <UploadView />
            <SearchView />
        </div>
      </div>
    </div>
  );
}

export default App;
