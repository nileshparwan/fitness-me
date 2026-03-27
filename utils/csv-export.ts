import Papa from "papaparse"

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => unknown;
};

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  return Papa.unparse({
    fields: columns.map((column) => column.header),
    data: rows.map((row) =>
      columns.map((column) => {
        const value = column.value(row)
        return value === null || value === undefined ? "" : String(value)
      })
    ),
  })
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
