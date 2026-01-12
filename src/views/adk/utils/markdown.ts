import { i18n } from "@/plugins/i18n";
// import { $t } from "@/plugins/i18n";
import hljs from "highlight.js";

import MarkdownIt from "markdown-it";
import "highlight.js/styles/an-old-hope.css"; // 选择你喜欢的样式 color-brewer
import MarkdownItCollapsible from "markdown-it-collapsible";
import MarkdownItDirective from "markdown-it-directive";
import MarkdownItWebcomponents from "markdown-it-directive-webcomponents";
// import MarkdownItMathjax from "markdown-it-mathjax3";
import MarkdownItContainer from "markdown-it-container";
// 不使用 markdown-it-mermaid 插件，改为手动处理，避免在模块加载时访问 document
// import MarkdownItMermaid from "markdown-it-mermaid";

import { checkIsJSON } from "./index";
// wrap i18n.global.t to avoid TS union-call incompatibility
const t = (...args: any[]) => (i18n.global as any).t(...args);

const escapeDollarSpace = (text: string) => {
  // 匹配单个$包围的内容，注意排除连续的$$情况
  // 正则解释：
  // 1. (?<!\$)\$(?!\$) - 匹配单个$，前后都不是$
  // 2. \s*(.*?)\s* - 匹配中间的内容，包括可能的前后空格
  // 3. (?<!\$)\$(?!\$) - 再次匹配单个$，前后都不是$
  return text.replace(
    /(?<!\$)\$(?!\$)\s*(.*?)\s*(?<!\$)\$(?!\$)/g,
    (match, content) => {
      // 将内容前后的空格去掉，保留内容本身
      return `$${content.trim()}$`;
    }
  );
};

// 处理markdown语法中的公式中[]和()
export const escapeBrackets = (text: string) => {
  const pattern =
    /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return text.replace(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return escapeDollarSpace(codeBlock);
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket.trim()}$`;
      }
      return match;
    }
  );
};

// 处理markdown语法中的列表
export const fixDashList = (text: string) => {
  return text.replace(/\n-/g, "\n - ");
};

export let currentReserchStepIdx = 0;

export const md: MarkdownIt = new MarkdownIt({
  html: true, // 允许渲染 HTML
  // linkify: true,
  // typographer: true,
  breaks: true, // 让单个 \n 也换行
  // 设置代码高亮的配置
  highlight: function (code, language) {
    // mermaid 代码块由 markdown-it-mermaid 插件处理，跳过 highlight
    if (language === "mermaid") {
      // 将原始代码保存到 data-code 属性中，避免后续渲染时获取到 SVG 内容
      const escapedCode = md.utils.escapeHtml(code);
      return `<pre class="mermaid" data-code="${escapedCode.replace(/"/g, "&quot;")}">${escapedCode}</pre>`;
    }
    // 如果识别不到语言,将默认语言置为json
    // console.log(
    //   "highlight code language:",
    //   language,
    //   hljs.getLanguage(language)
    // );
    let defaultLanguage = language;
    if (!(language && hljs.getLanguage(language))) {
      defaultLanguage = "json";
    }
    try {
      const codeDom = document.createElement("pre");
      const codeHtml =
        `<code class="hljs language-${defaultLanguage}">` +
        hljs.highlight(code, { language: defaultLanguage }).value +
        "</code>";
      codeDom.innerHTML = codeHtml;
      return (
        (["python", "r", "bash"].includes(language)
          ? `<div class="code-header">
          <div>${language || ""}</div>
          <div class="code-action"> 
            <div class="code-action-btn run-btn" onClick="onRunClick(this)">
              <span>${t("buttons.run")}</span>
            </div>
            <div class="code-action-btn copy-btn" onClick="onCopyClick(this)">
              <span>${t("buttons.copy")}</span>
            </div>
          </div>
        </div>`
          : `<div class="code-header">
          <div>${language || ""}</div>
          <div class="code-action"> 
            <div class="code-action-btn copy-btn" onClick="onCopyClick(this)">
              <span>${t("buttons.copy")}</span>
            </div>
          </div>
        </div>`) + codeDom.outerHTML
      );
    } catch (e: any) {
      console.log(e);
    }
    // }

    return (
      '<pre class="hljs"><code>' + md.utils.escapeHtml(code) + "</code></pre>"
    );
  }
})
  // .use(MarkdownItMathjax, {
  //   tex: {
  //     inlineMath: [
  //       ["$ ", " $"],
  //       ["\\(", "\\)"]
  //     ]
  //   }
  // })
  .use(MarkdownItCollapsible)
  .use(MarkdownItDirective)
  .use(MarkdownItWebcomponents, {
    components: [
      {
        present: "both",
        name: "tooltip-reference",
        tag: "ce-tooltip",
        allowedAttrs: ["src", "class", "title", "tips", "content"],
        destStringName: "tips",
        parseInner: true
      }
    ]
  })
  .use(MarkdownItContainer, "planner", {
    render(tokens: { [x: string]: { nesting: number } }, idx: number) {
      let isJson = false;
      if (tokens[idx].nesting === 1) {
        // 开始标签
        const nextToken = tokens[idx + 2] as any;
        if (nextToken && nextToken.type === "inline") {
          // 提取文本内容
          const content = nextToken.content;
          isJson = checkIsJSON(content);
          if (isJson) {
            const json = JSON.parse(content);
            const thoughtHtml = `<p>${md.utils.escapeHtml(json?.thought || "")}</p>`;

            // 渲染 steps 为 <ol>
            const stepsHtml =
              '<div class="md-steps"><ul>' +
              json.steps
                .map(
                  (step: any, index: number) =>
                    `<li><strong>${index + 1}. ${md.utils.escapeHtml(step.title)}</strong><br>${md.render(step.description)}</li>`
                )
                .join("") +
              "</ul></div>";

            // 合并并返回
            return thoughtHtml + stepsHtml + "<!--";
          } else {
            return `<p class="planner-block">${t("buttons.pureClose")}</p><!--`;
          }
        } else {
          return `<!--`;
        }
      } else {
        return "-->";
      }
    }
  })
  .use(MarkdownItContainer, "researcher", {
    // validate(params: string) {
    //   return params.trim().match(/^researcher\s+(.*)$/);
    // },
    render(
      tokens: {
        [x: string]: {
          markup: string;
          info: any;
          nesting: number;
        };
      },
      idx: number,
      options: any,
      env: any
    ) {
      if (tokens[idx].nesting === 1) {
        env.stepIdx++;
        currentReserchStepIdx = env.stepIdx;
        return `<details class="step-detail" data-step-idx="${env.stepIdx}" open>`;
      } else {
        return "</details>";
      }
    }
  })
  .use(MarkdownItContainer, "researcher_title", {
    render(
      tokens: { [x: string]: { nesting: number } },
      idx: number,
      options: any,
      env: any
    ) {
      let isJson = false;
      let summaryHtml = "";
      if (tokens[idx].nesting === 1) {
        // 开始标签
        env.currentitleStepIdx++;
        const nextToken = tokens[idx + 2] as any;
        if (nextToken && nextToken.type === "inline") {
          // 提取文本内容
          const content = nextToken.content;
          isJson = checkIsJSON(content);
          if (isJson) {
            const json = JSON.parse(content);
            // <span class="step-label">STEP ${env.stepIdx}</span>
            if (env.currentitleStepIdx != env.stepIdx) {
              env.stepIdx++;
              summaryHtml = `</details><details class="step-detail" data-step-idx="${env.stepIdx}" title="${json.query}" open><summary><div class="step-title">${json.query}</div></summary>`;
            } else {
              summaryHtml = `<summary title="${json.query}"><div class="step-title">${json.query}</div></summary>`;
            }
            // 合并并返回
            return summaryHtml + "<!--";
          } else {
            return `<p class="planner-block">${content}</p><!--`;
          }
        } else {
          return `<!--`;
        }
      } else {
        return "-->";
      }
    }
  })
  .use(MarkdownItContainer, "researcher_doc", {
    render(
      tokens: { [x: string]: { nesting: number } },
      idx: number,
      options: any,
      env: any
    ) {
      console.log("researcher_doc render", options, env);
      let isJson = false;
      if (tokens[idx].nesting === 1) {
        // 开始标签
        const nextToken = tokens[idx + 2] as any;
        if (nextToken && nextToken.type === "inline") {
          // 提取文本内容
          const content = nextToken.content;
          isJson = checkIsJSON(content);
          if (isJson) {
            const json = JSON.parse(content);
            // const contentHtml = `<p>${md.utils.escapeHtml(json?.content || "")}</p>`
            const docHtml =
              '<div class="doc-source"><ul>' +
                json.source
                  ?.map(
                    (it: any) =>
                      `<li><a href="${it.url}" target="_blank">${it.title}</a></li>`
                  )
                  ?.join("") || "" + "</ul></div>";

            // 合并并返回
            return docHtml + "<!--";
          } else {
            return `<p class="doc-block">${t("buttons.copy")}</p><!--`;
          }
        } else {
          return `<!--`;
        }
      } else {
        return "-->";
      }
    }
  })
  // 不使用 markdown-it-mermaid 插件，改为在 highlight 函数中处理，然后在组件中手动渲染
  // .use(MarkdownItMermaid, {
  //   theme: "default"
  // })
  .disable("code"); // 禁用缩进代码块;

export const mdNoBtn: MarkdownIt = new MarkdownIt({
  // 设置代码高亮的配置
  highlight: function (code, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return (
          `<pre><code class="hljs language-${language}">` +
          hljs.highlight(code, { language }).value +
          "</code></pre>"
        );
      } catch (e: any) {
        console.log(e);
      }
    }
    return (
      '<pre class="hljs"><code>' + md.utils.escapeHtml(code) + "</code></pre>"
    );
  }
});

// // 自定义 table 渲染
// const defaultRender = md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
//   return self.renderToken(tokens, idx, options);
// };

md.renderer.rules.table_open = function () {
  return '<div class="table-scroll"><table>';
};
md.renderer.rules.table_close = function () {
  return "</table></div>";
};

// 自定义链接渲染，使其在新窗口打开
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs?.[hrefIndex]?.[1];
    // 只对外部链接添加 target="_blank"，内部链接（锚点等）保持原样
    if (
      href &&
      (href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//"))
    ) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// 同样为 mdNoBtn 添加链接新窗口打开功能
const defaultLinkOpenNoBtn =
  mdNoBtn.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
mdNoBtn.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs?.[hrefIndex]?.[1];
    // 只对外部链接添加 target="_blank"，内部链接（锚点等）保持原样
    if (
      href &&
      (href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//"))
    ) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
  }
  return defaultLinkOpenNoBtn(tokens, idx, options, env, self);
};
