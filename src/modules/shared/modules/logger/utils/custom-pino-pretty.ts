import chalk from 'chalk';
import pinoPretty, { type PrettyOptions } from 'pino-pretty';

const customPinoPretty = (options: PrettyOptions | undefined) =>
  pinoPretty({
    ...options,
    messageFormat: (log, messageKey) => {
      return (
        chalk.yellow.bold(`[🛠  ${log['context'] as string}]: `) +
        chalk.cyanBright.italic(`${log[messageKey] as string}`)
      );
    },
    ignore: 'pid,hostname',
    include: 'time,level,message,stack,origin,cause',
    colorizeObjects: true,
    customPrettifiers: {
      time: (timestamp) => chalk.bold.blue(`⏱  ${timestamp as string}`),
    },
  });

export default customPinoPretty;
