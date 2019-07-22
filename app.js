var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');
var expressValidator = require('express-validator');
var session = require('express-session');
var methodOverride = require('method-override');
var moment = require('moment');
var locale = require('./misc/locale');
var cors = require('cors');


//routes
var index = require('./routes/index');
var admins = require('./routes/admins');
var profiles = require('./routes/profiles');
var companies = require('./routes/companies');
var locations = require('./routes/locations');
var cards = require('./routes/cards');
var api = require('./routes/api/api');

var app = express();

//external modules
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/bootbox', express.static(__dirname + '/node_modules/bootbox/'));
app.use('/bootstrap-datepicker', express.static(__dirname + '/node_modules/bootstrap-datepicker/dist/'));
app.use('/bootstrap-select', express.static(__dirname + '/node_modules/bootstrap-select/dist/'));

var config = require('./misc/config');
app.set('superSecret', config.secret);
app.set('sessionSecret', config.sessionSecret);

//app locals
app.locals.moment = moment;
app.locals.locale = locale;

//session
app.use(session({
    secret: 'sessionSecret', resave: true,
    saveUninitialized: true, cookie: {maxAge: 24 * 60 * 60 * 1000}
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/admins', admins);
app.use('/profile', profiles);
app.use('/companies', companies);
app.use('/location', locations);
app.use('/cards', cards);

//api
app.use('/api', api);

// app.use(cors());
app.options('/api', cors());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(config.server.port, config.server.host ? config.server.host : undefined);

module.exports = app;
