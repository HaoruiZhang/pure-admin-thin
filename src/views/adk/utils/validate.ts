// import { $t } from "vue-i18n";
// const { t } = useI18n();
// import { $t } from "@/plugins/i18n";
// 正则校验
export const isValidPhone = (val: string) => {
  const reg = /^1([38][0-9]|4[014-9]|[59][0-35-9]|6[2567]|7[0-8])\d{8}$/;
  return reg.test(val);
};
export const isValidMail = (val: string) => {
  const reg = /^.*@.*$/; // 宽容度大，针对国外邮箱
  return reg.test(val);
};
export const isValidPassword = (val: string) => {
  const reg =
    /^(?=.*[a-zA-Z])(?=.*[0-9])[A-Za-z0-9`~!@#$%^&*()+=|\\\][\]\{\}:;',.<>?\/\-]{8,16}$/;
  return reg.test(val);
};

// 由数字、26个英文字母或者下划线组成的字符串
export const isNormal = (val: string) => {
  const reg = /^[0-9a-zA-Z_]{1,}$/;
  return reg.test(val);
};

// 表单文言
export const requireMessage = (label: string) => {
  return `${label}  `;
};

//操作闻言
export const actionMessage = (label: string) => {
  return `${label}  `;
};

export const betweenMessage = (
  label: string,
  min: number,
  max: string | number
) => {
  return `${label}   ${min} to ${max}`;
};

export const minMessage = (label: string, min: number) => {
  return `${label}   ${min}`;
};

export const maxMessage = (label: string, max: number) => {
  return `${label}  ${max}`;
};

// 自定义校验
export const checkMobile = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error(requireMessage('$t("copilot.mobile")')));
  } else if (!isValidPhone(value)) {
    callback(new Error('$t("copilot.login.shoujihaogeshicuowu")'));
  } else {
    callback();
  }
};
export const checkPass = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error(requireMessage('t("copilot.password")')));
  } else if (isValidPassword(value)) {
    callback();
  } else {
    callback(new Error('t("copilot.login.yanzhengmima")'));
  }
};
export const checkEmail = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error(requireMessage('t("copilot.email")')));
  } else if (isValidMail(value)) {
    callback();
  } else {
    callback(new Error('t("copilot.login.youxinaggeshicuowu")'));
  }
};
export const checkAgree = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('t("copilot.login.qingyuedu")'));
  } else {
    callback();
  }
};

export const checkIsJSON = (str: string) => {
  if (typeof str == "string") {
    try {
      const obj = JSON.parse(str);
      if (typeof obj == "object" && obj) {
        return true;
      } else {
        return false;
      }
    } catch (e: any) {
      console.log("error: " + e);
      return false;
    }
  }
  return false;
};

export const checkIsValidHttpUrl = (str: string) => {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$", // fragment locator
    "i"
  );
  return pattern.test(str);
};

export function formatHtml(html: string) {
  // 1. 定义需要换行的块级标签
  const blockTags = ["div", "ol", "ul", "li", "p", "pre", "h1-h6"];

  // 2. 使用正则表达式添加换行和缩进
  const formatted = html
    // 在开始标签后换行
    .replace(/(<(\w+)[^>]*>)/g, (match, p1, p2) => {
      return blockTags.includes(p2) ? `${p1}\n` : p1;
    })
    // 在结束标签前换行
    .replace(/(<\/\w+>)/g, "\n$1")
    // 添加层级缩进
    .split("\n")
    .map(line => {
      const depth = (line.match(/<(\/)?\w+/g) || []).length;
      const spaces = "  ".repeat(depth);
      return line.startsWith("</") ? `${spaces}${line}` : `${spaces}${line}`;
    })
    .join("\n");

  return formatted;
}
