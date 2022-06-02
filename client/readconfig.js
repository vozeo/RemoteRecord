const fs = require('fs');
const iconv = require('iconv-lite')

/*
params['root-dir']=[];
params['frame']=[];
params['time-settings']=[];

params['root-dir']['path']='/home/webrtc/video';
params['frame']['width']='1920';
params['frame']['height']='1000';
params['frame']['rate']='15';
params['time-settings']['disconnect']='15';

console.log(params);
*/

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
                //line = line.replace(/(^\s*)|(\s*$)/g,"");
                line = line.replace(/\s/g, "");
                if (line == '')
                    continue;
                //console.log(i, '*'+line+'*');

                // [xxx]        group
                if (reg_group.test(line)) {
                    line = line.replace(/\[|\]/g, "");
                    //console.log('   group: ', '*'+line+'*');
                    group_name = line;
                    if (params[group_name] == null)
                        params[group_name] = {};
                    continue;
                }

                // LHS = RHS    item
                if (group_name != null && reg_item.test(line)) {
                    [item_name, item_value] = line.split(/=/);
                    //console.log('    item: ', '*'+item_name+'*', '*'+item_value+'*');
                    params[group_name][item_name] = item_value;
                    continue;
                }
                // err
                console.log('err in config line', i, line);
            }
            //console.log('params', params);
            resolve(params);
        })
    })
}

readConfig(default_config_file).then((res) => { console.log(res) })
module.exports = readConfig;