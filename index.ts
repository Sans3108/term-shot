import { Terminal, type ITheme } from '@xterm/xterm';
import chalk from 'chalk';
import fs from 'fs';
import pptr, { type Browser } from 'puppeteer';
import stripAnsi from 'strip-ansi';

let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;

async function getBrowser() {
  if (browser) return browser;
  if (launching) return launching;

  launching = pptr.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--disable-gpu',
      '--disable-background-timer-throttling'
    ]
  });

  browser = await launching;
  launching = null;
  console.log('Browser launched');
  return browser;
}

async function screenshot(
  text: string,
  options?: {
    theme?: ITheme;
    padAmountPx?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    fontWeightBold?: number;
    letterSpacing?: number;
    lineHeight?: number;
    format?: 'png' | 'jpeg' | 'webp';
  }
) {
  const lines = text.split(/\r\n|\r|\n/);

  const stripped = lines.map(line => stripAnsi(line));

  fs.writeFileSync('debug-stripped.txt', stripped.join('\n'), 'utf-8');
  fs.writeFileSync('debug-lines.txt', lines.join('\n'), 'utf-8');

  let [cols, rows] = [Math.max(...lines.map(line => stripAnsi(line).length)), lines.length];

  const opts = {
    padAmountPx: options?.padAmountPx || 0,
    fontFamily: options?.fontFamily || 'monospace',
    fontSize: options?.fontSize || 14,
    fontWeight: options?.fontWeight,
    fontWeightBold: options?.fontWeightBold,
    letterSpacing: options?.letterSpacing,
    lineHeight: options?.lineHeight || 0,
    format: options?.format || 'png',
    theme: {
      background: options?.theme?.background || '#000000',
      foreground: options?.theme?.foreground || '#e0e0e0',
      ...options?.theme
    }
  };

  const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        opts.fontFamily
      )}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

      #terminal {
        width: min-content;
        background-color: ${opts.theme.background};
        padding: ${opts.padAmountPx}px;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
  </body>
</html>
`;

  const page = await (await getBrowser()).newPage();
  console.log('New page created', page.isJavaScriptEnabled());

  await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
  console.log('Page content set');

  await page.addStyleTag({ path: './node_modules/@xterm/xterm/css/xterm.css' });
  console.log('Xterm CSS added');

  await page.addScriptTag({ path: './node_modules/@xterm/xterm/lib/xterm.js' });
  console.log('Xterm script added');

  await page.evaluate(() => document.fonts.ready);
  console.log('Fonts loaded');

  await page.evaluate(
    (rows: number, cols: number, op: typeof opts, text: string) => {
      const term = new Terminal({
        convertEol: true,
        rows,
        cols,
        ...op
      });

      term.open(document.getElementById('terminal')!);
      term.write(text);
    },
    rows,
    cols,
    opts,
    text
  );
  console.log('Terminal finished writing');

  const element = await page.$('#terminal');
  console.log('Terminal element selected');
  const buf = await element!.screenshot({ type: opts.format });
  console.log('Screenshot taken');

  await page.close();
  console.log('Page closed');

  return buf;
}

const str =
  'This is a horrible rainbow puke\nline showing off truecolor! Lmfao \nABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789\n`~!@#$%^&*()-_=+[{]}|;:\'",<.>?/\\'
    .split('')
    .map((ch, i) =>
      chalk.rgb(Math.round(Math.sin(0.3 * i) * 127 + 128), Math.round(Math.sin(0.3 * i + 2) * 127 + 128), Math.round(Math.sin(0.3 * i + 4) * 127 + 128))(ch)
    )
    .join('');

const opts = {
  padAmountPx: 10,
  fontFamily: 'Fira Code'
};

await Promise.all([
  screenshot(str, opts).then(buf => {
    fs.writeFileSync('output.png', buf);
  })
  // screenshot(stripAnsi(str), opts).then(buf => {
  //   fs.writeFileSync('output-stripped.png', buf);
  // })
]);

process.on('exit', async () => {
  if (browser) await browser.close();
});

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());