# 🀄 天津麻将

基于 TypeScript 全栈的天津麻将 Web 游戏。支持 2-4 人单机对战 AI，完整实现天津本地规则（混儿、碰/杠、仅自摸胡）。

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装

```bash
git clone https://github.com/cty8888/tianjin-mahjong.git
cd tianjin-mahjong
npm install
```

### 运行（开发模式）

启动后端（端口 3001）：
```bash
npm run dev -w packages/server
```

另开终端，启动前端（端口 5173）：
```bash
npm run dev -w packages/client
```

浏览器打开 **http://localhost:5173**

### 运行测试

```bash
npm test -w packages/shared    # 168 个测试
npm test -w packages/server    # 26 个测试
```

### 构建生产版本

```bash
npm run build -w packages/client
npm run build -w packages/server
```

## Docker

```bash
# 构建镜像
docker build -t tianjin-mahjong .

# 运行容器
docker run -p 3001:3001 tianjin-mahjong

# 或使用 docker-compose
docker-compose up
```

浏览器打开 **http://localhost:3001**

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `NODE_ENV` | `development` | 运行环境 |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Express + TypeScript |
| 游戏引擎 | 共享 TypeScript 包（纯函数） |
| 数据库 | 内存存储（游戏状态）+ localStorage（持久化） |
| 测试 | Vitest |
| 构建 | npm workspaces（monorepo） |
| 容器化 | Docker + docker-compose |
| CI | GitHub Actions |

## 项目结构

```
tianjin-mahjong/
├── packages/
│   ├── shared/                    # @tj-mahjong/shared 游戏引擎
│   │   └── src/
│   │       ├── types.ts           # 核心类型定义
│   │       ├── tile.ts            # 136 张牌系统
│   │       ├── deck.ts            # 牌墙操作（洗/发/摸）
│   │       ├── game-state.ts      # 游戏状态管理 + 混儿
│   │       ├── rules.ts           # 碰/杠规则
│   │       ├── hand.ts            # 手牌评估（胡牌/听牌）
│   │       ├── ai.ts              # AI 决策引擎
│   │       └── patterns/          # 胡牌牌型插件系统
│   ├── server/                    # @tj-mahjong/server Express API
│   │   └── src/
│   │       ├── index.ts           # 入口
│   │       ├── routes/game.ts     # 游戏路由
│   │       └── services/game-service.ts  # 游戏编排
│   └── client/                    # @tj-mahjong/client React 前端
│       └── src/
│           ├── api.ts             # API 通信层
│           ├── pages/             # GameSetup / GameBoard
│           ├── components/        # PlayerHand / PlayerArea / ActionPanel / GameResult
│           └── hooks/             # useGamePersistence
├── SPEC.md                        # 设计规约
├── PLAN.md                        # 实现计划
├── SPEC_PROCESS.md                # 规约过程记录（含冷启动验证）
├── AGENT_LOG.md                   # 智能体使用日志
├── REFLECTION.md                  # 反思报告
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 游戏规则

天津麻将 v1 支持的规则：

- **牌张**：136 张（万条筒 + 风箭），无花牌
- **操作**：碰、杠（明杠/暗杠/补杠/金杠），无吃
- **胡牌**：仅自摸，无点炮
- **混儿**：开局翻最后一张为指示牌，产生 7 张混儿（整局不变），混儿不可打出
- **牌型**：4 刻子 + 1 对子（牌型系统可扩展）
- **AI**：v1 随机出牌
- **庄家**：首局随机，胡牌者连庄，否则逆时针轮转

## 后续计划

- [ ] 混儿万能牌逻辑
- [ ] 完整番型系统（素本混儿、混儿杠、杠开、捉五魁、龙）
- [ ] AI 难度分级
- [ ] 联机对战
- [ ] 计分系统

## 许可证

MIT

---

*本项目为 AI4SE 课程期末项目，使用 Superpowers 框架 + Subagent-Driven Development 开发。*
