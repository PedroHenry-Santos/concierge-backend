// This file must be imported FIRST before any other imports
// to ensure OpenTelemetry instrumentations are registered before modules are loaded
import { initOpenTelemetry } from './tracing';

initOpenTelemetry();
