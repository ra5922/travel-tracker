import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "root123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Ridhima", color: "pink" },
  //{ id: 2, name: "Niya", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code.trim());
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  const detailsResult = await db.query(
    "SELECT country_code, note, visited_on FROM visited_countries WHERE user_id = $1",
    [currentUserId]
  );

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
    details: detailsResult.rows
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"].toLowerCase().trim();

  const note = req.body["note"];   // ✅ NEW
  const date = req.body["date"];   // ✅ NEW

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(TRIM(country_name)) = $1;",
      [input]
    );

    if (result.rows.length === 0) {
      console.log("Country not found:", input);
      return res.redirect("/");
    }

    const countryCode = result.rows[0].country_code.trim();

    console.log("✅ Found:", countryCode);

    await db.query(
      `INSERT INTO visited_countries (country_code, user_id, note, visited_on)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING;`,
      [countryCode, currentUserId, note, date]
    );

    res.redirect("/");
  } catch (err) {
    console.log("Query error:", err.message);
    res.redirect("/");
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
