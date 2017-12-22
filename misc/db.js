var mysql=require('mysql');
var connection = mysql.createPool({

    host:'localhost',
    user:'root',
    password:'',
    database:'discountdb',
    multipleStatements: true

});
module.exports=connection;