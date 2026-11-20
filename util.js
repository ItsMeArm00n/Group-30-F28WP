const { q } = require("./db"),
  { hashPassword, checkPassword } = require("./security");
// turns any input into a trimmed string of limited length
const s = (v, n = 200) =>
  String(v == null ? "" : v)
    .trim()
    .slice(0, n);
// throws an error object that the error-handling middleware in server.js turns into a JSON reply
const fail = (code, msg) => {
  throw { code, msg };
};
// used by register (customers) and by the admin (owners or customers)
async function createUser(name, username, password, role) {
  name = s(name, 60);
  username = s(username, 30);
  password = String(password || "");
  if (!name || !/^[A-Za-z0-9_]{3,30}$/.test(username) || password.length < 4)
    // white-list for usernames
    fail(
      400,
      "Enter a name, a username (3-30 letters, numbers or _) and a password (4+ characters)",
    );
  if ((await q("SELECT 1 FROM users WHERE username=?", [username])).length)
    fail(409, "That username is taken");
  const hash = await hashPassword(password); // bcrypt hash; the plain password is never stored
  return (
    await q(
      "INSERT INTO users (name,username,pass_hash,role) VALUES (?,?,?,?)",
      [name, username, hash, role],
    )
  ).insertId;
}
module.exports = { s, fail, createUser, hashPassword, checkPassword };
