import * as xlsx from 'xlsx';

export interface MatchReportData {
  matchInfo: Record<string, string>;
  team1Players: any[];
  team2Players: any[];
}

// Chuyển "Player Name" → "playerName"
function toCamelCase(str: string): string {
  return str
    .trim()
    .split(/[\s_]+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      return idx === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

// Parse dạng "1;12" thành [1, 12]
function parseMinuteList(val: any): number[] | null {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const result = trimmed
      .split(';')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
    return result.length > 0 ? result : null;
  }

  if (typeof val === 'number') {
    return [val];
  }

  return null;
}

// Parse 1 row của 1 đội
function processPlayerRow(rowData: any[], headers: string[]): Record<string, any> {
  const player: Record<string, any> = {};

  headers.forEach((h, idx) => {
    let val = rowData[idx] ?? null;

    if (['goalsAt', 'ownGoalsAt', 'yellowCardsAt'].includes(h)) {
      val = parseMinuteList(val);
    }

    if (h === 'redCardAt') {
      if (typeof val === 'number') {
        player.redCard = true;
        player.redCardMinute = val;
      } else if (typeof val === 'string' && val.trim() !== '') {
        const minute = parseInt(val.trim(), 10);
        if (!isNaN(minute)) {
          player.redCard = true;
          player.redCardMinute = minute;
        }
      } else {
        player.redCard = false;
        player.redCardMinute = null;
      }
      return;
    }

    player[h] = val;
  });

  // Tính các số liệu
  player.goals = player.goalsAt?.length || 0;
  player.ownGoals = player.ownGoalsAt?.length || 0;
  player.yellowCards = player.yellowCardsAt?.length || 0;

  return player;
}

export function parseMatchReportExcel(buffer: Buffer): MatchReportData {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const matchInfoRaw: Record<string, string> = {};
  const team1Players: any[] = [];
  const team2Players: any[] = [];

  let headerRowIndex = -1;
  let sepCol = -1;
  let team1Headers: string[] = [];
  let team2Headers: string[] = [];

  // 1) Lấy match info & headers
  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row || row.length === 0) continue;

    const countPlayerName = row.filter(cell => cell?.toString().trim() === 'Player Name').length;
    if (countPlayerName >= 2) {
      headerRowIndex = i;
      sepCol = row.findIndex((cell, idx) =>
        idx > 0 && idx < row.length - 1 && (!cell || cell.toString().trim() === '')
      );
      team1Headers = row.slice(0, sepCol).map(c => toCamelCase(c.toString().trim()));
      team2Headers = row.slice(sepCol + 1).map(c => toCamelCase(c.toString().trim()));
      break;
    }

    if (row[0] && row[1]) {
      const k = row[0].toString().trim();
      const v = row[1].toString().trim();
      if (k && v) matchInfoRaw[k] = v;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Không tìm thấy header Team Players trong sheet.');
  }

  // 2) Đọc player data
  for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row || row.length === 0) continue;
    if (row.every(cell => !cell?.toString().trim())) continue;

    const left = row.slice(0, sepCol);
    const right = row.slice(sepCol + 1);

    const p1 = processPlayerRow(left, team1Headers);
    const p2 = processPlayerRow(right, team2Headers);

    const has1 = Object.values(p1).some(v => v !== null && v !== '');
    const has2 = Object.values(p2).some(v => v !== null && v !== '');
    if (has1) team1Players.push(p1);
    if (has2) team2Players.push(p2);
  }

  // 3) Chuyển matchInfo key → camelCase
  const matchInfo: Record<string, string> = {};
  for (const [rawKey, val] of Object.entries(matchInfoRaw)) {
    matchInfo[toCamelCase(rawKey)] = val;
  }

  return { matchInfo, team1Players, team2Players };
}
