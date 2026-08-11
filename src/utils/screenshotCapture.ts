import html2canvas from 'html2canvas';

export interface CaptureOptions {
  quality?: number;
  scale?: number;
  backgroundColor?: string;
}

export class ScreenshotCapture {
  private static instance: ScreenshotCapture;
  private captured: Set<string> = new Set();
  private capturing: Set<string> = new Set();

  static getInstance(): ScreenshotCapture {
    if (!ScreenshotCapture.instance) {
      ScreenshotCapture.instance = new ScreenshotCapture();
    }
    return ScreenshotCapture.instance;
  }

  async capturePage(
    key: string,
    options: CaptureOptions = {}
  ): Promise<string | null> {
    if (this.captured.has(key) || this.capturing.has(key)) {
      return null;
    }

    this.capturing.add(key);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const overlay = document.querySelector('[data-tutorial-overlay="true"]') as HTMLElement | null;
      if (overlay) {
        overlay.style.visibility = 'hidden';
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const root = document.getElementById('root') || document.body;
      const canvas = await html2canvas(root as HTMLElement, {
        backgroundColor: options.backgroundColor || '#f8fafc',
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        removeContainer: true,
        ignoreElements: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          return Boolean(element.closest('[data-tutorial-overlay="true"]'));
        },
      });

      if (overlay) {
        overlay.style.visibility = '';
      }

      const imageData = canvas.toDataURL('image/png', options.quality || 0.92);
      
      sessionStorage.setItem(`screenshot_${key}`, imageData);
      
      this.captured.add(key);
      this.capturing.delete(key);

      return imageData;
    } catch (error) {
      console.debug('Screenshot capture failed:', error);
      this.capturing.delete(key);
      return null;
    }
  }

  getScreenshot(key: string): string | null {
    return sessionStorage.getItem(`screenshot_${key}`);
  }

  isCaptured(key: string): boolean {
    return this.captured.has(key) || sessionStorage.getItem(`screenshot_${key}`) !== null;
  }

  clearCache(): void {
    this.captured.clear();
    this.capturing.clear();
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('screenshot_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}
