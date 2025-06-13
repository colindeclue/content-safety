"use client";

import { useState } from "react";
import { isImageSafe } from "./services/content-safety";
import { uploadImage } from "./services/storage-account";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUploadSimple = async (e: any) => {
    setLoading(true);
    setError(null);
    setImageData(null);
    const selectedImage = e.target.files[0];
    if (selectedImage) {
      const reader = new FileReader();
      reader.onloadstart = () => {
        console.log("Reading file...");
      };
      reader.onloadend = async (event) => {
        if (event.target && event.target.result) {
          const base64String = (event.target.result as string).split(',')[1]; // Extract base64 string from data URL
          console.log(event.target.result);
          if (await isImageSafe(base64String)) {
            await uploadImage(base64String, selectedImage.name);
            console.log("Image uploaded successfully");
            setImageData(base64String);
          } else {
            setError("Image is not safe for upload.");
            console.error("Image is not safe for upload.");
          }
        }
        setLoading(false);
      };
      reader.onerror = (error) => {
        setError(`Error reading file: ${error}`);
        console.error(`Error reading file: ${error}`);
        setLoading(false);
      }
      reader.readAsDataURL(selectedImage);
    }
    else {
      setError("No image selected.");
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <input accept=".png, .jpg, .jpeg, .gif, .bmp, .tiff, .tif" type="file" id="image-upload" onChange={handleUploadSimple} />
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {imageData && (
          <div className="flex flex-col items-center">
            <img src={`data:image/png;base64,${imageData}`} alt="Uploaded" className="max-w-full h-auto" />
            <p className="mt-4">Image uploaded successfully!</p>
          </div>
        )}
        {!imageData && !loading && !error && (
          <p className="text-gray-500">Please upload an image to get started.</p>
        )}
      </main>
    </div>
  );
}
