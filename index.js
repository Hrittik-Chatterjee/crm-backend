require("dotenv").config();
const express = require("express");
// const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Middleware for User Token Verification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ error: "Token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach the decoded payload to the request
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// admin middaleware
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    const crmDB = client.db("crmDB");
    const businessCollections = crmDB.collection("businessCollections");
    const regularContentCollections = crmDB.collection(
      "regularContentCollections"
    );
    const usersCollection = crmDB.collection("usersCollection");

    // User Routes
    app.post("/users", verifyToken, verifyAdmin, async (req, res) => {
      const { username, password, role } = req.body;

      try {
        // Check if the username already exists
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: "Username already exists" });
        }

        // Save the new user with plain text password
        const result = await usersCollection.insertOne({
          username,
          password,
          role: role || "user", // Default role to "user" unless explicitly specified
        });

        res.status(201).json({
          message: "User created successfully",
          userId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // Admin: List All Users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.status(200).json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // Admin: Delete a User
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;

      try {
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    // User Profile
    app.get("/profile", verifyToken, async (req, res) => {
      try {
        const user = await usersCollection.findOne(
          { _id: new ObjectId(req.user.id) },
          { projection: { password: 0 } } // Exclude password
        );
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json({ user });
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    });

    // get individual user
    app.get("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const userData = await usersCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(userData);
    });
    // update user
    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({ error: "Failed to update status" });
      }
    });

    // User Login
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;

      try {
        const user = await usersCollection.findOne({ username });
        if (!user || user.password !== password) {
          return res
            .status(404)
            .json({ error: "Invalid username or password" });
        }

        const token = jwt.sign(
          { id: user._id, username: user.username, role: user.role }, // Include role
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Return both the token and user data
        res.status(200).json({ message: "Login successful", token, user });
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    });

    // Business Routes
    app.get("/businesses", async (req, res) => {
      const businessData = businessCollections.find();
      const result = await businessData.toArray();
      res.send(result);
    });

    app.post("/businesses", async (req, res) => {
      const businessData = req.body;
      const result = await businessCollections.insertOne(businessData);
      res.send(result);
    });
    app.get("/businesses/:id", async (req, res) => {
      const id = req.params.id;
      const businessData = await businessCollections.findOne({
        _id: new ObjectId(id),
      });
      res.send(businessData);
    });
    const { ObjectId } = require("mongodb");

    app.patch("/businesses/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const result = await businessCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        console.log("Update Result:", result);
        res.send(result);
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({ error: "Failed to update status" });
      }
    });

    // Content Routes
    app.post("/regularcontents", async (req, res) => {
      const userData = req.body;
      const regularContentsData = await regularContentCollections.insertOne(
        userData
      );
      res.send(regularContentsData);
    });

    app.get("/regularcontents", async (req, res) => {
      const regularContentData = regularContentCollections.find();
      const result = await regularContentData.toArray();
      res.send(result);
    });

    app.get("/regularcontents/:id", async (req, res) => {
      const id = req.params.id;
      const usersData = await regularContentCollections.findOne({
        _id: new ObjectId(id),
      });
      res.send(usersData);
    });

    app.delete("/regularcontents/:id", async (req, res) => {
      const id = req.params.id;
      const result = await regularContentCollections.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.patch("/regularcontents/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const result = await regularContentCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        console.log("Update Result:", result);
        res.send(result);
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({ error: "Failed to update status" });
      }
    });

    console.log("You successfully connected to MongoDB!");
  } finally {
    // Optional cleanup logic if needed
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
