const XLSX = require("xlsx");

const uploadExcelOrCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Excel or CSV file is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    res.status(200).json({
      message: "File uploaded successfully",
      sheet: sheetName,
      totalRows: data.length,
      data,
    });
  } catch (error) {
    console.error("Upload error:", error);

    res.status(500).json({
      message: "Failed to process file",
    });
  }
};

module.exports = {
  uploadExcelOrCsv,
};
