export type ScenarioStatus =
  | "passed"
  | "failed"
  | "partial"
  | "timeout"
  | "pass"
  | "fail"
  | "skip"
  | string;

export const normalizeScenarioStatus = (status?: string): string => {
  switch (status) {
    case "pass":
      return "passed";
    case "fail":
      return "failed";
    case "skip":
      return "partial";
    default:
      return status || "unknown";
  }
};

export const isPassedStatus = (status?: string): boolean =>
  normalizeScenarioStatus(status) === "passed";

export const isFailedStatus = (status?: string): boolean =>
  normalizeScenarioStatus(status) === "failed";

export const isPartialStatus = (status?: string): boolean => {
  const normalized = normalizeScenarioStatus(status);
  return normalized === "partial" || normalized === "timeout";
};

export const getScenarioBadgeClass = (status?: string): string => {
  const normalized = normalizeScenarioStatus(status);
  switch (normalized) {
    case "passed":
      return "badge-success";
    case "failed":
      return "badge-failed";
    case "partial":
    case "timeout":
      return "badge-partial";
    default:
      return "";
  }
};
