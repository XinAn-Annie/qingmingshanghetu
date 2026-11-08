# 清明上河图 · 小商贩的一天

这是一个可直接部署到 GitHub Pages 的静态长卷交互网站。页面以清明上河图的分层素材为基础，沿滚动推进五个场景，并保留透明 WebP 图层、知识弹窗和场景动效。

## 本地预览

在本目录运行任意静态服务器，例如：

    python -m http.server 4173

然后打开 http://127.0.0.1:4173/。

## 页面内容

- index.html：网站入口和五个场景结构
- qingming.css：页面布局、视差和视觉样式
- qingming.js：滚动推进、图层深度、场景切换和知识弹窗
- qingming-assets/su-scenes/：五个场景实际使用的透明 WebP 图层
- style/font_family/：页面字体资源
- docs/：当前素材清单、动效说明和一致性审计

## GitHub Pages

推送到 main 后，.github/workflows/pages.yml 会自动构建并部署静态站点。

部署地址：

https://xinan-annie.github.io/qingmingshanghetu/
