const crypto = require("crypto");

// Password hashes use Node's built-in crypto module, so no extra package is needed.
// A different random salt is stored with every password hash.
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
};
const checkPassword = (password, stored) => {
  const parts = String(stored).split(":");
  if (parts.length !== 2) return false;
  const hash = crypto.scryptSync(password, parts[0], 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(parts[1], "hex"),
  );
};
module.exports = { hashPassword, checkPassword };
