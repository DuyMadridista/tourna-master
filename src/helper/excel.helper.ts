import * as xlsx from 'xlsx';

export interface MatchReportData {
  matchInfo: Record<string, string>;
  team1Players: any[];
  team2Players: any[];
}

export function parseMatchReportExcel(buffer: Buffer): MatchReportData {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const matchInfo: Record<string, string> = {};
  const team1Players = [];
  const team2Players = [];

  let section = 'info';
  const playerHeaders = ["Number", "Player", "Starter", "Substitute In", "Goals", "Own Goals", "Yellow Cards", "Red Card"];

  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i] as any[];

    if (!row || row.length === 0) continue;

    const firstCell = row[0]?.toString().trim();

    if (firstCell === 'Team 1 Players') {
      section = 'team1';
      continue;
    }

    if (firstCell === 'Team 2 Players') {
      section = 'team2';
      continue;
    }

    if (section === 'info' && row[0] && row[1]) {
      matchInfo[row[0]] = row[1];
    }

    if ((section === 'team1' || section === 'team2') && row[0] && row.length === playerHeaders.length && row[0] !== 'Number') {
      const player = {} as Record<string, any>;
      playerHeaders.forEach((key, idx) => {
        player[key] = row[idx];
      });

      if (section === 'team1') team1Players.push(player);
      else team2Players.push(player);
    }
  }

  return {
    matchInfo,
    team1Players,
    team2Players,
  };
}
