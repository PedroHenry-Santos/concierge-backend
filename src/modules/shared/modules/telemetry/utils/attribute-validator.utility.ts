import { Logger } from '@nestjs/common';

import { Attributes } from '../types/telemetry.types';

/**
 * Configuration for attribute validation
 */
interface AttributeValidationConfig {
  maxKeys: number;
  maxValueLength: number;
  allowedKeys: string[];
  sanitizationRules: Record<string, (value: string) => string>;
}

/**
 * Default attribute validation configuration
 */
const DEFAULT_CONFIG: AttributeValidationConfig = {
  maxKeys: 10, // Maximum number of attributes per metric
  maxValueLength: 100, // Maximum length for attribute values
  allowedKeys: [
    // General attributes
    'status',
    'operation',
    'operation_name',
    'success',
    'error_type',
    'environment',
    'service_name',
    'service_version',

    // HTTP attributes (low cardinality)
    'method',
    'status_code',
    'route',
    'user_agent_category', // Instead of full user_agent

    // Database attributes (low cardinality)
    'table_name',
    'query_type',
    'connection_pool',

    // Queue attributes (low cardinality)
    'queue_name',
    'message_type',
    'priority_level', // Instead of exact priority

    // WhatsApp attributes (low cardinality)
    'message_type',
    'webhook_type',
    'phone_number_type', // Instead of actual phone number
    'conversation_category', // Instead of conversation_id

    // Business attributes (categories only)
    'user_tier', // Instead of user_id
    'order_status', // Instead of order_id
    'message_category', // Instead of message_id
    'session_type', // Instead of session_id
  ],
  sanitizationRules: {
    // Convert high-cardinality IDs to categories
    user_id: (value: string) => `user_tier_${getUserTier(value)}`,
    order_id: (value: string) => `order_status_${getOrderStatus(value)}`,
    message_id: (value: string) =>
      `message_category_${getMessageCategory(value)}`,
    session_id: (value: string) => `session_type_${getSessionType(value)}`,
    conversation_id: (value: string) =>
      `conversation_category_${getConversationCategory(value)}`,
    phone_number: (value: string) =>
      `phone_number_type_${getPhoneNumberType(value)}`,

    // Truncate long values
    error_message: (value: string) => truncateString(value, 50),
    user_agent: (value: string) => getUserAgentCategory(value),

    // Normalize URLs to remove dynamic parts
    url: (value: string) => normalizeUrl(value),
    endpoint: (value: string) => normalizeEndpoint(value),
  },
};

/**
 * Utility class for validating and sanitizing metric attributes to prevent high cardinality
 */
export class AttributeValidator {
  private static readonly logger = new Logger('AttributeValidator');
  private readonly config: AttributeValidationConfig;

  constructor(customConfig?: Partial<AttributeValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Validates and sanitizes attributes to prevent high cardinality
   */
  validateAndSanitize(attributes: Attributes = {}): Attributes {
    const sanitized: Attributes = {};
    const keys = Object.keys(attributes);

    // Check maximum number of keys
    if (keys.length > this.config.maxKeys) {
      AttributeValidator.logger.warn(
        `Too many attributes provided (${keys.length}). Maximum allowed: ${this.config.maxKeys}. Truncating...`,
      );
    }

    // Process each attribute
    const processedKeys = keys.slice(0, this.config.maxKeys);

    for (const key of processedKeys) {
      const value = attributes[key];

      if (value === null || value === undefined) {
        continue;
      }

      const stringValue = String(value);

      // Check if key is allowed
      if (!this.isKeyAllowed(key)) {
        AttributeValidator.logger.warn(
          `Attribute key "${key}" is not allowed. Consider using predefined keys to avoid high cardinality.`,
        );
        continue;
      }

      // Apply sanitization rules
      const sanitizedValue = this.sanitizeValue(key, stringValue);

      // Check value length
      if (sanitizedValue.length > this.config.maxValueLength) {
        sanitized[key] = sanitizedValue.slice(
          0,
          Math.max(0, this.config.maxValueLength),
        );
        AttributeValidator.logger.warn(
          `Attribute value for "${key}" truncated to ${this.config.maxValueLength} characters`,
        );
      } else {
        sanitized[key] = sanitizedValue;
      }
    }

    return sanitized;
  }

  /**
   * Checks if a key is in the allowed list
   */
  private isKeyAllowed(key: string): boolean {
    return this.config.allowedKeys.includes(key);
  }

  /**
   * Applies sanitization rules to attribute values
   */
  private sanitizeValue(key: string, value: string): string {
    const sanitizationRule = this.config.sanitizationRules[key];

    if (sanitizationRule) {
      try {
        return sanitizationRule(value);
      } catch (error) {
        AttributeValidator.logger.warn(
          `Failed to apply sanitization rule for "${key}": ${error.message}`,
        );
        return value;
      }
    }

    return value;
  }

  /**
   * Get allowed attribute keys for documentation
   */
  getAllowedKeys(): string[] {
    return [...this.config.allowedKeys];
  }

  /**
   * Get sanitization rules for documentation
   */
  getSanitizationRules(): Record<string, string> {
    const rules: Record<string, string> = {};
    for (const key of Object.keys(this.config.sanitizationRules)) {
      rules[key] = 'Converts high-cardinality values to categories';
    }
    return rules;
  }
}

// Helper functions for sanitization rules

function getUserTier(userId: string): string {
  // Example: Convert user_id to tier based on some logic
  const hash = simpleHash(userId);
  if (hash % 100 < 10) return 'premium';
  if (hash % 100 < 30) return 'standard';
  return 'basic';
}

function getOrderStatus(orderId: string): string {
  // Example: This would typically query a database or cache
  // For now, return a generic status based on ID pattern
  if (orderId.startsWith('ORD-')) return 'standard';
  if (orderId.startsWith('RUSH-')) return 'express';
  return 'unknown';
}

function getMessageCategory(messageId: string): string {
  // Example: Categorize messages by type
  if (messageId.includes('IMG')) return 'image';
  if (messageId.includes('DOC')) return 'document';
  if (messageId.includes('AUD')) return 'audio';
  return 'text';
}

function getSessionType(sessionId: string): string {
  // Example: Categorize sessions
  if (sessionId.length > 32) return 'long_session';
  if (sessionId.includes('mobile')) return 'mobile';
  if (sessionId.includes('web')) return 'web';
  return 'api';
}

function getConversationCategory(conversationId: string): string {
  // Example: Categorize conversations
  const hash = simpleHash(conversationId);
  if (hash % 3 === 0) return 'customer_support';
  if (hash % 3 === 1) return 'sales';
  return 'general';
}

function getPhoneNumberType(phoneNumber: string): string {
  // Example: Categorize by country code or type
  if (phoneNumber.startsWith('+1')) return 'us_canada';
  if (phoneNumber.startsWith('+55')) return 'brazil';
  if (phoneNumber.startsWith('+44')) return 'uk';
  return 'international';
}

function getUserAgentCategory(userAgent: string): string {
  // Categorize user agents to prevent high cardinality
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari')) return 'safari';
  if (ua.includes('mobile')) return 'mobile_browser';
  return 'other';
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query parameters and fragments that might be dynamic
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replaceAll(
      /\/\d+/g,
      '/{id}',
    );
  } catch {
    return 'invalid_url';
  }
}

function normalizeEndpoint(endpoint: string): string {
  // Replace dynamic segments with placeholders
  return endpoint
    .replaceAll(/\/\d+/g, '/{id}')
    .replaceAll(/\/[\da-f-]{36}/g, '/{uuid}')
    .replaceAll(/\/[\dA-Za-z]{20,}/g, '/{token}');
}

function truncateString(string_: string, maxLength: number): string {
  return string_.length > maxLength
    ? string_.slice(0, Math.max(0, maxLength - 3)) + '...'
    : string_;
}

function simpleHash(string_: string): number {
  let hash = 0;
  for (let index = 0; index < string_.length; index++) {
    const char = string_.codePointAt(index) ?? 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Export a default instance for convenience
export const attributeValidator = new AttributeValidator();
