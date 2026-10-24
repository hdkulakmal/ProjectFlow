// Pure keyword matching used by the Project Idea / Project Comparison features.

// Words that usually don't help identify a project's topic
const stopWords = new Set([
  "a", "an", "the", "is", "are", "to", "for",
  "of", "and", "in", "on", "with", "using",
  "system", "application", "app", "based",
  "management", "development", "platform",
  "design", "implementation", "project",
]);

const getKeywords = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

// A project counts as similar when its title shares at least
// MIN_SHARED_KEYWORDS meaningful words with the idea (same rule as before).
const MIN_SHARED_KEYWORDS = 1;

/**
 * projects: [{ _id, title, group: { batch, groupNumber } }]
 * Returns matches sorted by the number of shared keywords (most similar first).
 */
const findSimilarProjects = (idea, projects, { excludeProjectIds = [] } = {}) => {
  const ideaKeywords = new Set(getKeywords(idea));
  if (ideaKeywords.size === 0) return [];
  const excluded = new Set(excludeProjectIds.map(String));

  return projects
    .filter((project) => project.group && project.title && !excluded.has(String(project._id)))
    .map((project) => {
      const titleKeywords = new Set(getKeywords(project.title));
      const sharedKeywords = [...ideaKeywords].filter((word) => titleKeywords.has(word));
      return { project, sharedKeywords };
    })
    .filter(({ sharedKeywords }) => sharedKeywords.length >= MIN_SHARED_KEYWORDS)
    .sort((a, b) => b.sharedKeywords.length - a.sharedKeywords.length)
    .map(({ project, sharedKeywords }) => ({
      projectId: project._id,
      year: project.group.batch,
      projectName: project.title,
      groupNumber: project.group.groupNumber,
      sharedKeywords,
    }));
};

module.exports = { getKeywords, findSimilarProjects, MIN_SHARED_KEYWORDS, stopWords };
