require("dotenv").config();

const express = require("express"),
  path = require("path");
const db = require("./db"),
  { loadUser } = require("./middleware/auth");
const app = express(),
  PORT = process.env.PORT || 3000;

// logging middleware: shows every request in the terminal
app.use((req, res, next) => {
  console.log(req.method + " " + req.url);
  next();
});
app.use(express.json()); // parses JSON request bodies
app.use(express.static(path.join(__dirname, "public"))); // serves the three front ends

app.use("/api", loadUser); // authentication middleware
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/restaurants"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// error-handling middleware: errors thrown by fail() and by the database end up here
app.use((err, req, res, next) => {
  if (Number.isInteger(err.code))
    return res.status(err.code).json({ error: err.msg });
  if (err.status && err.status < 500)
    return res.status(err.status).json({ error: "Bad request" });
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

db.init()
  .then(() =>
    app.listen(PORT, () =>
      console.log("Food Advisor running on http://localhost:" + PORT),
    ),
  )
  .catch((e) => {
    console.error(
      "Could not start. Is MySQL running, and are DB_USER / DB_PASSWORD correct?\n" +
        e.message,
    );
    process.exit(1);
  });
