"use server";

import { AzureKeyCredential } from "@azure/core-auth";
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";

const incidentNames = process.env.INCIDENT_NAMES?.split(",") ?? ["blurry-images"];

export const isImageSafe = async (imageData: string, imageArrayBuffer: ArrayBuffer) => {
    const endpoint = process.env.CONTENT_SAFETY_ENDPOINT;
    const key = process.env.CONTENT_SAFETY_KEY;
    const predictionKey = process.env.VISION_PREDICTION_KEY;
    const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;

    if (!endpoint || !key || !predictionKey || !predictionEndpoint) {
        console.error("Content safety endpoint or key is not set.");
        return false;
    }

    const credential = new AzureKeyCredential(key);
    console.log("incidentNames",incidentNames);

    const client = ContentSafetyClient(endpoint, credential);

    const analyzeImageOption = { image: { content: imageData }};
    const analyzeImageParameters = { body: analyzeImageOption };

    const result = await client.path("/image:analyze").post(analyzeImageParameters);
    
    if (isUnexpected(result)) {
        console.error("Error analyzing image:", result.body);
        return false;
    }

    if (result.body.categoriesAnalysis.some(x => x.severity && x.severity > 0)) {
        console.warn("Image is not safe:", result.body.categoriesAnalysis);
        return false;
    }
    
    const url = `${predictionEndpoint}/customvision/v3.0/Prediction/${process.env.VISION_PREDICTION_PROJECT_ID}/classify/iterations/${encodeURIComponent(process.env.VISION_PREDICTION_PROJECT_NAME!)}/image`;
    console.log("Analyzing image with Custom Vision at URL:", url);

    const projectId = process.env.VISION_PREDICTION_PROJECT_ID;

    const predictionResult = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Prediction-Key": predictionKey,
        },
        body: imageArrayBuffer,
    });

    // const predictionResult = await fetch(url, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/octet-stream",
    //         "Prediction-Key": predictionKey,
    //     },
    //     body: imageData,
    // });

    if (!predictionResult.ok) {
        console.error("Error analyzing image with Custom Vision:", predictionResult.statusText);
        return false;
    }

    const responseBody = await predictionResult.json();
    console.log("Custom Vision response:", responseBody);

    return true;
}