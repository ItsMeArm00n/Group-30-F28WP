const router = require("express").Router();
const { q } = require("../db"),
  { need } = require("../middleware/auth"),
  { s, fail } = require("../util");
const SUM =
  "SELECT r.id,r.owner_id owner,r.name,r.cuisine,r.location,r.price,r.description `desc`,COUNT(v.id) `count`,COALESCE(AVG(v.stars),0) rating FROM restaurants r LEFT JOIN reviews v ON v.restaurant_id=r.id";
const fix = (r) => ({ ...r, rating: +r.rating, price: +r.price }); // MySQL sends AVG and DECIMAL as strings
const fields = (b) => ({
  name: s(b.name, 80),
  cuisine: s(b.cuisine, 40),
  location: s(b.location, 40),
  price: Math.min(3, Math.max(1, parseInt(b.price) || 1)),
  desc: s(b.desc, 300),
});
const check = (f) => {
  if (!f.name || !f.cuisine || !f.location)
    fail(400, "Name, cuisine and location are required");
};

// Middleware: the logged-in owner must own restaurant :id
async function ownsRestaurant(req, res, next) {
  const [r] = await q("SELECT owner_id FROM restaurants WHERE id=?", [
    parseInt(req.params.id),
  ]);
  if (!r) fail(404, "Restaurant not found");
  if (r.owner_id !== req.user.id) fail(403, "Not your restaurant");
  next();
}

router.get("/mine", need("owner"), async (req, res) => {
  res.json(
    (await q(SUM + " WHERE r.owner_id=? GROUP BY r.id", [req.user.id])).map(
      fix,
    ),
  );
});
router.get("/restaurants", async (req, res) => {
  // search and filter
  const g = req.query,
    t = s(g.q),
    w = [],
    p = [];
  if (t) {
    w.push(
      "(r.name LIKE ? OR r.description LIKE ? OR EXISTS(SELECT 1 FROM dishes d WHERE d.restaurant_id=r.id AND d.name LIKE ?))",
    );
    p.push("%" + t + "%", "%" + t + "%", "%" + t + "%");
  }
  if (s(g.c)) {
    w.push("r.cuisine=?");
    p.push(s(g.c));
  }
  if (s(g.l)) {
    w.push("r.location=?");
    p.push(s(g.l));
  }
  if (parseInt(g.p)) {
    w.push("r.price=?");
    p.push(parseInt(g.p));
  }
  const sql =
    SUM +
    (w.length ? " WHERE " + w.join(" AND ") : "") +
    " GROUP BY r.id HAVING rating>=? ORDER BY r.name";
  res.json((await q(sql, [...p, parseFloat(g.r) || 0])).map(fix));
});
router.post("/restaurants", need("admin", "owner"), async (req, res) => {
  const b = req.body || {},
    f = fields(b);
  check(f);
  // Owners can create restaurants for themselves. Administrators can assign one to any owner.
  const ow =
    req.user.role === "owner" ? req.user.id : parseInt(b.owner) || null;
  if (
    !ow ||
    !(await q("SELECT 1 FROM users WHERE id=? AND role=?", [ow, "owner"]))
      .length
  )
    fail(400, "Pick a valid owner");
  const r = await q(
    "INSERT INTO restaurants (owner_id,name,cuisine,location,price,description) VALUES (?,?,?,?,?,?)",
    [ow, f.name, f.cuisine, f.location, f.price, f.desc],
  );
  res.json({ id: r.insertId });
});
router.get("/restaurants/:id", async (req, res) => {
  const id = parseInt(req.params.id),
    [r] = (await q(SUM + " WHERE r.id=? GROUP BY r.id", [id])).map(fix);
  if (!r) fail(404, "Restaurant not found");
  const dishes = (
    await q(
      "SELECT id,name n,price p,description d FROM dishes WHERE restaurant_id=? ORDER BY id",
      [id],
    )
  ).map((d) => ({ ...d, p: +d.p }));
  const reviews = await q(
    "SELECT v.id,v.user_id uid,v.stars,v.text,u.name author FROM reviews v JOIN users u ON u.id=v.user_id WHERE v.restaurant_id=? ORDER BY v.id DESC",
    [id],
  );
  res.json({ ...r, dishes, reviews });
});
router.put(
  "/restaurants/:id",
  need("owner"),
  ownsRestaurant,
  async (req, res) => {
    const f = fields(req.body || {});
    check(f);
    await q(
      "UPDATE restaurants SET name=?,cuisine=?,location=?,price=?,description=? WHERE id=?",
      [f.name, f.cuisine, f.location, f.price, f.desc, parseInt(req.params.id)],
    );
    res.json({ ok: 1 });
  },
);
router.delete("/restaurants/:id", need("admin"), async (req, res) => {
  await q("DELETE FROM restaurants WHERE id=?", [parseInt(req.params.id)]); // dishes and reviews go too (ON DELETE CASCADE)
  res.json({ ok: 1 });
});
router.post(
  "/restaurants/:id/dishes",
  need("owner"),
  ownsRestaurant,
  async (req, res) => {
    const b = req.body || {},
      n = s(b.n, 60);
    if (!n) fail(400, "Dish name is required");
    await q(
      "INSERT INTO dishes (restaurant_id,name,price,description) VALUES (?,?,?,?)",
      [
        parseInt(req.params.id),
        n,
        Math.max(0, parseFloat(b.p) || 0),
        s(b.d, 120),
      ],
    );
    res.json({ ok: 1 });
  },
);
router.delete(
  "/restaurants/:id/dishes/:dish",
  need("owner"),
  ownsRestaurant,
  async (req, res) => {
    await q("DELETE FROM dishes WHERE id=? AND restaurant_id=?", [
      parseInt(req.params.dish),
      parseInt(req.params.id),
    ]);
    res.json({ ok: 1 });
  },
);
router.post("/restaurants/:id/reviews", need("customer"), async (req, res) => {
  const b = req.body || {},
    stars = Math.round(Number(b.stars)),
    text = s(b.text, 500);
  if (!(stars >= 1 && stars <= 5) || !text)
    fail(400, "Give a rating from 1 to 5 and some text");
  const id = parseInt(req.params.id);
  if (!(await q("SELECT 1 FROM restaurants WHERE id=?", [id])).length)
    fail(404, "Restaurant not found");
  // one review per customer per restaurant: a second post updates the first
  await q(
    "INSERT INTO reviews (restaurant_id,user_id,stars,text) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE stars=VALUES(stars),text=VALUES(text)",
    [id, req.user.id, stars, text],
  );
  res.json({ ok: 1 });
});
router.delete("/reviews/:id", need(), async (req, res) => {
  const id = parseInt(req.params.id),
    [v] = await q("SELECT user_id FROM reviews WHERE id=?", [id]);
  if (!v) fail(404, "Review not found");
  if (!(req.user.role === "admin" || v.user_id === req.user.id))
    fail(403, "You can only delete your own reviews");
  await q("DELETE FROM reviews WHERE id=?", [id]);
  res.json({ ok: 1 });
});
module.exports = router;
