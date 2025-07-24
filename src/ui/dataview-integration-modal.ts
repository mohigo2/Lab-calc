import { App, Modal, Setting, Notice, TextComponent, DropdownComponent, ButtonComponent } from 'obsidian';
import { DataViewIntegration } from '../integrations/dataview-integration';
import { DataViewQueries } from '../integrations/dataview-queries';
import { BufferCalcSettings } from '../types';

export class DataViewIntegrationModal extends Modal {
	private settings: BufferCalcSettings;
	private dataViewIntegration: DataViewIntegration;
	private onCloseCallback: () => void;

	// フォームの状態
	private calculationType: 'all' | 'buffer' | 'stock' | 'dilution' = 'all';
	private reagentName = '';
	private minVolume = '';
	private maxVolume = '';
	private volumeUnit = 'mL';
	private minConcentration = '';
	private maxConcentration = '';
	private concentrationUnit = 'mM';
	private tag = '';
	private dateFrom = '';
	private dateTo = '';
	private sortBy: 'name' | 'date' | 'volume' | 'concentration' = 'date';
	private sortOrder: 'asc' | 'desc' = 'desc';
	private limitResults = '50';

	constructor(
		app: App,
		settings: BufferCalcSettings,
		onClose: () => void
	) {
		super(app);
		this.settings = settings;
		this.dataViewIntegration = new DataViewIntegration(app);
		this.onCloseCallback = onClose;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('dataview-integration-modal');

		// タイトル
		contentEl.createEl('h2', { text: 'DataView統合' });

		// DataViewプラグインの状態確認
		this.renderDataViewStatus(contentEl);

		// クイッククエリセクション
		this.renderQuickQueries(contentEl);

		// カスタムクエリ生成セクション
		this.renderCustomQueryBuilder(contentEl);

		// 統計情報セクション
		this.renderStatistics(contentEl);

		// アクションボタン
		this.renderActionButtons(contentEl);
	}

	private renderDataViewStatus(container: HTMLElement) {
		const statusSection = container.createDiv('dataview-status-section');
		statusSection.createEl('h3', { text: 'DataViewプラグイン状態' });

		const isAvailable = this.dataViewIntegration.isDataViewAvailable();
		
		const statusEl = statusSection.createDiv('status-indicator');
		statusEl.addClass(isAvailable ? 'status-success' : 'status-warning');
		
		if (isAvailable) {
			statusEl.createSpan('status-icon').setText('✅');
			statusEl.createSpan('status-text').setText('DataViewプラグインが利用可能です');
		} else {
			statusEl.createSpan('status-icon').setText('⚠️');
			statusEl.createSpan('status-text').setText('DataViewプラグインが見つかりません');
			
			const helpText = statusSection.createDiv('status-help');
			helpText.setText('DataViewプラグインをコミュニティプラグインからインストールして有効化してください。');
		}

		// Buffer Calcデータの統計
		this.dataViewIntegration.getAllBufferCalcData().then(allData => {
			const statsEl = statusSection.createDiv('data-stats');
			statsEl.createEl('p', { text: `検出されたBuffer Calc計算: ${allData.length} 件` });
		}).catch(() => {
			const errorEl = statusSection.createDiv('data-stats-error');
			errorEl.setText('データの読み込みに失敗しました');
		});
	}

	private renderQuickQueries(container: HTMLElement) {
		const quickSection = container.createDiv('quick-queries-section');
		quickSection.createEl('h3', { text: 'クイッククエリ' });

		const templates = DataViewQueries.getQueryTemplates();
		const queryGrid = quickSection.createDiv('query-grid');

		const queryButtons = [
			{ key: 'all-calculations', label: '全ての計算', desc: '全てのBuffer Calc計算を表示' },
			{ key: 'buffer-only', label: 'バッファー計算', desc: 'バッファー計算のみ表示' },
			{ key: 'stock-only', label: 'ストック溶液', desc: 'ストック溶液計算のみ表示' },
			{ key: 'dilution-only', label: '希釈計算', desc: '希釈計算のみ表示' },
			{ key: 'recent-7days', label: '最近7日', desc: '過去7日間の計算を表示' },
			{ key: 'statistics', label: '統計情報', desc: '計算の統計情報を表示' }
		];

		queryButtons.forEach(btn => {
			const queryCard = queryGrid.createDiv('query-card');
			queryCard.createEl('h4', { text: btn.label });
			queryCard.createEl('p', { text: btn.desc });
			
			const insertBtn = queryCard.createEl('button', { 
				text: 'クエリを挿入',
				cls: 'query-insert-button'
			});
			
			insertBtn.onclick = () => {
				this.insertQueryIntoEditor(templates[btn.key]);
				new Notice(`${btn.label}クエリを挿入しました`);
			};
		});
	}

	private renderCustomQueryBuilder(container: HTMLElement) {
		const customSection = container.createDiv('custom-query-section');
		customSection.createEl('h3', { text: 'カスタムクエリビルダー' });

		// 計算タイプ選択
		new Setting(customSection)
			.setName('計算タイプ')
			.setDesc('表示する計算の種類を選択')
			.addDropdown(dropdown => {
				dropdown.addOption('all', '全て');
				dropdown.addOption('buffer', 'バッファー計算');
				dropdown.addOption('stock', 'ストック溶液');
				dropdown.addOption('dilution', '希釈計算');
				dropdown.setValue(this.calculationType);
				dropdown.onChange(value => this.calculationType = value as any);
			});

		// 試薬名検索
		new Setting(customSection)
			.setName('試薬名')
			.setDesc('特定の試薬を含む計算を検索（部分一致）')
			.addText(text => {
				text.setValue(this.reagentName);
				text.onChange(value => this.reagentName = value);
				text.inputEl.placeholder = '例: Tris, NaCl';
			});

		// 体積範囲
		const volumeContainer = customSection.createDiv('range-container');
		volumeContainer.createEl('label', { text: '体積範囲' });
		
		const volumeInputs = volumeContainer.createDiv('range-inputs');
		const minVolInput = volumeInputs.createEl('input', { type: 'number', placeholder: '最小' }) as HTMLInputElement;
		minVolInput.value = this.minVolume;
		minVolInput.oninput = () => this.minVolume = minVolInput.value;

		volumeInputs.createSpan().setText(' ～ ');

		const maxVolInput = volumeInputs.createEl('input', { type: 'number', placeholder: '最大' }) as HTMLInputElement;
		maxVolInput.value = this.maxVolume;
		maxVolInput.oninput = () => this.maxVolume = maxVolInput.value;

		const volUnitSelect = volumeInputs.createEl('select') as HTMLSelectElement;
		['mL', 'L', 'µL'].forEach(unit => {
			const option = volUnitSelect.createEl('option', { value: unit, text: unit });
			if (unit === this.volumeUnit) option.selected = true;
		});
		volUnitSelect.onchange = () => this.volumeUnit = volUnitSelect.value;

		// 濃度範囲
		const concContainer = customSection.createDiv('range-container');
		concContainer.createEl('label', { text: '濃度範囲' });
		
		const concInputs = concContainer.createDiv('range-inputs');
		const minConcInput = concInputs.createEl('input', { type: 'number', placeholder: '最小' }) as HTMLInputElement;
		minConcInput.value = this.minConcentration;
		minConcInput.oninput = () => this.minConcentration = minConcInput.value;

		concInputs.createSpan().setText(' ～ ');

		const maxConcInput = concInputs.createEl('input', { type: 'number', placeholder: '最大' }) as HTMLInputElement;
		maxConcInput.value = this.maxConcentration;
		maxConcInput.oninput = () => this.maxConcentration = maxConcInput.value;

		const concUnitSelect = concInputs.createEl('select') as HTMLSelectElement;
		['mM', 'M', 'µM', 'mg/mL'].forEach(unit => {
			const option = concUnitSelect.createEl('option', { value: unit, text: unit });
			if (unit === this.concentrationUnit) option.selected = true;
		});
		concUnitSelect.onchange = () => this.concentrationUnit = concUnitSelect.value;

		// ソート設定
		new Setting(customSection)
			.setName('ソート')
			.setDesc('結果の並び順を設定')
			.addDropdown(dropdown => {
				dropdown.addOption('date', '更新日');
				dropdown.addOption('name', '名前');
				dropdown.addOption('volume', '体積');
				dropdown.addOption('concentration', '濃度');
				dropdown.setValue(this.sortBy);
				dropdown.onChange(value => this.sortBy = value as any);
			})
			.addDropdown(dropdown => {
				dropdown.addOption('desc', '降順');
				dropdown.addOption('asc', '昇順');
				dropdown.setValue(this.sortOrder);
				dropdown.onChange(value => this.sortOrder = value as any);
			});

		// 結果数制限
		new Setting(customSection)
			.setName('結果数制限')
			.setDesc('表示する結果の最大数')
			.addText(text => {
				text.setValue(this.limitResults);
				text.onChange(value => this.limitResults = value);
				text.inputEl.type = 'number';
				text.inputEl.placeholder = '50';
			});

		// クエリ生成ボタン
		const generateBtn = customSection.createEl('button', {
			text: 'カスタムクエリを生成',
			cls: 'mod-cta'
		});

		generateBtn.onclick = () => {
			const options = {
				calculationType: this.calculationType === 'all' ? undefined : this.calculationType,
				reagentName: this.reagentName || undefined,
				minVolume: this.minVolume ? parseFloat(this.minVolume) : undefined,
				maxVolume: this.maxVolume ? parseFloat(this.maxVolume) : undefined,
				volumeUnit: this.volumeUnit,
				minConcentration: this.minConcentration ? parseFloat(this.minConcentration) : undefined,
				maxConcentration: this.maxConcentration ? parseFloat(this.maxConcentration) : undefined,
				concentrationUnit: this.concentrationUnit,
				sortBy: this.sortBy,
				sortOrder: this.sortOrder,
				limit: this.limitResults ? parseInt(this.limitResults) : undefined
			};

			const query = DataViewQueries.generateCustomQuery(options);
			this.insertQueryIntoEditor(query);
			new Notice('カスタムクエリを挿入しました');
		};
	}

	private renderStatistics(container: HTMLElement) {
		const statsSection = container.createDiv('statistics-section');
		statsSection.createEl('h3', { text: 'データ統計' });

		this.dataViewIntegration.generateStatistics().then(stats => {
			const statsGrid = statsSection.createDiv('stats-grid');
			
			// 基本統計
			const basicStats = statsGrid.createDiv('stat-group');
			basicStats.createEl('h4', { text: '基本統計' });
			basicStats.createEl('p', { text: `総計算数: ${stats.totalCalculations}` });
			basicStats.createEl('p', { text: `バッファー: ${stats.bufferCount}` });
			basicStats.createEl('p', { text: `ストック: ${stats.stockCount}` });
			basicStats.createEl('p', { text: `希釈: ${stats.dilutionCount}` });
			basicStats.createEl('p', { text: `平均体積: ${stats.averageVolume.toFixed(1)} mL` });

			// よく使用される試薬
			if (stats.mostUsedReagents.length > 0) {
				const reagentStats = statsGrid.createDiv('stat-group');
				reagentStats.createEl('h4', { text: 'よく使用される試薬' });
				stats.mostUsedReagents.slice(0, 5).forEach(reagent => {
					reagentStats.createEl('p', { text: `${reagent.name}: ${reagent.count}回` });
				});
			}
		}).catch(error => {
			statsSection.createEl('p', { 
				text: 'データの読み込み中にエラーが発生しました',
				cls: 'error-message'
			});
			console.error('Statistics error:', error);
		});
	}

	private renderActionButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		const refreshBtn = buttonContainer.createEl('button', {
			text: 'データを更新',
			cls: 'mod-cta'
		});

		refreshBtn.onclick = () => {
			this.onOpen(); // モーダルを再描画
			new Notice('データを更新しました');
		};

		const closeBtn = buttonContainer.createEl('button', {
			text: '閉じる'
		});

		closeBtn.onclick = () => {
			this.close();
		};
	}

	private insertQueryIntoEditor(query: string) {
		const { MarkdownView } = require('obsidian');
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('アクティブなMarkdownエディターが見つかりません');
			return;
		}

		const editor = (activeView as any).editor;
		const cursor = editor.getCursor();
		
		// 現在の行が空でない場合、新しい行を追加
		const currentLine = editor.getLine(cursor.line);
		const insertText = currentLine.trim() ? '\n\n' + query : query;
		
		editor.replaceRange(insertText, cursor);
		
		// カーソルをクエリの後に移動
		const lines = insertText.split('\n');
		editor.setCursor({
			line: cursor.line + lines.length - 1,
			ch: lines[lines.length - 1].length
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.onCloseCallback();
	}
}