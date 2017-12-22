var db = require('../misc/db');

var Location = {

    getCountries: function(done) {
        db.query('SELECT * FROM loc_states', function(err, rows){
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },
    getFoByCountry: function(id, done) {
        db.query('SELECT * FROM loc_fos WHERE state = ?', [id], function(err, rows){
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },
    getRegionByFo: function(id, done) {
        db.query('SELECT * FROM loc_regions WHERE foc = ?', [id], function(err, rows){
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    }

};

module.exports = Location;