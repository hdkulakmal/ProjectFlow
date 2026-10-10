
const Project = require("../model/Project");

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

// Check a student's idea against existing projects
const checkSimilarIdeas = async (req, res) => {
  try {
    const { idea } = req.body;

    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({
        message: "Please enter a project idea",
      });
    }

    const projects = await Project.find().populate("group");
    const ideaKeywords = new Set(getKeywords(idea));

    if (ideaKeywords.size === 0) {
      return res.status(200).json({
        idea,
        count: 0,
        matches: [],
      });
    }

    const matches = projects
      .filter((project) => project.group && project.title)
      .map((project) => {
        const titleKeywords = new Set(getKeywords(project.title));

        const commonKeywords = [...ideaKeywords].filter((word) =>
          titleKeywords.has(word)
        );

        // Require at least two meaningful shared keywords
        const isStrongMatch = commonKeywords.length >= 1;
        return {
          year: project.group.batch,
          projectName: project.title,
          groupNumber: project.group.groupNumber,
          isStrongMatch,
          sharedKeywordCount: commonKeywords.length,
        };
      })
      .filter((project) => project.isStrongMatch)
      .sort(
        (a, b) => b.sharedKeywordCount - a.sharedKeywordCount
      )
      .map(({ year, projectName, groupNumber }) => ({
        year,
        projectName,
        groupNumber,
      }));

    res.status(200).json({
      idea,
      count: matches.length,
      matches,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check similar ideas",
      error: error.message,
    });
  }
};

module.exports = { checkSimilarIdeas };
