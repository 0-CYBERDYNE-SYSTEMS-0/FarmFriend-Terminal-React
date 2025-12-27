import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  version?: string;
}

export default function SuiteSelector() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadSuites();
  }, []);

  const loadSuites = async () => {
    try {
      const { suites: data } = await api.listSuites();
      setSuites(data);
    } catch (err: any) {
      console.error("Failed to load suites:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuites = suites.filter(suite =>
    suite.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRunSuite = (suiteId: string) => {
    navigate(`/run-suite/${suiteId}`);
  };

  const handleViewSuite = (suiteId: string) => {
    navigate(`/suite/${suiteId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Test Suites</h1>
          <p className="text-gray-600">Select a test suite to run</p>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            className="border rounded p-2 w-64"
            placeholder="Search suites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading test suites...</div>
      ) : filteredSuites.length === 0 ? (
        <div className="text-center py-8 bg-white rounded shadow-md">
          <p className="text-gray-600 mb-4">
            {searchTerm ? "No suites match your search." : "No test suites found."}
          </p>
          <button className="btn btn-primary">Create New Suite</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuites.map((suite) => (
            <div
              key={suite.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-bold mb-2">{suite.name}</h3>
              {suite.description && (
                <p className="text-gray-600 mb-4 text-sm">
                  {suite.description}
                </p>
              )}
              {suite.version && (
                <span className="badge badge-info mb-4 inline-block">
                  v{suite.version}
                </span>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => handleRunSuite(suite.id)}
                >
                  Run
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleViewSuite(suite.id)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
