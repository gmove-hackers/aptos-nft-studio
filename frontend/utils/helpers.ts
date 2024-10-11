export const dateToSeconds = (date: Date | undefined) => {
  if (!date) return;
  const dateInSeconds = Math.floor(+date / 1000);
  return dateInSeconds;
};

export const APT_DECIMALS = 8;

export const convertAmountFromHumanReadableToOnChain = (value: number, decimal: number) => {
  return value * Math.pow(10, decimal);
};

export const validateSequentialFilenames = (files: File[], extension: string, feature?: string) => {
  files.forEach((file, index) => {
    let filename = file.name.replace(`.${extension}`, "");
    if (feature) {
      filename = filename.replace(feature, "");
    }
    const fileNumber = parseInt(filename, 10);
    if (fileNumber !== index + 1) {
      throw new Error(
        `Filenames are not sequential. Expected ${feature ?? ""}${index + 1}.${extension} but found ${file.name}`,
      );
    }
  });
};
