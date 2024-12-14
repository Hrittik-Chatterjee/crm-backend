require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

async function run() {
  try {
    await client.connect();
    const crmDB = client.db("crmDB");
    const businessCollections = crmDB.collection("businessCollections");
    const regularContentCollections = crmDB.collection(
      "regularContentCollections"
    );

    app.get("/businesses", async (req, res) => {
      const businessData = businessCollections.find();
      const result = await businessData.toArray();
      res.send(result);
    });

    app.post("/regularcontents", async (req, res) => {
      const userData = req.body;
      const regularContentsData = regularContentCollections.insertOne(userData);
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
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
