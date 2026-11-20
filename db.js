const mysql = require("mysql"),
  fs = require("fs"),
  path = require("path");
const { hashPassword } = require("./security");
const cfg = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};
const DBN = process.env.DB_NAME || "foodadvisor";
let pool;
// The mysql module uses callbacks (pool.query(sql, params, callback)).
// These two helpers wrap that call in a Promise so the routes can use async/await.
const q = (sql, params) =>
  new Promise((ok, no) =>
    pool.query(sql, params, (err, rows) => (err ? no(err) : ok(rows))),
  );
const run = (con, sql, params) =>
  new Promise((ok, no) =>
    con.query(sql, params, (err, rows) => (err ? no(err) : ok(rows))),
  );

async function init() {
  const con = mysql.createConnection({ ...cfg, multipleStatements: true });
  await new Promise((ok, no) => con.connect((err) => (err ? no(err) : ok())));
  await run(con, "CREATE DATABASE IF NOT EXISTS `" + DBN + "`");
  await run(con, "USE `" + DBN + "`");
  await run(con, fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8")); // CREATE TABLE IF NOT EXISTS ...
  if (!(await run(con, "SELECT 1 FROM users LIMIT 1")).length) await seed(con);
  con.end();
  pool = mysql.createPool({ ...cfg, database: DBN, connectionLimit: 10 });
}
async function seed(con) {
  const U = [
    ["Site Admin", "admin", "admin123", "admin"],
    ["Maya Owner", "owner", "owner123", "owner"],
    ["Sam Customer", "customer", "cust123", "customer"],
    ["Omar Owner", "owner2", "owner123", "owner"],
    ["Lina Hassan", "lina", "lina123", "customer"],
  ];
  const users = U.map((u) => [u[0], u[1], hashPassword(u[2]), u[3]]);
  await run(con, "INSERT INTO users (name,username,pass_hash,role) VALUES ?", [
    users,
  ]);
  await run(
    con,
    "INSERT INTO restaurants (owner_id,name,cuisine,location,price,description) VALUES ?",
    [
      [
        [
          2,
          "Al Mandi House",
          "Arabian",
          "Sharjah",
          2,
          "Slow-cooked meats on fragrant rice, served family style.",
        ],
        [
          2,
          "Bella Napoli",
          "Italian",
          "Dubai",
          2,
          "Wood-fired pizza and fresh pasta made every morning.",
        ],
        [
          2,
          "Sakura Sushi Bar",
          "Japanese",
          "Dubai",
          3,
          "Counter seating, seasonal fish and an omakase menu.",
        ],
        [
          4,
          "Spice Route",
          "Indian",
          "Sharjah",
          1,
          "Home-style curries and tandoor breads at honest prices.",
        ],
        [
          4,
          "Burger Yard",
          "American",
          "Abu Dhabi",
          1,
          "Smashed patties, crispy fries and thick shakes.",
        ],
      ],
    ],
  );
  await run(
    con,
    "INSERT INTO dishes (restaurant_id,name,price,description) VALUES ?",
    [
      [
        [1, "Chicken Mandi", 38, "Smoky rice with tender chicken"],
        [1, "Lamb Haneeth", 55, "Pit-roasted lamb shoulder"],
        [2, "Margherita", 42, "San Marzano tomato, fior di latte"],
        [2, "Tiramisu", 28, "Made in house"],
        [3, "Salmon nigiri set", 85, "Eight pieces, hand pressed"],
        [3, "Miso ramen", 58, "Rich pork broth, soft egg"],
        [4, "Butter chicken", 32, "Creamy tomato gravy"],
        [4, "Garlic naan", 8, "Brushed with butter"],
        [5, "Classic smash burger", 35, "Double patty, cheddar"],
        [5, "Oreo shake", 24, "Thick and cold"],
      ],
    ],
  );
  await run(
    con,
    "INSERT INTO reviews (restaurant_id,user_id,stars,text) VALUES ?",
    [
      [
        [1, 5, 5, "The mandi falls off the bone. Huge portions."],
        [1, 3, 4, "Lovely food, a bit of a wait on Fridays."],
        [3, 5, 5, "Worth every dirham. Book the counter."],
        [4, 3, 4, "Great value, butter chicken is rich and balanced."],
      ],
    ],
  );
}
module.exports = { init, q };
