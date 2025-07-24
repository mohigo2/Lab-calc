import { Modal, App, Setting, Notice } from 'obsidian';
import {
	CalculationHistoryEntry,
	HistoryFilter,
	HistoryStats,
	BufferCalcSettings
} from '../types';
import { HistoryManager } from '../utils/history-manager';

export class CalculationHistoryModal extends Modal {
	private settings: BufferCalcSettings;
	private onSettingsUpdate: (newSettings: BufferCalcSettings) => void;
	private onInsertCalculation: (yaml: string) => void;
	private currentFilter: HistoryFilter = { type: 'all' };
	private filteredHistory: CalculationHistoryEntry[] = [];

	constructor(
		app: App,
		settings: BufferCalcSettings,
		onSettingsUpdate: (newSettings: BufferCalcSettings) => void,
		onInsertCalculation: (yaml: string) => void
	) {
		super(app);
		this.settings = settings;
		this.onSettingsUpdate = onSettingsUpdate;
		this.onInsertCalculation = onInsertCalculation;
		this.filteredHistory = [...settings.calculationHistory];
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('calculation-history-modal');

		this.setTitle('計算履歴');

		if (!this.settings.enableHistory) {
			this.showHistoryDisabled();
			return;
		}

		if (this.settings.calculationHistory.length === 0) {
			this.showEmptyHistory();
			return;
		}

		this.createStatsSection();
		this.createFilterSection();
		this.createHistoryList();
		this.createActionButtons();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private showHistoryDisabled(): void {
		const { contentEl } = this;
		
		const disabledSection = contentEl.createEl('div', { cls: 'history-disabled-section' });
		disabledSection.createEl('h3', { text: '計算履歴が無効になっています' });
		disabledSection.createEl('p', { 
			text: '計算履歴機能を使用するには、プラグイン設定で有効にしてください。',
			cls: 'setting-item-description'
		});

		const enableButton = disabledSection.createEl('button', {
			text: '履歴を有効にする',
			cls: 'mod-cta'
		});

		enableButton.addEventListener('click', () => {
			const newSettings = { ...this.settings, enableHistory: true };
			this.onSettingsUpdate(newSettings);
			this.close();
			new Notice('計算履歴が有効になりました');
		});
	}

	private showEmptyHistory(): void {
		const { contentEl } = this;
		
		const emptySection = contentEl.createEl('div', { cls: 'history-empty-section' });
		emptySection.createEl('h3', { text: '計算履歴がまだありません' });
		emptySection.createEl('p', { 
			text: 'バッファー計算、ストック溶液、希釈計算を実行すると、ここに履歴が表示されます。',
			cls: 'setting-item-description'
		});
	}

	private createStatsSection(): void {
		const { contentEl } = this;

		const statsSection = contentEl.createEl('div', { cls: 'history-stats-section' });
		statsSection.createEl('h3', { text: '統計情報' });

		const stats = HistoryManager.generateHistoryStats(this.settings.calculationHistory);
		
		const statsGrid = statsSection.createEl('div', { cls: 'stats-grid' });
		
		this.createStatCard(statsGrid, '総計算数', stats.totalCalculations.toString(), 'history-stat-total');
		this.createStatCard(statsGrid, 'バッファー', stats.bufferCalculations.toString(), 'history-stat-buffer');
		this.createStatCard(statsGrid, 'ストック', stats.stockCalculations.toString(), 'history-stat-stock');
		this.createStatCard(statsGrid, '希釈', stats.dilutionCalculations.toString(), 'history-stat-dilution');

		if (stats.mostUsedReagents.length > 0) {
			const reagentsSection = statsSection.createEl('div', { cls: 'most-used-reagents' });
			reagentsSection.createEl('h4', { text: 'よく使用される試薬' });
			const reagentsList = reagentsSection.createEl('div', { cls: 'reagents-list' });
			
			stats.mostUsedReagents.slice(0, 5).forEach(reagent => {
				const reagentItem = reagentsList.createEl('div', { cls: 'reagent-item' });
				reagentItem.createEl('span', { text: reagent.name, cls: 'reagent-name' });
				reagentItem.createEl('span', { text: `${reagent.count}回`, cls: 'reagent-count' });
			});
		}
	}

	private createStatCard(container: HTMLElement, label: string, value: string, className: string): void {
		const card = container.createEl('div', { cls: `stat-card ${className}` });
		card.createEl('div', { text: value, cls: 'stat-value' });
		card.createEl('div', { text: label, cls: 'stat-label' });
	}

	private createFilterSection(): void {
		const { contentEl } = this;

		const filterSection = contentEl.createEl('div', { cls: 'history-filter-section' });
		filterSection.createEl('h3', { text: 'フィルター' });

		const filtersContainer = filterSection.createEl('div', { cls: 'filters-container' });

		// タイプフィルター
		new Setting(filtersContainer)
			.setName('計算タイプ')
			.addDropdown(dropdown => {
				dropdown.addOption('all', 'すべて');
				dropdown.addOption('buffer', 'バッファー');
				dropdown.addOption('stock', 'ストック溶液');
				dropdown.addOption('dilution', '希釈計算');
				
				dropdown.setValue(this.currentFilter.type || 'all');
				dropdown.onChange(value => {
					this.currentFilter.type = value as any;
					this.applyFilters();
				});
			});

		// 検索フィルター
		new Setting(filtersContainer)
			.setName('検索')
			.addText(text => {
				text.setPlaceholder('名前、メモ、タグで検索...');
				text.setValue(this.currentFilter.searchQuery || '');
				text.onChange(value => {
					this.currentFilter.searchQuery = value || undefined;
					this.applyFilters();
				});
			});

		// スター付きフィルター
		new Setting(filtersContainer)
			.setName('スター付きのみ')
			.addToggle(toggle => {
				toggle.setValue(this.currentFilter.starred || false);
				toggle.onChange(value => {
					this.currentFilter.starred = value || undefined;
					this.applyFilters();
				});
			});

		// フィルタークリアボタン
		const clearButton = filtersContainer.createEl('button', {
			text: 'フィルターをクリア',
			cls: 'history-clear-filters-button'
		});
		clearButton.addEventListener('click', () => {
			this.currentFilter = { type: 'all' };
			this.applyFilters();
			this.createFilterSection(); // フィルターUIを再作成
		});
	}

	private createHistoryList(): void {
		const { contentEl } = this;

		let listContainer = contentEl.querySelector('.history-list-container') as HTMLElement;
		if (listContainer) {
			listContainer.remove();
		}

		listContainer = contentEl.createEl('div', { cls: 'history-list-container' });
		listContainer.createEl('h3', { text: `履歴 (${this.filteredHistory.length}件)` });

		if (this.filteredHistory.length === 0) {
			listContainer.createEl('div', {
				text: 'フィルター条件に一致する履歴がありません',
				cls: 'history-no-results'
			});
			return;
		}

		const historyList = listContainer.createEl('div', { cls: 'history-list' });

		this.filteredHistory.forEach(entry => {
			this.createHistoryItem(historyList, entry);
		});
	}

	private createHistoryItem(container: HTMLElement, entry: CalculationHistoryEntry): void {
		const item = container.createEl('div', { cls: 'history-item' });
		item.setAttribute('data-entry-id', entry.id);

		// ヘッダー
		const header = item.createEl('div', { cls: 'history-item-header' });
		
		const titleSection = header.createEl('div', { cls: 'history-item-title-section' });
		titleSection.createEl('h4', { text: entry.name, cls: 'history-item-title' });
		
		const badges = titleSection.createEl('div', { cls: 'history-item-badges' });
		badges.createEl('span', {
			text: entry.type,
			cls: `history-badge history-badge-${entry.type}`
		});
		
		if (entry.starred) {
			badges.createEl('span', { text: '⭐', cls: 'history-star' });
		}

		const actions = header.createEl('div', { cls: 'history-item-actions' });
		
		// スターボタン
		const starButton = actions.createEl('button', {
			text: entry.starred ? '⭐' : '☆',
			cls: 'history-action-button history-star-button'
		});
		starButton.addEventListener('click', () => {
			this.toggleStar(entry.id);
		});

		// 挿入ボタン
		const insertButton = actions.createEl('button', {
			text: '挿入',
			cls: 'history-action-button history-insert-button'
		});
		insertButton.addEventListener('click', () => {
			const yaml = HistoryManager.recreateCalculationFromHistory(entry);
			this.onInsertCalculation(yaml);
			this.close();
			new Notice('計算を挿入しました');
		});

		// 削除ボタン
		const deleteButton = actions.createEl('button', {
			text: '削除',
			cls: 'history-action-button history-delete-button'
		});
		deleteButton.addEventListener('click', () => {
			this.deleteEntry(entry.id);
		});

		// 詳細情報
		const details = item.createEl('div', { cls: 'history-item-details' });
		details.createEl('div', {
			text: `日時: ${entry.timestamp.toLocaleString('ja-JP')}`,
			cls: 'history-item-timestamp'
		});

		if (entry.notes) {
			details.createEl('div', {
				text: `メモ: ${entry.notes}`,
				cls: 'history-item-notes'
			});
		}

		if (entry.tags && entry.tags.length > 0) {
			const tagsContainer = details.createEl('div', { cls: 'history-item-tags' });
			tagsContainer.createEl('span', { text: 'タグ: ', cls: 'tags-label' });
			entry.tags.forEach((tag: string) => {
				tagsContainer.createEl('span', { text: tag, cls: 'history-tag' });
			});
		}

		// 結果サマリー
		const resultSummary = item.createEl('div', { cls: 'history-item-result' });
		if (entry.result.errors.length > 0) {
			resultSummary.createEl('div', {
				text: `エラー: ${entry.result.errors[0]}`,
				cls: 'history-result-error'
			});
		} else {
			resultSummary.createEl('div', {
				text: `成分数: ${entry.result.components.length}, 溶媒: ${entry.result.solventVolume || 0}`,
				cls: 'history-result-summary'
			});
		}
	}

	private createActionButtons(): void {
		const { contentEl } = this;

		const actionsSection = contentEl.createEl('div', { cls: 'history-actions-section' });
		
		const exportButton = actionsSection.createEl('button', {
			text: '履歴をエクスポート',
			cls: 'history-export-button'
		});
		exportButton.addEventListener('click', () => {
			this.showExportOptions();
		});

		const clearButton = actionsSection.createEl('button', {
			text: '履歴をクリア',
			cls: 'history-clear-button'
		});
		clearButton.addEventListener('click', () => {
			this.clearHistory();
		});
	}

	private applyFilters(): void {
		this.filteredHistory = HistoryManager.filterHistory(
			this.settings.calculationHistory,
			this.currentFilter
		);
		this.createHistoryList();
	}

	private toggleStar(entryId: string): void {
		const entry = this.settings.calculationHistory.find(e => e.id === entryId);
		if (!entry) return;

		const newSettings = HistoryManager.updateHistoryEntry(
			this.settings,
			entryId,
			{ starred: !entry.starred }
		);
		
		this.settings = newSettings;
		this.onSettingsUpdate(newSettings);
		this.applyFilters();
	}

	private deleteEntry(entryId: string): void {
		if (!confirm('この履歴エントリを削除しますか？')) {
			return;
		}

		const newSettings = HistoryManager.removeHistoryEntry(this.settings, entryId);
		this.settings = newSettings;
		this.onSettingsUpdate(newSettings);
		this.applyFilters();
		
		new Notice('履歴エントリを削除しました');
	}

	private showExportOptions(): void {
		const exportModal = new HistoryExportModal(
			this.app,
			this.filteredHistory.length > 0 ? this.filteredHistory : this.settings.calculationHistory
		);
		exportModal.open();
	}

	private clearHistory(): void {
		if (!confirm('すべての計算履歴を削除しますか？この操作は元に戻せません。')) {
			return;
		}

		const newSettings = HistoryManager.clearHistory(this.settings);
		this.settings = newSettings;
		this.onSettingsUpdate(newSettings);
		
		this.close();
		new Notice('計算履歴をクリアしました');
	}
}

class HistoryExportModal extends Modal {
	private history: CalculationHistoryEntry[];

	constructor(app: App, history: CalculationHistoryEntry[]) {
		super(app);
		this.history = history;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle('履歴をエクスポート');

		contentEl.createEl('p', {
			text: `${this.history.length}件の履歴エントリをエクスポートします。`,
			cls: 'setting-item-description'
		});

		const formatSection = contentEl.createEl('div', { cls: 'export-format-section' });
		formatSection.createEl('h4', { text: 'エクスポート形式' });

		const jsonButton = formatSection.createEl('button', {
			text: 'JSON形式でダウンロード',
			cls: 'export-format-button mod-cta'
		});
		jsonButton.addEventListener('click', () => {
			HistoryManager.downloadHistory(this.history, 'json');
			this.close();
		});

		const csvButton = formatSection.createEl('button', {
			text: 'CSV形式でダウンロード',
			cls: 'export-format-button'
		});
		csvButton.addEventListener('click', () => {
			HistoryManager.downloadHistory(this.history, 'csv');
			this.close();
		});

		const markdownButton = formatSection.createEl('button', {
			text: 'Markdown形式でダウンロード',
			cls: 'export-format-button'
		});
		markdownButton.addEventListener('click', () => {
			HistoryManager.downloadHistory(this.history, 'markdown');
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}