var db = require('../misc/db');
var moment = require('moment');

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
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.admin?body.admin:body.owner, body.test=='on'?'1':'0', body.updated, body.updatedBy, body.id];

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

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getByCardForUser: (card, user, done)=>{

        let query = '';
        let whereArray = [];
        let params = [];
        let whereString = '';

        if (user.role === 'super') {
            query = 'SELECT * FROM cards ';
            if (card.id) {
                whereArray.push('id = ?');
                params.push(card.id);
            }
            if (card.card_nb) {
                whereArray.push('card_nb = ?');
                params.push(card.card_nb);
            }
            if (card.qr_code) {
                whereArray.push('qr_code = ?');
                params.push(card.qr_code);
            }
            if (card.nfs_code) {
                whereArray.push('nfs_code = ?');
                params.push(card.nfs_code);
            }
            whereString = ' WHERE '+whereArray.join(' OR ');
        }
        if (user.role == 'admin') {
            query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.id';
            if (card.id) {
                whereArray.push('c.id = ?');
                params.push(card.id);
            }
            if (card.card_nb) {
                whereArray.push('c.card_nb = ?');
                params.push(card.card_nb);
            }
            if (card.qr_code) {
                whereArray.push('c.qr_code = ?');
                params.push(card.qr_code);
            }
            if (card.nfs_code) {
                whereArray.push('c.nfs_code = ?');
                params.push(card.nfs_code);
            }
            params.push(user.id);
            whereString = ' WHERE ('+whereArray.join(' OR ') + ')  AND u.id = ?';
        }

        if (user.role == 'cashier') {
            query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.parent';
            if (card.id) {
                whereArray.push('c.id = ?');
                params.push(card.id);
            }
            if (card.card_nb) {
                whereArray.push('c.card_nb = ?');
                params.push(card.card_nb);
            }
            if (card.qr_code) {
                whereArray.push('c.qr_code = ?');
                params.push(card.qr_code);
            }
            if (card.nfs_code) {
                whereArray.push('c.nfs_code = ?');
                params.push(card.nfs_code);
            }
            params.push(user.id);
            whereString = ' WHERE ('+whereArray.join(' OR ') + ')  AND u.id = ?';
        }

        query += whereString;

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
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, (body.admin && body.admin!='')?body.admin:body.owner, body.updated, body.updatedBy, body.id];
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
            var params = [];
            var elm = cards[i];
            var nfscode = elm[2];
            var mcode = elm[3];
            if (nfscode != "") {
                params.push('nfs_code="'+nfscode+'"');
            }
            if (mcode != "") {
                params.push('m_code="'+mcode+'"');
            }
            if (params.length) {
                var qr = 'UPDATE cards SET '+params.join(',')+' WHERE id='+elm[0]+' AND qr_code="'+elm[1]+'"';
                queryFinalArray.push(qr);
            }
        }
        var queryFinal = queryFinalArray.join(';');

        if (queryFinal.length) {
            db.query(queryFinal, function(err, rows){
                if (err) {
                    return done(err);
                }
                done(null, rows);
            })
        } else {
            return done({message: 'Nothing to update'});
        }

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

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    checkExpired: (card, done)=> {

        let overdue = false;

        if (card.date_discount && card.date_pass) {
            let exp_date_discount = moment(card.date_discount, 'YYYY-MM-DD h:m').add(31, 'days');
            let exp_date_pass = moment(card.date_pass).add(31, 'days');
            let now = moment();

            if (now>exp_date_discount && now>exp_date_pass) {
                //both expired
                overdue = true;
            } else if (now <= exp_date_pass) {
                let expire = require('moment')(card.date_pass_update).add(1, 'days');
                if (now > expire) {
                    if (card.pass_count + 1 > Number(card.pass)) {
                        overdue = true;
                    }
                }
            }
        }
        if (overdue) {
            let query = 'update cards set status = "overdue" where id = ?';
            db.query(query, [card.id], (err, rows)=>{
                if (err) {
                    return done(err)
                }
                done(null, {success: true, message: ''})
            })
        } else {
            done(null, {success: true, message: ''})
        }
    },

    checkValidity: (body, card, done)=> {

        let query = '';
        let params = [];
        if (body.type === 'discount') {
            if (!card.date_discount) {
                query = 'update cards set date_discount = ? where id = ?';
                params = [body.created, card.id];
                db.query(query, params, (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    let res = rows.affectedRows !== null;
                    let mess = !res ? 'initial discount date not set' : '';
                    done(null, {success: res, message: mess});
                })
            } else {
                var exp_date = moment(card.date_discount, 'YYYY-MM-DD h:m').add(31, 'days');
                var now = moment();

                if (exp_date >= now) {
                    done(null, {success: true, message: ''});
                } else {
                    done(null, {success: false, message: 'card activity (discount) exceded 31 day'})
                }
            }

        } else {
            if (!card.date_pass) {
                query = 'update cards set date_pass = ?, date_pass_update = ? where id = ?';
                params = [body.created, body.created, card.id];
                db.query(query, params, (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    let res = rows.affectedRows !== null;
                    let mess = !res ? 'initial pass date not set' : '';
                    done(null, {success: res, message: mess});
                })
            } else {

                var exp_date = moment(card.date_pass, 'YYYY-MM-DD hh:mm').add(31, 'days');
                var now = moment();

                if (now > exp_date) {
                    done(null, {success: false, message: 'card activity (pass) exceded 31 day'})
                } else {
                    let expire = moment(card.date_pass_update, 'YYYY-MM-DD hh:mm').add(1, 'days');

                    if (now > expire) {

                        if (card.pass_count + 1 > Number(card.pass)) {
                            done(null, {success: false, message: 'card pass count exceded'})
                        } else {

                            query = 'select count(*) from visit where card = ? and terminal = ?';
                            params = [card.id, body.terminal];
                            db.query(query, params, (err, rows)=>{
                                if (err) {
                                    return done(err)
                                }
                                if (rows) {
                                    done(null, {success: false, message: 'pass already applied for terminal'})
                                    return;
                                }

                                query = 'update cards set date_pass_update = ?, pass_count = ? where id = ?';
                                params = [now.format('YYYY-MM-DD HH:mm:ss'), (card.pass_count + 1), card.id];

                                db.query(query, params, (err, rows)=>{
                                    if (err) {
                                        return done(err)
                                    }
                                    done(null, {success: true, message: ''})
                                })

                            })

                        }

                    } else {
                        done(null, {success: true, message: ''})
                    }
                }
            }
        }

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

            var queryUpdate = 'UPDATE cards SET status=\'sold\', update_date=\''+updated+'\' WHERE id = ?';

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