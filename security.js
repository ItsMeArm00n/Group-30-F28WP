const bcrypt = require("bcrypt");

// bcrypt generates and stores a different salt in every password hash.
// The plain password is never stored in the database.
const hashPassword = (password) => bcrypt.hash(String(password), 10);
const checkPassword = (password, stored) =>
  bcrypt.compare(String(password), String(stored));
module.exports = { hashPassword, checkPassword };
