// Pure logic for the Coordinator's Excel/CSV group import.
// No database access here, so it can be unit-tested without MongoDB.
//
// Supported columns (case, spaces and underscores are ignored):
//   Email               (or RegistrationNumber) - identifies a registered Student
//   GroupNumber         (also "Group Number", "Group No")
//   Batch               e.g. 2026 or TEST2026

const MAX_ROWS = 2000;
const MAX_ERRORS = 100;

const HEADER_ALIASES = {
  email: ["email", "emailaddress", "studentemail"],
  registrationNumber: ["registrationnumber", "registrationno", "regno", "regnumber"],
  groupNumber: ["groupnumber", "groupno", "group"],
  batch: ["batch"],
};

const normalizeHeader = (key) => String(key).toLowerCase().replace(/[\s_\-.]/g, "");

const pick = (normalizedRow, field) => {
  for (const alias of HEADER_ALIASES[field]) {
    if (Object.prototype.hasOwnProperty.call(normalizedRow, alias)) return normalizedRow[alias];
  }
  return undefined;
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

/**
 * Validates spreadsheet rows (as returned by xlsx.utils.sheet_to_json with defval "").
 * Returns { assignments, errors }. Row numbers match what the user sees in Excel
 * (row 1 is the header).
 */
const parseRows = (rows) => {
  const errors = [];
  const assignments = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return { assignments, errors: [{ row: null, message: "The uploaded file is empty." }] };
  }
  if (rows.length > MAX_ROWS) {
    return {
      assignments,
      errors: [{ row: null, message: `Too many rows (${rows.length}). The limit is ${MAX_ROWS}.` }],
    };
  }

  const headers = new Set(Object.keys(rows[0]).map(normalizeHeader));
  const has = (field) => HEADER_ALIASES[field].some((a) => headers.has(a));
  if (!(has("email") || has("registrationNumber")) || !has("groupNumber") || !has("batch")) {
    return {
      assignments,
      errors: [
        {
          row: 1,
          message:
            "Missing columns. Required: Email (or RegistrationNumber), GroupNumber, Batch.",
        },
      ],
    };
  }

  const seenEmails = new Map();
  const seenRegNos = new Map();

  rows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const row = {};
    for (const [key, value] of Object.entries(raw)) row[normalizeHeader(key)] = value;

    if (Object.values(row).every(isBlank)) return; // ignore empty lines

    const rowErrors = [];
    const emailRaw = pick(row, "email");
    const regRaw = pick(row, "registrationNumber");
    const groupRaw = pick(row, "groupNumber");
    const batchRaw = pick(row, "batch");

    const email = isBlank(emailRaw) ? null : String(emailRaw).trim().toLowerCase();
    const registrationNumber = isBlank(regRaw) ? null : String(regRaw).trim();
    const batch = isBlank(batchRaw) ? "" : String(batchRaw).trim();
    const groupNumber = Number(String(groupRaw ?? "").trim());

    if (!email && !registrationNumber) rowErrors.push("Email or RegistrationNumber is required");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) rowErrors.push(`Invalid email "${email}"`);
    if (isBlank(groupRaw) || !Number.isInteger(groupNumber) || groupNumber < 1) {
      rowErrors.push("GroupNumber must be a whole number of 1 or more");
    }
    if (!batch) rowErrors.push("Batch is required");
    if (batch.length > 50) rowErrors.push("Batch is too long");

    if (email) {
      if (seenEmails.has(email)) rowErrors.push(`Duplicate email (also on row ${seenEmails.get(email)})`);
      else seenEmails.set(email, rowNumber);
    }
    if (registrationNumber) {
      if (seenRegNos.has(registrationNumber)) {
        rowErrors.push(`Duplicate registration number (also on row ${seenRegNos.get(registrationNumber)})`);
      } else seenRegNos.set(registrationNumber, rowNumber);
    }

    if (rowErrors.length) {
      errors.push({ row: rowNumber, message: rowErrors.join("; ") });
    } else {
      assignments.push({ row: rowNumber, email, registrationNumber, groupNumber, batch });
    }
  });

  if (!assignments.length && !errors.length) {
    errors.push({ row: null, message: "The uploaded file has no data rows." });
  }

  return { assignments, errors: errors.slice(0, MAX_ERRORS) };
};

const keyOf = (batch, groupNumber) => `${batch}::${groupNumber}`;
const str = (v) => String(v && v._id ? v._id : v);
const sameSet = (a, b) => {
  const sa = new Set(a.map(str));
  const sb = new Set(b.map(str));
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
};

/**
 * Builds the import plan.
 *  assignments:      from parseRows
 *  students:         User docs (role Student) matching the sheet's emails / reg numbers
 *  existingGroups:   Group docs for every (batch, groupNumber) in the sheet
 *  currentGroups:    Group docs that currently contain any of the matched students
 * Returns { errors, conflicts, plannedGroups }. Nothing is written.
 */
const planImport = ({ assignments, students, existingGroups, currentGroups }) => {
  const errors = [];
  const conflicts = [];

  const byEmail = new Map(students.filter((s) => s.email).map((s) => [s.email.toLowerCase(), s]));
  const byReg = new Map(
    students.filter((s) => s.registrationNumber).map((s) => [String(s.registrationNumber), s])
  );

  const seenUsers = new Map();
  const groupMap = new Map();

  for (const a of assignments) {
    const fromEmail = a.email ? byEmail.get(a.email) : null;
    const fromReg = a.registrationNumber ? byReg.get(a.registrationNumber) : null;
    const label = a.email || a.registrationNumber;

    if (a.email && !fromEmail) {
      errors.push({ row: a.row, message: `No registered Student account with email ${a.email}` });
      continue;
    }
    if (!a.email && !fromReg) {
      errors.push({
        row: a.row,
        message: `No registered Student with registration number ${a.registrationNumber}`,
      });
      continue;
    }
    if (fromEmail && a.registrationNumber && (!fromReg || str(fromReg) !== str(fromEmail))) {
      errors.push({ row: a.row, message: `Email and registration number belong to different students (${label})` });
      continue;
    }

    const student = fromEmail || fromReg;
    if (student.isActive === false) {
      errors.push({ row: a.row, message: `Student account ${label} is deactivated` });
      continue;
    }
    const uid = str(student._id);
    if (seenUsers.has(uid)) {
      errors.push({ row: a.row, message: `The same student appears twice (also on row ${seenUsers.get(uid)})` });
      continue;
    }
    seenUsers.set(uid, a.row);

    const key = keyOf(a.batch, a.groupNumber);
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, batch: a.batch, groupNumber: a.groupNumber, members: [], memberRows: [] });
    }
    groupMap.get(key).members.push(student._id);
    groupMap.get(key).memberRows.push({ row: a.row, userId: uid, email: student.email });
  }

  const existingByKey = new Map(existingGroups.map((g) => [keyOf(g.batch, g.groupNumber), g]));

  // A student may only be in one group. Moving a student is allowed only when
  // their current group is also part of this upload (so it is rewritten too).
  const plannedKeys = new Set(groupMap.keys());
  for (const current of currentGroups) {
    const currentKey = keyOf(current.batch, current.groupNumber);
    if (plannedKeys.has(currentKey)) continue;
    for (const memberId of current.members || []) {
      const uid = str(memberId);
      if (!seenUsers.has(uid)) continue;
      conflicts.push({
        row: seenUsers.get(uid),
        batch: current.batch,
        groupNumber: current.groupNumber,
        message: `Student is already in group ${current.groupNumber} (batch ${current.batch}), which is not in this file`,
      });
    }
  }

  const plannedGroups = [];
  for (const planned of groupMap.values()) {
    const existing = existingByKey.get(planned.key);
    if (!existing) {
      plannedGroups.push({ ...planned, action: "create", existingId: null, removedMembers: [], addedMembers: planned.members });
      continue;
    }

    const oldMembers = existing.members || [];
    const unchanged = sameSet(oldMembers, planned.members);

    if (existing.project && !unchanged) {
      conflicts.push({
        batch: planned.batch,
        groupNumber: planned.groupNumber,
        message: "This group already has a project. Its members cannot be changed by an upload.",
      });
    } else if (existing.supervisor && !unchanged) {
      conflicts.push({
        batch: planned.batch,
        groupNumber: planned.groupNumber,
        message: "This group already has a supervisor. Edit its members individually instead.",
      });
    }

    const newSet = new Set(planned.members.map(str));
    const oldSet = new Set(oldMembers.map(str));
    plannedGroups.push({
      ...planned,
      action: unchanged ? "unchanged" : "update",
      existingId: existing._id,
      existingUpdatedAt: existing.updatedAt,
      removedMembers: oldMembers.filter((m) => !newSet.has(str(m))),
      addedMembers: planned.members.filter((m) => !oldSet.has(str(m))),
    });
  }

  return { errors: errors.slice(0, MAX_ERRORS), conflicts: conflicts.slice(0, MAX_ERRORS), plannedGroups };
};

module.exports = { parseRows, planImport, MAX_ROWS, HEADER_ALIASES, keyOf };
