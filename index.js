const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const jwt = require("jsonwebtoken");
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gj7dah.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const tvCollection = client.db("buy-sell").collection("tvCollection");
    const categoryCollection = client
      .db("buy-sell")
      .collection("categoryCollection");
    const bookingCollection = client
      .db("buy-sell")
      .collection("bookingCollection");
    const userCollection = client.db("buy-sell").collection("userCollection");
    const reportingCollection = client
      .db("buy-sell")
      .collection("reportingCollection");

    app.get("/tvCollection", async (req, res) => {
      const query = {};
      const collection = await tvCollection.find(query).toArray();
      res.send(collection);
    });
    app.get("/tvCollection/:id", async (req, res) => {
      const category = req.params.id;
      const query = { category: category };
      const collection = await tvCollection.find(query).toArray();
      res.send(collection);
    });
    app.get("/users/:id", async (req, res) => {
      const user = req.params.id;
      const query = { role: user };
      const collection = await userCollection.find(query).toArray();
      res.send(collection);
    });
    app.get("/categoryCollection", async (req, res) => {
      const query = {};
      const catCollection = await categoryCollection.find(query).toArray();
      res.send(catCollection);
    });
    // booked products collection
    app.post("/bookingCollection", async (req, res) => {
      const booking = req.body;
      const booked = await bookingCollection.insertOne(booking);
      res.send(booked);
    });
    // reported products collection
    app.post("/reportCollection", async (req, res) => {
      const reporting = req.body;
      const reported = await reportingCollection.insertOne(reporting);
      res.send(reported);
    });

    app.post("/tvCollection", async (req, res) => {
      const products = req.body;
      const addProduct = await tvCollection.insertOne(products);
      res.send(addProduct);
    });
    app.post("/userCollection", async (req, res) => {
      const user = req.body;
      const users = await userCollection.insertOne(user);
      res.send(users);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Buy&Sell server is running");
});

app.listen(port, () => console.log(`Buy&Sell running on ${port}`));
