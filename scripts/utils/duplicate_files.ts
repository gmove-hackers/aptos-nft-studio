import * as fs from "fs/promises";
import * as path from "path";

const SOURCE_DIR = path.join(__dirname, "../../resources/sample_evolution_collection");
const SOURCE_PNG = "1.png";
const SOURCE_JSON = "1.json";
const START_INDEX = 2;
const END_INDEX = 100;

async function duplicateFiles() {
  try {
    // Check if source files exist
    const sourcePngPath = path.join(SOURCE_DIR, SOURCE_PNG);
    const sourceJsonPath = path.join(SOURCE_DIR, SOURCE_JSON);

    await fs.access(sourcePngPath);
    await fs.access(sourceJsonPath);

    console.log(`Source files found: ${SOURCE_PNG}, ${SOURCE_JSON}`);

    for (let i = START_INDEX; i <= END_INDEX; i++) {
      const targetPng = `${i}.png`;
      const targetJson = `${i}.json`;

      const targetPngPath = path.join(SOURCE_DIR, targetPng);
      const targetJsonPath = path.join(SOURCE_DIR, targetJson);

      // Copy PNG file
      try {
        await fs.copyFile(sourcePngPath, targetPngPath);
        console.log(`Copied ${SOURCE_PNG} to ${targetPng}`);
      } catch (err) {
        console.error(`Error copying to ${targetPng}:`, err);
      }

      // Copy JSON file
      try {
        await fs.copyFile(sourceJsonPath, targetJsonPath);
        console.log(`Copied ${SOURCE_JSON} to ${targetJson}`);
      } catch (err) {
        console.error(`Error copying to ${targetJson}:`, err);
      }
    }

    console.log("File duplication completed successfully.");
  } catch (err) {
    console.error("Error accessing source files:", err);
  }
}

duplicateFiles();
