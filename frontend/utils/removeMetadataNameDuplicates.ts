import { ImageMetadata } from "@/utils/assetsUploader";

export function removeMetadataNameDuplicates(images: ImageMetadata[]) {
  const seenNames = new Set<string>();

  return images.filter((image) => {
    if (seenNames.has(image.name)) {
      return false;
    } else {
      seenNames.add(image.name);
      return true;
    }
  });
}
