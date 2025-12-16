import fs from "node:fs";
import path from "node:path";

type Args = { description?: string; data_source?: string };

function tryReadFile(abs: string, maxBytes: number): { ok: true; content: string } | { ok: false; error: string } {
  try {
    const st = fs.statSync(abs);
    if (st.size > maxBytes) return { ok: false, error: `file too large (${st.size} bytes > ${maxBytes})` };
    const content = fs.readFileSync(abs, "utf8");
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function parseCsvSample(csv: string, maxRows: number): { headers: string[]; rows: string[][] } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
  const rows: string[][] = [];
  const parseLine = (line: string): string[] => {
    // Minimal CSV parser: supports quoted fields and commas.
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = lines.length ? parseLine(lines[0]!) : [];
  for (const line of lines.slice(1, 1 + maxRows)) rows.push(parseLine(line));
  return { headers, rows };
}

export async function analyzeDataTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const description = String(args?.description || "").trim();
  const dataSource = typeof args?.data_source === "string" ? args.data_source.trim() : "";
  if (!description) throw new Error("analyze_data: missing args.description");

  const result: any = {
    description,
    data_source: dataSource || null,
    results: null
  };

  if (!dataSource) {
    result.results = {
      message: "No data_source provided. Provide a file path (csv/json/txt) for structured analysis.",
      supported: ["csv", "json", "txt"]
    };
    return JSON.stringify(result, null, 2);
  }

  const abs = path.resolve(dataSource);
  if (!fs.existsSync(abs)) {
    result.results = { error: `data_source not found: ${abs}` };
    return JSON.stringify(result, null, 2);
  }

  const ext = path.extname(abs).toLowerCase();
  const MAX = Number(process.env.FF_ANALYZE_DATA_MAX_BYTES || 500_000);
  const read = tryReadFile(abs, MAX);
  if (!read.ok) {
    result.results = { error: `Could not read file: ${read.error}`, path: abs };
    return JSON.stringify(result, null, 2);
  }

  if (ext === ".json") {
    try {
      const obj = JSON.parse(read.content);
      const type = Array.isArray(obj) ? "array" : typeof obj;
      result.results = {
        file_type: "json",
        path: abs,
        json_type: type,
        top_level_keys: obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj).slice(0, 50) : undefined,
        array_length: Array.isArray(obj) ? obj.length : undefined,
        sample: Array.isArray(obj) ? obj.slice(0, 3) : obj && typeof obj === "object" ? Object.fromEntries(Object.entries(obj).slice(0, 10)) : obj
      };
      return JSON.stringify(result, null, 2);
    } catch (e) {
      result.results = { error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, path: abs };
      return JSON.stringify(result, null, 2);
    }
  }

  if (ext === ".csv") {
    const sample = parseCsvSample(read.content, 20);
    result.results = {
      file_type: "csv",
      path: abs,
      headers: sample.headers,
      sample_rows: sample.rows,
      note: "This is a lightweight CSV sample parser (not full pandas parity)."
    };
    return JSON.stringify(result, null, 2);
  }

  // Generic text/file analysis.
  const lines = read.content.split(/\r?\n/);
  result.results = {
    file_type: ext ? ext.slice(1) : "text",
    path: abs,
    file_size_bytes: fs.statSync(abs).size,
    line_count: lines.length,
    char_count: read.content.length,
    preview: read.content.slice(0, 2000) + (read.content.length > 2000 ? "\n...(truncated)" : "")
  };
  return JSON.stringify(result, null, 2);
}

