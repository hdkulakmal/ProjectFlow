// Input validation helpers shared by controllers. They throw HttpError(400)
// with a clear message instead of letting bad input reach MongoDB.
const mongoose = require("mongoose");
const HttpError = require("./httpError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const isObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ||
  (typeof value === "string" && OBJECT_ID_RE.test(value));

const objectId = (value, label = "id") => {
  if (!isObjectId(value)) throw new HttpError(400, `Invalid ${label}`);
  return String(value);
};

const isEmail = (value) => typeof value === "string" && EMAIL_RE.test(value.trim());

const normalizeEmail = (value) => String(value).trim().toLowerCase();

// Required or optional trimmed string with length limits.
const text = (value, label, { required = true, min = 1, max = 5000 } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text`);
  const trimmed = value.trim();
  if (required && trimmed.length < min) {
    throw new HttpError(400, `${label} is required`);
  }
  if (trimmed.length > max) {
    throw new HttpError(400, `${label} must be at most ${max} characters`);
  }
  return trimmed;
};

const integer = (value, label, { min, max, required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw new HttpError(400, `${label} must be a whole number`);
  if (min !== undefined && n < min) throw new HttpError(400, `${label} must be at least ${min}`);
  if (max !== undefined && n > max) throw new HttpError(400, `${label} must be at most ${max}`);
  return n;
};

const date = (value, label, { required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required`);
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${label} must be a valid date`);
  return d;
};

const oneOf = (value, label, allowed, { required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required`);
    return undefined;
  }
  if (!allowed.includes(value)) {
    throw new HttpError(400, `${label} must be one of: ${allowed.join(", ")}`);
  }
  return value;
};

const PASSWORD_MIN = 8;
const password = (value, label = "Password") => {
  if (typeof value !== "string" || value.length < PASSWORD_MIN) {
    throw new HttpError(400, `${label} must be at least ${PASSWORD_MIN} characters`);
  }
  if (value.length > 128) throw new HttpError(400, `${label} is too long`);
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new HttpError(400, `${label} must contain at least one letter and one number`);
  }
  return value;
};

// Express 5 leaves req.body undefined when no body was sent.
const body = (req) => req.body || {};

// Parse ?page=&limit= safely.
const pagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = {
  isObjectId,
  objectId,
  isEmail,
  normalizeEmail,
  text,
  integer,
  date,
  oneOf,
  password,
  body,
  pagination,
  escapeRegex,
  PASSWORD_MIN,
};
