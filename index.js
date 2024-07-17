const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;

// middle were
const corsOptions = {
    origin: ['http://localhost:5173',],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(bodyParser.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
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

    app.post('/login', async(req, res) => {
      const {mobileOrEmail, password} = req.body;
      // console.log(mobileOrEmail, password);
      const query = {mobile: mobileOrEmail}
      const user = await usersCollection.findOne(query)
      
      if(!user){
        return res.status(400).json({ message: 'User not found' });
      }

      const match = await bcrypt.compare(password, user.password);
      if(match){
        res.status(200).send({message: true})
      }else{
        res.status(400).send({message: "Incorrect password"})
      }
    })
    app.post('/register', async(req, res) => {
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

    app.get('/users', async(req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
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