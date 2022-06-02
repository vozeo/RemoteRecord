const mysql = require('mysql')

const config = {
    database: 'user',
    user: 'root',
    password: 'abc123',
}

// [], {}, [{}, id]
exports.db = (sql, sqlParams) => {
    sqlParams = (sqlParams == null ? [] : sqlParams);
    return new Promise((resolve, reject) => {
        const pool = mysql.createPool(config);
        pool.getConnection((err, conn) => {
            if (!err) {
                conn.query(sql, sqlParams, (e, results) => {
                    if (!e) {
                        resolve(results);
                        conn.destroy();
                    } else {
                        console.log("sql err: ", e);
                        reject(e);
                    }
                });
            } else {
                console.log("conn err: ", err);
                reject(err);
            }
        });
    })
}