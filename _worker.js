// @ts-ignore
import { connect } from 'cloudflare:sockets';
let sub = ['cm.git.cloudns.biz'];
const hostName = 'test.xyz';
const userID = '90cd4a77-141a-43c9-991b-08263cfe9c10';
let ip = [];

function extractInfo(encodedUrls) {
  const lines = encodedUrls.split('\n');
  const extractedData = [];
  const ipSet = new Set();
  const nameCountMap = new Map();

  for (const line of lines) {
    const match = line.match(/@([\d.]+):(\d+)\?/);
    if (match) {
      const ipAddress = match[1];
      const port = match[2];
      const hashIndex = line.indexOf('#');
      const name = hashIndex !== -1 ? line.slice(hashIndex + 1) : '';

      // 包含中文字符(一般有广告)跳过
      if (/[\u4e00-\u9fa5]/.test(name)) {
        continue;
      }

      // 去掉重复的 IP 地址
      if (ipSet.has(ipAddress)) {
        continue;
      }
      ipSet.add(ipAddress);

      // 统计名字出现的次数
      const count = nameCountMap.get(name) || 0;
      if (count < 2) {
        const newName = count === 0 ? name : `${name}-${count}`;
        extractedData.push(`${ipAddress}:${port}#${newName}`);
        nameCountMap.set(name, count + 1);
      }

      // 总数不超过12个(自取前12个)
      if (nameCountMap.size >= 12) {
        break;
      }
    }
  }

  return extractedData;
}

export default {
	async fetch(request, env, ctx) {
    const url = new URL(request.url);
    sub = env.SUB ? env.SUB.split(",") : sub;
    sub = url.searchParams.get('sub') ? url.searchParams.get('sub').split(",") : sub;
    
    let addressapi = [];
    ip = [];

		try {
      await Promise.all(sub.map(async (subs) => {
        const response = await fetch(`https://${subs}/sub?host=${hostName}&uuid=${userID}&path=?ed2048&edgetunnel=cmliu`);
        if (response.ok) {
          const content = await response.text();
          if (content.length && content.length % 4 === 0 && !/[^A-Z0-9+\/=]/i.test(content)) {
            //console.log("content:", content);
            const decodedContent = decodeURI(atob(content)); // Base64 decoding
            //console.log("Decoded content:", decodedContent);
            const newaddressapi = extractInfo(decodedContent);
            addressapi = addressapi.concat(newaddressapi);
          }
        }
      }));

      if (addressapi.length >= 0){
        const Raddressapi = addressapi.join("\n");
        return new Response(Raddressapi, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      
		} catch (err) {
			/** @type {Error} */ let e = err;
			return new Response(e.toString());
		}
	},
};
