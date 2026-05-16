# 🌳 MEKAR

[![CI](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml/badge.svg)](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/live-mekar.vercel.app-d4a437)](https://mekar.vercel.app)
[![Tests](https://img.shields.io/badge/tests-59%20passing-1c3b2f)](packages/contracts/test/)
[![Network](https://img.shields.io/badge/0G-Aristotle%20Mainnet%2016661-1c3b2f)](https://chainscan.0g.ai/address/0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4)

> 🌐 语言：[English](README.md) · **简体中文**

**0G 上的 AI 谱系与版税协议**

> *每个 AI 都有谱系。每次推理都向其祖先付费。*
>
> *为智能体时代打造的 Spotify 式版税 —— 基于 0G 的 INFT 原语构建。*

---

## 🎯 问题

如今的 AI 就像 1999 年的音乐产业 —— Spotify 出现之前：

- 🔴 **诉讼乱局** —— 纽约时报诉 OpenAI（75 亿美元）、Getty 诉 Stability（17 亿美元）、1 万名艺术家诉 Midjourney
- 🔴 **欧盟《AI 法案》** 于 2026 年 5 月开始执行 —— 强制要求训练数据溯源
- 🔴 **开源 AI 正在凋零** —— Stability AI 于 2024 年破产，Mistral 转向闭源
- 🔴 **创作者得不到报酬** —— Llama 3 的衍生模型充斥市场，Meta 收到 0 美元版税
- 🔴 **合规噩梦** —— 没有任何办法验证「这个 AI 是用什么训练的？」

---

## 💡 解决方案

MEKAR 为 AI 提供缺失的**版税通道（royalty rail）**：

1. **谱系（Lineage）** —— 每个智能体都是一个 INFT（ERC-7857），其父代在链上可证明
2. **版税（Royalty）** —— 推理费用自动在整个祖先树上分配
3. **对齐（Alignment）** —— 0G 对齐节点审计谱系健康度（偏差漂移、幻觉）

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────┐
│            USER LAYER                       │
│  Creator | Fine-tuner | End User Dashboard  │
└──────────────────┬──────────────────────────┘
                   │
┌─────────────────────────────────────────────┐
│       MEKAR PROTOCOL CONTRACTS              │
│  Registry | INFT | RoyaltyVault | Auditor   │
└──────────────────┬──────────────────────────┘
                   │
┌─────────────────────────────────────────────┐
│        0G INFRASTRUCTURE (NATIVE)           │
│  Chain | Storage | Compute | INFT | Align   │
└─────────────────────────────────────────────┘
```

---

## 🔌 使用的 0G 模块

| 模块 | 用途 | 状态 |
|---|---|---|
| **0G Chain**（16661） | 5 个智能合约部署在 Aristotle 主网 | ✅ 已上线 |
| **0G Storage Log** | 真实的 `Indexer.upload()` —— 智能体权重被锚定，返回的 root 用作链上 `weightsPointer` | ✅ 已上线 |
| **INFT（ERC-7857）** | 每个智能体通过 mint/fork/compose 原语代币化 | ✅ 已上线 |
| **对齐节点** | 白名单审计员推送对齐分数 → 按比例缩放祖先版税 | ✅ 已上线（演示版为单审计员） |
| **0G Storage KV** | 带访问控制的可变智能体元数据 | 🟡 第二阶段 |
| **0G Specialized Flow** | 加密的模型权重（高级层 + ECIES 所有者密钥） | 🟡 第二阶段 |
| **0G Compute（TEE）** | 密封推理 + 训练证明 | 🟡 第二阶段 |
| **数据服务网络** | 推理自动计费 | 🟡 第二阶段 |

---

## 📁 仓库结构

```
mekar/
├── packages/
│   ├── contracts/    # Solidity 智能合约
│   ├── frontend/     # Next.js dApp
│   └── backend/      # 0G SDK 集成服务
├── docs/             # 架构、演示、设计笔记
├── scripts/          # 部署 + 演示脚本
└── CLAUDE.md         # 面向 AI 智能体的项目上下文
```

---

## 🚀 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+
- 一个持有 $0G 作为 gas 的 0G 钱包 —— 正式协议运行在 Aristotle 主网（本地实验可用 Galileo 测试网 + [水龙头](https://faucet.0g.ai)）

### 安装

```bash
pnpm install
```

### 编译合约

```bash
cd packages/contracts
forge build
```

### 运行测试

```bash
forge test
```

### 部署（0G Aristotle 主网）

```bash
# 从 .env.example 配置 .env
cp .env.example .env
# 填入 DEPLOYER_PRIVATE_KEY（主网钱包，gas 需 >= 0.06 OG）

# 部署 5 个合约 + 连线 + 链上自校验
bash scripts/deploy-mainnet.sh

# 播种一条 4 智能体的谱系：对齐削减 + 已结算的推理
bash scripts/seed-mainnet.sh
```

> **0G RPC 注意事项：** `forge script` 和阻塞式 `cast send` 在 0G 上偶尔会遇到
> null-response 错误。上述 shell 脚本使用 `--async` + 回执轮询模式，运行稳定。
> 详见 `packages/backend/CLAUDE.md`。

### 运行前端 + 后端（用于 /mint 的权重上传流程）

```bash
pnpm --filter @mekar/frontend dev   # → http://localhost:3000
pnpm --filter @mekar/backend dev    # → http://localhost:3001（真实 0G Storage）
```

---

## 📖 工作原理

### 1. 创世铸造（原始 AI 创作者）

```
1. 创作者训练一个基础模型
2. 加密权重并上传到 0G Specialized Flow
3. 提交训练数据 Merkle root + TEE 证明
4. 铸造一个带版税方案的创世 INFT
   ↓
   创世智能体 #001（parents: [], generation: 0）
```

### 2. 派生 Fork（单父微调）

```
1. 从 MEKAR 浏览器中选择一个父 INFT
2. 支付授权费（可配置）
3. 提交新的训练数据
4. 0G Compute TEE 执行训练：
   - 在飞地内解密父代权重
   - 在新数据上训练
   - 返回子代权重 + 证明
5. 智能合约验证证明 → 铸造子 INFT
   ↓
   子智能体 #042（parents: [1], generation: 1）
```

### 3. 组合 Compose（多父合并）

```
1. 选择多个父 INFT
2. 选择组合策略（LoRA 合并、蒸馏、集成）
3. TEE 带证明地执行合并
4. 对齐节点验证不存在漂移
5. 铸造组合 INFT
   ↓
   组合智能体 #156（parents: [42, 78], generation: 2）
```

### 4. 推理与版税分配

推理通过两个链上步骤结算：

```
1. payInference(agentId) → 费用进入托管，触发 InferenceRequested 事件
2. settleInference(...)  → 由一个已注册的算力提供方结算；
                           RoyaltyVault 原子性地分发整条级联

智能体 #156 的 RoyaltyVault 分配：
├── #156 的所有者        → 0.50 $0G  (50%)
├── #42 的所有者（父）   → 0.125 $0G (12.5%)
├── #78 的所有者（父）   → 0.125 $0G (12.5%)
├── #1 的所有者（创世）  → 0.15 $0G  (15%)
└── 训练数据贡献者       → 0.03 $0G  (3%)

另加：算力提供方费用 + 协议费用
```

托管步骤让一笔支付可以等待提供方（或超时后退款）；`settleInference`
才是版税级联触发的地方 —— 在单笔原子交易中向每位祖先付费。

---

## ✅ FAQ 诚实审计

落地页上的每条 FAQ 主张都对应到一个具体的链上测试或真实交易。FAQ 中没有
任何「纯营销」内容。

| FAQ | 主张 | 实现 | 证据 |
|---|---|---|---|
| Q1 | 推理触发版税级联（而非仅转售） | `RoyaltyVault._distributeRoyalty` 的 BFS 遍历 | 主网上 13 个 `RoyaltyPaid` 事件，分发至 4 个钱包 |
| Q2 | 深度有界（10）、原子性、国库兜底 | `_distributeRoyalty` 中的最终扫尾：`(fee - distributed) → protocolFeesAccrued` | 国库累计 = 预期数学值，精确到 wei |
| Q3 | 权重加密，链上仅存哈希 | `Indexer.upload()` → 真实 root → `weightsPointer` | 已验证的主网往返：上传 → 锚定交易 → 下载，字节完全一致 |
| Q4 | 对齐审计削减版税份额 | 每位祖先份额按 `alignmentHealth/10000` 缩放 | Bob（50%）在同一代层级上比 Alice（100%）少赚 50% |
| Q5 | 已销毁的祖先 → 国库兜底 | `_distributeAncestorTiers` 与 `_gatherNextTier` 中对 `ownerOf` 和 `getParents` 的 `try/catch` | 单元测试 `test_Q5_*` 覆盖已销毁与会 revert 的所有者两种路径 |

第二阶段（仍是远景，已明确标注）：
- 通过 Specialized Flow + ECIES 所有者密钥实现的加密权重
- 真实的 TEE 证明校验（当前仅检查字节非空）
- 多审计员预言机网络（演示版当前为单个已批准的审计员）

---

## 🛡️ 反套壳防御（Anti-Wrapping）

针对克隆洗白的 5 层防护：

1. **TEE 训练证明** —— 证明确实发生了真实的训练算力
2. **权重差值阈值** —— 拒绝权重变化不足的铸造
3. **行为指纹探针** —— 检测与现有 INFT 输出的相似度
4. **挑战期 + 质押** —— 30 天社区挑战窗口，附带罚没
5. **声誉系统** —— 屏蔽惯犯

---

## 🌐 在线演示

**生产环境 URL：** [https://mekar.vercel.app](https://mekar.vercel.app)

| 页面 | 路径 | 功能 |
|---|---|---|
| 落地页 | `/` | 项目介绍 + 0G 技术栈展示 |
| **浏览器** | `/explorer` | D3 谱系树（手机 <768px 自动回退为列表视图） |
| **智能体详情** | `/agent/[id]` | 单个智能体 + 推理支付界面 + 仅所有者可用的元数据编辑器 |
| 铸造 | `/mint` | 三步式 Genesis / Fork / Compose 流程，含文件校验 + 0G Storage 上传 |
| 仪表盘 | `/dashboard` | 用户的智能体 + 版税收益 + 活动迷你图 |
| 趋势榜 | `/trending` | 按 `RoyaltyPaid` 事件聚合实时排序的排行榜 |
| 文档 | `/docs` | 应用内开发者参考（8 个章节，API 文档式侧边栏布局） |
| 品牌 | `/brand` | Logo + 配色下载（SVG / PNG，多种尺寸） |
| 幻灯片 | `/slides` | 内部路演 deck（noindex，键盘导航） |

## 🎬 演示视频

> 演示视频链接将稍后补充。

## 📊 主网部署（0G Aristotle 主网 —— 链 16661）

### 核心合约

| 合约 | 地址 | 浏览器 |
|---|---|---|
| **MekarRegistry** | `0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6` | [查看 ↗](https://chainscan.0g.ai/address/0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6) |
| **AgentINFT**（ERC-7857） | `0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4` | [查看 ↗](https://chainscan.0g.ai/address/0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4) |
| **RoyaltyVault** | `0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6` | [查看 ↗](https://chainscan.0g.ai/address/0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6) |
| **AlignmentAuditor** | `0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8` | [查看 ↗](https://chainscan.0g.ai/address/0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8) |
| **TrainingDataRegistry** | `0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46` | [查看 ↗](https://chainscan.0g.ai/address/0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46) |

> 全新部署到 Aristotle 主网（链 16661）—— 全部 5 个核心合约已部署、连线并经链上校验。

### 治理合约（已部署，待启用）

已部署到主网，随时可接管协议所有权。出于黑客松考虑，所有权转移**有意未执行**
—— 管理权暂留在部署者 EOA 上。

| 合约 | 地址 | 配置 |
|---|---|---|
| **MekarMultisig** | `0x1adA8059630332Dc21CE516ad5F83732F9D657bb` | 2-of-3 |
| **AlignmentMultiAuditor** | `0xC3bCC0f113935C898e418825678d39A68d22541D` | 阈值 2 |

### 真实谱系（5 个智能体，13 次版税结算）

```
创世 #1（gen 0，部署者，对齐 100%）
  ├── 派生 #2（gen 1，对齐 100%）
  └── 派生 #3（gen 1，对齐 50% ← 被 AlignmentAuditor 削减）
        ↓ 两个父代
        组合 #4（gen 2 —— 版税级联至 #2、#3 和 #1）

创世 #5（gen 0，通过线上 /mint 流程铸造）
```

### 链上证据

| 指标 | 数值 | 来源 |
|---|---|---|
| 已铸造智能体 | 5（`totalSupply`） | AgentINFT 上的 `getLineage` |
| RoyaltyPaid 事件 | 13 | RoyaltyVault 上的 `RoyaltyPaid` 日志 |
| 协议国库累计 | 1.2675e15 wei | `RoyaltyVault.protocolFeesAccrued()` |
| 对齐惩罚 | 智能体 #3 对齐度为 50% | 其 gen-1 份额相比 100% 的同代减半 |

国库余额是协议费 + 未分发的深代份额（Q2 扫尾）+ 对齐削减（Q4）之和。
**失准是真实的经济惩罚**：对齐度 50% 的智能体 #3 所赚的 gen-1 份额，
恰好是对齐度 100% 同代的一半。

### Q3 —— 真实的 0G Storage，端到端已验证

在 Aristotle 主网上的一次真实「上传→下载」往返，走的是 `/mint` 流程
所用的同一条 `@0gfoundation/0g-ts-sdk` 的 `Indexer.upload()` 路径：

| 步骤 | 数值 |
|---|---|
| 载荷 | 128 字节的清单文件 |
| 0G Storage rootHash | `0x70422e922abd90e1ec705ce7d58a88d110d9be54926b8abcf1fda6b2e8db19fc` |
| Flow 锚定交易 | [`0x475d…b89`](https://chainscan.0g.ai/tx/0x475dd4a7075069b3dc4f013ab6e37379137b797bdf6767b99213850e5f309b89)（主网区块 33333849） |
| 下载 | 通过 `/api/storage/download` 取回，字节完全一致 |

数据确实存在于 0G Storage 上，rootHash 通过一笔真实的主网 Flow 合约交易锚定，
并且能够完整往返。

---

## 📜 许可证

MIT —— 见 [LICENSE](LICENSE)

---

## 🏆 黑客松

为 **0G APAC 黑客松 2026** 打造 —— 赛道 3（智能体经济与自主应用）

#0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
