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

    getAllForUser: (user, limit, offset, done)=>{
        var query = 'SELECT * from cards LIMIT ? OFFSET ?';
        var params = [limit, offset];
        if (user.role == 'admin') {
            query = 'SELECT * from cards WHERE owner = ? LIMIT ? OFFSET ?';
            params = [user.id, limit, offset];
        }
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getTotalForOwner: (user, done)=>{
        var query = 'SELECT count(*) as count from cards';
        var params = [];
        if (user.role == 'admin') {
            query = 'SELECT count(*) as count from cards WHERE owner = ?';
            params = [user.id];
        }
        db.query(query, params, (err, rows)=>{
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
        var query = 'INSERT INTO cards (qr_code, card_nb, type, status, lifetime, servicetime, company_id, transh, test) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM cards WHERE card_nb = ?) LIMIT 1';
        var params = [body.qr_code, body.card_nb, body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.transh?body.transh:null, body.test=='on'?'1':'0', body.card_nb];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    updateCard: (body, done)=>{
        var query = 'UPDATE cards SET type=?, status=?, lifetime=?, servicetime=?, company_id=?, owner=?, test=? WHERE id = ?';
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.admin!=''?body.admin:body.owner, body.test=='on'?'1':'0', body.id];

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

    createCardTransh: (finalArray, done)=>{
        var query = 'INSERT INTO cards (qr_code, card_nb, type, status, lifetime, servicetime, company_id, transh, test, owner) VALUES ?';

        db.query(query, [finalArray], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    updateCardsForTransh: (body, done)=>{
        var query = 'UPDATE cards set type=?, status=?, lifetime=?, servicetime=?, company_id=?, owner=? WHERE transh = ?';
        console.log(body);
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, (body.admin && body.admin!='')?body.admin:body.owner, body.id];
        console.log(query);
        console.log(params);
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    deleteCardsForTransh: (id, done)=>{
        var query = 'DELETE t, c FROM transh t JOIN cards c ON c.transh = t.id WHERE t.id = ?';
        var params = [id];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

};

module.exports = Card;