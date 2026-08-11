import html2canvas from 'html2canvas';

/**
 * Pre-captures screenshots for all tutorial steps
 * This should be called after user logs in
 */
export async function precaptureTutorialScreenshots(
  role: string,
  steps: Array<{ id: string; path?: string }>
): Promise<void> {
  const storageKey = `tutorial_precapture_${role}`;
  
  // Check if already precaptured
  if (sessionStorage.getItem(storageKey) === 'done') {
    return;
  }

  try {
    // Wait for page to be stable
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (const step of steps) {
      if (!step.path) continue;
      
      const screenshotKey = `tutorial_screenshot_${role}_${step.id}`;
      
      // Skip if already captured
      if (sessionStorage.getItem(screenshotKey)) {
        continue;
      }

      // Navigate to the page
      window.location.hash = step.path;
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Capture screenshot
      const overlay = document.querySelector('[data-tutorial-overlay="true"]') as HTMLElement | null;
      if (overlay) {
        overlay.style.visibility = 'hidden';
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const root = document.getElementById('root') || document.body;
      const canvas = await html2canvas(root as HTMLElement, {
        backgroundColor: '#f8fafc',
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        removeContainer: true,
      });

      if (overlay) {
        overlay.style.visibility = '';
      }

      const image = canvas.toDataURL('image/png', 0.92);
      sessionStorage.setItem(screenshotKey, image);
    }

    // Mark as done
    sessionStorage.setItem(storageKey, 'done');
  } catch (error) {
    console.debug('Failed to precapture screenshots:', error);
  }
}
