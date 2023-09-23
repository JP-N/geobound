var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongodb = require("mongodb");
var { createClient } = require('redis');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const { requiresAuth } = require('express-openid-connect');
const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',
  baseURL: 'http://localhost:3000',
  clientID: 'OhWMIGiRD314Mk8Wo7xElUkO9WokSVe3',
  issuerBaseURL: 'https://dev-mg2bbanln4b8fu3b.us.auth0.com'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// Tile38 Connection
var Tile38 = require('tile38');
var client = new Tile38({host: '172.17.51.158', port: 9851, debug: true });

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

// save a location in format (group, key, cords)
client.set('UIowa', 'IMU', [41.6631103,-91.5383735]); // cords for the IMU for testing

client.get('UIowa', 'IMU').then(data => {
  console.log(data); // prints coordinates in geoJSON format
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/users', usersRouter);
app.get('/', (req, res) => {
  var isAuthenticated = req.oidc.isAuthenticated();
  console.log(isAuthenticated);
  res.render('index', { isAuthenticated });
});

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
