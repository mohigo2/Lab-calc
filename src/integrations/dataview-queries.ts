/**
 * DataViewクエリ用のヘルパー関数とテンプレート
 */

export class DataViewQueries {
	/**
	 * 全てのBuffer Calc計算を表示するクエリ
	 */
	static getAllCalculationsQuery(): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  totalVolume + " " + volumeUnit as "体積",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
SORT calc.modifiedDate DESC
\`\`\`
`;
	}

	/**
	 * 特定の試薬を使用している計算を表示するクエリ
	 */
	static getReagentUsageQuery(reagentName: string): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  file as "ファイル",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE contains(string(calc), "${reagentName}")
SORT calc.modifiedDate DESC
\`\`\`
`;
	}

	/**
	 * バッファー計算のみを表示するクエリ
	 */
	static getBufferCalculationsQuery(): string {
		return `
\`\`\`dataview
TABLE
  name as "バッファー名",
  totalVolume + " " + volumeUnit as "総体積",
  length(components) as "成分数",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE calc.type = "buffer"
SORT calc.totalVolume DESC
\`\`\`
`;
	}

	/**
	 * ストック溶液計算のみを表示するクエリ
	 */
	static getStockCalculationsQuery(): string {
		return `
\`\`\`dataview
TABLE
  name as "溶液名",
  reagentName as "試薬名",
  targetConcentration + " " + concentrationUnit as "濃度",
  totalVolume + " " + volumeUnit as "体積"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE calc.type = "stock"
SORT calc.targetConcentration DESC
\`\`\`
`;
	}

	/**
	 * 希釈計算のみを表示するクエリ
	 */
	static getDilutionCalculationsQuery(): string {
		return `
\`\`\`dataview
TABLE
  name as "希釈名",
  stockConcentration + " → " + finalConcentration + " " + concentrationUnit as "濃度変化",
  finalVolume + " " + volumeUnit as "最終体積",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE calc.type = "dilution"
SORT calc.finalVolume DESC
\`\`\`
`;
	}

	/**
	 * 最近の計算を表示するクエリ
	 */
	static getRecentCalculationsQuery(days: number = 7): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  file as "ファイル",
  date(modifiedDate) as "更新日"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE calc.modifiedDate >= date(today) - dur(${days} days)
SORT calc.modifiedDate DESC
LIMIT 20
\`\`\`
`;
	}

	/**
	 * 濃度範囲で検索するクエリ
	 */
	static getConcentrationRangeQuery(minConc: number, maxConc: number, unit: string): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  targetConcentration + " " + concentrationUnit as "濃度",
  file as "ファイル"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE (calc.targetConcentration >= ${minConc} AND calc.targetConcentration <= ${maxConc} AND calc.concentrationUnit = "${unit}") OR
      (calc.finalConcentration >= ${minConc} AND calc.finalConcentration <= ${maxConc} AND calc.concentrationUnit = "${unit}")
SORT calc.targetConcentration DESC
\`\`\`
`;
	}

	/**
	 * 体積範囲で検索するクエリ
	 */
	static getVolumeRangeQuery(minVol: number, maxVol: number, unit: string): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  totalVolume + " " + volumeUnit as "体積",
  file as "ファイル"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
WHERE calc.totalVolume >= ${minVol} AND calc.totalVolume <= ${maxVol} AND calc.volumeUnit = "${unit}"
SORT calc.totalVolume DESC
\`\`\`
`;
	}

	/**
	 * 統計情報を表示するクエリ
	 */
	static getStatisticsQuery(): string {
		return `
\`\`\`dataview
TABLE WITHOUT ID
  "計算タイプ" as type,
  length(rows) as count
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
GROUP BY calc.type
SORT count DESC
\`\`\`

### 最も使用される試薬
\`\`\`dataview
TABLE WITHOUT ID
  reagent as "試薬名",
  length(rows) as "使用回数"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
FLATTEN calc.components as comp
GROUP BY comp.name as reagent
SORT length(rows) DESC
LIMIT 10
\`\`\`

### 月別計算数
\`\`\`dataview
TABLE WITHOUT ID
  dateformat(date(calc.modifiedDate), "yyyy-MM") as "月",
  length(rows) as "計算数"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
GROUP BY dateformat(date(calc.modifiedDate), "yyyy-MM")
SORT key DESC
LIMIT 12
\`\`\`
`;
	}

	/**
	 * 特定のタグを持つ計算を表示するクエリ
	 */
	static getTaggedCalculationsQuery(tag: string): string {
		return `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",
  file as "ファイル",
  join(tags, ", ") as "タグ"
FROM #${tag}
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
SORT calc.modifiedDate DESC
\`\`\`
`;
	}

	/**
	 * カスタム検索クエリを生成
	 */
	static generateCustomQuery(options: {
		calculationType?: 'buffer' | 'stock' | 'dilution';
		reagentName?: string;
		minVolume?: number;
		maxVolume?: number;
		volumeUnit?: string;
		minConcentration?: number;
		maxConcentration?: number;
		concentrationUnit?: string;
		tag?: string;
		dateFrom?: string;
		dateTo?: string;
		sortBy?: 'name' | 'date' | 'volume' | 'concentration';
		sortOrder?: 'asc' | 'desc';
		limit?: number;
	}): string {
		let query = `
\`\`\`dataview
TABLE
  name as "計算名",
  type as "種類",`;

		if (options.calculationType === 'buffer' || !options.calculationType) {
			query += `\n  totalVolume + " " + volumeUnit as "体積",`;
		}
		
		if (options.calculationType === 'stock' || !options.calculationType) {
			query += `\n  targetConcentration + " " + concentrationUnit as "濃度",`;
		}
		
		if (options.calculationType === 'dilution' || !options.calculationType) {
			query += `\n  finalConcentration + " " + concentrationUnit as "最終濃度",`;
		}

		query += `\n  file as "ファイル",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc`;

		// フィルター条件を追加
		const conditions: string[] = [];

		if (options.calculationType) {
			conditions.push(`calc.type = "${options.calculationType}"`);
		}

		if (options.reagentName) {
			conditions.push(`contains(string(calc), "${options.reagentName}")`);
		}

		if (options.minVolume !== undefined || options.maxVolume !== undefined) {
			const minVol = options.minVolume ?? 0;
			const maxVol = options.maxVolume ?? 999999;
			conditions.push(`calc.totalVolume >= ${minVol} AND calc.totalVolume <= ${maxVol}`);
		}

		if (options.minConcentration !== undefined || options.maxConcentration !== undefined) {
			const minConc = options.minConcentration ?? 0;
			const maxConc = options.maxConcentration ?? 999999;
			conditions.push(
				`((calc.targetConcentration >= ${minConc} AND calc.targetConcentration <= ${maxConc}) OR ` +
				`(calc.finalConcentration >= ${minConc} AND calc.finalConcentration <= ${maxConc}))`
			);
		}

		if (options.tag) {
			conditions.push(`contains(calc.tags, "${options.tag}")`);
		}

		if (options.dateFrom) {
			conditions.push(`calc.modifiedDate >= date("${options.dateFrom}")`);
		}

		if (options.dateTo) {
			conditions.push(`calc.modifiedDate <= date("${options.dateTo}")`);
		}

		if (conditions.length > 0) {
			query += `\nWHERE ` + conditions.join(' AND ');
		}

		// ソート条件を追加
		if (options.sortBy) {
			const sortField = {
				name: 'calc.name',
				date: 'calc.modifiedDate',
				volume: 'calc.totalVolume',
				concentration: 'calc.targetConcentration'
			}[options.sortBy];

			const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
			query += `\nSORT ${sortField} ${sortDirection}`;
		} else {
			query += `\nSORT calc.modifiedDate DESC`;
		}

		if (options.limit) {
			query += `\nLIMIT ${options.limit}`;
		}

		query += `\n\`\`\``;

		return query;
	}

	/**
	 * よく使用されるクエリのテンプレート集
	 */
	static getQueryTemplates(): { [key: string]: string } {
		return {
			'all-calculations': this.getAllCalculationsQuery(),
			'buffer-only': this.getBufferCalculationsQuery(),
			'stock-only': this.getStockCalculationsQuery(),
			'dilution-only': this.getDilutionCalculationsQuery(),
			'recent-7days': this.getRecentCalculationsQuery(7),
			'recent-30days': this.getRecentCalculationsQuery(30),
			'statistics': this.getStatisticsQuery()
		};
	}
}