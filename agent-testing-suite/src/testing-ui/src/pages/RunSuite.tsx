import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  scenarios?: any[];
}

export default function RunSuite() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [parallelWorkers, setParallelWorkers] = useState(4);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (suiteId) {
      loadSuite();
    }
  }, [suiteId]);

  const loadSuite = async () => {
    try {
      const { suite: data } = await api.getSuite(suiteId);
      setSuite(data);
      // Select all scenarios by default
      if (data.scenarios) {
        setSelectedScenarios(new Set(data.scenarios.map((s: any) => s.id)));
      }
    } catch (err: any) {
      console.error("Failed to load suite:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleScenario = (scenarioId: string) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(scenarioId)) {
      newSelected.delete(scenarioId);
    } else {
      newSelected.add(scenarioId);
    }
    setSelectedScenarios(newSelected);
  };

  const selectAll = () => {
    if (suite?.scenarios) {
      setSelectedScenarios(new Set(suite.scenarios.map((s: any) => s.id)));
    }
  };

  const selectNone = () => {
    setSelectedScenarios(new Set());
  };

  const handleRun = async () => {
    if (!suite || selectedScenarios.size === 0) {
      alert("Please select at least one scenario");
      return;
    }

    setRunning(true);
    try {
      const run = await api.createRun({
        suite: suiteId,
        options: {
          scenarios: Array.from(selectedScenarios),
          parallel_workers: parallelWorkers
        }
      });
      navigate(`/run/${run.runId}`);
    } catch (err: any) {
      alert(`Failed to start test run: ${err.message}`);
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading test suite...</div>;
  }

  if (!suite) {
    return <div className="text-center py-8">Test suite not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button className="btn btn-secondary" onClick={() => navigate("/suites")}>
          ← Back to Suites
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{suite.name}</h1>
        {suite.description && (
          <p className="text-gray-600 mb-4">{suite.description}</p>
        )}
        <span className="badge badge-info">Test Suite</span>
      </div>

      {/* Scenario Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Select Scenarios</h2>
          <div className="flex gap-2">
            <button className="btn btn-secondary text-sm" onClick={selectAll}>
              Select All
            </button>
            <button className="btn btn-secondary text-sm" onClick={selectNone}>
              Select None
            </button>
            <span className="text-gray-600 ml-4">
              {selectedScenarios.size} selected
            </span>
          </div>
        </div>

        {suite.scenarios && suite.scenarios.length > 0 ? (
          <div className="space-y-2">
            {suite.scenarios.map((scenario: any) => (
              <label
                key={scenario.id}
                className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mr-3"
                  checked={selectedScenarios.has(scenario.id)}
                  onChange={() => toggleScenario(scenario.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{scenario.name}</div>
                  {scenario.description && (
                    <div className="text-sm text-gray-600">
                      {scenario.description}
                    </div>
                  )}
                </div>
                {scenario.evaluation && (
                  <span className="badge badge-info ml-2">
                    {scenario.evaluation.criteria.length} criteria
                  </span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-600">
            No scenarios in this test suite
          </div>
        )}
      </div>

      {/* Run Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Run Configuration</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Parallel Workers
          </label>
          <input
            type="number"
            className="w-full border rounded p-2"
            min="1"
            max="10"
            value={parallelWorkers}
            onChange={(e) => setParallelWorkers(parseInt(e.target.value))}
          />
          <p className="text-sm text-gray-600 mt-1">
            Number of scenarios to run in parallel
          </p>
        </div>
      </div>

      {/* Run Button */}
      <div className="flex justify-end">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleRun}
          disabled={running || selectedScenarios.size === 0}
        >
          {running ? "Starting..." : `Run ${selectedScenarios.size} Scenario${selectedScenarios.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
