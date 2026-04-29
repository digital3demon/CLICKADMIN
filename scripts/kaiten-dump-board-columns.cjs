/**
 * Выгрузка колонок и дорожек (lanes) досок Kaiten из .env — для справки и настройки
 * KAITEN_*_COLUMN_TO_EXECUTION_ID / KAITEN_*_LANE_ID.
 *
 * Запуск: npm run kaiten:dump-boards
 * (или: node --env-file=.env scripts/kaiten-dump-board-columns.cjs)
 */
const token = process.env.KAITEN_API_TOKEN?.trim();
const base = (process.env.KAITEN_API_BASE_URL || "https://clicklab.kaiten.ru/api/v1")
  .trim()
  .replace(/\/+$/, "");

if (!token) {
  console.error("Нет KAITEN_API_TOKEN в окружении (.env)");
  process.exit(1);
}

function parseBoardId(name, raw) {
  const s = raw?.trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n)) {
    console.error(`${name}: не число:`, raw);
    process.exit(1);
  }
  return n;
}

const boards = [
  {
    label: "ORTHOPEDICS (ортопедия)",
    id: parseBoardId(
      "KAITEN_ORTHOPEDICS_BOARD_ID",
      process.env.KAITEN_ORTHOPEDICS_BOARD_ID,
    ),
  },
  {
    label: "ORTHODONTICS (ортодонтия)",
    id: parseBoardId(
      "KAITEN_ORTHODONTICS_BOARD_ID",
      process.env.KAITEN_ORTHODONTICS_BOARD_ID,
    ),
  },
].filter((x) => x.id != null);

if (boards.length === 0) {
  console.error(
    "Задайте в .env KAITEN_ORTHOPEDICS_BOARD_ID и/или KAITEN_ORTHODONTICS_BOARD_ID",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJson(path) {
  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text.slice(0, 500) };
  }
  return { ok: r.ok, status: r.status, data };
}

function pickCol(c) {
  if (!c || typeof c !== "object") return null;
  const id = c.id;
  const title = c.title ?? c.name ?? "";
  if (typeof id !== "number") return null;
  return { id, title: String(title) };
}

function pickLane(l) {
  if (!l || typeof l !== "object") return null;
  const id = l.id;
  const title = l.title ?? l.name ?? "";
  if (typeof id !== "number") return null;
  return { id, title: String(title) };
}

(async () => {
  for (let i = 0; i < boards.length; i++) {
    const { label, id } = boards[i];
    if (i > 0) await sleep(800);
    console.log("\n" + "=".repeat(72));
    console.log(label);
    console.log(`board_id=${id}`);
    console.log("=".repeat(72));

    const colsRes = await getJson(`/boards/${id}/columns`);
    await sleep(400);
    if (!colsRes.ok) {
      console.error("columns HTTP", colsRes.status, colsRes.data);
      continue;
    }
    const arr = Array.isArray(colsRes.data) ? colsRes.data : [];
    const columns = arr.map(pickCol).filter(Boolean);
    console.log("\nКолонки (column_id для API / CRM):\n");
    for (const c of columns) {
      console.log(`  ${c.id}\t${c.title}`);
    }

    let lanesRes = await getJson(`/boards/${id}/lanes`);
    if (!lanesRes.ok && lanesRes.status === 429) {
      await sleep(2000);
      lanesRes = await getJson(`/boards/${id}/lanes`);
    }
    await sleep(400);
    if (!lanesRes.ok) {
      console.error("\nlanes HTTP", lanesRes.status, lanesRes.data);
      continue;
    }
    const larr = Array.isArray(lanesRes.data) ? lanesRes.data : [];
    const lanes = larr.map(pickLane).filter(Boolean);
    console.log("\nДорожки / lanes (lane_id):\n");
    if (lanes.length === 0) {
      console.log("  (пусто или не массив)");
    } else {
      for (const l of lanes) {
        console.log(`  ${l.id}\t${l.title}`);
      }
    }

    console.log("\nJSON (columns):");
    console.log(JSON.stringify(columns, null, 2));
    console.log("\nJSON (lanes):");
    console.log(JSON.stringify(lanes, null, 2));
  }
  console.log("");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
