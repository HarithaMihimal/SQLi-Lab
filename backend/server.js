const express = require("express");
const db = require("./config/db");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());

app.post("/login-vulnerable", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Intentionally vulnerable: local lab only
        const query = `
            SELECT id, username, role
            FROM users
            WHERE username = '${username}'
            AND password = '${password}'
        `;

        const [rows] = await db.query(query);

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        res.json({
            message: "Login successful",
            user: rows[0]
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: "Database error"
        });
    }
});


app.post("/login-secure-no-bind", async (req,res) => {
    try{
        const query = "SELECT id, username, role FROM users WHERE username = 'haritha' AND password = 'user123'";
        const [rows] = await db.query(query);
        if(rows.length === 0){
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
        res.json({
            message: "Login successful",
            user: rows[0]
        });

    }catch(error){
        console.error(error.message);
        res.status(500).json({
            message: "Database error"
        });
    }
})

app.post("/login-secure-with-bind", async (req, res) => {
    try {
        const { username, password } = req.body;

        const query = "SELECT id, username, role FROM users WHERE username = ? AND password = ?";
        const [rows] = await db.execute(query, [username]);

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
        
        const passwordMatched = await bcrypt.compare(password, rows[0].password);
        if (!passwordMatched) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        res.json({
            message: "Login successful",
            user: rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Database error"
        });
    }
});

app.listen(process.env.PORT || 5000, () => {
    console.log("Server running on port 5000");
});