export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Dataset {
  id: string;
  name: string;
  created_at: string;
}
export interface Column {
  name: string;
  type: "text" | "number";
  missing: number;
  unique: number;
  outliers: number;
  min?: number;
  max?: number;
  mean?: number;
}
export interface Issue {
  key: string;
  title: string;
  count: number;
  unit: string;
  description: string;
  severity: string;
}
export interface Profile {
  rows: number;
  columnCount: number;
  columns: Column[];
  quality: number;
  missing: number;
  duplicates: number;
  whitespace: number;
  outliers: number;
  issues: Issue[];
  chart: { name: string; value: number }[];
  chartLabel: string;
  categoryLabel: string;
  histogram: { name: string; value: number }[];
}
export interface Rows {
  headers: string[];
  rows: string[][];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}
export interface CleanOptions {
  trim: boolean;
  deduplicate: boolean;
  fillMissing: boolean;
  replacement: string;
  dropEmptyRows: boolean;
}
export interface Preview {
  before: Profile;
  after: Profile;
  headers: string[];
  rows: string[][];
  removedRows: number;
}
