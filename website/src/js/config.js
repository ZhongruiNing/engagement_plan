// 所有可编辑的活动内容与公开连接配置集中在这里。
export const eventConfig = {
  title: '订婚计划安排',
  couple: '宁忠瑞 & 吴南',
  dateLabel: '2026年10月05日',
  hotel: {
    name: '喜雁之约宴会酒店',
    address: '枣庄市市中区人民西路21号',
    longitude: 117.523382,
    latitude: 34.830948,
  },
};
export const backendConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://xisfixidmdndheoefrlw.supabase.co',
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_HBUQ13R-CjLnl-alEKr20g_B8MW2lzj',
};
export const mapConfig = {
  key: import.meta.env.VITE_AMAP_KEY || '',
  serviceHost: import.meta.env.VITE_AMAP_SERVICE_HOST || '',
  // Style IDs are public identifiers; the key and security secret stay out of source control.
  styleId: import.meta.env.VITE_AMAP_STYLE_ID || 'dc027a862f81fd810851f7a80a03a5d1',
};
