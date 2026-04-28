import type { Page } from '@playwright/test';

/**
 * Playwright headless video does not render the OS cursor. Inject a DOM
 * element that mirrors page.mouse position so the recording shows where
 * the action is happening. Call once per page, before any interactions.
 */
export async function installFakeCursor(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #__clip_cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 24px;
        height: 24px;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M5 3 L5 19 L9 15 L11.5 21 L14 20 L11.5 14 L17 14 Z' fill='white' stroke='black' stroke-width='1.2' stroke-linejoin='round'/></svg>");
        background-repeat: no-repeat;
        background-size: contain;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-2px, -2px);
        transition: transform 30ms linear;
        will-change: transform;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
      }
      #__clip_cursor.click {
        animation: __clip_cursor_click 240ms ease-out;
      }
      @keyframes __clip_cursor_click {
        0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
        100% { box-shadow: 0 0 0 18px rgba(99, 102, 241, 0); }
      }
    `,
  });

  await page.evaluate(() => {
    if (document.getElementById('__clip_cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = '__clip_cursor';
    document.body.appendChild(cursor);

    const move = (x: number, y: number) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };

    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), { passive: true });
    document.addEventListener('click', () => {
      cursor.classList.remove('click');
      void cursor.offsetWidth;
      cursor.classList.add('click');
    }, { passive: true });
  });
}

/**
 * Smoothly move the fake cursor + real Playwright pointer to coordinates.
 * Use `steps` to control how many interpolated mouse events fire — higher = smoother.
 */
export async function moveCursorTo(page: Page, x: number, y: number, steps = 25): Promise<void> {
  await page.mouse.move(x, y, { steps });
}

/**
 * Move to a locator's center, then click. The fake cursor renders the click pulse.
 */
export async function clickWithCursor(page: Page, selector: string, steps = 25): Promise<void> {
  const el = page.locator(selector).first();
  const box = await el.boundingBox();
  if (!box) throw new Error(`clickWithCursor: no bounding box for ${selector}`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await moveCursorTo(page, cx, cy, steps);
  await page.waitForTimeout(120);
  await page.mouse.click(cx, cy);
}
