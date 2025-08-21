"use server";

import { parse } from "csv-parse";
import * as util from "util";

const headers = ["page_post_id", "url", "violation_category"];

export const uploadDownloadCSV = async (data: string): Promise<string[][]> => {
    const predictionKey = process.env.VISION_PREDICTION_KEY;
    const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;
    const records = [];

    if (!predictionKey || !predictionEndpoint) {
        console.error("Custom Vision prediction key or endpoint is not set.");
        throw new Error("Prediction key or endpoint is not set.");
    }

    const parser = parse(data, {
        columns: headers,
        skip_empty_lines: false,
        from_line: 2, // Skip the header line
    });
    let count = 0;
    for await (const record of parser) {
        console.log("Processing record:", record);
        if (!record.page_post_id || !record.url) {
            console.warn(
                "Skipping record with missing page_post_id or url:",
                record
            );
            continue;
        }

        const predictionResult = await retry(3, 5000, async () => {
            const url = `${predictionEndpoint}/customvision/v3.0/Prediction/${
                process.env.VISION_PREDICTION_PROJECT_ID
            }/classify/iterations/${encodeURIComponent(
                process.env.VISION_PREDICTION_PROJECT_NAME!
            )}/url`;

            console.log(`Analyzing URL: ${record.url} with Custom Vision`);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Prediction-Key": predictionKey,
                },
                body: `{"url": "${record.url}"}`,
            });

            if (!response.ok) {
                throw new Error(
                    `Error analyzing URL with Custom Vision: ${response.statusText}`
                );
            }

            return response.json();
        });

        record.prediction = JSON.stringify(
            predictionResult.predictions.map(
                (prediction: { tagName: string; probability: number }) => ({
                    tagName: prediction.tagName,
                    probability: prediction.probability,
                })
            )
        );
        records.push(record);
        count++;
        if (count === 2) {
            count = 0;
            console.log(
                "Processed 2 records, waiting to avoid rate limiting..."
            );
            await util.promisify(setTimeout)(2000); // Delay to avoid rate limiting
        }
    }
    console.log("records: ", records);
    return records;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function retry(
    maxRetries: number,
    delay: number,
    fn: () => Promise<any>
): Promise<any> {
    return new Promise((resolve, reject) => {
        const attempt = (retriesLeft: number) => {
            fn()
                .then(resolve)
                .catch((error) => {
                    if (retriesLeft <= 1) {
                        console.error("Max retries reached. Error:", error);
                        reject(error);
                    } else {
                        console.warn(
                            `Retrying... (${
                                maxRetries - retriesLeft + 1
                            }/${maxRetries})`
                        );
                        setTimeout(() => attempt(retriesLeft - 1), delay);
                    }
                });
        };
        attempt(maxRetries);
    });
}
