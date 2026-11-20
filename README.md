# Food Advisor - F28WP Group 30

Food Advisor is a local web application for discovering restaurants, viewing dishes and sharing reviews. It has three user roles: Customer, Restaurant Owner and Administrator.

## Run the project

1. Start a local MySQL server.
2. In this folder, open `.env` and enter your MySQL password after `DB_PASSWORD=`. Leave it blank if your MySQL root user has no password. The other values already match the project's local database setup.
3. Run `npm install` and then `npm start`.
4. Open `http://localhost:3000`.

The application creates the `foodadvisor` database, tables and sample data on its first run. Database settings are read from `.env`, so they do not need to be set in the terminal each time. `npm run check` performs a JavaScript syntax check.

### Demo accounts

| Role             | Username | Password |
| ---------------- | -------- | -------- |
| Customer         | customer | cust123  |
| Restaurant owner | owner    | owner123 |
| Administrator    | admin    | admin123 |

## Main functionality

- Customers can register, log in/out, browse restaurants, search dishes/restaurants, filter by cuisine, location, price and rating, view menus, create/update/delete one review per restaurant, and update their profile.
- Owners can log in, add a restaurant for their account, update only their own restaurant details, add/delete dishes, and read customer reviews.
- Administrators can create/delete customer or owner accounts, reset passwords, add/delete restaurants, and remove inappropriate reviews.

This covers meaningful database create, retrieve, update and delete operations. The client stores the current login token, saved filters and unfinished review text using Web Storage.

## Structure

- `server.js` - Express server, JSON handling, static files and error handling.
- `db.js` and `schema.sql` - MySQL connection pool, database setup and sample data.
- `routes/` - separate Express routers for authentication, restaurant features and administration.
- `middleware/auth.js` - login token lookup and role-based access control.
- `util.js` - input checks and password hashing with Node's built-in `crypto` module.
- `public/` - HTML, CSS, JavaScript and jQuery user interfaces.

## Security and validation

All database values use MySQL parameter placeholders. User input is validated on the server and escaped before insertion into dynamic client-side HTML. Passwords are salted and hashed; only the hash is stored. Route middleware prevents users from accessing another role's pages or another owner's restaurant data.
