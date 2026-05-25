import CsvImporter from "@/components/import/CsvImporter";

export default function ImportPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Import CSV</h1>
        <p className="text-sm text-text-muted mt-1">
          Upload a spreadsheet to bulk-load close and billed data
        </p>
      </div>
      <CsvImporter />
    </div>
  );
}
