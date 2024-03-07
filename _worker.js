
let sub = ['cm.git.cloudns.biz'];
const hostName = 'cm.git.xyz';
const userID = '90cd4a77-141a-43c9-991b-08263cfe9c10';
const ipSet = new Set();

// 随机选取 n 个元素
function randomSample(arr, n) {
  const shuffled = Array.from(arr);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function extractInfo(encodedUrls) {
  let lines = encodedUrls.split('\n');
  let extractedData = [];

  const nameCountMap = new Map();
  //console.log("lines content:", lines);
  //提高性能抽奖
  //lines = lines.length > 20 ? randomSample(lines, 20) : lines;

  for (const line of lines) {
    const match = line.match(/@([\d.]+):(\d+)\?/);
    if (match) {
      const [_, ipAddress, port] = match;
      const hashIndex = line.indexOf('#');
      const name = hashIndex !== -1 ? line.slice(hashIndex + 1) : '';

      // 包含中文字符(一般有广告)跳过
      // if (/[\u4e00-\u9fa5]/.test(name)) {
      //   continue;
      // }

      // 去掉重复的 IP 地址
      if (ipSet.has(ipAddress)) {
        continue;
      }
      

      // 统计名字出现的次数
      const count = nameCountMap.get(name) || 0;
      if (count < 2) {
        const newName = count === 0 ? name : `${name}-${count}`;
        extractedData.push(`${ipAddress}:${port}#${newName}`);
        ipSet.add(ipAddress);
        nameCountMap.set(name, count + 1);
      }

      // 配合高性能抽奖-总数不超过12个(自取前12个)
      // if (nameCountMap.size >= 12) {
      //   break;
      // }
    }
  }
  
  //低性能抽奖-总数不超过12个(自取前12个)
  extractedData = extractedData.length > 20 ? randomSample(extractedData, 6) : randomSample(extractedData, 8);
  
  return extractedData;
}

async function getapi(env) {
  const SUB_BUCKET = env.SUB_BUCKET || false;
  
  ipSet.clear();
  let addressapi = [];
  try {
    //await Promise.all(sub.map(async (subs) => {
    for (const subs of sub){
      const response = await fetch(`https://${subs}/sub?host=${hostName}&uuid=${userID}&path=?ed2048&edgetunnel=cmliu`);
      //console.log("subs content:", subs);
      if (response.ok) {
        const content = await response.text();
        if (content.length && content.length % 4 === 0 && !/[^A-Z0-9+\/=]/i.test(content)) {
          //console.log("content:", content);
          const decodedContent = decodeURI(atob(content)); // Base64 decoding
          //console.log("Decoded content:", decodedContent);
          const newaddressapi = extractInfo(decodedContent);
          //console.log("newaddressapi content:", newaddressapi);
          addressapi = addressapi.concat(newaddressapi);
        }
      }
    }
    //}));

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
    sub = env.SUB ? env.SUB.split(",") : sub;
    return getapi(env);
  },

  async fetch(request, env) {
    sub = env.SUB ? env.SUB.split(",") : sub;
    const url = new URL(request.url);
    const subQueryParam = url.searchParams.get('sub');
    sub = subQueryParam ? subQueryParam.split(",") : sub;

    return getapi(env);
		
  },
};
