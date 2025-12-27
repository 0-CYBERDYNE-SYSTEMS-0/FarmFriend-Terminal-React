import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AcademicDashboard from "./pages/AcademicDashboard";
import TestList from "./pages/TestList";
import TestRunDetail from "./pages/TestRunDetail";
import Review from "./pages/Review";
import Trends from "./pages/Trends";
import Config from "./pages/Config";
import SuiteSelector from "./pages/SuiteSelector";
import RunSuite from "./pages/RunSuite";
import Analytics from "./pages/Analytics";
import ResearchResults from "./pages/ResearchResults";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
                  <span className="text-white text-xl">🔬</span>
                </div>
                <div>
                  <Link
                    to="/"
                    className="text-2xl font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                  >
                    Agent Research Suite
                  </Link>
                  <p className="text-xs text-slate-600">Academic & Research Grade</p>
                </div>
              </div>
              <nav className="flex items-center gap-1">
                <Link
                  to="/"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/suites"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  Test Suites
                </Link>
                <Link
                  to="/runs"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  Test Runs
                </Link>
                <Link
                  to="/analytics"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  to="/config"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  Config
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<AcademicDashboard />} />
            <Route path="/suites" element={<SuiteSelector />} />
            <Route path="/suite/:suiteId" element={<SuiteSelector />} />
            <Route path="/run-suite/:suiteId" element={<RunSuite />} />
            <Route path="/runs" element={<TestList />} />
            <Route path="/run/:runId" element={<ResearchResults />} />
            <Route path="/review/:runId" element={<Review />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  Agent Research Testing Suite
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  v0.1.0 | Academic & Research Grade
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <a href="#" className="hover:text-indigo-600 transition-colors">
                  Documentation
                </a>
                <a href="#" className="hover:text-indigo-600 transition-colors">
                  API Reference
                </a>
                <a href="#" className="hover:text-indigo-600 transition-colors">
                  GitHub
                </a>
                <a href="#" className="hover:text-indigo-600 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
