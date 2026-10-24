
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const dotenv = require("dotenv");
const path = require("path");

const HistoricalProject = require("./model/HistoricalProject");

dotenv.config();

const excelPath = path.join(__dirname, "All Project Titles.xlsx");

async function importProjects() {
  let connected = false;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    connected = true;
    console.log("MongoDB connected successfully");

    const workbook = xlsx.readFile(excelPath);

    let imported = 0;
    let skipped = 0;

    for (const sheetName of workbook.SheetNames) {
      // Only process sheets named with a year, such as 2022 or 2025
      const year = Number(sheetName);

      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        console.log(`Skipped non-year sheet: ${sheetName}`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];

      const rows = xlsx.utils.sheet_to_json(sheet, {
        defval: "",
      });

      for (const row of rows) {
        const groupKey = Object.keys(row).find((key) =>
          key.toLowerCase().includes("group")
        );

        const titleKey = Object.keys(row).find((key) =>
          key.toLowerCase().includes("title")
        );

        if (
          !groupKey ||
          !titleKey ||
          !row[groupKey] ||
          !row[titleKey]
        ) {
          skipped++;
          continue;
        }

        const groupNumber = Number(
          String(row[groupKey]).match(/\d+/)?.[0]
        );

        const title = String(row[titleKey]).trim();
        const batch = String(year);

        if (!Number.isInteger(groupNumber) || !title) {
          skipped++;
          continue;
        }

        // Avoid importing the same batch/group more than once
        const existingProject = await HistoricalProject.findOne({
          batch,
          groupNumber,
        });

        if (existingProject) {
          console.log(
            `Skipped existing historical record: ${batch}, Group ${groupNumber}`
          );
          skipped++;
          continue;
        }

        await HistoricalProject.create({
          title,
          batch,
          groupNumber,
        });

        imported++;

        console.log(
          `Imported historical project: ${batch}, Group ${groupNumber}: ${title}`
        );
      }
    }

    console.log("\nHistorical import finished!");
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error("Historical import failed:", error.message);
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
}

importProjects();
