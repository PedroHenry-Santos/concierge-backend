import path from 'node:path';

import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

export interface PrettyStackErrorOptions {
  length?: number;
}

function extractInfoInPath(pathString: string) {
  const [filePath, line, col] = pathString.replaceAll(/[()]/gm, '').split(':');
  const fileName = path.basename(filePath);

  return { fileName, filePath: `${filePath}:${line}:${col}` };
}

interface GeneratePrettyStackOptions {
  fileName: string;
  filePath: string;
  instance?: string;
}

function generatePrettyStackError({
  fileName,
  filePath,
  instance,
}: GeneratePrettyStackOptions) {
  let message = '\t- File: ';
  message += chalk.whiteBright(fileName);
  if (instance) message += ` - ${chalk.cyanBright.bold(instance)}`;
  message += `\n\t${chalk.white.italic(filePath)}\n\n`;

  return message;
}

export function prettyStackError(
  error: Error,
  options?: PrettyStackErrorOptions,
) {
  error.message = stripAnsi(error.message);
  if (!error?.stack || error.cause === 'processed_stack') return;
  const stackArray: string[] = error.stack
    .split('\n')
    .map((stack) => stripAnsi(stack.trim()))
    .slice(1, options?.length);

  const stackedArray: string[][] = stackArray.map((stack) => {
    const regex = stack
      .replaceAll(/^\w+\s(.*)\s+(\(.*\))$/gm, '$1 | $2')
      .split(' | ');

    if (regex.length === 1) {
      const [, path] = stack.split(' ');

      return [`(${path})`];
    }

    const [instance, path] = regex;

    return [instance, path];
  });

  let stackError = '';

  for (const stacked of stackedArray) {
    if (stacked.length === 1) {
      const [instanceLocale] = stacked;
      const { fileName, filePath } = extractInfoInPath(instanceLocale);
      stackError += generatePrettyStackError({ fileName, filePath });
      continue;
    }

    const [instance, instanceLocale] = stacked;
    const { fileName, filePath } = extractInfoInPath(instanceLocale);
    stackError += generatePrettyStackError({ fileName, filePath, instance });
  }

  error.stack = stackError;
  error.cause = 'processed_stack';
}
