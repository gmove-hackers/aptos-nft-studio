import { ImportCandidate } from "node_modules/ipfs-core-types/dist/src/utils";
import { validateSequentialFilenames } from "./helpers";

// Get Pinata credentials from environment variables
const pinataJWT = import.meta.env.VITE_PINATA_JWT;

if (!pinataJWT) {
  throw new Error("VITE_PINATA_JWT environment variable is required");
}

// Pinata API client
const pinataUpload = async (file: File | Blob, filename?: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file, filename);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
};

// Pinata folder upload for multiple files - compatible with ipfs-http-client behavior  
const pinataUploadFolder = async (files: { path: string; content: File | Blob }[]): Promise<{ results: { path: string; cid: string }[]; directoryCid: string }> => {
  // Upload each file individually first
  const results: { path: string; cid: string }[] = [];

  for (const { path, content } of files) {
    const hash = await pinataUpload(content, path);
    results.push({ path, cid: hash });
  }

  // Since Pinata doesn't support true directory structures like IPFS,
  // we'll use the last uploaded file's CID as the "directory" CID
  // This is a limitation but maintains API compatibility
  const directoryCid = results[results.length - 1]?.cid || "";
  
  return { results, directoryCid };
};

// Get Pinata gateway URL from environment or use default
const pinataGateway = import.meta.env.VITE_PINATA_GATEWAY || "gateway.pinata.cloud";

// Create compatibility layer for existing ipfs-http-client usage
export const ipfs = {
  add: async (
    file: File | { path: string; content: File },
    path?: string,
  ): Promise<{ cid: { toString: () => string } }> => {
    if (file instanceof File) {
      const hash = await pinataUpload(file, path || file.name);
      return { cid: { toString: () => hash } };
    } else {
      // Handle object with path and content
      const hash = await pinataUpload(file.content, file.path);
      return { cid: { toString: () => hash } };
    }
  },
  addAll: async function* (
    files: ImportCandidate[],
    options?: { wrapWithDirectory?: boolean },
  ): AsyncGenerator<{ cid: { toString: () => string }; path?: string }> {
    const formattedFiles = files.map((file) => {
      if (typeof file === "string") {
        // Handle string content
        return {
          path: "file",
          content: new File([file], "file"),
        };
      } else if (file instanceof File || file instanceof Blob) {
        // Handle File/Blob content
        return {
          path: file instanceof File ? file.name || "file" : "file",
          content: file instanceof File ? file : new File([file], "file"),
        };
      } else if (typeof file === "object" && file !== null) {
        // Handle object with path and content
        const path = "path" in file ? file.path || "file" : "file";
        let content: File;

        if ("content" in file && file.content) {
          if (file.content instanceof File || file.content instanceof Blob) {
            content = file.content instanceof File ? file.content : new File([file.content], path);
          } else if (typeof file.content === "string") {
            content = new File([file.content], path);
          } else {
            content = new File([new Uint8Array(file.content as any)], path);
          }
        } else {
          content = new File([""], path);
        }

        return { path, content };
      } else {
        // Fallback
        return {
          path: "file",
          content: new File([String(file)], "file"),
        };
      }
    });

    const { results, directoryCid } = await pinataUploadFolder(formattedFiles);
    
    // Yield individual file results first (like ipfs-http-client does)
    for (const result of results) {
      yield { 
        cid: { toString: () => result.cid },
        path: result.path
      };
    }
    
    // If wrapWithDirectory is true, yield the directory CID last
    if (options?.wrapWithDirectory) {
      yield { 
        cid: { toString: () => directoryCid }
      };
    }
  },
  cat: async function* (cid: string): AsyncGenerator<Uint8Array> {
    // Fetch content from Pinata gateway
    const url = `https://${pinataGateway}/ipfs/${cid}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
      }
      
      // Get the response body as a ReadableStream and convert to async iterable
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('No response body available');
      }
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error(`Error fetching IPFS content for CID ${cid}:`, error);
      throw error;
    }
  },
};

// Define the features you want to handle
export const FEATURES = [
  {
    name: "combination",
    keyName: "combinations",
  },
  {
    name: "evolution",
    keyName: "evolutions",
  },
] as const;

const VALID_MEDIA_EXTENSIONS = ["png", "jpg", "jpeg", "gltf"] as const;

export type CollectionMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
};

type ImageAttribute = {
  trait_type: string;
  value: string;
};

type ImageFeatures = {
  [feature in (typeof FEATURES)[number]["keyName"]]?: {
    [key: string]: string;
  };
};

export type ImageMetadata = ImageFeatures & {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: ImageAttribute[];
};

export const uploadCollectionData = async (
  // aptosWallet: any,
  fileList: FileList,
): Promise<{
  collectionName: string;
  collectionDescription: string;
  maxSupply: number;
  projectUri: string;
}> => {
  const files: File[] = [];
  for (let i = 0; i < fileList.length; i++) {
    files.push(fileList[i]);
  }

  const collectionFiles = files.filter((file) => file.name.includes("collection"));
  if (collectionFiles.length !== 2) {
    throw new Error("Please make sure you include both collection.json and collection image file");
  }

  const collectionMetadataFile = collectionFiles.find((file) => file.name === "collection.json");
  if (!collectionMetadataFile) {
    throw new Error("Collection metadata not found, please make sure you include collection.json file");
  }

  const collectionCover = collectionFiles.find((file) =>
    VALID_MEDIA_EXTENSIONS.some((ext) => file.name.endsWith(`.${ext}`)),
  );
  if (!collectionCover) {
    throw new Error("Collection cover not found, please make sure you include the collection image file");
  }

  const mediaExt = collectionCover.name.split(".").pop();
  // Sort and validate nftImageMetadatas to ensure filenames are sequential
  const nftImageMetadatas = files
    .filter(
      (file) =>
        file.name.endsWith("json") &&
        file.name !== "collection.json" &&
        !FEATURES.some((feature) => file.name.toLowerCase().includes(feature.name)), // Exclude feature files
    )
    .sort((a, b) => {
      const getFileNumber = (file: File) => parseInt(file.name.replace(".json", ""), 10);

      const numA = getFileNumber(a);
      const numB = getFileNumber(b);

      return numA - numB; // Sort by the numeric part of the filenames
    });
  if (nftImageMetadatas.length === 0) {
    throw new Error("Image metadata not found, please make sure you include the NFT json files");
  }
  // Validate that nftImageMetadatas filenames start from 1 and are sequential
  validateSequentialFilenames(nftImageMetadatas, "json");

  const imageFiles = files
    .filter(
      (file) =>
        file.name.endsWith(`.${mediaExt}`) &&
        file.name !== collectionCover.name &&
        !FEATURES.some((feature) => file.name.toLowerCase().includes(feature.name)), // Exclude feature files
    )
    .sort((a, b) => {
      const getFileNumber = (file: File) => parseInt(file.name.replace(`.${mediaExt}`, ""), 10);

      const numA = getFileNumber(a);
      const numB = getFileNumber(b);

      return numA - numB; // Sort by the numeric part of the filenames
    });
  if (imageFiles.length === 0) {
    throw new Error("Image files not found, please make sure you include the NFT image files");
  }
  if (nftImageMetadatas.length !== imageFiles.length) {
    throw new Error("Mismatch between NFT metadata json files and images files");
  }
  // Validate that imageFiles filenames start from 1 and are sequential
  validateSequentialFilenames(imageFiles, mediaExt ?? "");

  // Iterate over each feature to handle their metadata and image files
  const featureData = FEATURES.map((feature) => {
    const name = feature.name;

    const featureMetadatas = files
      .filter((file) => file.name.endsWith("json") && file.name.includes(name))
      .sort((a, b) => {
        const getFeatureNumber = (file: File) => parseInt(file.name.replace(name, "").replace(".json", ""), 10);

        const numA = getFeatureNumber(a);
        const numB = getFeatureNumber(b);

        return numA - numB; // Sort by the numeric part of the feature filenames
      });

    const featureImageFiles = files
      .filter((file) => file.name.endsWith(`.${mediaExt}`) && file.name.includes(name))
      .sort((a, b) => {
        const getFeatureNumber = (file: File) => parseInt(file.name.replace(name, "").replace(`.${mediaExt}`, ""), 10);

        const numA = getFeatureNumber(a);
        const numB = getFeatureNumber(b);

        return numA - numB; // Sort by the numeric part of the feature filenames
      });

    // Validate feature filenames
    if (featureMetadatas.length !== featureImageFiles.length) {
      throw new Error(`Mismatch between ${name} metadata json files and images files`);
    }
    if (featureMetadatas.length === 0) return null;
    validateSequentialFilenames(featureMetadatas, "json", name);
    validateSequentialFilenames(featureImageFiles, mediaExt ?? "", name);

    return {
      feature,
      metadataFiles: featureMetadatas,
      imagesFiles: featureImageFiles,
    };
  }).filter((v) => v !== null);

  // Upload images and metadata to IPFS
  // const ipfsUploads: { path: string; cid: string }[] = [];
  const uploadFileToIpfs = async (file: File, path?: string) => {
    const added = await ipfs.add(path ? { path, content: file } : file);
    return added.cid.toString();
  };

  const filesToUpload: ImportCandidate[] = [];

  const imageFolderCid = await uploadFileToIpfs(collectionCover);

  const updatedCollectionMetadata: CollectionMetadata = JSON.parse(await collectionMetadataFile.text());
  updatedCollectionMetadata.image = `ipfs://${imageFolderCid}`;

  // Step 1: Upload feature files and store their CIDs
  // Initialize maps to hold CIDs for each feature
  const featureCidMaps: ImageFeatures = {};
  featureData.forEach((data) => {
    featureCidMaps[data.feature.keyName] = {};
  });

  await Promise.all(
    featureData.map(async (data) => {
      const { feature, metadataFiles, imagesFiles } = data;

      await Promise.all(
        metadataFiles.map(async (metadataFile, index) => {
          const metadata: ImageMetadata = JSON.parse(await metadataFile.text());
          const imageFile = imagesFiles[index];

          // Upload feature image file
          const imageCid = await uploadFileToIpfs(imageFile);
          metadata.image = `ipfs://${imageCid}`;

          // Upload feature metadata file
          const updatedMetadataFile = new File([JSON.stringify(metadata)], `${feature.name}${index + 1}.json`, {
            type: metadataFile.type,
          });
          const metadataCid = await uploadFileToIpfs(updatedMetadataFile);
          featureCidMaps[feature.keyName]![metadata.name] = metadataCid;

          filesToUpload.push({ path: `${feature.name}${index + 1}.json`, content: updatedMetadataFile });
        }),
      );
    }),
  );

  // Step 2: Upload main image files and corresponding metadata files
  await Promise.all(
    nftImageMetadatas.map(async (metadataFile, index) => {
      const metadata: ImageMetadata = JSON.parse(await metadataFile.text());
      const imageFile = imageFiles[index];

      // Upload image file
      const imageCid = await uploadFileToIpfs(imageFile);
      metadata.image = `ipfs://${imageCid}`;

      // Check for features and match the feature metadata with the uploaded feature CID
      featureData.forEach((data) => {
        const keyName = data.feature.keyName;
        const metadataFeature = metadata[keyName];
        if (metadataFeature) {
          Object.keys(metadataFeature).forEach((featureKey) => {
            if (featureCidMaps[keyName]![featureKey]) {
              metadataFeature[featureKey] = `ipfs://${featureCidMaps[keyName]![featureKey]}`;
            }
          });
        }
      });

      // Create updated metadata file
      const updatedMetadataFile = new File([JSON.stringify(metadata)], `${index + 1}.json`, {
        type: metadataFile.type,
      });
      filesToUpload.push({ path: `${index + 1}.json`, content: updatedMetadataFile });
    }),
  );

  // Step 3: Add the collection.json file to the filesToUpload list
  const updatedCollectionFile = new File([JSON.stringify(updatedCollectionMetadata)], "collection.json", {
    type: collectionMetadataFile.type,
  });
  filesToUpload.push({ path: "collection.json", content: updatedCollectionFile });

  // Step 4: Upload all files in a single request to IPFS
  let folderCid = "";

  for await (const result of ipfs.addAll(filesToUpload, { wrapWithDirectory: true })) {
    folderCid = result.cid.toString(); // Store the final folder CID
  }

  return {
    projectUri: `ipfs://${folderCid}/collection.json`,
    maxSupply: imageFiles.length,
    collectionName: updatedCollectionMetadata.name,
    collectionDescription: updatedCollectionMetadata.description,
  };
};
