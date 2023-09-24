require('dotenv').config()

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var mongodb = require("mongodb");
var { createClient } = require('redis');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const { requiresAuth } = require('express-openid-connect');
const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH_SECRET,
  baseURL: 'http://localhost:3000',
  clientID: process.env.AUTH_CLIENT_ID,
  issuerBaseURL: process.env.AUTH_ISSUER_BASE_URL
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await mongoClient.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await mongoClient.close();
  }
}
run().catch(console.dir);

// @todo may be better to keep one client just infinitely connected inside of a class, instead of connecting every time we need to do smth?
async function getCommits(id) {
  try {
    await mongoClient.connect();
    const db = await mongoClient.db("commitments");
    const coll = await db.collection("commitments"); // @TODO this can def go in the original userdata db
    const res = coll.find({
      uid: id
    });
    return res;
  } finally {
    await mongoClient.close();
  }
}

/*
{
  name: "a name",
  lat: "latitutde",
  lon: "longitude"
}
*/
async function addCommit(commit) {
  try {
    await mongoClient.connect();
    const db = await mongoClient.db("commitments");
    const coll = await db.collection("commitments"); // @TODO this can def go in the original userdata db
    const result = await coll.insertOne(commit);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
    return result;
  } finally {
    await mongoClient.close();
  }
}

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// Tile38 Connection
var Tile38 = require('tile38');
var client = new Tile38({host: process.env.TILE38_HOST, port: process.env.TILE38_PORT, debug: true });

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get("/about", function(req, res, next) {
  res.render("about", { title: "About Geobound"});
});

app.get("/contact", function(req, res, next) {
  res.render("contact", { title: "Contact"});
});

app.get("/faq", function(req, res, next) {
  res.render("faq", { title: "FAQ"});
});

app.get("/commitments", function(req, res, next) {
  var isAuthenticated = req.oidc.isAuthenticated();
  var cmts;
  if (isAuthenticated) {
    cmts = getCommits(req.oidc.user.sid);
  }
  res.render("commitments", {
    title: "Commitments",
    isAuthenticated,
    cmts
  });
});

// save a location in format (group, key, cords)
client.set('UIowa', 'IMU', [41.6631103,-91.5383735]); // cords for the IMU for testing

client.get('UIowa', 'IMU').then(data => {
  console.log("DATA BELOW");
  console.log(data); // prints coordinates in geoJSON format
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug'); // Set Pug as the view engine

app.use('/users', usersRouter);
app.get('/', (req, res) => {
  var isAuthenticated = req.oidc.isAuthenticated();
  console.log(isAuthenticated);
  res.render('index', { isAuthenticated });
});

// post request for sent commitments.
app.post("/submit_commitment", (req, res) => {
  var isAuthenticated = req.oidc.isAuthenticated();
  if(isAuthenticated) {
    var name = req.body.name || "";
    var lat = req.body.lat;
    var lon = req.body.lon;
    
    // small verification. test if coords are "valid"
    const gd = /^[1-9]\d{0,10}(\.\d{0,10})?$/; // 'good decimal'
    if(!gd.test(lat) || !gd.test(lon) || !name || name.length >= 250 /* arbitrary limit */) {
      res.statusCode(400);
      res.send("Invalid form submitted.");
    }
    
    const res = addCommit({ uid: req.oidc.user.id, name, lat, lon });
    if(!res.insertedId) {
      res.statusCode(500);
      res.send("An error occured whilst communicating to the database.");
    } else {
      res.statusCode(200);
      res.send("Success. :)");
    }
  } else {
    res.statusCode(403);
    res.send("You do not have permission to use this endpoint.");
  }
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
