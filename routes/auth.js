const router = require("express").Router();
const { q } = require("../db"),
  { need, newSession, endSession } = require("../middleware/auth"),
  { s, fail, createUser } = require("../util"),
  { hashPassword, checkPassword } = require("../security");
const sessionFor = (u) => ({
  token: newSession(u.id),
  user: { id: u.id, name: u.name, role: u.role },
});

router.post("/login", async (req, res) => {
  const b = req.body || {},
    [u] = await q("SELECT * FROM users WHERE username=?", [s(b.u)]); // ? placeholder: no SQL injection
  if (!u || !checkPassword(String(b.p || ""), u.pass_hash))
    fail(401, "Wrong username or password");
  if (b.role && u.role !== b.role)
    fail(403, "This account belongs to the " + u.role + " app");
  res.json(sessionFor(u));
});
router.post("/register", async (req, res) => {
  const b = req.body || {},
    id = await createUser(b.name, b.u, b.p, "customer"); // public sign-up is always a customer
  res.json(sessionFor({ id, name: s(b.name, 60), role: "customer" }));
});
router.post("/logout", (req, res) => {
  endSession(req.token);
  res.json({ ok: 1 });
});
router.get("/me", need(), (req, res) => res.json(req.user));

router.get("/profile", need(), async (req, res) => {
  const reviews = await q(
    "SELECT v.id,v.restaurant_id rid,r.name restaurant,v.stars,v.text FROM reviews v JOIN restaurants r ON r.id=v.restaurant_id WHERE v.user_id=? ORDER BY v.id DESC",
    [req.user.id],
  );
  res.json({ ...req.user, reviews });
});
router.put("/profile", need(), async (req, res) => {
  const b = req.body || {},
    name = s(b.name, 60);
  if (!name) fail(400, "Name is required");
  if (b.p) {
    const [u] = await q("SELECT pass_hash FROM users WHERE id=?", [
      req.user.id,
    ]);
    if (!checkPassword(String(b.current || ""), u.pass_hash))
      fail(401, "Current password is wrong");
    if (String(b.p).length < 4)
      fail(400, "New password needs 4 or more characters");
    await q("UPDATE users SET pass_hash=? WHERE id=?", [
      hashPassword(String(b.p)),
      req.user.id,
    ]);
  }
  await q("UPDATE users SET name=? WHERE id=?", [name, req.user.id]);
  res.json({ id: req.user.id, name, role: req.user.role });
});
module.exports = router;
