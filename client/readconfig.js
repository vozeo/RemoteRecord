const fs = require('fs');
const iconv = require('iconv-lite')

const default_config_file = "/etc/webrtc-u2051995.conf";

const readConfig = async (config_file) => {
    var params = {};
    return await new Promise((resolve, reject) => {
        fs.readFile(config_file, (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            data = iconv.decode(data, 'gbk');
            const lines = data.split(/\r?\n/);
            let group_name;
            let item_name;
            let item_value;
            const reg_group = /\[[^\[\]\s]+\]$/i;
            const reg_item = /[^\[\]\s]+=[^\[\]\s]+$/i;
            for (let i = 0; i < lines.length; i++) {
                let line = '';
                for (let ch of lines[i]) {
                    if (ch == ';' || ch == '#')
                        break;
                    line += ch;
                }
                line = line.replace(/\s/g, "");
                if (line == '')
                    continue;
                if (reg_group.test(line)) {
                    line = line.replace(/\[|\]/g, "");
                    group_name = line;
                    if (params[group_name] == null)
                        params[group_name] = {};
                    continue;
                }
                if (group_name != null && reg_item.test(line)) {
                    [item_name, item_value] = line.split(/=/);
                    params[group_name][item_name] = item_value;
                    continue;
                }
                console.log('err in config line', i, line);
            }
            resolve(params);
        })
    })
}

readConfig(default_config_file).then((res) => { console.log(res) });
module.exports = readConfig;