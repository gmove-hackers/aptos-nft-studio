import { create } from "ipfs-http-client";
import { ImportCandidate } from "node_modules/ipfs-core-types/dist/src/utils";
import { validateSequentialFilenames } from "./helpers";

const projectId = "2Xi31agz7M8y7BuefMlhbswjv3L";
const projectSecret = "1d72178ee211645564992adfd6ddc6f2";

// Configure the IPFS client
export const ipfs = create({
  host: "ipfs.infura.io", // You can use Infura or your own IPFS node
  port: 5001,
  protocol: "https",
  headers: {
    authorization: "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64"),
  },
});

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
