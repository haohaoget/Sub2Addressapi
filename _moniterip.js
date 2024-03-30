const moniterurl = 'https://monitor.gacjie.cn/api/client/get_ip_address';
const cfv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv4api') : null;
const cfv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cfv6api') : null;
const cftv4_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv4api') : null;
const cftv6_api = env.SUB_BUCKET ? await env.SUB_BUCKET.get('cftv6api') : null;

const key = env.KEY || "o1zrmHAF";
const types = ["v4","v6"];
const cdn_server = [1, 2];
const maxRetries = 3; // 最大重试次数
