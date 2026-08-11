import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../public/assets/tutorial');

const screenshots = {
  director: [
    { id: 'dashboard', path: '/dashboard' },
    { id: 'students', path: '/students' },
    { id: 'teachers', path: '/teachers' },
    { id: 'classes', path: '/classes' },
    { id: 'subjects', path: '/subjects' },
    { id: 'fees', path: '/fees' },
    { id: 'payments', path: '/payments' },
    { id: 'reports', path: '/reports' },
    { id: 'hr', path: '/staff' },
    { id: 'administration', path: '/branches' },
    { id: 'communication', path: '/announcements' },
    { id: 'settings', path: '/settings' },
  ],
  finance: [
    { id: 'dashboard', path: '/dashboard' },
    { id: 'fees', path: '/fees' },
    { id: 'payments', path: '/payments' },
    { id: 'reports', path: '/reports' },
  ],
  teacher: [
    { id: 'dashboard', path: '/teacher/dashboard' },
    { id: 'classes', path: '/teacher/classes' },
    { id: 'students', path: '/teacher/students' },
    { id: 'attendance', path: '/teacher/attendance' },
    { id: 'assignments', path: '/teacher/assignments' },
    { id: 'grades', path: '/teacher/grades' },
    { id: 'timetable', path: '/teacher/timetable' },
  ],
  parent: [
    { id: 'dashboard', path: '/parent/dashboard' },
    { id: 'children', path: '/parent/children' },
    { id: 'pay-bill', path: '/parent/pay-bill' },
    { id: 'profile', path: '/parent/profile' },
  ],
  student: [
    { id: 'dashboard', path: '/student/dashboard' },
    { id: 'profile', path: '/student/profile' },
    { id: 'classes', path: '/student/classes' },
    { id: 'paybill', path: '/student/paybill' },
    { id: 'payments', path: '/student/payments' },
  ],
  record_keeper: [
    { id: 'dashboard', path: '/admin-asst/dashboard' },
    { id: 'students', path: '/admin-asst/students' },
    { id: 'classes', path: '/admin-asst/classes' },
    { id: 'sessions', path: '/admin-asst/sessions' },
    { id: 'collections', path: '/admin-asst/collections' },
    { id: 'inventory', path: '/admin-asst/inventory' },
    { id: 'reports', path: '/admin-asst/reports' },
    { id: 'payment', path: '/admin-asst/payment' },
  ],
};

async function generateScreenshots() {
  console.log('🚀 Generating tutorial screenshots...');

  for (const role of Object.keys(screenshots)) {
    await fs.mkdir(path.join(OUTPUT_DIR, role), { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'admin@school.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 30000 });

  for (const [role, pages] of Object.entries(screenshots)) {
    console.log(`\n📸 Generating ${role} screenshots...`);

    for (const { id, path: routePath } of pages) {
      console.log(`  - ${id} (${routePath})`);

      try {
        await page.goto(`${BASE_URL}${routePath}`, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        const screenshotPath = path.join(OUTPUT_DIR, role, `${id}.png`);
        await page.screenshot({
          path: screenshotPath,
          type: 'png',
          quality: 92,
          fullPage: false,
        });

        console.log(`    ✅ Saved: ${screenshotPath}`);
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }
  }

  await browser.close();
  console.log('\n✨ Tutorial screenshots generated successfully!');
}

generateScreenshots().catch(console.error);
