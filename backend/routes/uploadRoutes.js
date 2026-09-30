const express = require("express");
const multer = require("multer");

const { uploadExcelOrCsv } = require("../controller/uploadController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.single("file"), uploadExcelOrCsv);

module.exports = router;
