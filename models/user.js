var db = require('../misc/db');

var User = {

    getForParent: (parent, done) => {

        db.query('SELECT * from users WHERE parent = ?', [parent], (err, rows) => {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getForParentRole: (parent, role, done) => {

        db.query('SELECT * from users WHERE parent = ? AND role = ?', [parent, role], (err, rows) => {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getAll: function(done) {
        db.query('SELECT * from users', function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getForRoles: function(roles, id, done) {
        console.log(roles+" == "+id);

        db.query('SELECT * from users WHERE parent = ? AND role IN ( ? ) ', [id, roles], function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getByRole: function(role, done) {
        db.query('SELECT * from users WHERE role = ?', role, function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    createUser: (body, cryptPwd, done)=> {

        var name = body.name;
        var last = body.last;
        var phone = body.phone;
        var email = body.email;
        var password = cryptPwd;
        var role = body.role;
        var parent = body.parentadmin ? body.parentadmin : body.parent;
        var publisher = body.publisher ? (body.publisher=='on' ? '1':'0') : '0';
        db.query('INSERT INTO users (name, last, phone, email, password, role, parent, publisher) SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM users WHERE email=?) LIMIT 1', [name, last, phone, email, password, role, parent, publisher, email], function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        });
    },

    create: function(name, last, email, password, role, parent, done) {
        db.query('INSERT INTO users (name, last, email, password, role, parent) SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM users WHERE email=?) LIMIT 1', [name, last, email, password, role, parent, email], function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        });
    },

    updateProfile: function(id, name, last, email, password, done) {
        db.query('UPDATE users SET name = ?, last = ?, email = ?, password = ? WHERE id = ?', [name, last, email, password, id], function(err, rows) {
            console.log(err);
            console.log(rows);
            if (err) {
                return done(err)
            }
            done(null, rows.affectedRows)
        })
    },

    update: function(id, name, last, email, password, done) {
        db.query('UPDATE users SET name = ?, last = ?, email = ?, password = ? WHERE id = ?', [name, last, email, password, id], function(err, rows) {
            console.log(err);
            console.log(rows);
            if (err) {
                return done(err)
            }
            done(null, rows.affectedRows)
        })
    },

    updateUser: (body, cryptPwd, done)=> {
        console.log(body);
        var id = body.id;
        var name = body.name;
        var last = body.last;
        var phone = body.phone;
        var email = body.email;
        var password = cryptPwd;
        var query = 'UPDATE users SET name = ?, last = ?, email = ?, phone = ?, password = ? WHERE id = ?';
        var params = [name, last, email, phone, password, id];
        if (cryptPwd == null) {
            query = 'UPDATE users SET name = ?, last = ?, email = ?, phone = ? WHERE id = ?';
            params = [name, last, email, phone, id];
        }
        db.query(query, params, function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        });
    },

    getById: function (id, done) {
        db.query('SELECT * FROM users WHERE id = ?', [id, id], (err, rows)=> {
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    },

    delete: function (id, done) {
        db.query('DELETE FROM users WHERE id = ? OR parent = ?', [id, id], function(err, rows) {
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    },

    deleteAdmin: function (id, done) {
        //TODO: provide deletion all instances associated with admin
        db.query('DELETE FROM company WHERE owner = ? ', [id], function(err, rows) {
            if (err) {
                return done(err);
            }
            db.query('DELETE FROM users WHERE id = ? OR parent = ?', [id, id], function(err, rows) {
                if (err) {
                    return done(err);
                }
                done(null, rows);
            })
        });
    },

    getByNamePassword: function (name, password, done) {
        db.query('SELECT * FROM users where name = ? and password = ?', name, password, function(err, rows) {
            if (err) {
                return done(err);
            }
            done(null, rows)
        })

    },
    find: (name, done)=> {
        console.log(name);
        db.query('SELECT * FROM users where email = ?', name, function(err, rows) {
            if (err) {
                return done(err);
            }
            done(null, rows)
        })

    },

    updateReference: (uid, cid, tid, done)=> {

        var query = 'INSERT INTO reference (user, company, terminal) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE terminal=?';

        console.log(query);
        console.log(uid+" "+cid+" "+tid);

        var tidval = tid ? tid : null;

        db.query(query, [uid, cid, tidval, tidval], function(err, rows) {
            if (err) {
                return done(err);
            }
            done(null, rows)
        })
    },

    getByCompany: (cid, done)=> {
        var query = 'select u.*, r.company as cid, r.terminal as tid FROM users u LEFT JOIN reference r ON r.user = u.id WHERE r.company = ?';
        db.query(query, [cid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows)
        })
    },
    getExtendedByIdAndCompany: (uid, cid, done)=> {
        var query = 'select u.*, r.company as cid, r.terminal as tid FROM users u LEFT JOIN reference r ON r.user = u.id WHERE u.id = ? AND r.company = ?';
        db.query(query, [uid, cid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows)
        })
    },

    getUserByCompanyId: (id, done)=>{

        var query = 'SELECT * from users WHERE id = (SELECT owner FROM company WHERE id = ?)';
        db.query(query, [id], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows)
        })

    },

    allowedCompany: (user, cid, done)=>{
        var query = 'SELECT * FROM reference WHERE user = ? AND company = ?';
        db.query(query, [user.id, cid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows)
        })
    },

    allowedTerminal: (user, cid, tid, done)=>{
        var query = 'SELECT * FROM reference WHERE user = ? AND company = ? AND (isnull(terminal) OR terminal = ?)';
        db.query(query, [user.id, cid, tid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows)
        })
    },

};

module.exports = User;