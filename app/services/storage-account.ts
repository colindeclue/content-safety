"use server";

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export const uploadImage = async (
  imageData: string,
  fileName: string,
  containerName: string | null = null
) => {
  const credential = new StorageSharedKeyCredential(
    process.env.STORAGE_ACCOUNT_NAME || "",
    process.env.STORAGE_ACCOUNT_KEY || ""
  );
  const blobServiceClient = new BlobServiceClient(
    `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    credential
  );
  const containerClient = blobServiceClient.getContainerClient(
    containerName || process.env.STORAGE_CONTAINER_NAME || ""
  );
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  try {
    await blockBlobClient.upload(imageData, imageData.length);
    console.log(`Image uploaded successfully: ${fileName}`);
  } catch (error) {
    console.error(`Error uploading image: ${fileName}`, error);
    throw new Error(`Failed to upload image: ${fileName}`);
  }
};
