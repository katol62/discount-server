var mysql=require('mysql');
var connection = mysql.createPool({

    host:'localhost',
    user:'admin',
    password:'xl12qtmwrvXz4VZ8',
    database:'discountdb',
    multipleStatements: true

});
module.exports=connection;
