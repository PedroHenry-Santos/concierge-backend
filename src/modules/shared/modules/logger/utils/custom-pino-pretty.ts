import chalk from 'chalk';
import pinoPretty, { type PrettyOptions } from 'pino-pretty';

const customPinoPretty = (options: PrettyOptions | undefined) =>
  pinoPretty({
    ...options,
    messageFormat: (log, messageKey) => {
      const context = log['context'] as string;
      const message = log[messageKey] as string;
      const traceId = log['trace_id'] as string;
      const spanId = log['span_id'] as string;
      const traceSampled = log['trace_sampled'] as boolean;

      let formattedMessage =
        chalk.yellow.bold(`[🛠  ${context}]: `) +
        chalk.cyanBright.italic(`${message}`);

      // Add trace information if available
      if (traceId && spanId) {
        const samplingIndicator = traceSampled ? '🟢' : '🔴';
        const traceInfo = chalk.gray(
          `[${samplingIndicator} trace:${traceId.slice(-8)} span:${spanId.slice(-8)}]`,
        );
        formattedMessage = `${traceInfo} ${formattedMessage}`;
      }

      return formattedMessage;
    },
    ignore: 'pid,hostname,trace_id,span_id,trace_flags,trace_sampled',
    include: 'time,level,message,stack,origin,cause',
    colorizeObjects: true,
    customPrettifiers: {
      time: (timestamp) => chalk.bold.blue(`⏱  ${timestamp as string}`),
    },
  });

export default customPinoPretty;
