import React, { useEffect, useState } from "react";
import { api } from "../api";

interface Config {
  llmJudge: {
    provider: string;
    model: string;
    settings: {
      temperature: number;
      maxTokens: number;
      timeoutMs: number;
    };
  };
  parallel: {
    workerCount: number;
    timeoutMinutes: number;
  };
}

export default function Config() {
  const [config, setConfig] = useState<Config | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configData, providersData] = await Promise.all([
        api.getConfig(),
        api.getProviders()
      ]);
      setConfig(configData);
      setProviders(providersData.providers);
    } catch (err: any) {
      console.error("Failed to load config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = async (provider: string) => {
    if (!config) return;
    setConfig({ ...config, llmJudge: { ...config.llmJudge, provider } });
    setTestResult(null);
    
    // Load available models for provider
    try {
      const { models } = await api.getProviderModels(provider);
      setAvailableModels(models);
    } catch (err) {
      console.error("Failed to load models:", err);
      setAvailableModels([]);
    }
  };

  const handleModelChange = (model: string) => {
    if (!config) return;
    setConfig({ ...config, llmJudge: { ...config.llmJudge, model } });
  };

  const handleTestConnection = async () => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    
    try {
      const providerConfig = {
        model: config.llmJudge.model
      };
      const result = await api.testProvider(config.llmJudge.provider, providerConfig);
      setTestResult(result.connected ? "✅ Connection successful!" : "❌ Connection failed!");
    } catch (err: any) {
      setTestResult(`❌ Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="text-center py-8">Failed to load configuration</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configuration</h1>

      {/* LLM Judge Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">LLM Judge Settings</h2>

        {/* Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            LLM Provider
          </label>
          <select
            className="w-full border rounded p-2"
            value={config.llmJudge.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} {provider.requiresApiKey && "(requires API key)"}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-1">
            {providers.find(p => p.id === config.llmJudge.provider)?.description}
          </p>
        </div>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Model
          </label>
          <select
            className="w-full border rounded p-2"
            value={config.llmJudge.model}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            <option value="">Default model</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Temperature
            </label>
            <input
              type="number"
              className="w-full border rounded p-2"
              step="0.1"
              min="0"
              max="2"
              value={config.llmJudge.settings.temperature}
              onChange={(e) => setConfig({
                ...config,
                llmJudge: {
                  ...config.llmJudge,
                  settings: {
                    ...config.llmJudge.settings,
                    temperature: parseFloat(e.target.value)
                  }
                }
              })}
            />
            <p className="text-sm text-gray-600 mt-1">0.0 - 2.0</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              className="w-full border rounded p-2"
              min="100"
              max="32000"
              value={config.llmJudge.settings.maxTokens}
              onChange={(e) => setConfig({
                ...config,
                llmJudge: {
                  ...config.llmJudge,
                  settings: {
                    ...config.llmJudge.settings,
                    maxTokens: parseInt(e.target.value)
                  }
                }
              })}
            />
            <p className="text-sm text-gray-600 mt-1">100 - 32000</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Timeout (ms)
            </label>
            <input
              type="number"
              className="w-full border rounded p-2"
              min="1000"
              max="300000"
              value={config.llmJudge.settings.timeoutMs}
              onChange={(e) => setConfig({
                ...config,
                llmJudge: {
                  ...config.llmJudge,
                  settings: {
                    ...config.llmJudge.settings,
                    timeoutMs: parseInt(e.target.value)
                  }
                }
              })}
            />
            <p className="text-sm text-gray-600 mt-1">1000 - 300000</p>
          </div>
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-4">
          <button
            className="btn btn-primary"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <span className={testResult.includes("✅") ? "text-green-600" : "text-red-600"}>
              {testResult}
            </span>
          )}
        </div>
      </div>

      {/* Parallel Execution Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Parallel Execution</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Worker Count
            </label>
            <input
              type="number"
              className="w-full border rounded p-2"
              min="1"
              max="10"
              value={config.parallel.workerCount}
              onChange={(e) => setConfig({
                ...config,
                parallel: {
                  ...config.parallel,
                  workerCount: parseInt(e.target.value)
                }
              })}
            />
            <p className="text-sm text-gray-600 mt-1">Number of parallel test workers</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Timeout (minutes)
            </label>
            <input
              type="number"
              className="w-full border rounded p-2"
              min="1"
              max="120"
              value={config.parallel.timeoutMinutes}
              onChange={(e) => setConfig({
                ...config,
                parallel: {
                  ...config.parallel,
                  timeoutMinutes: parseInt(e.target.value)
                }
              })}
            />
            <p className="text-sm text-gray-600 mt-1">Timeout per test scenario</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button className="btn btn-secondary">
          Reset to Defaults
        </button>
        <button className="btn btn-primary">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
