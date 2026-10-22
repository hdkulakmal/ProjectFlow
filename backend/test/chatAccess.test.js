// Run:  node --test test/chatAccess.test.js      (no database needed)
const test = require("node:test");
const assert = require("node:assert");
const { getChannelAccess, parseChannelId } = require("../utils/chatAccess");

const G = "a".repeat(24);
const U1 = "1".repeat(24);
const U2 = "2".repeat(24);
const user = (id, role, extra = {}) => ({
  _id: id,
  role,
  status: "active",
  ...extra,
});

const s1 = user("s1", "student");
const other = user("s9", "student");
const sup = user("sup1", "supervisor");
const sup2 = user("sup2", "supervisor");
const coord = user("c1", "coordinator");
const admin = user("a1", "admin");

const withSup = { members: ["s1", "s2"], supervisor: "sup1" };
const noSup = { members: ["s1", "s2"], supervisor: null };
const ch = (type) => parseChannelId(`${type}:${G}`);
const ok = (u, type, group) => getChannelAccess(u, ch(type), { group }).allowed;

test("GROUP channel: only the group's students (always open)", () => {
  assert.ok(ok(s1, "group", noSup));
  assert.ok(ok(s1, "group", withSup));
  assert.equal(ok(other, "group", withSup), false);
  assert.equal(ok(sup, "group", withSup), false);
  assert.equal(ok(coord, "group", withSup), false);
  assert.equal(ok(admin, "group", withSup), false);
});

test("SUPERVISOR channel: students + THEIR supervisor, only after acceptance", () => {
  assert.ok(ok(s1, "supervisor", withSup));
  assert.ok(ok(sup, "supervisor", withSup));
  assert.equal(ok(sup2, "supervisor", withSup), false);
  assert.equal(ok(coord, "supervisor", withSup), false);
  assert.equal(ok(other, "supervisor", withSup), false);
  assert.equal(ok(s1, "supervisor", noSup), false); // supervisor not accepted yet
  assert.match(
    getChannelAccess(s1, ch("supervisor"), { group: noSup }).reason,
    /accepts/,
  );
});

test("TRIAD channel: students + supervisor + coordinator, only after acceptance", () => {
  assert.ok(ok(s1, "triad", withSup));
  assert.ok(ok(sup, "triad", withSup));
  assert.ok(ok(coord, "triad", withSup));
  assert.equal(ok(sup2, "triad", withSup), false);
  assert.equal(ok(other, "triad", withSup), false);
  assert.equal(ok(admin, "triad", withSup), false);
  assert.equal(ok(coord, "triad", noSup), false); // channel not open yet
});

test("PRIVATE channel: only the two people, both must be chat users", () => {
  const c = parseChannelId(`private:${U2}:${U1}`);
  assert.equal(c.id, `private:${U1}:${U2}`); // canonical (sorted)
  const a = user(U1, "student");
  const b = user(U2, "coordinator");
  assert.ok(getChannelAccess(a, c, { peer: b }).allowed);
  assert.ok(getChannelAccess(b, c, { peer: a }).allowed);
  assert.equal(
    getChannelAccess(user("x".repeat(24), "student"), c, { peer: b }).allowed,
    false,
  );
  assert.equal(
    getChannelAccess(a, c, { peer: user(U2, "admin") }).allowed,
    false,
  );
  assert.equal(
    getChannelAccess(a, c, {
      peer: user(U2, "student", { status: "inactive" }),
    }).allowed,
    false,
  );
  assert.equal(getChannelAccess(a, c, { peer: null }).allowed, false);
});

test("admin and deactivated accounts never chat", () => {
  assert.equal(ok(admin, "group", withSup), false);
  assert.equal(
    ok(user("s1", "student", { status: "inactive" }), "group", withSup),
    false,
  );
});

test("channel id validation", () => {
  assert.throws(() => parseChannelId("nonsense"));
  assert.throws(() => parseChannelId(`private:${U1}:${U1}`));
  assert.throws(() => parseChannelId(`group:123`));
  assert.equal(parseChannelId(`GROUP:${G.toUpperCase()}`).id, `group:${G}`);
});

test("missing group -> 404; 'Project Coordinator' spelling works", () => {
  assert.equal(getChannelAccess(s1, ch("group"), {}).status, 404);
  assert.ok(ok(user("c2", "Project Coordinator"), "triad", withSup));
});
