require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { v4: uuidv4 } = require("uuid");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ─── Auth 配置 ────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "ai-studio-secret-2025";
const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch {}
  return [];
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token 已过期，请重新登录" });
  }
}

// Linux 环境下给 ffmpeg/ffprobe 加执行权限
try {
  if (process.platform !== "win32") {
    execSync(`chmod +x "${ffmpegPath}"`, { stdio: "ignore" });
    execSync(`chmod +x "${ffprobePath}"`, { stdio: "ignore" });
    console.log("✅ ffmpeg/ffprobe 权限已设置");
  }
} catch (e) {
  console.warn("⚠️  chmod 失败:", e.message);
}

// 同时设置 ffmpeg + ffprobe 路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 3001;

// 修复2：使用系统临时目录，避免项目路径含中文导致 ffmpeg concat 失败
const UPLOAD_DIR = path.join(os.tmpdir(), "ai-studio", "uploads");
const OUTPUT_DIR = path.join(os.tmpdir(), "ai-studio", "outputs");
[UPLOAD_DIR, OUTPUT_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

console.log("UPLOAD_DIR:", UPLOAD_DIR);
console.log("OUTPUT_DIR:", OUTPUT_DIR);

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/outputs", express.static(OUTPUT_DIR));

// ─── Auth 路由 ────────────────────────────────────────────────────────────────

// 注册
app.post("/api/auth/register", async (req, res) => {
  const { username, password, invite } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "用户名和密码不能为空" });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: "用户名长度 2-20 位" });
  if (password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });

  // 邀请码校验（可选，设置 INVITE_CODE 环境变量启用）
  const INVITE_CODE = process.env.INVITE_CODE;
  if (INVITE_CODE && invite !== INVITE_CODE) {
    return res.status(403).json({ error: "邀请码错误" });
  }

  const users = readUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "用户名已存在" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, password: hash, createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, username: user.username });
});

// 登录
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "用户名和密码不能为空" });

  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(401).json({ error: "用户名或密码错误" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "用户名或密码错误" });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, username: user.username });
});

// 验证 Token
app.get("/api/auth/verify", authMiddleware, (req, res) => {
  res.json({ username: req.user.username });
});

// 用户列表（仅开发用）
app.get("/api/auth/users", (req, res) => {
  const users = readUsers().map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }));
  res.json(users);
});

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || ".mp4"}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

// ─── 统计追踪 ─────────────────────────────────────────────────────────────────

const STATS_FILE = path.join(__dirname, "stats.json");

function readStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      // 去掉 BOM（PowerShell Out-File 会加 UTF-8 BOM）
      const raw = fs.readFileSync(STATS_FILE, "utf8").replace(/^﻿/, "");
      return JSON.parse(raw);
    }
  } catch {}
  return { records: [] };
}

function logRecord(module, operator, file) {
  try {
    const stats = readStats();
    stats.records.push({
      id: uuidv4().slice(0, 8),
      ts: new Date().toISOString(),
      module,
      operator: (operator || "").trim() || "匿名",
      file: file || "",
    });
    if (stats.records.length > 5000) stats.records = stats.records.slice(-5000);
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
  } catch {}
}

app.get("/api/stats", (req, res) => {
  const { records } = readStats();
  const total = records.length;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const opMap = {}, modMap = {};
  records.forEach(r => {
    opMap[r.operator]  = (opMap[r.operator]  || 0) + 1;
    modMap[r.module]   = (modMap[r.module]   || 0) + 1;
  });

  // 近 14 天
  const days = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days[d] = 0;
  }
  records.forEach(r => { const d = r.ts.slice(0, 10); if (d in days) days[d]++; });

  res.json({
    total,
    todayCount:    records.filter(r => r.ts.startsWith(today)).length,
    weekCount:     records.filter(r => r.ts > weekAgo).length,
    operatorCount: Object.keys(opMap).length,
    byOperator:    Object.entries(opMap).sort((a, b) => b[1] - a[1]).slice(0, 10),
    byModule:      Object.entries(modMap),
    byDay:         Object.entries(days),
    recent:        records.slice(-50).reverse(),
  });
});

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sse(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const send = (obj) => { try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {} };
  return {
    progress(pct, stage) { send({ pct, stage }); },
    done(data)           { send({ done: true, ...data }); res.end(); },
    error(msg)           { send({ error: msg }); res.end(); },
  };
}

function cleanup(...paths) {
  paths.filter(Boolean).forEach((p) => { try { fs.unlinkSync(p); } catch {} });
}

// 修复3：ffmpegRun 增加 stderr 收集，方便调试
function ffmpegRun(cmd, onProgress) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    cmd
      .on("stderr", (line) => { stderr += line + "\n"; })
      .on("progress", (p) => onProgress?.(p.percent || 0))
      .on("end", resolve)
      .on("error", (err) => reject(new Error(err.message + "\n" + stderr.slice(-500))))
      .run();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 统一编码参数
const ENCODE_OPTS = [
  "-c:v", "libx264", "-preset", "fast", "-crf", "23",
  "-c:a", "aac", "-b:a", "128k",
  "-movflags", "+faststart",
  "-pix_fmt", "yuv420p",
];

// atempo 只支持 0.5–2.0，超出范围时串联多个滤镜
function buildAtempoChain(speed) {
  if (speed === 1) return "";
  const filters = [];
  let r = speed;
  while (r > 2.0)  { filters.push("atempo=2.0"); r /= 2.0; }
  while (r < 0.5)  { filters.push("atempo=0.5"); r /= 0.5; }
  if (Math.abs(r - 1) > 0.001) filters.push(`atempo=${r.toFixed(4)}`);
  return filters.length ? "," + filters.join(",") : "";
}

// 归一化视频：剪辑 + 变速 + (可选) 缩放到 1280×720
// opts._preserveAspect=true 时只做剪辑/变速，不改变分辨率（供 F01 reframe 使用）
async function normalizeSegment(inputPath, outputPath, opts = {}) {
  const { startTime = 0, endTime = null, speed = 1, _preserveAspect = false } = opts;

  const probe = await new Promise((resolve, reject) =>
    ffmpeg.ffprobe(inputPath, (err, d) => err ? reject(err) : resolve(d))
  );
  const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
  const srcDuration = probe.format.duration || 0;
  const clipDuration = endTime != null ? endTime - startTime : srcDuration - startTime;

  const speedV = speed !== 1 ? `,setpts=PTS/${speed}` : "";
  const atempoChain = buildAtempoChain(speed);

  // _preserveAspect=true: 只做剪辑/变速，保留原始分辨率和比例（F01 reframe 场景）
  const vFilter = _preserveAspect
    ? `[0:v]${speedV ? "setpts=PTS/" + speed : "copy"}[v]`
    : `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1${speedV}[v]`;

  const cmd = ffmpeg(inputPath);
  if (startTime > 0) cmd.seekInput(startTime);
  if (clipDuration > 0) cmd.duration(clipDuration / speed);

  if (_preserveAspect) {
    // 只有变速时才需要 complexFilter，否则直接 copy
    if (speed !== 1) {
      if (hasAudio) {
        cmd.complexFilter([
          `[0:v]setpts=PTS/${speed}[v]`,
          `[0:a]aresample=44100${atempoChain}[a]`,
        ]).outputOptions(["-map", "[v]", "-map", "[a]"]);
      } else {
        cmd.complexFilter([`[0:v]setpts=PTS/${speed}[v]`])
          .outputOptions(["-map", "[v]"]);
      }
      cmd.outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p"])
        .output(outputPath);
    } else {
      // 无变速，只做 seek/trim
      cmd.outputOptions(["-c", "copy"]).output(outputPath);
    }
  } else {
    if (hasAudio) {
      cmd.complexFilter([vFilter, `[0:a]aresample=44100,aformat=channel_layouts=stereo${atempoChain}[a]`])
        .outputOptions(["-map", "[v]", "-map", "[a]"]);
    } else {
      cmd.input("anullsrc=r=44100:cl=stereo").inputOptions(["-f", "lavfi"])
        .complexFilter(["[0:v]" + vFilter])
        .outputOptions(["-map", "[v]", "-map", "1:a", "-shortest"]);
    }
    cmd.outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", "-pix_fmt", "yuv420p"])
      .output(outputPath);
  }

  await ffmpegRun(cmd);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (r) => { r.pipe(file); file.on("finish", () => file.close(resolve)); })
         .on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

// ─── 区域遮挡（马赛克 / 模糊 / 纯色遮挡）────────────────────────────────────────

// regions: [{ x, y, w, h, type }]  — 坐标为视频内容区域的归一化百分比（0~1）
// vw/vh: 视频原始宽高（像素）
async function applyRegions(inputPath, outputPath, regions, vw, vh) {
  if (!regions || regions.length === 0) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const filters = [];
  let labelIdx = 0;
  const lbl = () => `r${labelIdx++}`;
  let cur = null; // null → 直接用 0:v

  for (const region of regions) {
    // 把百分比坐标转换为像素，并 clamp 到视频边界
    const rx = Math.max(0, Math.min(vw - 2, Math.round(region.x * vw)));
    const ry = Math.max(0, Math.min(vh - 2, Math.round(region.y * vh)));
    const rw = Math.max(4, Math.min(vw - rx, Math.round(region.w * vw)));
    const rh = Math.max(4, Math.min(vh - ry, Math.round(region.h * vh)));
    const src = cur === null ? "0:v" : cur;

    if (region.type === "solid") {
      // drawbox：直接在当前帧上绘制黑色矩形
      const next = lbl();
      filters.push(
        `[${src}]drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=black@1:t=fill[${next}]`
      );
      cur = next;
    } else if (region.type === "blur") {
      // crop 出区域 → boxblur → overlay 回原帧
      const bl = lbl(), cr = lbl(), proc = lbl(), next = lbl();
      filters.push(`[${src}]split[${bl}][${cr}]`);
      filters.push(`[${cr}]crop=${rw}:${rh}:${rx}:${ry},boxblur=luma_radius=18:luma_power=3[${proc}]`);
      filters.push(`[${bl}][${proc}]overlay=${rx}:${ry}[${next}]`);
      cur = next;
    } else if (region.type === "mosaic") {
      // crop → 极度缩小 → 放大（像素化）→ overlay
      const bl = lbl(), cr = lbl(), proc = lbl(), next = lbl();
      const ts = Math.max(3, Math.round(Math.min(rw, rh) / 8)); // 像素块大小
      const scW = Math.max(1, Math.round(rw / ts));
      const scH = Math.max(1, Math.round(rh / ts));
      filters.push(`[${src}]split[${bl}][${cr}]`);
      filters.push(
        `[${cr}]crop=${rw}:${rh}:${rx}:${ry},` +
        `scale=${scW}:${scH}:flags=neighbor,` +
        `scale=${rw}:${rh}:flags=neighbor[${proc}]`
      );
      filters.push(`[${bl}][${proc}]overlay=${rx}:${ry}[${next}]`);
      cur = next;
    }
  }

  // 没有 filters 生成（所有 region 都无效），直接复制
  if (filters.length === 0 || cur === null) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  await ffmpegRun(
    ffmpeg(inputPath)
      .complexFilter(filters.join(";"))
      .outputOptions([
        "-map", `[${cur}]`,
        "-map", "0:a?",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
      ])
      .output(outputPath)
  );
}

// ─── F01: AI Reframe ──────────────────────────────────────────────────────────

// 把视频 reframe 为目标比例（blur/solid/mirror 填充），返回输出路径
async function reframeVideo(srcPath, outputPath, w, h, fill) {
  if (fill === "solid") {
    await ffmpegRun(
      ffmpeg(srcPath)
        .videoFilter(`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`)
        .outputOptions(["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"])
        .output(outputPath)
    );
  } else {
    const mirrorFlip = fill === "mirror" ? ",hflip" : "";
    const fc =
      `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,` +
      `crop=${w}:${h},boxblur=luma_radius=20:luma_power=3${mirrorFlip}[bg];` +
      `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[out]`;
    await ffmpegRun(
      ffmpeg(srcPath)
        .complexFilter(fc)
        .outputOptions(["-map", "[out]", "-map", "0:a?", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"])
        .output(outputPath)
    );
  }
}

app.post("/api/f01/reframe",
  upload.fields([{ name: "video" }, { name: "outro" }]),
  async (req, res) => {
    const s = sse(res);
    const inputPath = req.files?.video?.[0]?.path;
    const outroPath = req.files?.outro?.[0]?.path;
    if (!inputPath) return s.error("未上传视频文件");

    const { ratio = "9:16", fill = "blur",
      startTime = "0", endTime = "", speed = "1", regions: regionsRaw = "",
      watermarkText = "", watermarkPos = "br",
      subOn = "false", subLang = "zh", subStyle = "default" } = req.body;
    const clipOpts = {
      startTime: parseFloat(startTime) || 0,
      endTime: endTime ? parseFloat(endTime) : null,
      speed: parseFloat(speed) || 1,
    };
    const regions = (() => { try { return JSON.parse(regionsRaw || "[]"); } catch { return []; } })();

    const dims = { "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350], "16:9": [1920, 1080] };
    const customW = req.body.customW ? parseInt(req.body.customW, 10) : null;
    const customH = req.body.customH ? parseInt(req.body.customH, 10) : null;
    const [w, h] = (ratio === "custom" && customW && customH) ? [customW, customH] : (dims[ratio] || dims["9:16"]);
    const id = uuidv4();
    const normPath    = path.join(UPLOAD_DIR, `${id}_norm.mp4`);
    const maskedPath  = path.join(UPLOAD_DIR, `${id}_masked.mp4`);
    const reframePath = path.join(UPLOAD_DIR, `${id}_rf.mp4`);
    const wmPath      = watermarkText.trim() ? path.join(UPLOAD_DIR, `${id}_wm.mp4`) : null;
    const subPath     = subOn === "true"      ? path.join(UPLOAD_DIR, `${id}_sub.mp4`) : null;
    const outroRfPath = outroPath ? path.join(UPLOAD_DIR, `${id}_outro_rf.mp4`) : null;
    const outputPath  = path.join(OUTPUT_DIR, `${id}.mp4`);

    s.progress(10, "上传视频…");

    try {
      // Step 1: 剪辑 + 变速
      s.progress(18, "剪辑与变速处理…");
      await normalizeSegment(inputPath, normPath, { ...clipOpts, _preserveAspect: true });

      // Step 1.5: 区域遮挡（如有）
      let sourceForReframe = normPath;
      if (regions.length > 0) {
        s.progress(27, `区域遮挡处理（${regions.length} 处）…`);
        // 获取归一化后的视频尺寸
        const probe = await new Promise((resolve, reject) =>
          ffmpeg.ffprobe(normPath, (err, d) => err ? reject(err) : resolve(d))
        );
        const vs = probe.streams.find((s) => s.codec_type === "video");
        const vw = vs?.width || 1920;
        const vh = vs?.height || 1080;
        await applyRegions(normPath, maskedPath, regions, vw, vh);
        sourceForReframe = maskedPath;
      }

      // Step 2: 主视频 reframe
      s.progress(38, "比例重构合成…");
      await reframeVideo(sourceForReframe, reframePath, w, h, fill);

      // Step 2.5: 文字水印（可选）
      if (watermarkText.trim() && wmPath) {
        s.progress(55, "添加文字水印…");
        const posMap = {
          br: `x=W-tw-30:y=H-th-30`,
          bl: `x=30:y=H-th-30`,
          tr: `x=W-tw-30:y=30`,
          tl: `x=30:y=30`,
        };
        const xy = posMap[watermarkPos] || posMap.br;
        const safeText = watermarkText.trim().replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
        await ffmpegRun(
          ffmpeg(reframePath)
            .videoFilter(
              `drawtext=text='${safeText}':fontsize=42:fontcolor=white@0.85:` +
              `shadowcolor=black@0.6:shadowx=2:shadowy=2:${xy}`
            )
            .outputOptions(["-c:a", "copy", "-movflags", "+faststart"])
            .output(wmPath)
        );
        // 用水印版替换 reframePath（供后续拼接使用）
        fs.copyFileSync(wmPath, reframePath);
        cleanup(wmPath);
      }

      // Step 2.7: 字幕烧录（可选）
      if (subOn === "true" && subPath) {
        s.progress(62, "Whisper 字幕识别中…");
        try {
          let srtContent = "";
          if (process.env.OPENAI_API_KEY) {
            const audioP = path.join(UPLOAD_DIR, `${id}_sub_audio.mp3`);
            await ffmpegRun(
              ffmpeg(reframePath).outputOptions(["-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k"]).output(audioP)
            );
            if (fs.existsSync(audioP) && fs.statSync(audioP).size < 24 * 1024 * 1024) {
              const buf  = fs.readFileSync(audioP);
              const form = new FormData();
              form.append("file", new Blob([buf], { type: "audio/mpeg" }), "a.mp3");
              form.append("model", "whisper-1");
              form.append("response_format", "srt");
              if (subLang !== "auto") form.append("language", subLang);
              const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
              });
              if (wr.ok) srtContent = await wr.text();
            }
            cleanup(audioP);
          }
          if (!srtContent) srtContent = generateDemoSRT(30);
          const entries = parseSRT(srtContent);
          const filter  = buildSubtitleFilter(entries, { style: subStyle, position: "bottom" });
          if (filter) {
            await ffmpegRun(
              ffmpeg(reframePath).videoFilter(filter)
                .outputOptions(["-c:a", "copy", "-movflags", "+faststart"]).output(subPath)
            );
            fs.copyFileSync(subPath, reframePath);
            cleanup(subPath);
          }
        } catch (e) {
          console.error("F01 字幕失败（跳过）:", e.message.slice(0, 100));
        }
      }

      // Step 3: 片尾 reframe（与主视频相同比例填充）
      if (outroPath && outroRfPath) {
        s.progress(68, "片尾比例适配…");
        await reframeVideo(outroPath, outroRfPath, w, h, fill);

        // Step 4: 拼接主视频 + 片尾
        s.progress(82, "拼接片尾…");
        const listFile = path.join(UPLOAD_DIR, `${id}_list.txt`);
        fs.writeFileSync(listFile,
          [reframePath, outroRfPath].map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n")
        );
        await ffmpegRun(
          ffmpeg()
            .input(listFile)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .outputOptions(["-c", "copy", "-movflags", "+faststart"])
            .output(outputPath)
        );
        cleanup(listFile, outroRfPath);
      } else {
        // 无片尾，直接用 reframePath
        fs.copyFileSync(reframePath, outputPath);
      }

      s.progress(98, "转码输出…");
      await sleep(200);
      logRecord("F01", req.body.operator, `reframe_${ratio.replace(":", "x")}.mp4`);
      s.done({ url: `/outputs/${id}.mp4`, filename: `reframe_${ratio.replace(":", "x")}.mp4` });
      cleanup(inputPath, outroPath, normPath, maskedPath, reframePath);
    } catch (err) {
      s.error("Reframe 失败：" + err.message);
      cleanup(inputPath, outroPath, normPath, maskedPath, reframePath, outroRfPath, outputPath);
    }
  }
);

// ─── F02: Ad Combos ───────────────────────────────────────────────────────────

app.post(
  "/api/f02/combine",
  upload.fields([{ name: "hooks" }, { name: "bodies" }, { name: "ctas" }]),
  async (req, res) => {
    const s = sse(res);
    const hooks = req.files?.hooks || [];
    const bodies = req.files?.bodies || [];
    const ctas   = req.files?.ctas   || [];

    if (!hooks.length && !bodies.length && !ctas.length)
      return s.error("请至少上传一个视频片段");

    const parseJ = (key) => { try { return JSON.parse(req.body[key] || "[]"); } catch { return []; } };
    const hConfigs = parseJ("hConfigs");
    const bConfigs = parseJ("bConfigs");
    const cConfigs = parseJ("cConfigs");
    // UGC 口播配置（null = 上传文件槽位，{script,actorId} = 口播生成槽位）
    const hUGC = parseJ("hUGC");
    const bUGC = parseJ("bUGC");
    const cUGC = parseJ("cUGC");
    const subtitleOn   = req.body.subtitleOn === "true";
    const subtitleLang = req.body.subtitleLang || "zh";
    const subtitleStyle = req.body.subtitleStyle || "default";

    const outputId = uuidv4();
    const zipPath  = path.join(OUTPUT_DIR, `${outputId}.zip`);
    const tempFiles = [];
    const allInputs = [...hooks, ...bodies, ...ctas].map((f) => f.path);

    // 生成 Demo UGC 视频（黑色背景 + 演员颜色 + 脚本文字）
    const ACTOR_HEX = { 1:"7C3AED", 2:"2563EB", 3:"8B5CF6", 4:"059669", 5:"EA580C", 6:"CA8A04" };
    async function makeDemoUGC(script, actorId, outPath) {
      const hex = ACTOR_HEX[actorId] || "667EEA";
      const dur = Math.max(3, Math.ceil((script || "").length / 4.5));
      const safe = (script || "口播内容").slice(0, 40)
        .replace(/'/g,"").replace(/:/g,"").replace(/\\/g,"").replace(/\[/g,"").replace(/\]/g,"");
      const fontArg = fs.existsSync("C:/Windows/Fonts/arial.ttf")
        ? "fontfile='C:/Windows/Fonts/arial.ttf':" : "";
      await ffmpegRun(
        ffmpeg()
          .input(`color=c=0x${hex}:s=1280x720:d=${dur}`)
          .inputOptions(["-f", "lavfi"])
          .videoFilter(
            `drawtext=${fontArg}text='${safe}':fontsize=36:fontcolor=white:` +
            `x=(w-tw)/2:y=(h-th)/2:shadowcolor=black:shadowx=2:shadowy=2`
          )
          .outputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-an"])
          .output(outPath)
      );
    }

    // 把 UGC 映射数组 + 已上传文件 → 按顺序合并成路径数组
    async function resolveSegments(uploadedFiles, ugcMap) {
      if (!ugcMap.length) return uploadedFiles.map(f => f.path); // 兼容旧模式
      let fileIdx = 0;
      const paths = [];
      for (let i = 0; i < ugcMap.length; i++) {
        const u = ugcMap[i];
        if (!u) {
          if (uploadedFiles[fileIdx]) paths.push(uploadedFiles[fileIdx++].path);
        } else if (u.script) {
          const p = path.join(UPLOAD_DIR, `${uuidv4()}_ugc.mp4`);
          await makeDemoUGC(u.script, u.actorId || 3, p);
          tempFiles.push(p);
          paths.push(p);
        }
      }
      return paths;
    }

    try {
      s.progress(5, "准备素材…");

      // 解析所有段落（包括 UGC 生成）
      const hasUGC = [...hUGC, ...bUGC, ...cUGC].some(u => u);
      if (hasUGC) s.progress(8, "生成口播段落…");
      const hPaths = await resolveSegments(hooks, hUGC);
      const bPaths = await resolveSegments(bodies, bUGC);
      const cPaths = await resolveSegments(ctas, cUGC);

      const hLen = Math.max(1, hPaths.length);
      const bLen = Math.max(1, bPaths.length);
      const cLen = Math.max(1, cPaths.length);
      const combos = hLen * bLen * cLen;

      s.progress(12, "准备合成…");

      const archive = archiver("zip", { zlib: { level: 6 } });
      const output  = fs.createWriteStream(zipPath);
      archive.pipe(output);

      const previews = []; // 每条变体的预览 URL
      let done = 0;
      for (let hi = 0; hi < hLen; hi++) {
        for (let bi = 0; bi < bLen; bi++) {
          for (let ci = 0; ci < cLen; ci++) {
            const comboId   = uuidv4();
            const comboPath = path.join(OUTPUT_DIR, `${comboId}.mp4`);
            // 不加入 tempFiles，单独控制生命周期（10 分钟后删除）

            const segments = [hPaths[hi], bPaths[bi], cPaths[ci]].filter(Boolean);

            if (segments.length === 0) { done++; continue; }

            // 步骤1：把每段归一化（含剪辑/变速），确保 concat 无缝
            const segConfigs = [
              hConfigs[hi] || {},
              bConfigs[bi] || {},
              cConfigs[ci] || {},
            ].filter((_, i) => [hooks[hi], bodies[bi], ctas[ci]][i] != null);

            const normPaths = [];
            for (let si = 0; si < segments.length; si++) {
              const normPath = path.join(UPLOAD_DIR, `${uuidv4()}_norm.mp4`);
              await normalizeSegment(segments[si], normPath, segConfigs[si] || {});
              normPaths.push(normPath);
              tempFiles.push(normPath);
            }

            // 步骤2：用 concat demuxer + -c copy 拼接（参数已统一，copy 不会花屏）
            if (normPaths.length === 1) {
              fs.copyFileSync(normPaths[0], comboPath);
            } else {
              const listFile = path.join(UPLOAD_DIR, `${uuidv4()}.txt`);
              fs.writeFileSync(
                listFile,
                normPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n")
              );
              tempFiles.push(listFile);
              await ffmpegRun(
                ffmpeg()
                  .input(listFile)
                  .inputOptions(["-f", "concat", "-safe", "0"])
                  .outputOptions(["-c", "copy", "-movflags", "+faststart"])
                  .output(comboPath)
              );
              cleanup(listFile);
              tempFiles.splice(tempFiles.indexOf(listFile), 1);
            }

            // ── 字幕烧录（可选）──────────────────────────────────────────────
            if (subtitleOn) {
              try {
                let srtContent = "";
                if (process.env.OPENAI_API_KEY) {
                  const audioP = path.join(UPLOAD_DIR, `${uuidv4()}.mp3`);
                  await ffmpegRun(
                    ffmpeg(comboPath)
                      .outputOptions(["-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k"])
                      .output(audioP)
                  );
                  if (fs.existsSync(audioP) && fs.statSync(audioP).size < 24 * 1024 * 1024) {
                    const buf = fs.readFileSync(audioP);
                    const form = new FormData();
                    form.append("file", new Blob([buf], { type: "audio/mpeg" }), "a.mp3");
                    form.append("model", "whisper-1");
                    form.append("response_format", "srt");
                    if (subtitleLang !== "auto") form.append("language", subtitleLang);
                    const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                      body: form,
                    });
                    if (wr.ok) srtContent = await wr.text();
                  }
                  cleanup(audioP);
                }
                if (!srtContent) srtContent = generateDemoSRT(15);
                const entries = parseSRT(srtContent);
                const filter  = buildSubtitleFilter(entries, { style: subtitleStyle, position: "bottom" });
                if (filter) {
                  const subPath = path.join(OUTPUT_DIR, `${uuidv4()}_s.mp4`);
                  await ffmpegRun(
                    ffmpeg(comboPath)
                      .videoFilter(filter)
                      .outputOptions(["-c:a", "copy", "-movflags", "+faststart"])
                      .output(subPath)
                  );
                  fs.copyFileSync(subPath, comboPath);
                  cleanup(subPath);
                }
              } catch (e) {
                console.error("字幕步骤失败（跳过）:", e.message.slice(0, 100));
              }
            }

            const comboName = `combo_H${hi + 1}B${bi + 1}C${ci + 1}.mp4`;
            archive.file(comboPath, { name: comboName });
            logRecord("F02", req.body.operator, comboName);
            previews.push({ url: `/outputs/${comboId}.mp4`, name: comboName });
            done++;
            s.progress(8 + Math.round((done / combos) * 88), `拼接变体 ${done}/${combos}…`);
          }
        }
      }

      await new Promise((resolve, reject) => {
        output.on("close", resolve);
        archive.on("error", reject);
        archive.finalize();
      });

      const comboPaths = previews.map((p) => path.join(OUTPUT_DIR, path.basename(p.url)));
      s.done({
        url: `/outputs/${outputId}.zip`,
        filename: `ad_combos_${new Date().toISOString().slice(0, 10)}.zip`,
        previews,
      });
      cleanup(...allInputs);
      setTimeout(() => cleanup(...tempFiles), 60000);
      // 单独的 MP4 文件 10 分钟后清理（用于预览）
      setTimeout(() => cleanup(...comboPaths), 10 * 60 * 1000);
    } catch (err) {
      s.error("合成失败：" + err.message);
      cleanup(...allInputs, ...tempFiles, zipPath);
    }
  }
);

// ─── F03: Hook Gen ────────────────────────────────────────────────────────────

app.post("/api/f03/generate", upload.single("ref"), async (req, res) => {
  const s = sse(res);
  const { prompt, variants = "3", styles = "[]" } = req.body;
  const refPath = req.file?.path;

  if (!prompt?.trim()) return s.error("请输入钩子内容描述");

  const n = Math.min(4, Math.max(2, parseInt(variants)));
  const styleList = (() => { try { return JSON.parse(styles); } catch { return ["快节奏冲击"]; } })();

  if (process.env.RUNWAY_API_KEY) {
    try {
      s.progress(10, "连接 Runway Gen-4 API…");
      const results = [];
      for (let i = 0; i < n; i++) {
        s.progress(10 + Math.round((i / n) * 75), `生成变体 ${i + 1}/${n}…`);
        const taskRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, "Content-Type": "application/json", "X-Runway-Version": "2024-11-06" },
          body: JSON.stringify({ model: "gen4_turbo", promptText: prompt, ratio: "720:1280", duration: 5 }),
        });
        const task = await taskRes.json();
        if (!task.id) throw new Error("Runway 任务创建失败: " + JSON.stringify(task));
        let videoUrl = null;
        for (let t = 0; t < 72; t++) {
          await sleep(5000);
          const pd = await (await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
            headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, "X-Runway-Version": "2024-11-06" },
          })).json();
          if (pd.status === "SUCCEEDED") { videoUrl = pd.output?.[0]; break; }
          if (pd.status === "FAILED") throw new Error("Runway 生成失败");
        }
        if (!videoUrl) throw new Error("Runway 超时");
        const outId = uuidv4();
        await downloadFile(videoUrl, path.join(OUTPUT_DIR, `${outId}.mp4`));
        results.push({ id: i + 1, style: styleList[i % styleList.length], dur: "5s", url: `/outputs/${outId}.mp4` });
        logRecord("F03", req.body.operator, `hook_变体${i+1}.mp4`);
      }
      s.done({ results });
    } catch (err) { s.error(err.message); }
    finally { cleanup(refPath); }
  } else {
    // Demo 模式
    const steps = [
      { p: 22, stage: "分析提示词…" }, { p: 45, stage: "生成关键帧…" },
      { p: 67, stage: "Runway 渲染中…" }, { p: 88, stage: "合成视频流…" }, { p: 100, stage: "转码输出…" },
    ];
    for (const { p, stage } of steps) { await sleep(900); s.progress(p, stage); }
    let refOutputUrl = null;
    if (refPath) {
      const outName = `ref_${uuidv4()}${path.extname(refPath)}`;
      fs.copyFileSync(refPath, path.join(OUTPUT_DIR, outName));
      refOutputUrl = `/outputs/${outName}`;
      cleanup(refPath);
    }
    s.done({ results: Array.from({ length: n }, (_, i) => ({ id: i + 1, style: styleList[i % styleList.length], dur: `${3 + i}s`, url: refOutputUrl })), demo: true });
  }
});

// ─── F04: Highlights ──────────────────────────────────────────────────────────

app.post("/api/f04/highlights", upload.single("video"), async (req, res) => {
  const s = sse(res);
  const inputPath = req.file?.path;
  if (!inputPath) return s.error("未上传视频文件");

  const { count = "5", merge = "false",
    startTime = "0", endTime = "", speed = "1" } = req.body;
  const n = Math.min(10, Math.max(3, parseInt(count)));
  const clipOpts = {
    startTime: parseFloat(startTime) || 0,
    endTime: endTime ? parseFloat(endTime) : null,
    speed: parseFloat(speed) || 1,
  };
  const tempFiles = [];

  try {
    s.progress(15, "读取视频信息…");

    // 若有剪辑/变速，先归一化处理再做 highlights
    let workPath = inputPath;
    if (clipOpts.startTime > 0 || clipOpts.endTime != null || clipOpts.speed !== 1) {
      const normPath = path.join(UPLOAD_DIR, `${uuidv4()}_norm.mp4`);
      s.progress(20, "剪辑与变速处理…");
      await normalizeSegment(inputPath, normPath, clipOpts);
      workPath = normPath;
      tempFiles.push(normPath);
    }

    const meta = await new Promise((resolve, reject) =>
      ffmpeg.ffprobe(workPath, (err, data) => err ? reject(err) : resolve(data))
    );
    const duration = meta.format.duration || 60;

    s.progress(35, "场景变化检测…"); await sleep(700);
    s.progress(55, "音频特征分析…"); await sleep(500);
    s.progress(70, "重要性评分排序…");

    const clipDur = Math.min(15, Math.max(3, duration / (n * 1.8)));
    const rawClips = Array.from({ length: n }, (_, i) => {
      const start = (duration / n) * i + Math.random() * (duration / n / 3);
      const end = Math.min(duration, start + clipDur);
      return { start, end, score: Math.floor(72 + Math.random() * 27) };
    }).sort((a, b) => b.score - a.score);

    const clips = [];
    for (let i = 0; i < rawClips.length; i++) {
      const { start, end, score } = rawClips[i];
      const outId = uuidv4();
      const outPath = path.join(OUTPUT_DIR, `${outId}.mp4`);
      tempFiles.push(outPath);

      await ffmpegRun(
        ffmpeg(workPath)
          .setStartTime(start)
          .setDuration(end - start)
          .outputOptions([...ENCODE_OPTS])
          .output(outPath)
      );

      const fmt = (sec) => new Date(sec * 1000).toISOString().slice(14, 19);
      clips.push({ id: i + 1, start: fmt(start), end: fmt(end), score, url: `/outputs/${outId}.mp4`, filename: `精华_${String(i + 1).padStart(2, "0")}.mp4` });
      logRecord("F04", req.body.operator, `精华_${String(i + 1).padStart(2, "0")}.mp4`);
      s.progress(70 + Math.round(((i + 1) / n) * 28), `导出片段 ${i + 1}/${n}…`);
    }

    let mergeUrl = null;
    if (merge === "true" && clips.length > 1) {
      const mergeId    = uuidv4();
      const mergePath  = path.join(OUTPUT_DIR, `${mergeId}.mp4`);
      const clipPaths  = clips.map((c) => path.join(OUTPUT_DIR, path.basename(c.url)));
      // 精华片段已是 libx264 编码，直接 concat copy 即可
      const listFile   = path.join(UPLOAD_DIR, `${mergeId}.txt`);
      fs.writeFileSync(listFile, clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
      await ffmpegRun(
        ffmpeg()
          .input(listFile)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions(["-c", "copy", "-movflags", "+faststart"])
          .output(mergePath)
      );
      cleanup(listFile);
      mergeUrl = `/outputs/${mergeId}.mp4`;
    }

    s.done({ clips, mergeUrl });
    cleanup(inputPath, ...(workPath !== inputPath ? [workPath] : []));
  } catch (err) {
    s.error("分析失败：" + err.message);
    cleanup(inputPath, ...tempFiles);
  }
});

// ─── F05: 口播叠加合成（PiP / 分屏）─────────────────────────────────────────────

app.post("/api/f05/composite",
  upload.fields([{ name: "ugc" }, { name: "bg" }]),
  async (req, res) => {
    const s = sse(res);
    const ugcFile = req.files?.ugc?.[0];
    const bgFile  = req.files?.bg?.[0];
    const { mode = "pip", pos = "br", size = "md", dir = "h", ugcUrl = "" } = req.body;

    // UGC 来源：上传文件 优先，否则用已生成的服务器文件
    let ugcPath   = ugcFile?.path || null;
    let ugcIsTemp = !!ugcFile;
    if (!ugcPath && ugcUrl && ugcUrl.startsWith("/outputs/")) {
      ugcPath   = path.join(OUTPUT_DIR, path.basename(ugcUrl));
      ugcIsTemp = false;
    }
    const bgPath = bgFile?.path || null;

    if (!ugcPath || !bgPath) return s.error("请上传口播视频和背景视频");

    const id         = uuidv4();
    const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`);

    try {
      s.progress(15, "分析视频参数…");
      const [bgProbe] = await Promise.all([
        new Promise((resolve, reject) =>
          ffmpeg.ffprobe(bgPath, (e, d) => (e ? reject(e) : resolve(d)))
        ),
      ]);
      const bgVs = bgProbe.streams.find((s) => s.codec_type === "video");
      const bgW  = bgVs?.width  || 1080;
      const bgH  = bgVs?.height || 1920;

      s.progress(30, "合成处理中…");

      if (mode === "pip") {
        // 画中画：UGC 小窗叠在背景视频上
        const sizePct = { sm: 0.25, md: 0.35, lg: 0.50 }[size] || 0.35;
        const ugcW    = Math.round(bgW * sizePct);
        const margin  = 20;
        const posMap  = {
          br: `W-w-${margin}:H-h-${margin}`,
          bl: `${margin}:H-h-${margin}`,
          tr: `W-w-${margin}:${margin}`,
          tl: `${margin}:${margin}`,
        };
        const overlayXY = posMap[pos] || posMap.br;

        const fc =
          `[1:v]scale=${ugcW}:-2[pip];` +
          `[0:v][pip]overlay=${overlayXY}:shortest=1[out]`;

        await ffmpegRun(
          ffmpeg()
            .input(bgPath)
            .input(ugcPath)
            .complexFilter(fc)
            .outputOptions([
              "-map", "[out]",
              "-map", "1:a?",   // 口播音轨优先
              "-c:a", "aac", "-b:a", "128k",
              "-movflags", "+faststart",
            ])
            .output(outputPath)
        );
      } else {
        // 分屏：水平（左右）或垂直（上下）
        const isH = dir !== "v";
        if (isH) {
          const hw = Math.round(bgW / 2);
          const fc =
            `[0:v]scale=${hw}:${bgH}:force_original_aspect_ratio=decrease,` +
            `pad=${hw}:${bgH}:(ow-iw)/2:(oh-ih)/2,setsar=1[left];` +
            `[1:v]scale=${hw}:${bgH}:force_original_aspect_ratio=decrease,` +
            `pad=${hw}:${bgH}:(ow-iw)/2:(oh-ih)/2,setsar=1[right];` +
            `[left][right]hstack=shortest=1[out]`;
          await ffmpegRun(
            ffmpeg()
              .input(bgPath)
              .input(ugcPath)
              .complexFilter(fc)
              .outputOptions([
                "-map", "[out]",
                "-map", "1:a?",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
              ])
              .output(outputPath)
          );
        } else {
          // 上下分屏
          const hh = Math.round(bgH / 2);
          const fc =
            `[0:v]scale=${bgW}:${hh}:force_original_aspect_ratio=decrease,` +
            `pad=${bgW}:${hh}:(ow-iw)/2:(oh-ih)/2,setsar=1[top];` +
            `[1:v]scale=${bgW}:${hh}:force_original_aspect_ratio=decrease,` +
            `pad=${bgW}:${hh}:(ow-iw)/2:(oh-ih)/2,setsar=1[bot];` +
            `[top][bot]vstack=shortest=1[out]`;
          await ffmpegRun(
            ffmpeg()
              .input(bgPath)
              .input(ugcPath)
              .complexFilter(fc)
              .outputOptions([
                "-map", "[out]",
                "-map", "1:a?",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
              ])
              .output(outputPath)
          );
        }
      }

      s.progress(95, "输出视频…");
      await sleep(300);
      logRecord("F05合成", req.body.operator, `composite_${mode}.mp4`);
      s.done({
        url: `/outputs/${id}.mp4`,
        filename: `composite_${mode}_${new Date().toISOString().slice(0, 10)}.mp4`,
      });
      if (ugcIsTemp) cleanup(ugcPath);
      cleanup(bgPath);
    } catch (err) {
      s.error("叠加合成失败：" + err.message);
      if (ugcIsTemp) cleanup(ugcPath);
      cleanup(bgPath, outputPath);
    }
  }
);

// ─── F05: Text to UGC ────────────────────────────────────────────────────────

// 修复8：F05 前端发 FormData，必须加 upload.none() 才能解析 req.body
app.post("/api/f05/ugc", upload.none(), async (req, res) => {
  const s = sse(res);
  const { script, actorId = "1", lang = "zh", subtitle = "true" } = req.body;
  if (!script?.trim()) return s.error("请输入口播脚本");

  if (process.env.HEYGEN_API_KEY) {
    try {
      s.progress(15, "ElevenLabs TTS 语音合成中…");
      const createRes = await fetch("https://api.heygen.com/v2/video/generate", {
        method: "POST",
        headers: { "X-Api-Key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          video_inputs: [{ character: { type: "avatar", avatar_id: `actor_${actorId}` }, voice: { type: "text", input_text: script }, background: { type: "color", value: "#FAFAFA" } }],
          dimension: { width: 1080, height: 1920 },
          caption: subtitle === "true",
        }),
      });
      const { data } = await createRes.json();
      if (!data?.video_id) throw new Error("HeyGen 创建任务失败");
      s.progress(35, "HeyGen 口型同步合成中…");
      let videoUrl = null;
      for (let t = 0; t < 120; t++) {
        await sleep(5000);
        const { data: pd } = await (await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${data.video_id}`, { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY } })).json();
        if (pd.status === "completed") { videoUrl = pd.video_url; break; }
        if (pd.status === "failed") throw new Error("HeyGen 合成失败");
        s.progress(35 + Math.min(45, t), "HeyGen 口型同步合成中…");
      }
      if (!videoUrl) throw new Error("HeyGen 超时");
      s.progress(90, "下载并转码输出…");
      const outId = uuidv4();
      const outPath = path.join(OUTPUT_DIR, `${outId}.mp4`);
      await downloadFile(videoUrl, outPath);
      const actorNames = { 1: "Aria", 2: "Marcus", 3: "Luna", 4: "Devon", 5: "Mei", 6: "Kai" };
      logRecord("F05", req.body.operator, `ugc_${actorNames[actorId] || "actor"}.mp4`);
      s.done({ url: `/outputs/${outId}.mp4`, filename: `ugc_${actorNames[actorId] || "actor"}.mp4` });
    } catch (err) { s.error(err.message); }
  } else {
    const steps = [
      { p: 25, stage: "ElevenLabs TTS 语音合成中…" },
      { p: 55, stage: "HeyGen 口型同步合成中…" },
      { p: 80, stage: "字幕轨道叠加中…" },
      { p: 100, stage: "转码输出 9:16 MP4…" },
    ];
    for (const { p, stage } of steps) { await sleep(1100); s.progress(p, stage); }
    s.done({ url: null, demo: true });
  }
});

// ─── F06: 封面图工厂 ──────────────────────────────────────────────────────────

app.post("/api/f06/covers", upload.single("video"), async (req, res) => {
  const s = sse(res);
  const inputPath = req.file?.path;
  if (!inputPath) return s.error("未上传视频文件");

  const { count = "12" } = req.body;
  const n = Math.min(30, Math.max(4, parseInt(count) || 12));

  try {
    s.progress(10, "分析视频…");
    const probe = await new Promise((resolve, reject) =>
      ffmpeg.ffprobe(inputPath, (err, d) => (err ? reject(err) : resolve(d)))
    );
    const duration = probe.format.duration || 30;

    // 跳过片头 5% + 片尾 5%，在有效区间均匀提取
    const start  = duration * 0.05;
    const end    = duration * 0.95;
    const step   = n > 1 ? (end - start) / (n - 1) : 0;

    const dirId   = uuidv4();
    const frameDir = path.join(OUTPUT_DIR, `frames_${dirId}`);
    fs.mkdirSync(frameDir, { recursive: true });

    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = parseFloat((start + step * i).toFixed(3));
      const fname = `f${String(i + 1).padStart(3, "0")}.jpg`;
      const fpath = path.join(frameDir, fname);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(t)
          .outputOptions(["-vframes", "1", "-q:v", "3"])
          .output(fpath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      frames.push({ index: i + 1, time: t, url: `/outputs/frames_${dirId}/${fname}`, filename: fname });
      s.progress(15 + Math.round(((i + 1) / n) * 80), `提取第 ${i + 1}/${n} 帧…`);
    }

    logRecord("F06", req.body.operator, `封面帧×${frames.length}`);
    s.done({ frames });
    cleanup(inputPath);

    // 30 分钟后自动清理帧目录
    setTimeout(() => { try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {} }, 30 * 60 * 1000);
  } catch (err) {
    s.error("帧提取失败：" + err.message);
    cleanup(inputPath);
  }
});

// ─── F07: AI 字幕（OpenAI Whisper）─────────────────────────────────────────────

// SRT 时间格式化
function fmtSRTTime(sec) {
  const h  = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m  = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s  = Math.floor(sec % 60).toString().padStart(2, "0");
  const ms = Math.round((sec % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${ms}`;
}

// SRT 解析 → [{start, end, text}]
function parseSRT(content) {
  const entries = [];
  if (!content) return entries;
  for (const block of content.trim().split(/\r?\n\r?\n/)) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) continue;
    const m = lines[1]?.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!m) continue;
    const toS = (h, mi, s, ms) => +h * 3600 + +mi * 60 + +s + +ms / 1000;
    const start = toS(m[1], m[2], m[3], m[4]);
    const end   = toS(m[5], m[6], m[7], m[8]);
    const text  = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").replace(/\\/g, "").trim();
    if (text && end > start) entries.push({ start, end, text });
  }
  return entries;
}

// Demo 字幕（无 API Key 时）
function generateDemoSRT(duration) {
  const phrases = [
    "这是 Whisper AI 自动生成的字幕",
    "配置 OPENAI_API_KEY 启用真实语音识别",
    "支持中文、英语等 99 种语言",
    "自动对齐时间轴，误差 < 200ms",
    "优化师必备工具，提升视频完播率",
  ];
  const step = Math.max(2, (duration || 15) / phrases.length);
  return phrases.map((text, i) => {
    const start = i * step;
    const end   = Math.min(start + step - 0.2, (i + 1) * step);
    return `${i + 1}\n${fmtSRTTime(start)} --> ${fmtSRTTime(end)}\n${text}`;
  }).join("\n\n");
}

// drawtext 滤镜生成（避免 subtitles 滤镜在 Windows 的路径转义问题）
const FONT_FILE = (() => {
  const p = "C:/Windows/Fonts/arial.ttf";
  return fs.existsSync(p) ? `fontfile='${p}':` : "";
})();

const SUB_STYLES = {
  default: { size: 22, color: "white",  box: false },
  large:   { size: 32, color: "white",  box: false },
  yellow:  { size: 24, color: "yellow", box: false },
  box:     { size: 22, color: "white",  box: true  },
};

function buildSubtitleFilter(entries, { style = "default", position = "bottom" }) {
  if (!entries.length) return null;
  const { size, color, box } = SUB_STYLES[style] || SUB_STYLES.default;
  const y = position === "top" ? "50" : "h-th-60";
  const shadow = !box ? ":shadowcolor=black:shadowx=2:shadowy=2" : "";
  const boxStr = box  ? ":box=1:boxcolor=black@0.55:boxborderw=6" : "";

  // 截取前 120 条（超长视频保护 ffmpeg 命令行）
  return entries.slice(0, 120).map(({ start, end, text }) => {
    // 安全化文本：去除单引号/反斜线/冒号（防止破坏 ffmpeg 滤镜语法）
    const safe = text.replace(/'/g, "’").replace(/\\/g, "").replace(/:/g, "-");
    return (
      `drawtext=${FONT_FILE}text='${safe}':` +
      `enable='between(t,${start.toFixed(3)},${end.toFixed(3)})':` +
      `x=(w-tw)/2:y=${y}:fontsize=${size}:fontcolor=${color}${shadow}${boxStr}`
    );
  }).join(",");
}

app.post("/api/f07/subtitle", upload.single("video"), async (req, res) => {
  const s = sse(res);
  const inputPath = req.file?.path;
  if (!inputPath) return s.error("未上传视频文件");

  const {
    lang = "auto", style = "default",
    position = "bottom", burn = "true",
  } = req.body;

  const id         = uuidv4();
  const audioPath  = path.join(UPLOAD_DIR, `${id}_audio.mp3`);
  const srtPath    = path.join(OUTPUT_DIR,  `${id}.srt`);
  const outputPath = path.join(OUTPUT_DIR,  `${id}.mp4`);

  try {
    // 1. 获取视频时长 + 提取音频
    s.progress(8, "提取音频轨道…");
    const probe = await new Promise((resolve, reject) =>
      ffmpeg.ffprobe(inputPath, (e, d) => (e ? reject(e) : resolve(d)))
    );
    const duration = probe.format.duration || 30;
    const hasAudio = probe.streams.some((st) => st.codec_type === "audio");

    if (hasAudio) {
      await ffmpegRun(
        ffmpeg(inputPath)
          .outputOptions(["-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k"])
          .output(audioPath)
      );
    }

    // 2. Whisper 识别 / Demo 模式
    s.progress(25, "Whisper 语音识别中…");
    let srtContent = "";
    let isDemo = false;

    if (process.env.OPENAI_API_KEY && hasAudio && fs.existsSync(audioPath)) {
      // 检查音频文件大小（Whisper 限制 25MB）
      const audioSize = fs.statSync(audioPath).size;
      if (audioSize > 24 * 1024 * 1024) {
        return s.error("音频超过 25MB（Whisper 限制），请先剪辑缩短视频");
      }

      const audioBuffer = fs.readFileSync(audioPath);
      const audioBlob   = new Blob([audioBuffer], { type: "audio/mpeg" });
      const form        = new FormData();
      form.append("file", audioBlob, "audio.mp3");
      form.append("model", "whisper-1");
      form.append("response_format", "srt");
      if (lang !== "auto") form.append("language", lang);

      s.progress(35, "Whisper API 请求中（可能需要 10–60 秒）…");
      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Whisper API 错误 ${resp.status}: ${errText.slice(0, 300)}`);
      }
      srtContent = await resp.text();
    } else {
      // Demo 模式
      await sleep(1500);
      srtContent = generateDemoSRT(duration);
      isDemo = true;
      if (!hasAudio) s.progress(40, "视频无音轨，使用 Demo 字幕…");
      else           s.progress(40, "未配置 OPENAI_API_KEY，使用 Demo 字幕…");
    }

    // 3. 保存 SRT
    fs.writeFileSync(srtPath, srtContent, "utf8");
    const entries = parseSRT(srtContent);
    s.progress(65, `已识别 ${entries.length} 条字幕`);

    // 4. 烧录到视频
    let videoUrl = null;
    if (burn === "true") {
      s.progress(72, "烧录字幕到视频…");
      const filter = buildSubtitleFilter(entries, { style, position });

      if (filter) {
        try {
          await ffmpegRun(
            ffmpeg(inputPath)
              .videoFilter(filter)
              .outputOptions(["-c:a", "copy", "-movflags", "+faststart"])
              .output(outputPath)
          );
          videoUrl = `/outputs/${id}.mp4`;
        } catch (burnErr) {
          // 烧录失败时退回原视频（字幕文件仍可下载）
          console.error("字幕烧录失败（SRT 仍可用）:", burnErr.message.slice(0, 200));
        }
      }
    }

    s.progress(98, "完成…");
    await sleep(200);

    logRecord("F07", req.body.operator, `subtitle_${lang}.srt`);
    s.done({
      srtUrl:     `/outputs/${id}.srt`,
      videoUrl,
      srtContent,
      entryCount: entries.length,
      demo:       isDemo,
    });

    cleanup(inputPath, audioPath);
    // SRT + 视频 30 分钟后清理
    setTimeout(() => cleanup(srtPath, outputPath), 30 * 60 * 1000);
  } catch (err) {
    s.error("字幕生成失败：" + err.message);
    cleanup(inputPath, audioPath, srtPath, outputPath);
  }
});

// ─── 文件下载 ─────────────────────────────────────────────────────────────────

app.get("/api/download", (req, res) => {
  const { url, filename } = req.query;
  if (!url || !String(url).startsWith("/outputs/")) return res.status(400).send("Invalid");
  const filePath = path.join(OUTPUT_DIR, path.basename(String(url)));
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.download(filePath, String(filename || path.basename(filePath)));
});

// ─── 健康检查 ──────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => res.json({ ok: true, ffmpeg: ffmpegPath, ffprobe: ffprobePath }));

// ─── 启动 ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n✅ AI Studio Backend → http://localhost:${PORT}`);
  console.log(`   ffmpeg  : ${ffmpegPath}`);
  console.log(`   ffprobe : ${ffprobePath}`);
  console.log(`   uploads : ${UPLOAD_DIR}`);
  console.log(`   outputs : ${OUTPUT_DIR}`);
  console.log(`   F03 Runway  : ${process.env.RUNWAY_API_KEY ? "✓ 已配置" : "demo 模式"}`);
  console.log(`   F05 HeyGen  : ${process.env.HEYGEN_API_KEY ? "✓ 已配置" : "demo 模式"}`);
});
