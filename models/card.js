var db = require('../misc/db');

var Card = {

    getAll: (limit, offset, done)=>{
        var query = 'SELECT * from cards LIMIT ? OFFSET ?';
        db.query(query, [limit, offset], (err, rows)=>{
            if (err) {
                if (err) {
                    return done(err)
                }
                done(null, rows)
            }
        })
    },

};

module.exports = Card;