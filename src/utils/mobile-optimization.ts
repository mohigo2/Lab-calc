/**
 * モバイル・タブレット最適化ユーティリティ
 */

export interface ViewportInfo {
	width: number;
	height: number;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isLandscape: boolean;
	isPortrait: boolean;
	isTouchDevice: boolean;
	hasHover: boolean;
}

export class MobileOptimization {
	private static instance: MobileOptimization;
	private viewportInfo: ViewportInfo;
	private listeners: (() => void)[] = [];

	private constructor() {
		this.viewportInfo = this.getViewportInfo();
		this.setupViewportListener();
		this.setupTouchOptimizations();
	}

	static getInstance(): MobileOptimization {
		if (!MobileOptimization.instance) {
			MobileOptimization.instance = new MobileOptimization();
		}
		return MobileOptimization.instance;
	}

	/**
	 * 現在のビューポート情報を取得
	 */
	getViewportInfo(): ViewportInfo {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const hasHover = window.matchMedia('(hover: hover)').matches;

		return {
			width,
			height,
			isMobile: width <= 768,
			isTablet: width > 768 && width <= 1024,
			isDesktop: width > 1024,
			isLandscape: width > height,
			isPortrait: height > width,
			isTouchDevice,
			hasHover
		};
	}

	/**
	 * ビューポート変更リスナーを設定
	 */
	private setupViewportListener(): void {
		const updateViewport = () => {
			this.viewportInfo = this.getViewportInfo();
			this.notifyListeners();
		};

		window.addEventListener('resize', updateViewport);
		window.addEventListener('orientationchange', () => {
			// orientationchangeの後に少し待ってからビューポートを更新
			setTimeout(updateViewport, 100);
		});
	}

	/**
	 * タッチ最適化を設定
	 */
	private setupTouchOptimizations(): void {
		if (!this.viewportInfo.isTouchDevice) return;

		// タッチイベントの最適化
		document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
		document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

		// iOS Safariでのズーム無効化
		if (this.isIOS()) {
			this.preventIOSZoom();
		}

		// Android Chromeでの最適化
		if (this.isAndroid()) {
			this.optimizeForAndroid();
		}
	}

	/**
	 * タッチ開始イベントの処理
	 */
	private handleTouchStart(event: TouchEvent): void {
		const target = event.target as HTMLElement;
		
		// Buffer Calcの要素に対するタッチフィードバック
		if (target.closest('.buffer-calc-container')) {
			target.style.transition = 'transform 0.1s ease';
		}
	}

	/**
	 * タッチ終了イベントの処理
	 */
	private handleTouchEnd(event: TouchEvent): void {
		const target = event.target as HTMLElement;
		
		if (target.closest('.buffer-calc-container')) {
			setTimeout(() => {
				target.style.transform = '';
			}, 100);
		}
	}

	/**
	 * iOS Safari向けの最適化
	 */
	private preventIOSZoom(): void {
		// メタタグの設定確認
		let viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
		if (!viewport) {
			viewport = document.createElement('meta');
			viewport.name = 'viewport';
			document.head.appendChild(viewport);
		}

		// ズーム無効化の設定
		viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

		// ダブルタップズームの無効化
		document.addEventListener('touchend', (event) => {
			if (event.target && (event.target as HTMLElement).closest('.buffer-calc-container')) {
				event.preventDefault();
			}
		}, { passive: false });
	}

	/**
	 * Android Chrome向けの最適化
	 */
	private optimizeForAndroid(): void {
		// Androidでのフォーカス時の挙動改善
		document.addEventListener('focusin', (event) => {
			const target = event.target as HTMLElement;
			if (target.closest('.buffer-calc-container') && target.tagName === 'INPUT') {
				// 入力フィールドがビューポートに見える位置までスクロール
				setTimeout(() => {
					target.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 300);
			}
		});
	}

	/**
	 * デバイス判定ヘルパー
	 */
	isIOS(): boolean {
		return /iPad|iPhone|iPod/.test(navigator.userAgent);
	}

	isAndroid(): boolean {
		return /Android/.test(navigator.userAgent);
	}

	isSafari(): boolean {
		return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
	}

	/**
	 * モーダルのモバイル最適化
	 */
	optimizeModal(modalElement: HTMLElement): void {
		if (!this.viewportInfo.isMobile) return;

		modalElement.classList.add('mobile-optimized');

		// モーダルの高さ調整
		const adjustModalHeight = () => {
			const viewportHeight = window.visualViewport?.height || window.innerHeight;
			modalElement.style.maxHeight = `${viewportHeight * 0.95}px`;
		};

		adjustModalHeight();

		// キーボード表示時の調整
		if (window.visualViewport) {
			const handleViewportResize = () => adjustModalHeight();
			window.visualViewport.addEventListener('resize', handleViewportResize);

			// クリーンアップ用のイベントリスナー追加
			modalElement.addEventListener('remove', () => {
				window.visualViewport?.removeEventListener('resize', handleViewportResize);
			});
		}

		// スワイプジェスチャーでモーダルを閉じる
		this.addSwipeGesture(modalElement);
	}

	/**
	 * スワイプジェスチャーの追加
	 */
	private addSwipeGesture(element: HTMLElement): void {
		let startY = 0;
		let startTime = 0;

		element.addEventListener('touchstart', (e) => {
			startY = e.touches[0].clientY;
			startTime = Date.now();
		}, { passive: true });

		element.addEventListener('touchend', (e) => {
			const endY = e.changedTouches[0].clientY;
			const endTime = Date.now();
			const deltaY = endY - startY;
			const deltaTime = endTime - startTime;

			// 下方向への素早いスワイプでモーダルを閉じる
			if (deltaY > 100 && deltaTime < 300) {
				const closeButton = element.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
				if (closeButton) {
					closeButton.click();
				}
			}
		}, { passive: true });
	}

	/**
	 * 入力フィールドの最適化
	 */
	optimizeInputField(inputElement: HTMLInputElement): void {
		// モバイルデバイスでの入力最適化
		if (this.viewportInfo.isMobile) {
			inputElement.setAttribute('autocomplete', 'off');
			inputElement.setAttribute('autocorrect', 'off');
			inputElement.setAttribute('autocapitalize', 'off');
			inputElement.setAttribute('spellcheck', 'false');

			// 数値入力の場合の最適化
			if (inputElement.type === 'number' || inputElement.inputMode === 'numeric') {
				inputElement.setAttribute('inputmode', 'decimal');
				
				// iOSでの数値入力改善
				if (this.isIOS()) {
					inputElement.addEventListener('focus', () => {
						inputElement.setAttribute('readonly', 'readonly');
						setTimeout(() => {
							inputElement.removeAttribute('readonly');
						}, 100);
					});
				}
			}

			// フォーカス時のスクロール調整
			inputElement.addEventListener('focus', () => {
				setTimeout(() => {
					inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 300);
			});
		}
	}

	/**
	 * ボタンのタッチ最適化
	 */
	optimizeButton(buttonElement: HTMLButtonElement): void {
		if (!this.viewportInfo.isTouchDevice) return;

		// タッチターゲットサイズの確保
		const computedStyle = window.getComputedStyle(buttonElement);
		const minSize = 44; // Apple推奨の最小タッチターゲットサイズ

		if (parseInt(computedStyle.minHeight) < minSize) {
			buttonElement.style.minHeight = `${minSize}px`;
		}
		if (parseInt(computedStyle.minWidth) < minSize) {
			buttonElement.style.minWidth = `${minSize}px`;
		}

		// タッチフィードバックの追加
		buttonElement.addEventListener('touchstart', () => {
			buttonElement.style.transform = 'scale(0.98)';
		}, { passive: true });

		buttonElement.addEventListener('touchend', () => {
			setTimeout(() => {
				buttonElement.style.transform = '';
			}, 100);
		}, { passive: true });
	}

	/**
	 * ビューポート変更リスナーの追加
	 */
	addViewportChangeListener(callback: () => void): void {
		this.listeners.push(callback);
	}

	/**
	 * ビューポート変更リスナーの削除
	 */
	removeViewportChangeListener(callback: () => void): void {
		const index = this.listeners.indexOf(callback);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * リスナーに通知
	 */
	private notifyListeners(): void {
		this.listeners.forEach(callback => callback());
	}

	/**
	 * アクセシビリティの改善
	 */
	improveAccessibility(element: HTMLElement): void {
		// キーボードナビゲーションの改善
		const focusableElements = element.querySelectorAll(
			'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		focusableElements.forEach((el, index) => {
			const htmlEl = el as HTMLElement;
			
			// タブインデックスの設定
			if (!htmlEl.hasAttribute('tabindex')) {
				htmlEl.setAttribute('tabindex', '0');
			}

			// キーボードショートカットの追加
			htmlEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if (htmlEl.tagName === 'BUTTON') {
						e.preventDefault();
						htmlEl.click();
					}
				}
			});
		});

		// ARIAラベルの追加・改善
		this.improveAriaLabels(element);
	}

	/**
	 * ARIAラベルの改善
	 */
	private improveAriaLabels(element: HTMLElement): void {
		// 入力フィールドのラベル改善
		element.querySelectorAll('input').forEach(input => {
			const label = element.querySelector(`label[for="${input.id}"]`) ||
						  input.closest('.buffer-calc-input-group')?.querySelector('label');
			
			if (label && !input.hasAttribute('aria-label')) {
				input.setAttribute('aria-label', label.textContent || '');
			}
		});

		// ボタンのARIAラベル改善
		element.querySelectorAll('button').forEach(button => {
			if (!button.hasAttribute('aria-label') && !button.textContent?.trim()) {
				const icon = button.querySelector('[class*="icon"]');
				if (icon) {
					button.setAttribute('aria-label', 'アクション実行');
				}
			}
		});

		// モーダルのARIA属性
		if (element.classList.contains('modal')) {
			element.setAttribute('role', 'dialog');
			element.setAttribute('aria-modal', 'true');
			
			const title = element.querySelector('h1, h2, h3');
			if (title && !element.hasAttribute('aria-labelledby')) {
				if (!title.id) {
					title.id = `modal-title-${Date.now()}`;
				}
				element.setAttribute('aria-labelledby', title.id);
			}
		}
	}

	/**
	 * パフォーマンス最適化
	 */
	optimizePerformance(): void {
		// スクロールイベントの最適化
		let scrollTimeout: NodeJS.Timeout;
		window.addEventListener('scroll', () => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				// スクロール完了後の処理
				this.handleScrollEnd();
			}, 150);
		}, { passive: true });

		// リサイズイベントの最適化
		let resizeTimeout: NodeJS.Timeout;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				this.viewportInfo = this.getViewportInfo();
				this.notifyListeners();
			}, 250);
		});
	}

	/**
	 * スクロール完了時の処理
	 */
	private handleScrollEnd(): void {
		// 必要に応じてレイアウトの再計算など
	}

	/**
	 * デバッグ情報の取得
	 */
	getDebugInfo(): ViewportInfo & {
		userAgent: string;
		platform: string;
		language: string;
		cookieEnabled: boolean;
		onLine: boolean;
	} {
		return {
			...this.viewportInfo,
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			language: navigator.language,
			cookieEnabled: navigator.cookieEnabled,
			onLine: navigator.onLine
		};
	}
}