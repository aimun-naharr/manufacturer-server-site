const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var jwt = require('jsonwebtoken')

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ay62o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("manufacturers").collection('tools')
    const reviewCollection = client.db("manufacturers").collection('review')
    const orderCollection = client.db("manufacturers").collection('orders')
    
    app.get('/tools', async (req, res) => {
      const query = {}
      const tools = await toolsCollection.find(query).toArray()
      res.send(tools)
    })


    // app.post('/login', async(req, res) => {
    //   const email = req.body.userEmail
    //   const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
    //   res.send(token)
    // })

    app.get('/purchase/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const tool = await toolsCollection.findOne(query)
      res.send(tool)
    })


    app.post('/review', async (req, res) => {
      const review = req.body
      
      const result = await reviewCollection.insertOne(review)
      res.send(result)
    })

    app.post('/order', async(req,res)=>{
      const order=req.body
      const result=await orderCollection.insertOne(order)
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