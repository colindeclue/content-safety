"use server";

import { AzureKeyCredential } from "@azure/core-auth";
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";

export const isImageSafe = async (imageData: string) => {
    const endpoint = process.env.CONTENT_SAFETY_ENDPOINT;
    const key = process.env.CONTENT_SAFETY_KEY;
    if (!endpoint || !key) {
        console.error("Content safety endpoint or key is not set.");
        return false;
    }

    const credential = new AzureKeyCredential(key);

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

    const incidentResult = await fetch(`${endpoint}contentsafety/image:detectIncidents?api-version=2024-02-15-preview`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": key,
            },
            body: JSON.stringify({ image: { content: imageData }, incidentNames: ["blurry-images"] }),
        }
    );

    if (!incidentResult.ok) {
        console.error("Error detecting incidents:", incidentResult);
        return false;
    }

    const incidentsData = await incidentResult.json();

    if (incidentsData.incidentMatches && incidentsData.incidentMatches.length > 0) {
        console.warn("Image contains incidents:", incidentsData.incidentMatches);
        return false;
    }

    return true;
}