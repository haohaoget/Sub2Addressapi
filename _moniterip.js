const moniterurl = 'https://monitor.gacjie.cn/api/client/get_ip_address';
// const cfv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv4api') : null;
// const cfv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv6api') : null;
// const cftv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv4api') : null;
// const cftv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv6api') : null;
let key = "o1zrmHAF";
const types = ["v4", "v6"];
const cdn_servers = ['cf', 'cft'];
const maxRetries = 3; // 最大重试次数
async
function getapi(env) {
    key = env.KEY || key;
    const SUB_BUCKET = env.SUB_BUCKET || false;

    let cfv4_api = [];
    let cfv6_api = [];
    let cftv4_api = [];
    let cftv6_api = [];
    for (let cdn_server of cdn_servers) {
        let cdn = 1;
        if (cdn_server == 'cf') {
            cdn = 1;
        } else if (cdn_server == 'cft') {
            cdn = 2;
        }
        for (let type of types) {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    const headers = {
                        'Content-Type': 'application/json'
                    };

                    const data = {
                        "key": key,
                        "type": type,
                        "cdn_server": cdn
                    };

                    const response = await fetch(moniterurl, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(data)
                    });

                    if (response.ok) {
                        const responsetext = await response.text();
                        const responseData = JSON.parse(responsetext);
                        // 按照delay的大小排序，如果delay相同则按照speed大小排序，如果都相同则取默认顺序
                        const Carrier_line = ['CM', 'CT', 'CU'];
                        const classsorted = [];
                        for (let line of Carrier_line) {
                            const sorted = responseData.info[line].sort((a, b) = >{
                                if (a.delay === b.delay) {
                                    return a.speed + b.speed;
                                }
                                return a.delay - b.delay;
                            });
                            classsorted.push(sorted);
                        }

                        for (let sorted of classsorted) {
                            // 提取前三个或所有CM的ip、colo和line_name
                            const numberOfCMsToExtract = Math.min(sorted.length, 3);
                            sorted.slice(0, numberOfCMsToExtract).map(cm = >{
                                const loc = cm.colo;
                                const name = cm.line_name;
                                const delay = cm.delay;

                                let api;
                                if (type == "v6") {
                                   api = `[${cm.ip}]:443#${name}v6-${loc}-${delay}`;
                                } else {
                                    api = `${cm.ip}:443#${name}-${loc}-${delay}`;
                                }

                                if (cdn_server == 'cf' && type == 'v4') {
                                    cfv4_api.push(api);
                                } else if (cdn_server == 'cf' && type == 'v6') {
                                    cfv6_api.push(api);
                                } else if (cdn_server == 'cft' && type == 'v4') {
                                    cftv4_api.push(api);
                                } else if (cdn_server == 'cft' && type == 'v6') {
                                    cftv6_api.push(api);
                                }
                            });
                        }

                        if (SUB_BUCKET) {
                            if (cdn_server == 'cf' && type == 'v4') {
                                const Raddressapi = cfv4_api.join("\n");
                                await SUB_BUCKET.put('cfv4_api', Raddressapi);
                            } else if (cdn_server == 'cf' && type == 'v6') {
                                const Raddressapi = cfv6_api.join("\n");
                                await SUB_BUCKET.put('cfv6_api', Raddressapi)
                            } else if (cdn_server == 'cft' && type == 'v4') {
                                const Raddressapi = cftv4_api.join("\n");
                                await SUB_BUCKET.put('cftv4_api', Raddressapi)
                            } else if (cdn_server == 'cft' && type == 'v6') {
                                const Raddressapi = cftv6_api.join("\n");
                                await SUB_BUCKET.put('cftv6_api', Raddressapi)
                            }
                        }
                        // 如果请求成功，跳出重试循环
                        break;
                    } else {
                        console.error(`获取地址时出错 (${retries + 1}/${maxRetries})`, response.status, response.statusText);
			retries++;
                    }
                }

                // 如果重试次数用尽，返回错误响应
                // if (retries === maxRetries) {
                // 	return new Response(`Error: 获取地址时出错,已重试${maxRetries}次`, {
                // 	status: 500,
                // 	headers: { 'content-type': 'text/plain; charset=utf-8' },
                // 	});
            }
        }

        if (cfv4_api.length > 0 && cfv6_api.length > 0 && cftv4_api.length > 0 && cftv6_api.length > 0) {
            const Raddressapi = cfv4_api.join("\n") + "\n" + cfv6_api.join("\n") + "\n" + cftv4_api.join("\n") + "\n" + cftv6_api.join("\n");

            return new Response('Raddressapi', {
                status: 200,
                headers: {
                    'content-type': 'text/plain; charset=utf-8'
                },
            });
        } else {
            return new Response('Error: 获取地址时出错', {
                status: 500,
                headers: {
                    'content-type': 'text/plain; charset=utf-8'
                },
            });
        }

    }

    export
default {
        async scheduled(event, env) {
            return getapi(env);
        },

        async fetch(request, env) {
            return getapi(env);

        },
    };
