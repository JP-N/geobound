require('dotenv').config()

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');

var mongodb = require("mongodb");
var { createClient } = require('redis');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;

var app = express();
app.use(bodyParser.json());
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

let db;

(async () => {
  try {
    const client = await mongoClient.connect(uri, { useUnifiedTopology: true });
    console.log('MongoDB Connected');
    db = client.db('commitments');

  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1); // exit with a failure code
  }
})();


// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

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

app.get("/commitments", requiresAuth(), async (req, res) => {

  var isAuthenticated = req.oidc.isAuthenticated();
  let userCommitments = [];

  if (isAuthenticated) {
    const sub = req.oidc.user.sub;
    const commitmentsCollection = db.collection('commitments');

    // Awaiting the result from the database
    userCommitments = await commitmentsCollection.find({ sub: sub }).toArray();

  }
  console.log(userCommitments);
  res.render("commitments", { isAuthenticated, userCommitments });
});

app.post('/commitments', async (req, res) => {
  try {
    const commitment = {
      commitment_name: req.body.commitment_name,
      lat: req.body.lat,
      long: req.body.long,
      sub: req.oidc.user.sub
    };
    const result = await db.collection('commitments').insertOne(commitment);
    res.json({ success: true, message: 'Data inserted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to insert data' });
  }
});


app.get('/', (req, res) => {
  var isAuthenticated = req.oidc.isAuthenticated();
  console.log(isAuthenticated);
  res.render('index', { isAuthenticated });
});




// view engine setup
app.set('views', path.join(__dirname, 'views'));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug'); // Set Pug as the view engine

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
