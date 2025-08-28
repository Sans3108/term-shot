import { type ITheme } from '@xterm/xterm';
import chalk from 'chalk';
import fs from 'fs';
import stripAnsi from 'strip-ansi';

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
  }
) {
  const lines = text.split(/\r\n|\r|\n/);

  const [cols, rows] = [Math.max(...lines.map(line => stripAnsi(line).length)), lines.length];

  const opts = {
    padAmountPx: options?.padAmountPx || 0,
    fontFamily: options?.fontFamily || 'monospace',
    fontSize: options?.fontSize || 14,
    fontWeight: options?.fontWeight,
    fontWeightBold: options?.fontWeightBold,
    letterSpacing: options?.letterSpacing || 1,
    lineHeight: options?.lineHeight,
    theme: {
      background: options?.theme?.background || '#000000',
      foreground: options?.theme?.foreground || '#e0e0e0',
      ...options?.theme
    }
  };

  const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="node_modules/@xterm/xterm/css/xterm.css" />
    <script src="node_modules/@xterm/xterm/lib/xterm.js"></script>
  </head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      opts.fontFamily
    )}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

    #terminal {
      width: fit-content;
      background-color: ${opts.theme.background};
      padding: ${opts.padAmountPx}px;
    }
  </style>
  <body>
    <div id="terminal"></div>
    <script>

      const term = new Terminal({
        convertEol: true,
        cols: ${cols},
        rows: ${rows},
        theme: ${JSON.stringify(opts.theme)},
        fontFamily: ${JSON.stringify(opts.fontFamily)},
        fontSize: ${JSON.stringify(opts.fontSize)},
        fontWeight: ${JSON.stringify(opts.fontWeight)},
        fontWeightBold: ${JSON.stringify(opts.fontWeightBold)},
        letterSpacing: ${JSON.stringify(opts.letterSpacing)},
        lineHeight: ${JSON.stringify(opts.lineHeight)}
      });

      term.open(document.getElementById('terminal'));
      term.write(${JSON.stringify(text)});
    </script>
  </body>
</html>
`;

  return htmlTemplate;
}

const str = 'This is a horrible rainbow puke\nline showing off truecolor!'
  .split('')
  .map((ch, i) => chalk.rgb(Math.round(Math.sin(0.3 * i) * 127 + 128), Math.round(Math.sin(0.3 * i + 2) * 127 + 128), Math.round(Math.sin(0.3 * i + 4) * 127 + 128))(ch))
  .join('');

fs.writeFileSync('template.html', await screenshot(str, { padAmountPx: 0, fontFamily: 'Fira Code' }));
