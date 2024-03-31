const moniterurl = 'https://monitor.gacjie.cn/api/client/get_ip_address';
// const cfv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv4api') : null;
// const cfv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv6api') : null;
// const cftv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv4api') : null;
// const cftv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv6api') : null;

let key = "o1zrmHAF";
const types = ["v4","v6"];
const cdn_servers = [1, 2];
const maxRetries = 3; // 最大重试次数

async function getapi(env) {
  key = env.KEY || key;
  const SUB_BUCKET = env.SUB_BUCKET || false;
  
  let result = [];;
  for(let cdn_server of cdn_servers){
    let apis = [];
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
								"cdn_server": cdn_server
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
								const Carrier_line = ['CM','CT','CU'];
                const classsorted =[];
                for(let line of Carrier_line){
                  const sorted = responseData.info[line].sort((a, b) => {
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
									sorted.slice(0, numberOfCMsToExtract).map(cm => {
                    const loc = cm.colo;
                    const name = cm.line_name;
                    const delay = cm.delay;
                    
                    let api;
                    if (type == "v6") {
                      api = `[${cm.ip}]:443#${name}v6-${loc}-${delay}`;
                    } else {
                      api = `${cm.ip}:443#${name}-${loc}-${delay}`;
                    }
                    apis.push(api);
								  });
                }

                
								// 如果请求成功，跳出重试循环
								break;
							} else {
								console.error(`获取地址时出错 (${retries + 1}/${maxRetries})`, response.status, response.statusText);
								retries++;
							}
						} catch (error) {
						console.error(`获取地址时出错 (${retries + 1}/${maxRetries})`, error);
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
    if(SUB_BUCKET){
      if(cdn_server == 1){
        result.push(apis);
        const Raddressapi = apis.join("\n");
        await SUB_BUCKET.put('cf_api', Raddressapi);
      }else if(cdn_server == 2){
        result.push(apis);
        const Raddressapi = apis.join("\n");
        await SUB_BUCKET.put('cft_api', Raddressapi);
      }
    }
  }

  if (result.length > 0){
    const Raddressapi = result.join("\n");

    return new Response(Raddressapi, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }else{
    return new Response(`Error: 获取地址时出错`, {
    status: 500,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

}

export default {
  async scheduled(event, env){
    return getapi(env);
  },

  async fetch(request, env) {
    return getapi(env);
		
  },
};
