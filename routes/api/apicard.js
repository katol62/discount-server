var express = require('express');

var router = express.Router();

var config = require('./../../misc/config')
var Card = require('./../../models/card');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];


router.get('/', (req, res, next)=> {
    res.json({success:true});
});

module.exports = router;