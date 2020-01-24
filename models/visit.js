var db = require('../misc/db');

var Visit = {

    getExtendedForTerminal: (trid, done)=>{

        var query = 'select v.*, ter.name as terminalName, tar.name as tariffName, tar.discount, tar.discountUnit as discountUnit, tar.price as totalPrice, tar.discountType, c.card_nb as cardNumber, u.email from visit v left join terminal ter on v.terminal=ter.id left join tariff tar on v.tariff=tar.id left join cards c on v.card=c.id left join users u on v.user=u.id where v.terminal=? order by v.date DESC';
        db.query(query, [trid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    getExtendedForTerminalAndOwner: (trid, user, done)=>{

        let params = [trid];
        var query = 'select v.*, ' +
            'ter.name as terminalName, ' +
            'tar.name as tariffName, ' +
            'tar.discount, ' +
            'tar.discountUnit as discountUnit, ' +
            'tar.price as totalPrice, ' +
            'tar.discountType, ' +
            'c.card_nb as cardNumber, ' +
            'u.email from visit v ' +
            'left join terminal ter on v.terminal=ter.id ' +
            'left join tariff tar on v.tariff=tar.id ' +
            'left join cards c on v.card=c.id ' +
            'left join users u on v.user=u.id ' +
            'where v.terminal=? ';
        if (user.role === 'partner') {
            query += 'AND v.type = "discount" AND c.id in (SELECT distinct id from cards where owner = ?) ';
            params.push(user.id);
        }
        query += 'order by v.date DESC';

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    getExtendedForTerminalDate: (trid, start, end, done)=>{

        var query = 'select v.*, ' +
            'ter.name as terminalName, ' +
            'tar.name as tariffName, ' +
            'ter.commission as terminalCommission, ' +
            'tar.discount, ' +
            'tar.discountUnit as discountUnit, ' +
            'tar.price as totalPrice, ' +
            'tar.discountType, ' +
            'c.card_nb as cardNumber, ' +
            'u.email from visit v ' +
            'left join terminal ter on v.terminal=ter.id ' +
            'left join tariff tar on v.tariff=tar.id ' +
            'left join cards c on v.card=c.id ' +
            'left join users u on v.user=u.id ' +
            'where v.terminal=? ';
        let params = [trid];

        if (start != '') {
            query += ' and v.date >= ?';
            params.push(start);
        }

        if (end != '') {
            query += ' and v.date <= ?';
            params.push(end);
        }

        query += ' order by v.date DESC';

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    getExtendedForTerminalDateAndOwner: (trid, start, end, user, done)=>{

        var query = 'select v.*, ' +
            'ter.name as terminalName, ' +
            'tar.name as tariffName, ' +
            'ter.commission as terminalCommission, ' +
            'tar.discount, ' +
            'tar.discountUnit as discountUnit, ' +
            'tar.price as totalPrice, ' +
            'tar.discountType, ' +
            'c.card_nb as cardNumber, ' +
            'u.email from visit v ' +
            'left join terminal ter on v.terminal=ter.id ' +
            'left join tariff tar on v.tariff=tar.id ' +
            'left join cards c on v.card=c.id ' +
            'left join users u on v.user=u.id ' +
            'where v.terminal=? ';
        let params = [trid];

        if (user.role === 'partner') {
            query += ' and c.id in (SELECT distinct id from cards where owner = ?)';
            params.push(user.id);
        }

        if (start != '') {
            query += ' and v.date >= ?';
            params.push(start);
        }

        if (end != '') {
            query += ' and v.date <= ?';
            params.push(end);
        }

        query += ' order by v.date DESC';

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    getExtended: (user, start, end, done)=>{

        var query = 'select v.*,\n' +
            '       ter.name as terminalName,\n' +
            '       ter.commission as terminalCommission,\n' +
            '       tar.name as tariffName,\n' +
            '       tar.discount,\n' +
            '       tar.discountUnit as discountUnit,\n' +
            '       tar.price as totalPrice,\n' +
            '       tar.discountType,\n' +
            '       c.card_nb as cardNumber,\n' +
            '       cm.name as companyName,\n' +
            '       cm.id as companyId,\n' +
            '       u.email from visit v\n' +
            '         left join terminal ter on v.terminal=ter.id\n' +
            '         left join company cm on ter.company=cm.id\n' +
            '         left join tariff tar on v.tariff=tar.id\n' +
            '         left join cards c on v.card=c.id\n' +
            '         left join users u on v.user=u.id ';

        if (user.role === 'admin' || user.role === 'cashier') {
            query =
                'select v.*, ' +
                'ter.name as terminalName, ' +
                'ter.commission as terminalCommission, ' +
                ' tar.name as tariffName, ' +
                ' tar.discount, ' +
                ' tar.discountUnit as discountUnit, ' +
                ' tar.price as totalPrice,' +
                ' tar.discountType, ' +
                ' ter.company as terminalCompany, ' +
                ' c.card_nb as cardNumber, ' +
                ' r.company as refCompany, ' +
                ' cm.name as companyName,' +
                ' cm.id as companyId,' +
                ' u.email from visit v' +
                ' left join terminal ter on v.terminal=ter.id' +
                ' left join reference r on ter.company=r.company ' +
                ' left join company cm on ter.company=cm.id' +
                ' left join tariff tar on v.tariff=tar.id' +
                ' left join cards c on v.card=c.id' +
                ' left join users u on v.user=u.id' +
                ' where r.user = ? ';
        }
        if (user.role === 'partner') {
            query += ' where c.id in (select distinct id from cards where owner = ?)'
        }

        let params = [];

        if (start != '') {
            query += ' and v.date >= ?';
            params.push(start);
        }

        if (end != '') {
            query += ' and v.date <= ?';
            params.push(end);
        }
        query += ' order by v.date DESC';

        if (user.role === 'admin' || user.role === 'cashier' || user.role === 'partner') {
            params.unshift(user.id);
        }
        // console.log(query);
        // console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    add: (body, done)=> {
        var query = 'INSERT INTO visit (date, terminal, card, tariff, type, price, user) VALUES (?, ?, ?, ?, ?, ?, ?)';
        var params = [body.created, body.tid, body.card, body.tariff, body.type, body.price, body.user];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    checkExists: (id, done)=>{
        db.query('SELECT * FROM visit WHERE card = ?', [id], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    },

    getTotalCount: (user, dstart, dend, done)=> {
        let query = 'select v.id from visit v';
        let params = [];
        let whereArray = [];

        if (user.role === 'admin' || user.role === 'cashier') {
            query = 'select v.id, ' +
                'v.terminal, t.company, r.company from visit v ' +
                'left join terminal t on v.terminal=t.id ' +
                'left join reference r on t.company=r.company ';
            whereArray.push('r.user=?');
            params.push(user.id);
        }
        if (user.role === 'partner') {
            whereArray.push('v.card in (select id from cards where owner = ?)');
            whereArray.push('v.type = "discount"');
            params.push(user.id);
        }
        if (dstart != '' ) {
            whereArray.push('v.date >= ?');
            params.push(dstart);
        }
        if (dend != '' ) {
            whereArray.push('v.date <= ?');
            params.push(dend);
        }

        query += whereArray.length ? ' where ' + whereArray.join(' and ') : '';
        console.log(query);
        console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows.length);
        })
    },

    getListWithCompany: (user, offset, limit, dstart, dend, done)=> {
        let params = [limit, offset];
        let query =
            'select v.*, ' +
            ' ter.name as terminalName, ' +
            ' tar.name as tariffName, ' +
            ' tar.discount, ' +
            ' tar.discountUnit as discountUnit, ' +
            ' tar.price as totalPrice,' +
            ' tar.discountType, ' +
            ' ter.company as terminalCompany, ' +
            ' c.card_nb as cardNumber, ' +
            ' cm.name as companyName,' +
            ' cm.id as companyId,' +
            ' u.email from visit v' +
            ' left join terminal ter on v.terminal=ter.id' +
            ' left join company cm on ter.company=cm.id' +
            ' left join tariff tar on v.tariff=tar.id' +
            ' left join cards c on v.card=c.id' +
            ' left join users u on v.user=u.id' +
            ' where 1=1 ';

        if (user.role == 'admin' || user.role == 'cashier') {
            query =
                'select v.*, ' +
                'ter.name as terminalName, ' +
                ' tar.name as tariffName, ' +
                ' tar.discount, ' +
                ' tar.discountUnit as discountUnit, ' +
                ' tar.price as totalPrice,' +
                ' tar.discountType, ' +
                ' ter.company as terminalCompany, ' +
                ' c.card_nb as cardNumber, ' +
                ' r.company as refCompany, ' +
                ' cm.name as companyName,' +
                ' cm.id as companyId,' +
                ' u.email from visit v' +
                ' left join terminal ter on v.terminal=ter.id' +
                ' left join reference r on ter.company=r.company ' +
                ' left join company cm on ter.company=cm.id' +
                ' left join tariff tar on v.tariff=tar.id' +
                ' left join cards c on v.card=c.id' +
                ' left join users u on v.user=u.id' +
                ' where r.user = ? ';
        }
        if (dstart != '' ) {
            query += ' and date >= ? ';
            params.unshift(dstart);
        }
        if (dend != '' ) {
            query += ' and date <= ? ';
            if (dstart != '') {
                params.splice(1, 0, dend)
            } else {
                params.unshift(dend);
            }
        }
        query +=' order by v.date DESC' +
            ' LIMIT ? OFFSET ?';

        if (user.role == 'admin' || user.role == 'cashier') {
            params.unshift(user.id);
        }

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    getListForJournal: (user, offset, limit, dstart, dend, done)=> {
        // let params = [limit, offset];
        let params = [];
        let whereArray = [];
        let query =
            'select v.*, ' +
            ' ter.name as terminalName, ' +
            ' tar.name as tariffName, ' +
            ' tar.discount, ' +
            ' tar.discountUnit as discountUnit, ' +
            ' tar.price as totalPrice,' +
            ' tar.discountType, ' +
            ' ter.company as terminalCompany, ' +
            ' c.card_nb as cardNumber, ' +
            ' cm.name as companyName,' +
            ' cm.id as companyId,' +
            ' u.email from visit v' +
            ' left join terminal ter on v.terminal=ter.id' +
            ' left join company cm on ter.company=cm.id' +
            ' left join tariff tar on v.tariff=tar.id' +
            ' left join cards c on v.card=c.id' +
            ' left join users u on v.user=u.id';

        if (user.role == 'admin' || user.role == 'cashier') {
            query =
                'select v.*, ' +
                'ter.name as terminalName, ' +
                ' tar.name as tariffName, ' +
                ' tar.discount, ' +
                ' tar.discountUnit as discountUnit, ' +
                ' tar.price as totalPrice,' +
                ' tar.discountType, ' +
                ' ter.company as terminalCompany, ' +
                ' c.card_nb as cardNumber, ' +
                ' r.company as refCompany, ' +
                ' cm.name as companyName,' +
                ' cm.id as companyId,' +
                ' u.email from visit v' +
                ' left join terminal ter on v.terminal=ter.id' +
                ' left join reference r on ter.company=r.company ' +
                ' left join company cm on ter.company=cm.id' +
                ' left join tariff tar on v.tariff=tar.id' +
                ' left join cards c on v.card=c.id' +
                ' left join users u on v.user=u.id';
            whereArray.push('r.user = ?');
            params.push(user.id);
        }

        if (user.role === 'partner') {
            whereArray.push('v.card in (select id from cards where owner = ?)');
            whereArray.push('v.type = "discount"');
            params.push(user.id);
        }
        if (dstart != '' ) {
            whereArray.push('v.date >= ?');
            params.push(dstart);
        }
        if (dend != '' ) {
            whereArray.push('v.date <= ?');
            params.push(dend);
        }

        query += whereArray.length ? ' where ' + whereArray.join(' and ') : '';

        query +=' order by v.date DESC' +
            ' LIMIT ? OFFSET ?';
        params.push(limit);
        params.push(offset);

        if (user.role == 'admin' || user.role == 'cashier') {
            params.unshift(user.id);
        }

        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    }

};

module.exports = Visit;
