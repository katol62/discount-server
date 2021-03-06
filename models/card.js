var db = require('../misc/db');
var moment = require('moment');
var locale = require('./../misc/locale');
var config = require('../misc/config');
var globals = require('../misc/globals');
var dict = locale[config.locale];

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

    getAllForUser: (user, limit, offset, filterObject, done)=>{

        var query = 'SELECT * from cards ';
        var whereArray = [];
        var params = [];
        var limitString = '';

        if (user.role === 'admin' || user.role === 'partner') {
            whereArray.push('owner = ?');
            params.push(user.id);
        }

        if (filterObject.filter !== '') {
            whereArray.push(filterObject.filter+' = ?');
            params.push(filterObject.filterValue);
        } else {
            limitString += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }
        var whereString = whereArray.length ? ' WHERE ' + whereArray.join(' AND ') : '';

        query = query + whereString + limitString;
        console.log(filterObject);
        console.log(query);
        console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getTotalForOwner: (user, filterObject, done)=>{

        var query = 'SELECT count(*) as count from cards ';
        var whereArray = [];
        var params = [];

        if (user.role == 'admin' || user.role == 'partner') {
            whereArray.push('owner = ?');
            params.push(user.id);
        }

        if (filterObject.filter != '') {
            whereArray.push(filterObject.filter+' = ?');
            params.push(filterObject.filterValue);
        }
        var whereString = whereArray.length ? ' WHERE ' + whereArray.join(' AND ') : '';

        query = query + whereString;

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
        var query = 'INSERT INTO cards (qr_code, card_nb, type, status, lifetime, servicetime, company_id, transh, owner, test, prim) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM cards WHERE card_nb = ?) LIMIT 1';
        var params = [body.qr_code, body.card_nb, body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.transh?body.transh:null, body.owner, body.test=='on'?'1':'0', body.prim?body.prim:null, body.card_nb];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    updateCard: (body, done)=>{
        var query = 'UPDATE cards SET type=?, status=?, lifetime=?, servicetime=?, company_id=?, owner=?, test=?, prim=?, update_date=?, updated_by=? WHERE id = ?';
        var params = [body.type, body.status, body.lifetime, body.servicetime, body.company?body.company:null, body.admin?body.admin:body.owner, body.test=='on'?'1':'0', body.prim?body.prim:null, body.updated, body.updatedBy, body.id];

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
        // if (user.role == 'admin') {
        //     query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.id WHERE (c.id = ? OR c.card_nb = ?) AND u.id=?';
        //     params = [id, id, user.id];
        // }
        // if (user.role == 'cashier') {
        //     query = 'select c.*, u.id as userId from cards c left join users u on c.owner=u.parent WHERE (c.id = ? OR c.card_nb = ?) AND u.id=?';
        //     params = [id, id, user.id];
        // }

        console.log(query);
        console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getByCardForUser: (card, user, done)=>{

        let query = 'SELECT * FROM cards ';
        let whereArray = [];
        let params = [];
        // let whereString = '';

        /*
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
        */

        // let query = 'SELECT * FROM cards ';
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
        let whereString = ' WHERE '+whereArray.join(' OR ');

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
        if (user.role === 'admin' || user.role === 'partner') {
            query = 'SELECT c.card_nb, c.qr_code, c.type, u.email as owner, uu.email as seller, CAST(c.update_date as CHAR) as date from cards c \n' +
                'left join users u on c.owner=u.id \n' +
                'left join users uu on c.updated_by=uu.id\n' +
                'where c.status=? and c.owner=?';
            params = [type, user.id];
        }
        if (user.role === 'cashier') {
            query = 'SELECT c.card_nb, c.qr_code, c.type, u.email as owner, uu.email as seller, CAST(c.update_date as CHAR) as date from cards c \n' +
                'left join users u on c.owner=u.id \n' +
                'left join users uu on c.updated_by=uu.id\n' +
                'where c.status=? and c.updated_by=?';
            params = [type, user.id];
        }

        if (start !== '') {
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
            let exp_date_discount = moment(card.date_discount, 'YYYY-MM-DD h:m').add(Number(card.lifetime), 'days');
            let exp_date_pass = moment(card.date_pass).add(Number(card.servicetime), 'days');
            let now = moment();

            if (now>exp_date_discount) {
                overdue = true;
            }
            // if (now => exp_date_pass) {
            //     let expire = require('moment')(card.date_pass_update).add(1, 'days');
            //     if (now > expire) {
            //         if (card.pass_count + 1 > card.pass && card.pass_total >= Number(card.passCount)) {
            //             overdue = true;
            //         }
            //     }
            // }
            // if (now>exp_date_discount && now>exp_date_pass) {
            //     //both expired
            //     overdue = true;
            // } else if (now <= exp_date_pass) {
            //     let expire = require('moment')(card.date_pass_update).add(1, 'days');
            //     if (now > expire) {
            //         if (card.pass_count + 1 > Number(card.passCount)) {
            //             overdue = true;
            //         }
            //     }
            // }
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
                var exp_date = moment(card.date_discount, 'YYYY-MM-DD h:m').add(Number(card.lifetime), 'days');
                var now = moment();

                if (exp_date >= now) {
                    done(null, {success: true, message: ''});
                } else {
                    done(null, {success: false, message: 'card activity (discount) exceded '+card.lifetime+' days'})
                }
            }

        } else {
            // do not allow discount cards to use pass terminals
            if (card.pass === 0) {
                return done(null, {success: false, message: dict.messages.visit_card_tariff_type_error})
            }
            if (!card.date_pass) {
                query = 'update cards set pass_total = ?, date_pass = ?, date_pass_update = ? where id = ?';
                params = [(card.pass_total + 1), body.created, body.created, card.id];
                console.log('====== first pass ====')
                console.log(query);
                console.log(params);
                db.query(query, params, (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    let res = rows.affectedRows !== null;
                    let mess = !res ? 'initial pass date not set' : '';
                    done(null, {success: res, message: mess});
                })
            } else {

                console.log('=============');
                var exp_date = moment(card.date_pass, 'YYYY-MM-DD HH:mm').add(Number(card.servicetime), 'days');
                var now = moment();

                if (now > exp_date) {
                    done(null, {success: false, message: 'card activity (pass) exceded ' + card.servicetime + ' day(s)'})
                } else {
                    //Check card pass on terminal
                    query = 'select count(*) as count from visit where card = ? and terminal = ? and type = ? ';
                    params = [card.id, body.tid, 'pass'];
                    db.query(query, params, (err, rows)=>{
                        if (err) {
                            return done(err);
                        }
                        console.log('=== CHECK TERMINAL!! ===');
                        console.log(rows[0].count);
                        //if card was already checked on terminal
                        if (rows && rows[0].count > 0) {
                            return done(null, {success: false, message: dict.messages.visits_card_already_passed});
                        } else {
                            let expire = moment(card.date_pass_update, 'YYYY-MM-DD HH:mm').add(1, 'days');
                            // if current date > date of last pass update
                            if (now > expire){
                                let new_pass_count = card.pass_count + 1;
                                if (new_pass_count > card.pass) {
                                    if (card.pass_total >= Number(card.passCount)) {
                                        return done(null, {success: false, message: dict.messages.visits_card_pass_count_exceded});
                                    }
                                    query = 'update cards set pass_total = ? where id = ?';
                                    params = [(card.pass_total + 1), card.id];
                                    db.query(query, params, (err, rows)=>{
                                        if (err) {
                                            return done(err)
                                        }
                                        return done(null, {success: true, message: ''})
                                    });
                                } else {
                                    query = 'update cards set pass_count = ?, pass_total = ?, date_pass_update = ? where id = ?';
                                    params = [new_pass_count, (card.pass_total + 1), now.format('YYYY-MM-DD HH:mm:ss'), card.id];
                                    db.query(query, params, (err, rows)=>{
                                        if (err) {
                                            return done(err)
                                        }
                                        done(null, {success: true, message: ''})
                                    });
                                }
                            } else {
                                // if current date <= date of last pass update
                                let new_pass_count = card.pass_count + 1;
                                if (new_pass_count > card.pass) {
                                    if (card.pass_total >= Number(card.passCount)) {
                                        return done(null, {success: false, message: dict.messages.visits_card_pass_count_exceded});
                                    }
                                }
                                query = 'update cards set pass_total = ? where id = ?';
                                params = [(card.pass_total + 1), card.id];
                                db.query(query, params, (err, rows)=>{
                                    if (err) {
                                        return done(err)
                                    }
                                    return done(null, {success: true, message: ''})
                                });
                            }
                        }
                    });
                }
            }
        }
    },

    resetPass: (body, done) => {
        let query = 'update cards set pass_count = ?, pass_total = ?, date_pass = ?, date_pass_update = ? where id = ?';
        let params = [0, 0, body.updated, body.updated, body.id];
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

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    registerPass: (body, done) => {
        console.log(body);
        const query = 'INSERT INTO purchased_pass (card, date, pass, days, pass_limit) VALUES (?, ?, ?, ?, ?)';
        const limit = globals.methods.getPassLimit(body.pass);
        const params = [Number(body.id), body.updated, body.pass, body.pass, limit];
        console.log(query);
        console.log(params);
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    checkAvailableCards: (done) => {
        const query = 'select count(*) as count from cards c, transh t where t.external=\'1\' and c.transh = t.id';
        db.query(query, [], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows);
        })
    },

    assignSoftCard: (body, done)=>{

        var selectArray = ['t.external=\'1\'', 'c.transh = t.id', 'c.status = ?'];
        var paramsArray = ['published'];
        if (body.company) {
            selectArray.push('c.company_id = ?');
            paramsArray.push(body.company);
        }

        const where = ' WHERE ' + selectArray.join( ' AND ');

        const query = 'select c.* from cards c, transh t' + where + ' ORDER BY id LIMIT 1';
        // var query = 'SELECT * FROM cards WHERE '+selectArray.join(' AND ')+' ORDER BY id LIMIT 1';
        var params = paramsArray;

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }

            if (rows.length == 0) {
                return done({status:'error', message: 'Cards not available'});
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

    checkCardAssignedGroup: (card, done)=>{
        var query = 'SELECT * FROM tariff_card WHERE card = ?';
        var params = [card.card_nb];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            return done(null, rows);
        })
    },

    validateCards: (cards, done) => {
        let numbersArray = [];
        if (cards.length > 0) {
            cards.forEach( (card)=> {
                numbersArray.push("'"+card.card_nb+"'");
            });
        }
        const numbers = numbersArray.join(',');
        // var query = 'SELECT * FROM cards WHERE card_nb IN ( ? )';
        // var params = [numbers];
        // console.log('SELECT * FROM cards WHERE card_nb IN ('+numbers+')');
        let query = `SELECT * FROM cards WHERE card_nb IN (${numbers})`;

        db.query(query, [], (err, rows)=>{
            console.log(rows);
            if (err) {
                return done(err)
            }
            return done(null, rows);
        })

    },

    exchangeCards: (body, done) => {
        var updateArray = ['status = ?', 'update_date=?', 'updated_by=?', 'prim = ?'];
        var paramsArray = [body.status, body.updated, body.updatedBy, body.prim];

        if (body.type) {
            updateArray.push('type = ?');
            paramsArray.push(body.type);
        }
        if (body.pass) {
            updateArray.push('pass = ?');
            paramsArray.push(body.pass);
        }
        paramsArray.push(body.card_nb);

        var query = 'UPDATE cards SET '+updateArray.join(',')+' WHERE card_nb = ?';
        var params = paramsArray;

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    },

};

module.exports = Card;
