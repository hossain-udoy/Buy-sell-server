const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

// jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unAuthorized");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// collection
async function run() {
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

  // verify admin
  const verifyAdmin = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await userCollection.findOne(query);

    if (user?.role !== "admin") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };
  // verify seller
  const verifySeller = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await userCollection.findOne(query);

    if (user?.role !== "seller") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };
  // verify buyer
  const verifyBuyer = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await userCollection.findOne(query);

    if (user?.role !== "buyer") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };
  try {
    // jwt get function
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "5d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // get tv collection
    app.get("/tvCollection", async (req, res) => {
      const query = {};
      const collection = await tvCollection.find(query).toArray();
      res.send(collection);
    });
    app.get("/tvCollection", async (req, res) => {
      const filter = {};
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: "true",
        },
      };
      const result = await tvCollection.updateMany(filter, updatedDoc, options);
      res.send(result);
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
      const checkSellerEmail = req.query.email;
      const booking = req.body;
      const query = {
        productId: booking.productId,
        productImage: booking.image,
      };
      const checkSeller = { sellerEmail: booking?.email };
      const seller = await tvCollection.findOne(checkSeller);
      if (checkSellerEmail === seller?.email) {
        return res.send({ message: "You can't booking your product" });
      }
      const alreadyOrder = await bookingCollection.findOne(query);
      if (alreadyOrder) {
        return res.send({ message: "Sorry this product is out of stock" });
      }

      const booked = await bookingCollection.insertOne(booking);
      res.send(booked);
    });
    // reported products collection
    app.post("/reportCollection", async (req, res) => {
      const reporting = req.body;
      const reported = await reportingCollection.insertOne(reporting);
      res.send(reported);
    });
    // add a product
    app.post("/tvCollection", async (req, res) => {
      const products = req.body;
      const addProduct = await tvCollection.insertOne(products);
      res.send(addProduct);
    });
    // user creation
    app.post("/userCollection", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const alreadyUser = await userCollection.findOne(query);
      if (alreadyUser) {
        return res.send({ acknowledged: true });
      }
      const users = await userCollection.insertOne(user);
      res.send(users);
    });
    // dasboard work
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    // all user got by this
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    //   seller dashboard

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });

      app.get(
        "/tv/seller/:email",
        verifyJWT,
        verifySeller,
        async (req, res) => {
          const email = req.params.email;
          const query = { sellerEmail: email };
          const result = await tvCollection.find(query).toArray();
          res.send(result);
        }
      );
      app.get("/advertiseTv", async (req, res) => {
        const TV = await tvCollection.find({}).toArray();
        const filter = TV.filter((tv) => tv.Status === "Approved");
        res.send(filter);
      });
    });

    // admin dashboard
    // get Buyers
    app.get("/usersBuyers", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      console.log(email);
      console.log(decodedEmail);

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const sellers = await userCollection.find({}).toArray();
      const seller = sellers.filter((seller) => seller.role === "buyer");
      res.send(seller);
      console.log(seller);

      //   get seller
      app.get("/usersSellers", verifyJWT, async (req, res) => {
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const sellers = await userCollection.find({}).toArray();
        const seller = sellers.filter((seller) => seller.role === "seller");
        res.send(seller);
      });

      //verify seller
      app.put("/users/:email", verifyJWT, verifyAdmin, async (req, res) => {
        const email = req.params.email;
        if (email) {
          const sellerVerified = { email: email };
          const query = { sellerEmail: email };
          const options = { upsert: true };
          const updateDoc = {
            $set: {
              verified: "true",
            },
          };
          const seller = await userCollection.updateOne(
            sellerVerified,
            updateDoc,
            options
          );
          const result = await tvCollection.updateMany(
            query,
            updateDoc,
            options
          );
          res.send(result);
        }
      });
      app.get("/allBookings", async (req, res) => {
        const result = await bookingCollection.find({}).toArray();
        res.send(result);
      });
      app.get("/users/buyer/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email };
        const user = await userCollection.findOne(query);
        res.send({ isBuyer: user?.role === "buyer" });
      });
      app.get("/booking/:email", verifyJWT, async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      });

      app.get("/reports", verifyJWT, verifyAdmin, async (req, res) => {
        const query = {};
        const result = await reportingCollection.find(query).toArray();
        res.send(result);
      });

      app.put("/tv/:id", async (req, res) => {
        const { id } = req.params;
        const Status = req.body;
        const query = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            Status: Status?.Status,
          },
        };
        const result = await tvCollection.updateOne(query, updateDoc, options);
        res.send(result);
      });
      app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
        const { id } = req.params;
        const email = req.query.email;
        const query = { _id: ObjectId(id) };
        const user = await userCollection.findOne(query);
        if (
          user.email === email ||
          user.role === "admin" ||
          user.email === "ememon707@gmail.com"
        ) {
          return res.send({
            message: "You Can't delete admin but Owner Can delete everything",
          });
        }
        const result = await userCollection.deleteOne(query);
        res.send(result);
      });

      app.delete("/tv/:id", verifyJWT, verifyAdmin, async (req, res) => {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await tvCollection.deleteOne(query);
        res.send(result);
      });

      app.delete(
        "/tv/seller/:id",
        verifyJWT,
        verifySeller,
        async (req, res) => {
          const { id } = req.params;
          const query = { _id: ObjectId(id) };
          const result = await tvCollection.deleteOne(query);
          res.send(result);
        }
      );
      app.delete("/booking/:id", verifyJWT, async (req, res) => {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      });

      //   report delete
      app.delete("/reports/:id", verifyJWT, verifyAdmin, async (req, res) => {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await reportingCollection.deleteOne(query);
        res.send(result);
      });

      // payment option
      app.post("/create-payment-intent", async (req, res) => {
        const order = req.body;
        // console.log(order);
        const price = order.price;
        const amount = price * 100;
        // console.log(price);
        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: amount,
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      });

      app.get(
        "/tv/seller/:email",
        verifyJWT,
        verifySeller,
        async (req, res) => {
          const email = req.params.email;
          const query = { sellerEmail: email };
          const result = await tvCollection.find(query).toArray();
          res.send(result);
        }
      );

      app.post("/payments", async (req, res) => {
        const payment = req.body;
        const result = await paymentsCollection.insertOne(payment);
        const id = payment.order;
        const filter = { _id: ObjectId(id) };
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId,
          },
        };
        const updatedResult = await ordersCollections.updateOne(
          filter,
          updatedDoc
        );
        res.send(result);
      });

      // payment option
    });
  } finally {
  }
}
run().catch((err) => {
  console.log(err);
});

app.get("/", async (req, res) => {
  res.send("Buy&Sell server is running");
});

app.listen(port, () => console.log(`Buy&Sell running on ${port}`));
