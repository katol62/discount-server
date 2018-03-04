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
        var query = 'UPDATE cards SET type=?, status=?, lifetime=?, servicetime=?, company_id=?, owner=?, test=?, update_date=?, updated_by=? WHERE id = ?';
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.admin!=''?body.admin:body.owner, body.test=='on'?'1':'0', body.updated, body.updatedBy, body.id];

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

    getCardsForUserAndType: (user, type, start, end, done)=>{

        var query = 'SELECT c.card_nb, c.qr_code, c.type, u.email as owner, uu.email as seller, CAST(c.update_date as CHAR) as date from cards c left join users u on c.owner=u.id left join users uu on c.updated_by=uu.id where c.status=?';
        var params = [type];
        if (user.role == 'admin') {
            query = 'SELECT c.card_nb, c.qr_code, c.type, u.email as owner, uu.email as seller, CAST(c.update_date as CHAR) as date from cards c \n' +
                'left join users u on c.owner=u.id \n' +
                'left join users uu on c.updated_by=uu.id\n' +
                'where c.status=? and c.owner=?';
            params = [type, user.id];
        }
        if (user.role == 'cashier') {
            query = 'SELECT c.card_nb, c.qr_code, c.type, u.email as owner, uu.email as seller, CAST(c.update_date as CHAR) as date from cards c \n' +
                'left join users u on c.owner=u.id \n' +
                'left join users uu on c.updated_by=uu.id\n' +
                'where c.status=? and c.updated_by=?';
            params = [type, user.id];
        }

        if (start != '') {
            query += ' and c.update_date >= ?';
            params.push(start);
        }

        if (end != '') {
            query += ' and c.update_date <= ?';
            params.push(end);
        }

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
        var query = 'UPDATE cards set type=?, status=?, lifetime=?, servicetime=?, company_id=?, owner=?, update_date=?, updated_by=? WHERE transh = ?';
        console.log(body);
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, (body.admin && body.admin!='')?body.admin:body.owner, body.updated, body.updatedBy, body.id];
        console.log('=== query ===');
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
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    },

    updateStatus: (body, done)=>{
        var updateArray = ['status = ?', 'update_date=?', 'updated_by=?'];
        var paramsArray = [body.status, body.updated, body.updatedBy];

        if (body.pass) {
            updateArray.push('pass = ?');
            paramsArray.push(body.pass);
        }
        paramsArray.push(body.id);

        var query = 'UPDATE cards SET '+updateArray.join(',')+' WHERE id = ?';
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

    sell: (body, done)=>{

        var updateArray = ['status = ?', 'update_date=?', 'updated_by=?'];
        var paramsArray = [body.status, body.updated, body.updatedBy];

        if (body.type) {
            updateArray.push('type = ?');
            paramsArray.push(body.type);
        }
        if (body.pass) {
            updateArray.push('pass = ?');
            paramsArray.push(body.pass);
        }
        paramsArray.push(body.id);

        var query = 'UPDATE cards SET '+updateArray.join(',')+' WHERE id = ?';
        var params = paramsArray;

        console.log('=====!!!!=========');
        console.log(query);
        console.log(params);
        console.log('==============');

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    assignSoftCard: (body, done)=>{

        var selectArray = ['status = ?'];
        var paramsArray = ['published'];
        if (body.company) {
            selectArray.push('company_id = ?');
            paramsArray.push(body.company);
        }

        var query = 'SELECT * FROM cards WHERE '+selectArray.join(' AND ')+' ORDER BY id LIMIT 1';
        var params = paramsArray;

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }

            if (rows.length == 0) {
                return done({status:'error', message: 'Cards now available'});
            }
            var card = rows[0];
            var updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');

            var queryUpdate = 'UPDATE cards SET status=\'sold\', update_date='+updated+' WHERE id = ?';

            db.query(queryUpdate, [card.id], (err, rows)=>{
                if (err) {
                    return done(err)
                }
                if (rows.affectedRows == 0) {
                    return done({status:'error', message: 'Cards could not be sold'});
                }
                var queryAssign = 'INSERT INTO usercards (user, card) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM usercards WHERE user = ? AND card = ?) LIMIT 1';
                var paramsAssign = [body.user, card.id, body.user, card.id];

                db.query(queryAssign, paramsAssign, (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    done(null, rows)
                })

            })

        })
    },

};

module.exports = Card;