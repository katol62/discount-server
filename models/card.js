var db = require('../misc/db');

var Card = {

    getAll: (limit, offset, done)=>{
        var query = 'SELECT * from cards LIMIT ? OFFSET ?';
        db.query(query, [limit, offset], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getAutoIncrement: (done)=>{

        var qr = 'SELECT Auto_increment as ai FROM information_schema.tables WHERE table_name = \'cards\' AND table_schema=DATABASE()';
        db.query(qr, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    },

    createCard: (body, done)=>{
        var query = 'INSERT INTO cards (qr_code, card_nb, type, status, lifetime, servicetime, test) SELECT ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM cards WHERE card_nb = ?) LIMIT 1';
        var params = [body.qr_code, body.card_nb, body.type, body.status, body.lifetime, body.servicetime, body.test=='on'?'1':'0', body.card_nb];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    updateCard: (body, done)=>{
        var query = 'UPDATE cards SET type=?, status=?, lifetime=?, servicetime=?, test=? WHERE id = ?';
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.test=='on'?'1':'0', body.id];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getById: (id, done)=>{
        db.query('SELECT * FROM cards WHERE id = ?', [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    delete: (id, done)=>{
        db.query('DELETE FROM cards WHERE id = ?', [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

};

module.exports = Card;