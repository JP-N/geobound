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

// Tile38 Connection
var Tile38 = require('tile38');
var client = new Tile38({host: '172.17.51.158', port: 9851, debug: true });

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

app.use('/', indexRouter);
app.use('/users', usersRouter);

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
