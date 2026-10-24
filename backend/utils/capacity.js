const Group = require("../model/Group");
const Supervisor = require("../model/Supervisor");
const Setting = require("../model/Setting");

const FALLBACK_CAPACITY = 5; // used until the Coordinator sets a default
const DEFAULT_KEY = "defaultSupervisorCapacity";

const getDefaultCapacity = async (session) => {
  const setting = await Setting.findOne({ key: DEFAULT_KEY }).session(session || null).lean();
  return Number.isInteger(setting?.value) ? setting.value : FALLBACK_CAPACITY;
};

const setDefaultCapacitySetting = (value, userId) =>
  Setting.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { value, updatedBy: userId },
    { upsert: true, returnDocument: "after" }
  );

const getCapacity = async (supervisorId, session) => {
  const profile = await Supervisor.findOne({ user: supervisorId }).session(session || null).lean();
  return profile ? profile.capacity : getDefaultCapacity(session);
};

const countAssigned = (supervisorId, session) =>
  Group.countDocuments({ supervisor: supervisorId }).session(session || null);

module.exports = {
  FALLBACK_CAPACITY,
  getDefaultCapacity,
  setDefaultCapacitySetting,
  getCapacity,
  countAssigned,
};
