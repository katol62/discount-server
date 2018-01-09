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
        var query = 'INSERT INTO cards (qr_code, card_nb, type, status, lifetime, servicetime, company_id, transh, owner, test) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM cards WHERE card_nb = ?) LIMIT 1';
        var params = [body.qr_code, body.card_nb, body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.transh?body.transh:null, body.owner, body.test=='on'?'1':'0', body.card_nb];

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

    getByIdOrNumber: (id, done)=>{
        db.query('SELECT * FROM cards WHERE id = ? OR card_nb = ?', [id, id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getByIdOrNumberForUser: (id, user, done)=>{

        var query = 'SELECT * FROM cards WHERE id = ? OR card_nb = ?';
        var params = [id, id];
        if (user.role == 'admin') {
            query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.id WHERE (c.id = ? OR c.card_nb = ?) AND u.id=?';
            params = [id, id, user.id];
        }
        if (user.role == 'cashier') {
            query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.parent WHERE (c.id = ? OR c.card_nb = ?) AND u.id=?';
            params = [id, id, user.id];
        }

        console.log(query);
        console.log(params);
        db.query(query, params, (err, rows)=>{
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

    getByTranshId: (trid, done)=>{
        var query = 'SELECT * FROM cards WHERE transh = ?';

        db.query(query, [trid], (err, rows)=>{
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

    updateFromExternal: (cards, done)=>{
        var queryFinalArray = [];
        for (var i=0; i<cards.length; i++) {
            var elm = cards[i];
            var qr = 'UPDATE cards SET nfs_code="'+elm[2]+'", m_code="'+elm[3]+'" WHERE id='+elm[0]+' AND qr_code="'+elm[1]+'"';
            console.log(qr);
            queryFinalArray.push(qr);
        }
        var queryFinal = queryFinalArray.join(';');

        db.query(queryFinal, function(err, rows){
            console.log('== update cards =====')
            console.log(err)
            console.log(rows)
            console.log('== update cards =====')
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    },

    setSold: (id, pass, done)=>{
        var query = 'UPDATE cards SET status=\'sold\', pass = ? WHERE id = ?';
        var params = [pass, id];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    updateStatus: (body, done)=>{
        var query = 'UPDATE cards SET status=? WHERE id = ?';
        var params = [body.status, body.id];

        if (body.pass) {
            query = 'UPDATE cards SET status=? AND pass=? WHERE id = ?';
            params = [body.status, body.pass, body.id];
        }

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    sell: (body, done)=>{

        var updateArray = ['status = ?'];
        var paramsArray = [body.status];

        if (body.type) {
            updateArray.push('type = ?');
            paramsArray.push(body.type);
        }
        if (body.pass) {
            updateArray.push('pass = ?');
            paramsArray.push(body.pass);
        }
        paramsArray.push(body.id);

        var query = 'UPDATE cards SET '+updateArray.join(' AND ')+' WHERE id = ?';
        var params = paramsArray;

        console.log(query);
        console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

};

module.exports = Card;