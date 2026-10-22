
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const dotenv = require("dotenv");
const path = require("path");

const Group = require("./model/Group");
const Project = require("./model/Project");

dotenv.config();

const excelPath = path.join(__dirname, "All Project Titles.xlsx");

async function importProjects() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    const workbook = xlsx.readFile(excelPath);
    let imported = 0;
    let skipped = 0;

    for (const sheetName of workbook.SheetNames) {
      const year = Number(sheetName);
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

        if (!groupKey || !titleKey || !row[groupKey] || !row[titleKey]) {
          skipped++;
          continue;
        }

        const groupNumber = Number(
          String(row[groupKey]).match(/\d+/)?.[0]
        );
        const title = String(row[titleKey]).trim();

        if (!Number.isInteger(groupNumber) || !title) {
          skipped++;
          continue;
        }

        const batch = String(year);

        let group = await Group.findOne({
          groupNumber,
          batch,
        });

        if (!group) {
          group = await Group.create({
            groupNumber,
            batch,
          });
        }

        const existingProject = await Project.findOne({
          group: group._id,
        });

        if (existingProject) {
          console.log(`Skipped existing project: ${batch}, Group ${groupNumber}`);
          skipped++;
          continue;
        }

        const project = await Project.create({
          title,
          group: group._id,
        });

        group.project = project._id;
        await group.save();

        imported++;
        console.log(`Imported ${batch} - Group ${groupNumber}: ${title}`);
      }
    }

    console.log("\nImport finished!");
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error("Import failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

importProjects();
