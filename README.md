First Tag Filter & Blocker 是一款专为 Archive of Our Own 设计的浏览器扩展。

在 AO3 搜索时，经常会遇到喜欢的角色或 CP 只是作为配角出现在 tag 列表。本插件旨在通过首位有效标签过滤与多层级屏蔽，帮你精准找到自推中心向的作品。其主要功能均通过本地前端处理，对 AO3 搜索结果与作品列表进行精准控制与过滤。

✨ 功能列表：

1. 首位有效标签过滤：输入关键词并点击 ▶，扩展会跳过评分、警告、Fandom 等固定元数据标签，仅检查作品的第一个有效标签。若该标签包含设定关键词则保留作品，点击 ⏸ 恢复原状。界面会实时显示当前过滤结果数量。
2. 多层级屏蔽系统：支持屏蔽特定作品（点击卡片右上角折角）、作者、Fandom、关系、角色或标签（点击 🚫 图标）。手动输入的关键词采用包含匹配，范围为标题、摘要、作者名及所有 Tag。
3. 模糊搜索：在屏蔽管理与标签选择面板中，内置支持拼音及英文首字母的检索功能（如输入 sc 可匹配相应标签）。
4. 自动补位 (Refill)：当页面可见作品少于 20 条时，该功能可自动请求后续 AO3 页面，抓取符合规则的作品补充至当前列表，并在原页面对抓取项进行隐藏以防重复。
5. 生成排除链接：点击结果页标题末尾的猫猫头图标，可将本地黑名单标签写入 AO3 原生的 work_search[excluded_tag_names] 参数中，生成新的筛选链接。
6. 界面与交互：提供可拖拽的悬浮启动器（支持在阅读页隐藏）。标签选择界面采用胶囊式设计。支持中英文切换、颜色自定义（含预设与 HEX 输入）、面板位置保存。
7. 数据管理：提供屏蔽列表的导入与导出功能（Base64 加密），便于本地备份与跨设备迁移。

⚙️ 工作原理与注意事项：
本扩展仅在包含作品列表的页面运行。所有过滤与屏蔽均在本地浏览器完成，不修改 AO3 原生搜索条件。
启用「自动补位」时，扩展会发起网络请求获取后续页面数据，建议在网络稳定时使用。

⚠️ 生效范围：

1. https://archiveofourown.org/
2. https://www.archiveofourown.org/
   仅在上述官方域名生效，第三方镜像或反代域名下扩展不运行。

🔒 隐私与安全：
所有过滤词、屏蔽列表及设置均存储在浏览器的本地存储（LocalStorage）中。扩展不收集、不上传任何个人数据。

---


First Tag Filter & Blocker is a browser extension designed specifically for Archive of Our Own.

When searching on AO3, it is common to encounter fics where your favorite character or ship only appears as a side character in the tag list. This extension aims to help you accurately find works where your ship/character is the central focus through first valid tag filtering and multi-level blocking. All primary functions are processed locally on the front-end to precisely control and filter AO3 search results and work lists.

✨ Features:

1. First Valid Tag Filtering: Enter keywords and click ▶. The extension skips fixed metadata tags (ratings, warnings, fandoms) and checks only the first valid tag. Works are kept if this tag contains the keyword. Click ⏸ to restore. The UI displays the current result count.
2. Multi-level Blocking: Supports blocking specific works (folded corner), authors, fandoms, relationships, characters, or tags (🚫 icon). Manually entered keywords use "contains" matching across titles, summaries, authors, and all tags.
3. Fuzzy Search: In the blocklist management and tag selection panels, it supports searching by Pinyin and English initials (e.g., typing sc to match relevant tags).
4. Auto-Refill: When visible works are fewer than 20, this feature fetches subsequent AO3 pages to append works that match the rules to the current list. Fetched items are hidden on their original pages to avoid duplicates.
5. Generate Exclusion URL: Click the cat icon next to the title to append local blocklist tags to AO3's work_search[excluded_tag_names] parameter and generate a new search URL.
6. UI & Interaction: Draggable floating launcher (can auto-hide on reading pages). Tag selection uses a capsule design. Supports English/Chinese UI switching, color customization (presets and HEX input), and panel position saving.
7. Data Management: Provides blocklist export and import (Base64 encrypted) for local backup and cross-device migration.

⚙️ How It Works & Notes:
Runs only on pages with work lists. All filtering and blocking are done locally and do not modify AO3's native search conditions.
When "Auto-Refill" is enabled, the extension makes network requests to fetch subsequent pages; a stable network is recommended.

⚠️ Supported Domains:

1. https://archiveofourown.org/
2. https://www.archiveofourown.org/
   Only works on the official domains; it will not run on third-party mirrors or proxies.

🔒 Privacy & Security:
All filters, blocklists, and settings are stored locally in the browser (LocalStorage). No personal data is collected or uploaded.