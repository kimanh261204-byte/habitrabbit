"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { parseExcelFile, parseSheet, parseCSVContent, ParsedSheet } from "@/lib/import/parser";
import { SheetInfo, VocabFieldKey, ParsedColumn, ParsedRow } from "@/types";

type Step = "upload" | "sheets" | "mapping" | "preview" | "enrichment" | "saving" | "done";

const VOCAB_FIELD_LABELS: Record<VocabFieldKey, string> = {
  word: "Từ tiếng Anh *",
  part_of_speech: "Từ loại",
  ipa: "Phiên âm IPA",
  definition_en: "Định nghĩa tiếng Anh",
  meaning_vi: "Nghĩa tiếng Việt *",
  example_en: "Câu ví dụ tiếng Anh",
  example_vi: "Dịch câu ví dụ",
  synonyms: "Từ đồng nghĩa",
  antonyms: "Từ trái nghĩa",
};

export default function ImportWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<import("xlsx").WorkBook | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>([]);
  const [columns, setColumns] = useState<ParsedColumn[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [libraryName, setLibraryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    imported: number;
    failed: number;
    libraryId: string;
  } | null>(null);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enriching, setEnriching] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFileError(null);

    const maxMB = 10;
    if (f.size > maxMB * 1024 * 1024) {
      setFileError(`File quá lớn. Kích thước tối đa là ${maxMB}MB.`);
      return;
    }

    setFile(f);
    const ext = f.name.split(".").pop()?.toLowerCase();
    setLibraryName(f.name.replace(/\.[^.]+$/, ""));

    if (ext === "xlsx" || ext === "xls") {
      const buffer = await f.arrayBuffer();
      const { sheets: s, workbook: wb } = parseExcelFile(buffer);
      setWorkbook(wb);
      setSheets(s);
      setStep("sheets");
    } else if (ext === "csv") {
      const text = await f.text();
      const parsed = parseCSVContent(text);
      setParsedSheets([parsed]);
      setColumns(parsed.columns);
      setRows(parsed.rows);
      setStep("mapping");
    } else {
      setFileError("Hệ thống chỉ hỗ trợ định dạng file .xlsx, .xls hoặc .csv");
      setFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  const handleSheetsNext = () => {
    const selected = sheets.filter((s) => s.selected);
    if (!selected.length) return;
    const parsed = selected.map((s) => parseSheet(workbook!, s.name));
    setParsedSheets(parsed);
    setColumns(parsed[0].columns);
    const allRows = parsed.flatMap((p) => p.rows);
    setRows(allRows);
    setStep("mapping");
  };

  const updateColumnMapping = (colIdx: number, field: VocabFieldKey | "") => {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIdx ? { ...c, detectedField: field === "" ? null : field } : c))
    );
  };

  const handleMappingNext = () => {
    const updatedRows = rows.map((row) => {
      const mapped: Partial<Record<VocabFieldKey, string>> = {};
      columns.forEach((col) => {
        if (col.detectedField) {
          const val = row.raw[col.header];
          if (val) mapped[col.detectedField] = val;
        }
      });
      const missingFields: VocabFieldKey[] = (
        ["word", "meaning_vi"] as VocabFieldKey[]
      ).filter((f) => !mapped[f]);
      return { ...row, mapped, missingFields };
    });
    setRows(updatedRows);
    setStep("preview");
  };

  const toggleRow = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
  };

  const handleEnrich = async () => {
    setEnriching(true);
    const toEnrich = rows.filter((r) => r.selected && r.missingFields.length > 0 && r.mapped.word);
    for (let i = 0; i < toEnrich.length; i++) {
      const row = toEnrich[i];
      try {
        const res = await fetch("/api/ai/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: row.mapped.word,
            partOfSpeech: row.mapped.part_of_speech,
            fields: row.missingFields,
          }),
        });
        if (res.ok) {
          const enriched = await res.json();
          setRows((prev) =>
            prev.map((r) =>
              r === row ? { ...r, mapped: { ...r.mapped, ...enriched }, missingFields: [] } : r
            )
          );
        }
      } catch {}
      setEnrichProgress(Math.round(((i + 1) / toEnrich.length) * 100));
    }
    setEnriching(false);
    setStep("saving");
  };

  const handleSave = async () => {
    setSaving(true);
    const selectedRows = rows.filter((r) => r.selected && r.mapped.word);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryName: libraryName || "Thư viện từ vựng",
          fileName: file?.name,
          rows: selectedRows,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSaveResult({
          success: true,
          imported: result.imported,
          failed: result.failed,
          libraryId: result.libraryId,
        });
        setStep("done");
      } else {
        setSaveResult({
          success: false,
          imported: 0,
          failed: selectedRows.length,
          libraryId: "",
        });
        setStep("done");
      }
    } catch {
      setSaveResult({
        success: false,
        imported: 0,
        failed: selectedRows.length,
        libraryId: "",
      });
      setStep("done");
    }
    setSaving(false);
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const missingCount = rows.filter((r) => r.selected && r.missingFields.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Từ vựng</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tải lên tài liệu Excel hoặc CSV, hệ thống sẽ tự động trích xuất và chia bài học
        </p>
      </div>

      {/* Step Indicator */}
      {step !== "done" && (
        <div className="flex gap-2 items-center text-xs text-gray-400 flex-wrap">
          {(["upload", "sheets", "mapping", "preview", "saving"] as const).map((s, i) => {
            const labels = {
              upload: "Tải file lên",
              sheets: "Chọn Sheet",
              mapping: "Khớp cột",
              preview: "Xem trước",
              saving: "Lưu dữ liệu",
            };
            const steps: Step[] = ["upload", "sheets", "mapping", "preview", "saving"];
            const current = steps.indexOf(step);
            const pos = steps.indexOf(s);
            return (
              <span
                key={s}
                className={cn(
                  "flex items-center gap-1.5",
                  pos <= current ? "text-indigo-600 font-semibold" : "text-gray-400"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    pos < current
                      ? "bg-indigo-600 text-white"
                      : pos === current
                      ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-600"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {pos < current ? "✓" : i + 1}
                </span>
                <span>{labels[s]}</span>
                {i < 4 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              </span>
            );
          })}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card className="p-8 md:p-12">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 md:p-16 text-center cursor-pointer transition-all duration-200",
              isDragActive
                ? "border-indigo-500 bg-indigo-50/70"
                : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50/60"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">
              {isDragActive ? "Thả file vào đây..." : "Kéo thả hoặc nhấn để chọn file"}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Hỗ trợ file Microsoft Excel (.xlsx, .xls) hoặc tệp văn bản CSV (.csv) — Kích thước tối
              đa 10MB
            </p>
          </div>
          {fileError && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3.5 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Sheet Selection */}
      {step === "sheets" && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Chọn các trang tính (Sheets)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tệp: <strong className="text-gray-800">{file?.name}</strong>
            </p>
          </div>

          <div className="space-y-2.5">
            {sheets.map((sheet, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={sheet.selected}
                  onChange={() =>
                    setSheets((prev) =>
                      prev.map((s, si) => (si === i ? { ...s, selected: !s.selected } : s))
                    )
                  }
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <FileSpreadsheet className="w-5 h-5 text-indigo-500 shrink-0" />
                <span className="font-semibold text-gray-800 text-sm">{sheet.name}</span>
                <Badge variant="default" className="ml-auto">
                  {sheet.rowCount} dòng dữ liệu
                </Badge>
              </label>
            ))}
          </div>

          <div>
            <Input
              label="Tên thư viện từ vựng"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              placeholder="Nhập tên thư viện..."
              required
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep("upload")}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleSheetsNext}
              disabled={!sheets.some((s) => s.selected)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Tiếp tục khớp cột
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === "mapping" && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Khớp cột dữ liệu</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Hệ thống đã tự động phân tích tiêu đề cột. Bạn có thể kiểm tra và tùy chỉnh lại nếu
              cần.
            </p>
          </div>

          <div className="space-y-3">
            {columns.map((col, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100"
              >
                <div className="sm:w-52 shrink-0">
                  <span className="text-sm font-semibold text-gray-800 truncate block">
                    {col.header}
                  </span>
                  {col.detectedField && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ✓ Đã tự động nhận diện
                    </span>
                  )}
                </div>
                <div className="hidden sm:block text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
                <select
                  value={col.detectedField ?? ""}
                  onChange={(e) => updateColumnMapping(i, e.target.value as VocabFieldKey | "")}
                  className="flex-1 h-10 px-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Bỏ qua cột này --</option>
                  {(Object.entries(VOCAB_FIELD_LABELS) as [VocabFieldKey, string][]).map(
                    ([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    )
                  )}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep(workbook ? "sheets" : "upload")}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Quay lại
            </Button>
            <Button onClick={handleMappingNext} rightIcon={<ChevronRight className="w-4 h-4" />}>
              Xem trước dữ liệu
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Preview Table */}
      {step === "preview" && (
        <Card className="overflow-hidden border-gray-100">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Xem trước & Lọc dữ liệu</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedCount} từ đã chọn • {missingCount} từ còn thiếu dữ liệu
              </p>
            </div>
            {missingCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Wand2 className="w-4 h-4 text-violet-600" />}
                onClick={() => setStep("enrichment")}
              >
                Bổ sung bằng AI ({missingCount})
              </Button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded"
                      checked={rows.every((r) => r.selected)}
                      onChange={(e) =>
                        setRows((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))
                      }
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Từ tiếng Anh</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Nghĩa tiếng Việt</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">IPA</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">
                    Ví dụ
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 100).map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "hover:bg-gray-50/60 transition-colors",
                      !row.selected && "opacity-40"
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(i)}
                        className="w-3.5 h-3.5 rounded"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">
                      {row.mapped.word ?? <span className="text-red-400">Thiếu</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {row.mapped.meaning_vi ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-indigo-600 font-mono hidden md:table-cell">
                      {row.mapped.ipa ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate hidden lg:table-cell">
                      {row.mapped.example_en ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.isDuplicate ? (
                        <Badge variant="warning">Trùng</Badge>
                      ) : row.missingFields.length > 0 ? (
                        <Badge variant="warning">{row.missingFields.length} thiếu</Badge>
                      ) : (
                        <Badge variant="success">Đầy đủ</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setStep("mapping")}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Quay lại
            </Button>
            <Button
              onClick={() => setStep("saving")}
              disabled={selectedCount === 0}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Xác nhận import ({selectedCount} từ)
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: AI Enrichment */}
      {step === "enrichment" && (
        <Card className="p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-3xl flex items-center justify-center mx-auto">
            <Wand2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">Bổ sung dữ liệu bằng AI</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              AI sẽ tự động tra cứu và điền IPA, định nghĩa, nghĩa tiếng Việt và câu ví dụ cho{" "}
              <strong>{missingCount}</strong> từ còn thiếu trong danh sách của bạn.
            </p>
          </div>

          {enriching ? (
            <div className="max-w-xs mx-auto space-y-3 pt-2">
              <Progress value={enrichProgress} color="indigo" />
              <p className="text-xs text-gray-500">Đang xử lý với AI... {enrichProgress}%</p>
            </div>
          ) : (
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="secondary" onClick={() => setStep("saving")}>
                Bỏ qua, lưu luôn
              </Button>
              <Button leftIcon={<Sparkles className="w-4 h-4" />} onClick={handleEnrich}>
                Bắt đầu làm giàu bằng AI
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 6: Saving */}
      {step === "saving" && (
        <Card className="p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
            {saving ? <Spinner size="lg" /> : <BookMarked className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">
              {saving ? "Đang tạo bài học và lưu dữ liệu..." : "Xác nhận tạo thư viện"}
            </h2>
            {!saving && (
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Hệ thống sẽ lưu <strong>{selectedCount} từ</strong> vào bộ từ vựng "
                <strong>{libraryName}</strong>" và tự động chia thành các bài học vừa vặn (10 - 20
                từ).
              </p>
            )}
          </div>

          {!saving && (
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="secondary" onClick={() => setStep("preview")}>
                Xem lại
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Xác nhận lưu
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 7: Done */}
      {step === "done" && saveResult && (
        <Card className="p-10 text-center space-y-4">
          <div
            className={cn(
              "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto",
              saveResult.success ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}
          >
            {saveResult.success ? (
              <CheckCircle className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {saveResult.success ? "Import thành công! 🎉" : "Import không thành công"}
            </h2>
            {saveResult.success ? (
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Đã thêm <strong>{saveResult.imported} từ vựng</strong> vào thư viện của bạn. Các bài
                học đã sẵn sàng để bạn bắt đầu học ngay!
              </p>
            ) : (
              <p className="text-xs text-red-600">Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng thử lại.</p>
            )}
          </div>

          <div className="flex gap-3 justify-center pt-3">
            <Button variant="secondary" onClick={() => router.push("/libraries")}>
              Danh sách thư viện
            </Button>
            {saveResult.success && saveResult.libraryId && (
              <Button onClick={() => router.push(`/libraries/${saveResult.libraryId}`)}>
                Mở thư viện vừa tạo
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}