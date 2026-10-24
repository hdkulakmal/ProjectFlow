
const HistoricalProject = require("../model/HistoricalProject");

// Words that usually don't help identify a project's topic
const stopWords = new Set([
  "a", "an", "the", "is", "are", "to", "for",
  "of", "and", "in", "on", "with", "using",
  "system", "application", "app", "based",
  "management", "development", "platform",
  "design", "implementation", "project"
]);

const getKeywords = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

// Check a student's idea against historical projects
const checkSimilarIdeas = async (req, res) => {
  try {
    const { idea } = req.body;

    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({
        message: "Please enter a project idea",
      });
    }

    // Search the separate historical project collection
    const projects = await HistoricalProject.find().lean();

    const ideaKeywords = new Set(getKeywords(idea));

    if (ideaKeywords.size === 0) {
      return res.status(200).json({
        idea,
        count: 0,
        matches: [],
      });
    }

    const matches = projects
      .filter((project) => project.title)
      .map((project) => {
        const titleKeywords = new Set(getKeywords(project.title));

        const commonKeywords = [...ideaKeywords].filter((word) =>
          titleKeywords.has(word)
        );

        return {
          year: project.batch,
          projectName: project.title,
          groupNumber: project.groupNumber,
          sharedKeywordCount: commonKeywords.length,
        };
      })
      .filter((project) => project.sharedKeywordCount >= 1)
      .sort(
        (a, b) => b.sharedKeywordCount - a.sharedKeywordCount
      )
      .map(({ year, projectName, groupNumber }) => ({
        year,
        projectName,
        groupNumber,
      }));

    return res.status(200).json({
      idea,
      count: matches.length,
      matches,
    });
  } catch (error) {
    console.error("Similar idea check failed:", error);

    return res.status(500).json({
      message: "Failed to check similar ideas",
    });
  }
};

module.exports = { checkSimilarIdeas };
