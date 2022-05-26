const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ay62o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).send({ message: 'Unathorized access' })
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded
    next()
  });

}
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("manufacturers").collection('tools')
    const reviewCollection = client.db("manufacturers").collection('review')
    const orderCollection = client.db("manufacturers").collection('orders')
    const paymentCollection = client.db("manufacturers").collection('payments')
    const userCollection = client.db("manufacturers").collection('users')

    app.get('/tools', verifyJWT, async (req, res) => {
      const query = {}
      const tools = await toolsCollection.find(query).toArray()
      res.send(tools)
    })




    app.get('/purchase/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const tool = await toolsCollection.findOne(query)
      res.send(tool)
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { amount } = req.body

      const payAmount = amount * 100

      const paymentIntent = await stripe.paymentIntents.create({
        amount: payAmount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })
    app.post('/review', async (req, res) => {
      const review = req.body

      const result = await reviewCollection.insertOne(review)
      res.send(result)
    })

    app.get('/reviews', async(req,res)=>{
      const result =await reviewCollection.find().toArray()
      res.send(result)
    })

    app.post('/order', async (req, res) => {
      const order = req.body
      const result = await orderCollection.insertOne(order)
      res.send(result)
    })

    app.get('/users', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray()
      res.send(users)
    })
    app.get('/order/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const decodedEmail = req.decoded.email
      if (decodedEmail === email) {
        const query = { email: email }
        const result = await orderCollection.find(query).toArray()
        res.send(result)
      }
      else {
        return res.status(403).send({ message: 'forbidden access' })
      }
    })

    app.get('/payment/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const tool = await orderCollection.findOne(query)
      res.send(tool)
    })
    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id
      const payment = req.body
      const filter = { _id: ObjectId(id) }
      const upadatedDoc = {
        $set: {
          paid: true,
          transactonId: payment.transactionId
        }
      }
      const updateOrder = await orderCollection.updateOne(filter, upadatedDoc)
      const payments = await paymentCollection.insertOne(payment)
      res.send(upadatedDoc)

    })

    app.delete('/tool/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const filter = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
      res.send({ result, token })
    })
    app.put('/user/admin/:email', async (req, res) => {
      const email = req.params.email
      const requester = req.decoded.email
      const requesterAccount = await userCollection.find({ email: requester })
      if (requesterAccount.role === 'admin') {
        const filter = { email: email }

        const updateDoc = {
          $set: { role: 'admin' }
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
        res.send(result)
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }

    })

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email
      const user = await userCollection.findOne({ email: email })
      const isAdmin = user.role === 'admin'
      res.send({ admin: isAdmin })
    })
    app.post('/product', verifyJWT, async(req,res)=>{
      const tool=req.body
      console.log(tool)
      const result=await toolsCollection.insertOne(tool)
      res.send(result)
    })

  }
  finally {

  }
}
run().catch(console.dir)


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})