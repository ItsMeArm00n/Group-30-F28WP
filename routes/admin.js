const router = require("express").Router();
const { q } = require("../db"),
  { need } = require("../middleware/auth"),
  { s, fail, createUser } = require("../util"),
  { hashPassword } = require("../security");
router.use(need("admin")); // every route in this file is admin-only

router.get("/owners", async (req, res) =>
  res.json(await q("SELECT id,name FROM users WHERE role=?", ["owner"])),
);
router.get("/reviews", async (req, res) => {
  res.json(
    await q(
      "SELECT v.id,v.stars,v.text,u.name author,r.name restaurant FROM reviews v JOIN users u ON u.id=v.user_id JOIN restaurants r ON r.id=v.restaurant_id ORDER BY v.id DESC",
    ),
  );
});
router.get("/users", async (req, res) => {
  res.json(
    await q(
      "SELECT u.id,u.name,u.username u,u.role,IF(u.role='owner',(SELECT COUNT(*) FROM restaurants WHERE owner_id=u.id),(SELECT COUNT(*) FROM reviews WHERE user_id=u.id)) n FROM users u WHERE u.role<>'admin' ORDER BY u.role,u.name",
    ),
  );
});
router.post("/users", async (req, res) => {
  const b = req.body || {};
  await createUser(
    b.name,
    b.u,
    b.p,
    b.role === "customer" ? "customer" : "owner",
  );
  res.json({ ok: 1 });
});
router.put("/users/:id", async (req, res) => {
  // rename and/or reset password (admin accounts are protected)
  const b = req.body || {},
    id = parseInt(req.params.id),
    p = String(b.p || "");
  if (p && p.length < 4) fail(400, "Password needs 4 or more characters");
  if (p)
    await q("UPDATE users SET pass_hash=? WHERE id=? AND role<>?", [
      await hashPassword(p),
      id,
      "admin",
    ]);
  if (s(b.name))
    await q("UPDATE users SET name=? WHERE id=? AND role<>?", [
      s(b.name, 60),
      id,
      "admin",
    ]);
  res.json({ ok: 1 });
});
router.delete("/users/:id", async (req, res) => {
  await q("DELETE FROM users WHERE id=? AND role<>?", [
    parseInt(req.params.id),
    "admin",
  ]);
  res.json({ ok: 1 });
});
module.exports = router;
