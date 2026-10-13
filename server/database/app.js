const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Reviews = require('./review');
const Dealerships = require('./dealership');
const app = express();
const port = process.env.PORT || 3030;
app.use(cors());
app.use(express.json());

const route = handler => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    console.error(error.message);
    res.status(500).json({error: 'Database operation failed'});
  }
};
app.get('/', (req, res) => res.send('Welcome to the Mongoose API'));
app.get('/fetchReviews', route(async (req, res) => {
  res.json(await Reviews.find().sort({id: 1}));
}));
app.get('/fetchReviews/dealer/:id', route(async (req, res) => {
  res.json(await Reviews.find({dealership: Number(req.params.id)}).sort({time: -1, id: -1}));
}));
app.get('/fetchDealers', route(async (req, res) => {
  res.json(await Dealerships.find().sort({id: 1}));
}));
app.get('/fetchDealers/:state', route(async (req, res) => {
  const filter = req.params.state === 'All' ? {} : {state: req.params.state};
  res.json(await Dealerships.find(filter).sort({id: 1}));
}));
app.get('/fetchDealer/:id', route(async (req, res) => {
  res.json(await Dealerships.find({id: Number(req.params.id)}));
}));
app.post('/insert_review', route(async (req, res) => {
  const data = req.body;
  const required = ['name', 'dealership', 'review', 'purchase_date',
    'car_make', 'car_model', 'car_year'];
  if (!required.every(field => data[field])) {
    return res.status(400).json({error: 'Review fields required'});
  }
  const previous = await Reviews.findOne().sort({id: -1});
  const review = new Reviews({
    id: previous ? previous.id + 1 : 1,
    user_id: data.user_id, time: new Date().toISOString(),
    name: data.name, dealership: Number(data.dealership), review: data.review,
    purchase: Boolean(data.purchase), purchase_date: data.purchase_date,
    car_make: data.car_make, car_model: data.car_model,
    car_year: Number(data.car_year)
  });
  res.status(201).json(await review.save());
}));

async function start() {
  const mongoURL = process.env.MONGO_URL || 'mongodb://mongo_db:27017/dealershipsDB';
  await mongoose.connect(mongoURL);
  const readSeed = name => {
    const local = path.join(__dirname, 'data', name + '.json');
    const file = fs.existsSync(local) ? local : path.join(__dirname, name + '.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'))[name];
  };
  if (await Reviews.countDocuments() === 0) {
    await Reviews.insertMany(readSeed('reviews'));
  }
  if (await Dealerships.countDocuments() === 0) {
    await Dealerships.insertMany(readSeed('dealerships'));
  }
  app.listen(port, '0.0.0.0', () => console.log('Server is running on port ' + port));
}
start().catch(error => { console.error(error); process.exit(1); });
