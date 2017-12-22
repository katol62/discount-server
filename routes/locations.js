var express = require('express');
var Location = require('./../models/location');

var router = express.Router();

var methodOverride = require('method-override');
router.use(methodOverride('X-HTTP-Method-Override'));
router.use(methodOverride('_method'));
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        var method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

router.get('/countries', function (req, res, next) {
    Location.getCountries(function (err, rows) {
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(rows);
    })
});

router.get('/countries/:cid/fos', function (req, res, next) {

    var cid = req.params.cid;

    Location.getFoByCountry(cid, function (err, rows) {
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(rows);
    })
});

router.get('/fos/:fid/regions', function (req, res, next) {

    var fid = req.params.fid;

    Location.getRegionByFo(fid, function (err, rows) {
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(rows);
    })

});

module.exports = router;

