import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, TestRun } from "../api";
import {
  getScenarioBadgeClass,
  normalizeScenarioStatus
} from "../utils/scenarioStatus";
import { getDisplayMode } from "../utils/displayMode";

export default function Review() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<TestRun | null>(null);
  const [currentScenario, setCurrentScenario] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewDecision, setReviewDecision] = useState<"pass" | "fail" | "skip">("skip");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Map<string, { decision: string; notes: string }>>(new Map());

  useEffect(() => {
    if (runId) {
      loadRun();
    }
  }, [runId]);

  const loadRun = async () => {
    try {
      const { run: data } = await api.getRun(runId!);
      setRun(data);

      const saved = localStorage.getItem(`reviews_${runId}`);
      if (saved) {
        setReviews(new Map(JSON.parse(saved)));
      }
    } catch (err: any) {
      console.error("Failed to load run:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveReview = () => {
    if (!run || !run.results) return;

    const scenario = run.results[currentScenario];
    if (!scenario) return;

    const updatedReviews = new Map(reviews);
    updatedReviews.set(scenario.scenario_name, {
      decision: reviewDecision,
      notes: reviewNotes
    });

    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${runId}`, JSON.stringify([...updatedReviews]));

    if (currentScenario < run.results.length - 1) {
      nextScenario();
    }
  };

  const nextScenario = () => {
    if (!run || !run.results) return;
    setCurrentScenario(prev => Math.min(prev + 1, run!.results!.length - 1));
    setReviewNotes("");
    setReviewDecision("skip");
  };

  const previousScenario = () => {
    setCurrentScenario(prev => Math.max(prev - 1, 0));
  };

  if (loading) {
    return <div className="text-center py-8">Loading review queue...</div>;
  }

  if (!run || !run.results || run.results.length === 0) {
    return <div className="text-center py-8">No results to review</div>;
  }

  const scenario = run.results[currentScenario];
  const review = reviews.get(scenario.scenario_name);
  const progress = ((currentScenario + 1) / run.results.length) * 100;
  const errorMessages = Array.isArray(scenario.errors)
    ? scenario.errors
    : scenario.error
    ? [scenario.error]
    : [];
  const isVerbose = getDisplayMode() === "verbose";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Human Review</h2>
          <p className="text-gray-600">Run ID: {runId}</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-secondary" onClick={() => navigate(`/run/${runId}`)}>
            Back to Results
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-md mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Review Progress</span>
          <span className="text-sm">{currentScenario + 1} / {run.results.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h3 className="text-lg font-bold mb-4">Scenarios</h3>
        <div className="grid grid-cols-10 gap-2">
          {run.results.map((s, idx) => {
            const hasReview = reviews.has(s.scenario_name);
            const isActive = idx === currentScenario;

            return (
              <button
                key={s.scenario_name}
                className={`p-2 rounded text-xs font-medium ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : hasReview
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
                onClick={() => setCurrentScenario(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{scenario.scenario_name}</h3>
          <span className={`badge ${getScenarioBadgeClass(scenario.status)}`}>
            {normalizeScenarioStatus(scenario.status)}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-2xl font-bold">{(scenario.duration_ms / 1000).toFixed(1)}s</p>
          </div>
          {isVerbose && (
            <>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Turns</p>
                <p className="text-2xl font-bold">{scenario.turn_count ?? "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Tool Calls</p>
                <p className="text-2xl font-bold">{scenario.tool_calls ?? "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{errorMessages.length}</p>
              </div>
            </>
          )}
        </div>

        {errorMessages.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-bold mb-2">Errors</h4>
            <div className="bg-red-50 p-4 rounded">
              <ul className="list-disc pl-5 space-y-1 text-red-700">
                {errorMessages.map((message, index) => (
                  <li key={`${scenario.scenario_name}-error-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {isVerbose && scenario.evaluation && (
          <div className="mb-6">
            <h4 className="text-md font-bold mb-2">Automated Evaluation</h4>
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Passed:</strong> {scenario.evaluation.passed ? "Yes" : "No"}</p>
              <p><strong>Score:</strong> {(scenario.evaluation.score * 100).toFixed(1)}%</p>
              {scenario.evaluation.human_review_required && (
                <p className="text-orange-600 mt-2">
                  ⚠️ Flagged for human review
                </p>
              )}

              {scenario.evaluation.criteria_results?.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-bold mb-2">Criteria Results</h5>
                  <table>
                    <thead>
                      <tr>
                        <th>Dimension</th>
                        <th>Passed</th>
                        <th>Score</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenario.evaluation.criteria_results.map((c, idx) => (
                        <tr key={idx}>
                          <td>{c.dimension}</td>
                          <td>
                            <span className={`badge ${c.passed ? "badge-success" : "badge-failed"}`}>
                              {c.passed ? "Yes" : "No"}
                            </span>
                          </td>
                          <td>{(c.score * 100).toFixed(1)}%</td>
                          <td>{c.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {review ? (
        <div className="bg-white p-6 rounded shadow-md mb-6">
          <h3 className="text-lg font-bold mb-4">Previous Review</h3>
          <div className="mb-4">
            <p><strong>Decision:</strong> {review.decision.toUpperCase()}</p>
            <p><strong>Notes:</strong></p>
            <pre className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
              {review.notes || "No notes"}
            </pre>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow-md mb-6">
          <h3 className="text-lg font-bold mb-4">Submit Review</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Decision</label>
            <select
              className="w-full border rounded p-2"
              value={reviewDecision}
              onChange={(e) => setReviewDecision(e.target.value as "pass" | "fail" | "skip")}
            >
              <option value="skip">Skip</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Review Notes</label>
            <textarea
              className="w-full border rounded p-2 h-32"
              placeholder="Provide reasoning for your decision..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button
              className="btn btn-primary"
              onClick={saveReview}
              disabled={reviewDecision === "skip"}
            >
              Save & Next
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setReviewDecision("skip")}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-md">
        <div className="flex items-center justify-between">
          <button
            className="btn btn-secondary"
            onClick={previousScenario}
            disabled={currentScenario === 0}
          >
            Previous
          </button>

          <div className="flex gap-4">
            <span className="text-sm text-gray-600">
              Scenario {currentScenario + 1} of {run.results.length}
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={nextScenario}
            disabled={currentScenario === run.results.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
