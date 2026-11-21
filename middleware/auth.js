const bcrypt = require("bcrypt"),
  { q } = require("../db"),
  { fail } = require("../util");
const sessions = new Map(); // login token -> user id (in memory, so a restart logs everyone out)
// bcrypt generates a unique salted value for each in-memory session token.
const newSession = async (id) => {
  const t = await bcrypt.hash(`${id}:${Date.now()}:${Math.random()}`, 10);
  sessions.set(t, id);
  return t;
};
const endSession = (t) => sessions.delete(t);

// Middleware 1: works out who is calling from the Authorization header and sets req.user
async function loadUser(req, res, next) {
  req.token = (req.headers.authorization || "").slice(7);
  req.user = null;
  if (sessions.has(req.token)) {
    const [u] = await q(
      "SELECT id,name,username u,role FROM users WHERE id=?",
      [sessions.get(req.token)],
    );
    req.user = u || null;
  }
  next();
}
// Middleware 2: need() = must be logged in, need('admin') = must also have that role
const need =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) fail(401, "Please log in");
    if (roles.length && !roles.includes(req.user.role))
      fail(403, "Not allowed for your role");
    next();
  };
module.exports = { loadUser, need, newSession, endSession };
