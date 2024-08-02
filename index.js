const express = require('express');
require('dotenv').config()
const cors = require('cors')
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const app = express()
const port = process.env.PORT || 5000;

// middle were
const corsOptions = {
  origin: ['http://localhost:5173',],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(bodyParser.json());
app.use(cors(corsOptions))
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ifklbg0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const usersCollection = client.db('easyTakaDB').collection('users')
    const sendMoneyCollection = client.db('easyTakaDB').collection('sendMoney')

    app.post('/login', async (req, res) => {
      const { mobileOrEmail, password } = req.body;
      const query = { mobile: mobileOrEmail }
      const user = await usersCollection.findOne(query)

      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (match) {
        res.status(200).send({ message: true })
      } else {
        res.status(400).send({ message: "Incorrect password" })
      }
    })
    app.post('/register', async (req, res) => {
      const userInfo = req.body;
      const password = await bcrypt.hash(userInfo.password, 10)
      const result = await usersCollection.insertOne({
        username: userInfo.name,
        mobile: userInfo.mobile,
        email: userInfo.email,
        password,
        role: userInfo.role,
        status: userInfo.status
      })
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    // get user role 
    app.get('/user/:emailOrMobile', async (req, res) => {
      const emailOrMobile = req.params.emailOrMobile;
      const result = await usersCollection.findOne({
        $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
      })
      res.send(result)
    })
    // get user balance 
    app.get('/user/balance/:emailOrMobile', async (req, res) => {
      const emailOrMobile = req.params.emailOrMobile;
      const result = await usersCollection.findOne({
        $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
      })
      res.send(result)
    })

    // confirm user
    app.patch('/user/update/:mobile', async (req, res) => {
      const mobile = req.params.mobile;
      const user = req.body;
      const query = { mobile: mobile };
      const updateDoc = {
        $set: {
          ...user,
        }
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result)
    })
    app.post('/sendMoney', async (req, res) => {
      try {
        const sendMoney = req.body;
        const { mobile, recipient, password, amount, cutMoney } = sendMoney;

        // Fetch recipient and sender details from the database
        const recipientUser = await usersCollection.findOne({ mobile: recipient });
        const senderUser = await usersCollection.findOne({ mobile: mobile });
        // Check if the recipient exists
        if (!recipientUser) {
          return res.status(404).send({ message: 'Recipient not found' });
        }

        // Verify the sender's password
        const isMatch = await bcrypt.compare(password, senderUser.password);
        if (!isMatch) {
          return res.status(401).send({ message: 'Incorrect password' });
        }
        // Generate a unique transaction ID
        const transactionId = uuidv4();

        // Perform the transaction
        const result = await sendMoneyCollection.insertOne({
          mobile: mobile,
          transactionId: transactionId,
          amount: amount,
          recipient: recipient
        });

        // Update the recipient's balance
        await usersCollection.updateOne(
          { mobile: recipient },
          { $inc: { balance: amount } }
        );

        // Update the sender's balance
        await usersCollection.updateOne(
          { mobile: mobile },
          { $inc: { balance: -cutMoney } }
        );

        return res.send({ ...result, transactionId });
      } catch (error) {
        console.log(error);
        return res.status(500).send({ message: 'Internal Server Error' });
      }
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  const result = "Hello from Easy Taka server";
  res.send(result)
})
app.listen(port, () => {
  console.log(`Easy Taka server is running on port: ${port}`);
})