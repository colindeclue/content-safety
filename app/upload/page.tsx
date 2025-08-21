"use client";

import { useState } from "react";
import Papa from "papaparse";
import { uploadDownloadCSV } from "../services/upload-download-csv";

export default function Upload() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [predctionResult, setPredictionResult] = useState<string | null>(
        null
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUploadSimple = async (e: any) => {
        setLoading(true);
        setError(null);
        setPredictionResult(null);
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
                        setPredictionResult(JSON.stringify(result));
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
                {predctionResult && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md">
                        <h3 className="text-lg font-semibold">
                            Prediction Result:
                        </h3>
                        <pre className="whitespace-pre-wrap break-all">
                            {predctionResult}
                        </pre>
                    </div>
                )}
            </main>
        </div>
    );
}
