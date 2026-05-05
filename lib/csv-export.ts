/**
 * CSV export utilities with formula injection protection.
 *
 * When spreadsheet applications (Excel, Google Sheets) open CSV files, cells
 * starting with `=`, `+`, `-`, `@`, tab, or carriage return are interpreted
 * as formulas. We neutralize this by prefixing with a single-quote inside
 * double-quotes, following the OWASP CSV Injection prevention guidelines.
 */

export function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
