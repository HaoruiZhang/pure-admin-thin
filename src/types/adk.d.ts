export interface Session {
  id: number | string;
  title: string;
  create_time: number;
  isEdit?: boolean;
  editTitle?: string;
  dropShow?: boolean;
  summary_data?: any; // 文献助手-文献速读页面的AI总结数据
  currentSessionFiles?: any[];
  streaming_task_id?: any;
  attach_id?: string;
  type?: number; // 会话类型 0 普通会话 1 文献助手 2 智能分析 3 生物学解读
  client_type?: number; // 前端页面逻辑类型 0 首页会话 1 文献助手-文献速读页面 2 文献助手-文献问答页面 3 文献助手-详细阅读页面"
  article_info?: any;
  upload_status?: number; // upload_status 上传状态 0 旧版本文档 1 刚启动上传 2 处于分析过程 3 正在embeddings中 4 已完成 5 报错了"
  recommend_questions?: string[];
  file_type?: "pdf";
  is_collected?: boolean; //是否已收藏到文献库
  docList?: any[];
  is_upload?: boolean; // 是否用户上传文件的当前会话
  client_messages?: any[]; // 历史消息
}
export interface AdkState {
  title?: string;
  title_generated_at?: string;
  last_plan_result?: string;
  last_task_result?: string;
}

export interface AdkSession {
  id: string;
  appName: string;
  userId: string;
  events: any[];
  lastUpdateTime: number; // 示例: 1761899673
  state?: AdkState;
}
