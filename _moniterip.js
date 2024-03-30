const moniterurl = 'https://monitor.gacjie.cn/api/client/get_ip_address';
const cfv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv4api') : null;
const cfv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv6api') : null;
const cftv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv4api') : null;
const cftv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv6api') : null;

const key = env.KEY || "o1zrmHAF";
const types = ["v4","v6"];
const cdn_servers = [1, 2];
const maxRetries = 3; // 最大重试次数

async function getapi(env) {
  const SUB_BUCKET = env.SUB_BUCKET || false;
  
  let addressapi = [];
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
								const sortedCM = responseData.info.CM.sort((a, b) => {
								if (a.delay === b.delay) {
									return a.speed + b.speed;
								}
								return a.delay - b.delay;
								});
								const sortedCT = responseData.info.CT.sort((a, b) => {
								if (a.delay === b.delay) {
									return a.speed + b.speed;
								}
								return a.delay - b.delay;
								});
								const sortedCU = responseData.info.CU.sort((a, b) => {
								if (a.delay === b.delay) {
									return a.speed + b.speed;
								}
								return a.delay - b.delay;
								});
								const classsorted = [sortedCM, sortedCT, sortedCU];

								for (let sorted of classsorted) {
                  // 提取前三个或所有CM的ip、colo和line_name
									const numberOfCMsToExtract = Math.min(sorted.length, 3);
									sorted.slice(0, numberOfCMsToExtract).map(cm => {

									const loc = cm.colo;
									const name = cm.line_name;
									const delay = cm.delay;

									
								if (type == "v6") {
									const vlessLink = `[${cm.ip}]:443#${name}v6-${loc}-${delay}`;
									//console.log(vlessLink);
									vlessLinks.push(vlessLink);
									});
								} else {

									const vlessLink = `${cm.ip}:443#${name}-${loc}-${delay}`;
									vlessLinks.push(vlessLink);
									});
								}
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

    if (addressapi.length >= 0){
      const Raddressapi = addressapi.join("\n");
      if(SUB_BUCKET){
        await SUB_BUCKET.put('addressapi', Raddressapi);
      }
      
      return new Response(Raddressapi, {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  
    
  } catch (err) {
    /** @type {Error} */ 
    let e = err;
    return new Response(e.toString());
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
