const {db} = require('./db');

// 用户模块的数据持久化操作

const user = {

    // 获取所有用户信息
    getAll: async () => {
        const sql = "SELECT * FROM student WHERE stu_userlevel = '0' AND stu_enable = '1'";
        return await db(sql);
    },

    // 根据 id 获取用户信息
    getUserById: async (id) => {
        const sql = "SELECT * FROM student WHERE stu_no = ? AND stu_enable = '1'";
        return await db(sql, [id]);
    },

    // 更新用户信息
    update: async (arr) => {
        // [user, id] ==> [{nickname: '', gender: ''}, id]
        const sql = 'UPDATE student SET ? WHERE stu_no = ?';
        return await db(sql, arr);
    },
};

module.exports = user