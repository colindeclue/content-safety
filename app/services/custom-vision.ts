"use server";

import { TrainingAPIClient } from "@azure/cognitiveservices-customvision-training";
import * as msRest from "@azure/ms-rest-js";
import * as fs from "fs"
import * as util from "util";
import { Project } from "@azure/cognitiveservices-customvision-training/esm/models";

export const uploadImagesOnce = async() => {
    const trainingKey = process.env.VISION_TRAINING_KEY;
    const trainingEndpoint = process.env.VISION_TRAINING_ENDPOINT;
    const predictionResourceId = process.env.VISION_PREDICTION_RESOURCE_ID;
    if (!trainingKey || !trainingEndpoint || !predictionResourceId) {
        console.error("Custom Vision keys or endpoints are not set.");
        return;
    }
    const trainingCredentials = new msRest.ApiKeyCredentials({ inHeader: { "Training-key": trainingKey } });
    const trainingClient = new TrainingAPIClient(trainingCredentials, trainingEndpoint);

    const projectName = "MLSPOC Custom Vision";
    const existingProjects = await trainingClient.getProjects();
    let project : Project;
    const projectExists = existingProjects.some(project => project.name === projectName);
    // if (projectExists) {
    //     console.log("Project already exists, skipping creation.");
    //     return;
    // }

    if(!projectExists) {
        const setTimeoutPromise = util.promisify(setTimeout);

        project = projectExists ? existingProjects.find(project => project.name === projectName)! : await trainingClient.createProject(projectName);
        console.log("Created project:", project!.id);
        const tagNames = [
            "Age Restricted Images", 
            "Blur Images",
            "Incomplete Images", 
            "NFL Related Images", 
            "Patient Care Images",
            "Screenshot Images",
            "Syringe Visible Images",
            "Watermark Images",
            "Negative"
        ];
        const tags = await Promise.all(tagNames.map(name => trainingClient.createTag(project!.id!, name )));
        // const tags = await Promise.all(tagNames.map(name => trainingClient.getTags(project!.id!).then(tags => {
        //     const existingTag = tags.find(tag => tag.name === name);
        //     if (existingTag) {
        //         console.log(`Tag already exists: ${name}`);
        //     }
        //     return existingTag || trainingClient.createTag(project!.id!, name);
        // })));

        console.log("Created tags:", tags.map(tag => tag.name));
        const imagesDir = "images";

        for (const tag of tags) {
            const tagDir = `public/${imagesDir}/${tag.name}`;
            if (!fs.existsSync(tagDir)) {
                console.warn(`Directory for tag ${tag.name} does not exist: ${tagDir}`);
                continue;
            }
            console.log(`Uploading images for tag: ${tag.name}`);
            const files = fs.readdirSync(tagDir);
            let count = 0;
            for (const file of files) {
                console.log(`Uploading file: ${file} for tag: ${tag.name}`);
                const filePath = `${tagDir}/${file}`;
                const imageData = fs.readFileSync(filePath);
                await retry(10, 5000, () => trainingClient.createImagesFromData(project!.id!, imageData, { tagIds: [tag.id!] }));
                count++;
                if(count === 2) {
                    count = 0;
                    console.log("Waiting for 1 second to avoid rate limiting...");
                    await setTimeoutPromise(1000, null); // Wait for 10 seconds
                }
            }
        }

        console.log("Training...");
        let trainingIteration = await retry(3, 10000, () => trainingClient.trainProject(project!.id!));
        while (trainingIteration.status === "Training") {
            console.log("Training in progress...");
            await setTimeoutPromise(10000, null); // Wait for 5 seconds
            trainingIteration = await trainingClient.getIteration(project!.id!, trainingIteration.id!);
        }
        if (trainingIteration.status !== "Completed") {
            console.error("Training failed:", trainingIteration.status);
            return;
        }
        console.log("Training completed successfully:", trainingIteration.id);
        const publishIteration = await trainingClient.publishIteration(
            project.id!,
            trainingIteration.id!,
            "MLSPOC Custom Vision",
            predictionResourceId
        );
        console.log("Published iteration:", publishIteration);
    }
}

function retry(maxRetries: number, delay: number, fn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
        const attempt = (retriesLeft: number) => {
            fn().then(resolve).catch((error) => {
                if (retriesLeft <= 1) {
                    console.error("Max retries reached. Error:", error);
                    reject(error);
                } else {
                    console.warn(`Retrying... (${maxRetries - retriesLeft + 1}/${maxRetries})`);
                    setTimeout(() => attempt(retriesLeft - 1), delay);
                }
            });
        };
        attempt(maxRetries);
    });
}