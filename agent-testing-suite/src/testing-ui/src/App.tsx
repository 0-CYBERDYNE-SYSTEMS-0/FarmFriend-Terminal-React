import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TestList from "./pages/TestList";
import TestRunDetail from "./pages/TestRunDetail";
import "./index.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-indigo-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                <Link to="/" className="text-white hover:text-indigo-200">
                  🧪 Agent Testing Suite
                </Link>
              </h1>
              <nav className="space-x-4">
                <Link to="/" className="hover:text-indigo-200">Dashboard</Link>
                <Link to="/runs" className="hover:text-indigo-200">Test Runs</Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs" element={<TestList />} />
            <Route path="/run/:runId" element={<TestRunDetail />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-300 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>Agent Testing Suite v0.1.0 | ff-terminal</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
