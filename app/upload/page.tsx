"use client";

import { useState } from "react";
import Papa from "papaparse";
import { uploadDownloadCSV } from "../services/upload-download-csv";

export default function Upload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUploadSimple = async (e: any) => {
    setLoading(true);
    setError(null);
    setUploaded(false);
    const csv: File = e.target.files[0];
    // console.log("Upload images once before processing");
    // await uploadImagesOnce(); // Ensure images are uploaded once before processing
    if (csv) {
      const reader = new FileReader();
      reader.onloadstart = () => {
        console.log("Reading file...");
      };
      reader.onloadend = async (event) => {
        if (event.target && event.target.result) {
          const fileAsString = event.target.result as string;
          console.log("File content: ", fileAsString);
          try {
            const result = await uploadDownloadCSV(fileAsString);
            const outputCsv = Papa.unparse(result);
            const blob = new Blob([outputCsv], {
              type: "text/csv",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Content-Safety-Predictions-${new Date().toLocaleString()}.csv`;
            a.click();
            setUploaded(true);
          } catch (err) {
            setError(`Error processing file: ${err}`);
            console.error(`Error processing file: ${err}`);
          }
        }
        setLoading(false);
      };
      reader.onerror = (error) => {
        setError(`Error reading file: ${error}`);
        console.error(`Error reading file: ${error}`);
        setLoading(false);
      };
      reader.readAsText(csv);
    } else {
      setError("No image selected.");
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <input
          accept=".csv"
          type="file"
          id="image-upload"
          onChange={handleUploadSimple}
        />
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {uploaded && <p>Thanks! Click again to upload another CSV.</p>}
        {!uploaded && !loading && <p>Click above to upload a CSV.</p>}
      </main>
    </div>
  );
}
