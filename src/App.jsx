// 三麻〜八人対応・ウマ/オカ/チップ設定＋半荘別折りたたみ付き完全版
import React, { useMemo, useState } from "react";

export default function App() {
  // 🧩 初期設定
  const [playerCount, setPlayerCount] = useState(5);
  const [players, setPlayers] = useState(["Aさん", "Bさん", "Cさん", "Dさん", "Eさん"]);
  const [hanchanCount, setHanchanCount] = useState(3);
  const [lines, setLines] = useState(
    Array.from({ length: 3 }, () => ({ restIds: [], scores: {}, error: "" }))
  );

  const [returnPoint, setReturnPoint] = useState(35000);
  const [rate, setRate] = useState(100);

  // ⚙️ 設定ON/OFF
  const [useUma, setUseUma] = useState(true);
  const [useOka, setUseOka] = useState(true);
  const [useChip, setUseChip] = useState(true);

  // ⚙️ 設定値
  const [uma, setUma] = useState({ first: 20, second: 10, third: -10, fourth: -20 });
  const [oka, setOka] = useState(20000);
  const [chipValue, setChipValue] = useState(100);
  const [defaultChipCount, setDefaultChipCount] = useState(5);
  const [chips, setChips] = useState(Array(playerCount).fill(5));
  const [chipError, setChipError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openRounds, setOpenRounds] = useState({}); // 半荘別開閉状態

  // 🧠 休み人数計算（3〜8人対応）
  const getRestCount = (n) => (n <= 4 ? 0 : n - 4);

  // ✅ 人数変更処理
  const handlePlayerCountChange = (count) => {
    const n = Number(count);
    if (isNaN(n) || n < 3 || n > 8) return;
    setPlayerCount(n);

    // プレイヤー配列調整
    setPlayers((prev) => {
      const next = [...prev];
      if (n > next.length) {
        const extras = Array.from({ length: n - next.length }, (_, i) => `新${i + 1}`);
        return [...next, ...extras];
      } else {
        return next.slice(0, n);
      }
    });

    // チップ・半荘情報を調整
    const newChips = Array(n).fill(defaultChipCount);
    setChips(newChips);
    setChipError(validateChipSum(newChips, defaultChipCount, n));
    setLines(Array.from({ length: hanchanCount }, () => ({ restIds: [], scores: {}, error: "" })));
  };

  // ✅ 半荘数変更
  const handleHanchanChange = (count) => {
    const n = Number(count);
    if (isNaN(n) || n < 1) return;
    setHanchanCount(n);
    setLines((prev) => {
      const current = [...prev];
      if (n > current.length) {
        const extra = Array.from({ length: n - current.length }, () => ({
          restIds: [],
          scores: {},
          error: "",
        }));
        return [...current, ...extra];
      } else {
        return current.slice(0, n);
      }
    });
  };

  // ✅ 合計点数チェック
  const validateSum = (line, activePlayersCount) => {
    const total = Object.values(line.scores).reduce((a, b) => a + (Number(b) || 0), 0);
    const expected = returnPoint * activePlayersCount;
    if (total > 0 && total !== expected) {
      return `⚠️ 合計が ${expected.toLocaleString()} 点ではありません（現在 ${total.toLocaleString()} 点）`;
    }
    return "";
  };

  // ✅ チップ合計チェック
  const validateChipSum = (chipList, base, count) => {
    const total = chipList.reduce((a, b) => a + (Number(b) || 0), 0);
    const expected = base * count;
    if (total !== expected) {
      return `⚠️ チップ合計が合いません（現在 ${total}枚／合計${expected}枚）`;
    }
    return "";
  };

  // ✅ スコア入力
  const handleScoreChange = (idx, pid, value) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx] };
      line.scores = { ...line.scores, [pid]: Number(value) };
      const restCount = getRestCount(playerCount);
      const activePlayersCount = playerCount - restCount;
      line.error = validateSum(line, activePlayersCount);
      next[idx] = line;
      return next;
    });
  };

  // ✅ 休み変更
  const handleRestChange = (idx, ridx, value) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx] };
      const newRestIds = [...(line.restIds || [])];
      newRestIds[ridx] = value === "" ? null : Number(value);
      line.restIds = newRestIds;
      const restCount = getRestCount(playerCount);
      const activePlayersCount = playerCount - restCount;
      line.error = validateSum(line, activePlayersCount);
      next[idx] = line;
      return next;
    });
  };

  // ✅ チップ変更
  const handleChipChange = (i, value) => {
    const next = [...chips];
    next[i] = Number(value);
    setChips(next);
    setChipError(validateChipSum(next, defaultChipCount, playerCount));
  };

  // ✅ 点棒精算
  const pointResult = useMemo(() => {
    const totals = Array(playerCount).fill(0);
    lines.forEach((line) => {
      const restIds = line.restIds || [];
      const active = players
        .map((_, i) => ({
          pid: i,
          score: restIds.includes(i) ? returnPoint : line.scores[i] ?? returnPoint,
          isRest: restIds.includes(i),
        }))
        .filter((p) => !p.isRest);
      if (active.length < 3) return;
      active.sort((a, b) => b.score - a.score);
      active.forEach((t, i) => {
        const diff = (t.score - returnPoint) / 1000;
        let umaValue = useUma ? [uma.first, uma.second, uma.third, uma.fourth][i] || 0 : 0;
        const okaValue = useOka && i === 0 ? oka / 1000 : 0;
        totals[t.pid] += diff + umaValue + okaValue;
      });
    });
    return totals.map((v) => Math.round(v * rate));
  }, [lines, players, returnPoint, rate, uma, oka, useUma, useOka, playerCount]);

  // ✅ チップ精算
  const chipResult = useMemo(() => {
    if (!useChip) return Array(playerCount).fill(0);
    return chips.map((c) => (c - defaultChipCount) * chipValue);
  }, [chips, chipValue, useChip, playerCount, defaultChipCount]);

  const finalResult = useMemo(
    () => pointResult.map((p, i) => p + chipResult[i]),
    [pointResult, chipResult]
  );

  // ✅ 半荘別順位
  const roundRankings = useMemo(() => {
    return lines.map((line, idx) => {
      const restIds = line.restIds || [];
      const scores = players.map((p, i) => ({
        pid: i,
        name: p,
        score: line.scores[i],
        isRest: restIds.includes(i),
      }));
      const active = scores.filter((s) => !s.isRest && s.score != null);
      if (active.length < 3) return null;
      const sorted = [...active].sort((a, b) => b.score - a.score);
      const results = sorted.map((t, i) => {
        const diff = (t.score - returnPoint) / 1000;
        let umaValue = useUma ? [uma.first, uma.second, uma.third, uma.fourth][i] || 0 : 0;
        const okaValue = useOka && i === 0 ? oka / 1000 : 0;
        const yen = Math.round((diff + umaValue + okaValue) * rate);
        return { ...t, yen };
      });
      return { idx, rests: scores.filter((s) => s.isRest).map((s) => s.name), ranking: results };
    });
  }, [lines, players, returnPoint, rate, uma, oka, useUma, useOka]);

  // ====================== UI ======================
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 10 }}>
      <h2 style={{ textAlign: "center" }}>三麻・四人三麻・多人数対応 清算アプリ📱</h2>

      {/* 🎛 基本設定 */}
      <div style={{ background: "#f9f9f9", padding: 12, borderRadius: 10, marginBottom: 15 }}>
        <h3>基本設定 ⚙️</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>人数：
            <input type="number" min="3" max="8" value={playerCount}
              onChange={(e) => handlePlayerCountChange(e.target.value)} />
          </label>
          <label>半荘数：
            <input type="number" min="1" value={hanchanCount}
              onChange={(e) => handleHanchanChange(e.target.value)} />
          </label>
          <label>返し（点）：
            <input type="number" value={returnPoint}
              onChange={(e) => setReturnPoint(Number(e.target.value))} />
          </label>
          <label>レート（円/千点）：
            <input type="number" value={rate}
              onChange={(e) => setRate(Number(e.target.value))} />
          </label>
        </div>

        {/* 🎛 詳細設定 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ width: "100%", marginTop: 10 }}
        >
          {showAdvanced ? "▲ 詳細設定を隠す" : "▼ 詳細設定（ウマ・オカ・チップ）を開く"}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 10, background: "#fff", padding: 10, borderRadius: 8 }}>
            <label><input type="checkbox" checked={useUma} onChange={(e) => setUseUma(e.target.checked)} /> ウマ</label><br />
            <label><input type="checkbox" checked={useOka} onChange={(e) => setUseOka(e.target.checked)} /> オカ</label><br />
            <label><input type="checkbox" checked={useChip} onChange={(e) => setUseChip(e.target.checked)} /> チップ</label>

            {/* ウマ設定 */}
            {useUma && (
              <div style={{ marginTop: 8 }}>
                <b>ウマ設定：</b>
                {["first", "second", "third", "fourth"].map((key, i) => (
                  <div key={key}>
                    {i + 1}位：
                    <input
                      type="number"
                      value={uma[key]}
                      onChange={(e) => setUma({ ...uma, [key]: Number(e.target.value) })}
                      style={{ width: 60 }}
                    />
                    <span style={{ color: "#666" }}>
                      ＝ {uma[key] * 1000}点（{(uma[key] * rate).toLocaleString()}円）
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* オカ設定 */}
            {useOka && (
              <div style={{ marginTop: 8 }}>
                <b>オカ設定：</b>
                <input
                  type="number"
                  value={oka}
                  onChange={(e) => setOka(Number(e.target.value))}
                  style={{ width: 80 }}
                /> 点（トップに加算）
              </div>
            )}

            {/* チップ設定 */}
            {useChip && (
              <div style={{ marginTop: 8 }}>
                <b>チップ設定：</b><br />
                標準枚数：
                <input
                  type="number"
                  value={defaultChipCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDefaultChipCount(val);
                    const next = Array(playerCount).fill(val);
                    setChips(next);
                    setChipError(validateChipSum(next, val, playerCount));
                  }}
                  style={{ width: 60 }}
                /> 枚　
                単価：
                <input
                  type="number"
                  value={chipValue}
                  onChange={(e) => setChipValue(Number(e.target.value))}
                  style={{ width: 80 }}
                /> 円／枚
                <p style={{ fontSize: 12, color: "#666" }}>
                  ※全員{defaultChipCount}枚スタート。終了時との差で精算。
                </p>
                {players.map((p, i) => (
                  <div key={i}>
                    {p}：
                    <input
                      type="number"
                      value={chips[i]}
                      onChange={(e) => handleChipChange(i, e.target.value)}
                      style={{ width: 60 }}
                    /> 枚
                  </div>
                ))}
                {chipError && <p style={{ color: "red" }}>{chipError}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🀄 半荘入力 */}
      <h3>半荘入力 🀄</h3>
      {lines.map((line, idx) => {
        const restCount = getRestCount(playerCount);
        return (
          <div key={idx} style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            background: "#fff"
          }}>
            <b>{idx + 1}半荘</b><br />
            {restCount > 0 && (
              <div style={{ marginBottom: 6 }}>
                {Array.from({ length: restCount }).map((_, ridx) => (
                  <label key={ridx} style={{ marginRight: 6 }}>
                    休み{ridx + 1}：
                    <select
                      value={line.restIds?.[ridx] ?? ""}
                      onChange={(e) => handleRestChange(idx, ridx, e.target.value)}
                    >
                      <option value="">選択</option>
                      {players.map((p, i) => (
                        <option key={i} value={i}>{p}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {players.map((p, i) =>
                !(line.restIds || []).includes(i) ? (
                  <div key={i}>
                    {p}：
                    <input
                      type="number"
                      placeholder="例: 35000"
                      value={line.scores[i] ?? ""}
                      onChange={(e) => handleScoreChange(idx, i, e.target.value)}
                      style={{ width: 80 }}
                    />
                  </div>
                ) : null
              )}
            </div>
            {line.error && <p style={{ color: "red", fontSize: 12 }}>{line.error}</p>}
          </div>
        );
      })}

      {/* 🔁 半荘別順位（個別折りたたみ） */}
      <h3>半荘別順位一覧 🔁</h3>
      {roundRankings.map((r, i) =>
  r ? (
    <>
      <div
        key={i}
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fafafa",
          marginBottom: 8,
        }}
      >
        <button
          onClick={() =>
            setOpenRounds((prev) => ({ ...prev, [i]: !prev[i] }))
          }
          style={{
            width: "100%",
            padding: "8px",
            background: openRounds[i] ? "#ddd" : "#f0f0f0",
            color: "#333",
            border: "1px solid #bbb",
            borderRadius: "8px 8px 0 0",
            fontSize: "15px",
            textAlign: "left",
          }}
        >
          {openRounds[i]
            ? `▲ 第${r.idx + 1}半荘を閉じる`
            : `▼ 第${r.idx + 1}半荘を見る`}
        </button>
        {openRounds[i] && (
          <div style={{ padding: 8 }}>
            {r.rests.length > 0 && (
              <p style={{ fontSize: 13, color: "#555" }}>
                休み：{r.rests.join("・")}
              </p>
            )}
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {r.ranking.map((p, j) => (
                <li key={j}>
                  {p.name}（{p.score.toLocaleString()}点 →{" "}
                  <span
                    style={{
                      color: p.yen >= 0 ? "green" : "red",
                    }}
                  >
                    {p.yen >= 0 ? "+" : ""}
                    {p.yen.toLocaleString()}円
                  </span>
                  ）
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </>
  ) : null
)}


      {/* 💴 最終結果 */}
      <h3>最終結果 💴</h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "center",
          fontSize: 14,
        }}
      >
        <thead style={{ background: "#f2f2f2" }}>
          <tr>
            <th>名前</th>
            <th>点棒</th>
            <th>チップ</th>
            <th>合計</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i}>
              <td>{p}</td>
              <td>{pointResult[i].toLocaleString()}円</td>
              <td>{chipResult[i].toLocaleString()}円</td>
              <td>
                <b
                  style={{
                    color: finalResult[i] >= 0 ? "green" : "red",
                  }}
                >
                  {finalResult[i] >= 0 ? "+" : ""}
                  {finalResult[i].toLocaleString()}円
                </b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
        ※ 各金額は「(得点−返し＋ウマ＋オカ)×レート＋チップ」で自動算出されています。
      </p>
    </div>
  );
}
