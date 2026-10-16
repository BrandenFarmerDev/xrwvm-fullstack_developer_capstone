const cors = require('cors');
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const Cars = require('./inventory');

const app = express();
const port = Number(process.env.PORT || 3050);
const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo_db:27017/dealershipsDB';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const numericParam = (value, name) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const error = new Error(`${name} must be numeric`);
    error.status = 400;
    throw error;
  }
  return parsed;
};

const bucketCondition = (value, cutoffs) => {
  if (cutoffs.includes(value)) {
    const index = cutoffs.indexOf(value);
    return index === 0
      ? { $lte: value }
      : { $gt: cutoffs[index - 1], $lte: value };
  }
  return { $gt: cutoffs[cutoffs.length - 1] };
};

const route = (handler) => async (req, res) => {
  try {
    res.json(await handler(req));
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Inventory request failed' });
  }
};

app.get('/', (req, res) => res.send('Welcome to the Mongoose API'));
app.get('/cars/:id', route((req) => Cars.find({ dealer_id: numericParam(req.params.id, 'dealer id') })));
app.get('/carsbymake/:id/:make', route((req) => Cars.find({
  dealer_id: numericParam(req.params.id, 'dealer id'), make: req.params.make
})));
app.get('/carsbymodel/:id/:model', route((req) => Cars.find({
  dealer_id: numericParam(req.params.id, 'dealer id'), model: req.params.model
})));
app.get('/carsbymaxmileage/:id/:mileage', route((req) => Cars.find({
  dealer_id: numericParam(req.params.id, 'dealer id'),
  mileage: bucketCondition(numericParam(req.params.mileage, 'mileage'), [50000, 100000, 150000, 200000])
})));
app.get('/carsbyprice/:id/:price', route((req) => Cars.find({
  dealer_id: numericParam(req.params.id, 'dealer id'),
  price: bucketCondition(numericParam(req.params.price, 'price'), [20000, 40000, 60000, 80000])
})));
app.get('/carsbyyear/:id/:year', route((req) => Cars.find({
  dealer_id: numericParam(req.params.id, 'dealer id'),
  year: { $gte: numericParam(req.params.year, 'year') }
})));

const start = async () => {
  await mongoose.connect(mongoUrl);
  const carsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'car_records.json'), 'utf8'));
  await Cars.deleteMany({});
  await Cars.insertMany(carsData.cars);
  app.listen(port, () => console.log(`Car inventory service listening on ${port}`));
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Car inventory service failed to start:', error);
    process.exit(1);
  });
}

module.exports = { app, bucketCondition, numericParam, start };
