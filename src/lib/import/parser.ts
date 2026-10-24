import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  ParsedColumn,
  ParsedRow,
  SheetInfo,
  VocabFieldKey,
} from "@/types";

const FIELD_SYNONYMS: Record<VocabFieldKey, string[]> = {
  word: ["word", "vocabulary", "từ vựng", "từ", "term", "english", "tiếng anh", "headword"],
  part_of_speech: ["part of speech", "pos", "loại từ", "word type", "category"],
  ipa: ["ipa", "pronunciation", "phiên âm", "phonetic", "transcription"],
  definition_en: ["definition", "english meaning", "meaning", "definition en", "định nghĩa", "english definition"],
  meaning_vi: ["vietnamese meaning", "translation", "nghĩa tiếng việt", "nghĩa", "meaning vi", "dịch nghĩa"],
  example_en: ["example", "example sentence", "câu ví dụ", "sentence", "usage", "example en"],
  example_vi: ["example translation", "nghĩa câu ví dụ", "example vi", "dịch câu"],
  synonyms: ["synonyms", "synonym", "từ đồng nghĩa"],
  antonyms: ["antonyms", "antonym", "từ trái nghĩa"],
};

function detectField(header: string): { field: VocabFieldKey | null; confidence: number } {
  const h = header.toLowerCase().trim();
  let bestField: VocabFieldKey | null = null;
  let bestScore = 0;

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of synonyms) {
      if (h === syn) {
        return { field: field as VocabFieldKey, confidence: 1.0 };
      }
      if (h.includes(syn) || syn.includes(h)) {
        const score = Math.min(h.length, syn.length) / Math.max(h.length, syn.length);
        if (score > bestScore) {
          bestScore = score;
          bestField = field as VocabFieldKey;
        }
      }
    }
  }

  return { field: bestField, confidence: bestScore };
}

export function detectColumns(headers: string[]): ParsedColumn[] {
  return headers.map((header, index) => {
    const { field, confidence } = detectField(header);
    return { index, header, detectedField: field, confidence };
  });
}

function rowToMapped(
  row: Record<string, unknown>,
  columns: ParsedColumn[]
): Partial<Record<VocabFieldKey, string>> {
  const mapped: Partial<Record<VocabFieldKey, string>> = {};
  for (const col of columns) {
    if (col.detectedField) {
      const val = String(row[col.header] ?? "").trim();
      if (val) mapped[col.detectedField] = val;
    }
  }
  return mapped;
}

function getMissingFields(mapped: Partial<Record<VocabFieldKey, string>>): VocabFieldKey[] {
  const required: VocabFieldKey[] = ["word", "meaning_vi"];
  return required.filter((f) => !mapped[f]);
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  columns: ParsedColumn[];
  rows: ParsedRow[];
  rowCount: number;
}

export function parseExcelFile(buffer: ArrayBuffer): {
  sheets: SheetInfo[];
  workbook: XLSX.WorkBook;
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    return { name, rowCount: Math.max(0, data.length - 1), selected: true };
  });
  return { sheets, workbook };
}

export function parseSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedSheet {
  const ws = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as string[][];

  if (rawData.length === 0) {
    return { name: sheetName, headers: [], columns: [], rows: [], rowCount: 0 };
  }

  // Find header row (first non-empty row)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    if (rawData[i].some((cell) => cell !== "")) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = rawData[headerRowIdx].map((h) => String(h).trim());
  const columns = detectColumns(headers);
  const seenWords = new Set<string>();
  const rows: ParsedRow[] = [];

  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = String(rawRow[idx] ?? "").trim();
    });

    const isEmpty = Object.values(rowObj).every((v) => v === "");
    if (isEmpty) continue;

    const mapped = rowToMapped(rowObj, columns);
    const word = mapped.word?.toLowerCase() ?? "";
    const isDuplicate = word !== "" && seenWords.has(word);
    if (word) seenWords.add(word);

    rows.push({
      rowIndex: i,
      sheetName,
      raw: rowObj,
      mapped,
      isEmpty,
      isDuplicate,
      missingFields: getMissingFields(mapped),
      selected: !isEmpty,
    });
  }

  return { name: sheetName, headers, columns, rows, rowCount: rows.length };
}

export function parseCSVContent(content: string): ParsedSheet {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  const headers = result.meta.fields ?? [];
  const columns = detectColumns(headers);
  const seenWords = new Set<string>();
  const rows: ParsedRow[] = [];

  result.data.forEach((rowObj, i) => {
    const isEmpty = Object.values(rowObj).every((v) => v === "");
    if (isEmpty) return;

    const mapped = rowToMapped(rowObj as Record<string, unknown>, columns);
    const word = mapped.word?.toLowerCase() ?? "";
    const isDuplicate = word !== "" && seenWords.has(word);
    if (word) seenWords.add(word);

    rows.push({
      rowIndex: i + 2,
      sheetName: "Sheet1",
      raw: rowObj,
      mapped,
      isEmpty,
      isDuplicate,
      missingFields: getMissingFields(mapped),
      selected: !isEmpty,
    });
  });

  return { name: "Sheet1", headers, columns, rows, rowCount: rows.length };
}
