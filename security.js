const bcrypt = require("bcrypt"),
  crypto = require("crypto");

// bcrypt generates and stores a different salt in every password hash.
// The plain password is never stored in the database.
const hashPassword = (password) => bcrypt.hash(String(password), 10);

const isBcryptHash = (stored) => /^\$2[aby]\$\d\d\$/.test(String(stored));

// Accounts created before the bcrypt migration stored a scrypt value as
// "salt:hash". Keep this verifier only so a successful login can upgrade that
// account to bcrypt; newly created and updated passwords always use bcrypt.
const checkLegacyPassword = (password, stored) => {
  const parts = String(stored).split(":");
  if (
    parts.length !== 2 ||
    !/^[a-f0-9]{32}$/i.test(parts[0]) ||
    !/^[a-f0-9]{128}$/i.test(parts[1])
  )
    return false;
  const expected = Buffer.from(parts[1], "hex");
  const actual = Buffer.from(
    crypto.scryptSync(String(password), parts[0], 64).toString("hex"),
    "hex",
  );
  return crypto.timingSafeEqual(actual, expected);
};

const checkPassword = (password, stored) =>
  isBcryptHash(stored)
    ? bcrypt.compare(String(password), String(stored))
    : Promise.resolve(checkLegacyPassword(password, stored));

module.exports = { hashPassword, checkPassword, isBcryptHash };
