# 清明上河图页面素材风格一致性审计

审计日期：2026-11-08  
项目：`D:\Xiangmu\SII1\nature-replica\qingming-replica`

## 结论

页面主素材已按“原画同源优先”处理。当前页面的 53 个 `<img>` 引用全部存在且可读取；活动页面和 `scene-layer-manifest.json` 均不再引用 `generated-webp`。页面中的补足层只使用清院本原始分段像素、原始实例分层或这些像素的低频/边缘派生，不使用现代插画风格的独立生成对象。

## 素材分类

- **源图派生层 15 个**：`qingming-assets/source-faithful-webp/`，包含雾、蒸汽、墨线、桅杆、钱币、傍晚光线、酒旗等页面角色层。
- **同源实例/代理层 38 个**：来自 `data/derived/vendor_workflow/scene_packages/`，保留清院本原始人物、货物、船、建筑、道路和人群像素；其中 proxy 只表示页面叙事位置代理，不改变画面事实含义。
- **虹桥区域**：`qingming-assets/scene03-source/` 的桥体和五个局部区域均由 `data/raw_web/0008_img3_8.jpg` 裁切登记，未混用其他分段作为桥体背景。
- **模型生成备份**：`qingming-assets/generated-webp/` 仅保留审计备份，不被页面或活动场景清单加载。

## 验证证据

执行 `python tools/verify_web_assets.py`：

- `img_refs=53 missing=0`
- `generated=15 bad=0`（源派生 WebP 均能读取，Alpha 通道非空）
- `scene_layer_manifest_generated_refs=False`
- 活动页面 `generated-webp` 引用数：0

接触表：`qingming-assets/source-faithful-contact-sheet.jpg`。  
替换及来源记录：`qingming-assets/replaced-assets-manifest.json`。  
虹桥区域坐标和哈希：`qingming-assets/scene03-source/manifest.json`。

## 边界

这份审计证明素材与清院本像素来源和画面风格一致，不把模型生成或类别代理提升为历史事实；“小商贩”仍是高置信度疑似角色，需要人工确认后才能作为确定身份使用。
