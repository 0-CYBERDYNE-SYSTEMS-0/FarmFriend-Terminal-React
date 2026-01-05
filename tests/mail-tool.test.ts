/**
 * Mail Tool Test Suite
 * 
 * Tests verify that:
 * 1. Mail tool is properly registered
 * 2. Tool schema is correctly defined
 * 3. Basic validation works correctly
 * 4. Error handling for non-macOS platforms
 * 
 * Note: These are unit tests that don't require actual Mail.app access.
 * Integration tests with Mail.app would require macOS and proper setup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadToolSchemas, validateToolArgs } from '../src/runtime/tools/toolSchemas.js';
import { ToolRegistry } from '../src/runtime/tools/registry.js';
import { registerDefaultTools } from '../src/runtime/registerDefaultTools.js';

describe('Mail Tool', () => {
  let registry: ToolRegistry;
  let originalPlatform: string;

  beforeEach(() => {
    registry = new ToolRegistry();
    registerDefaultTools(registry, { workspaceDir: '/tmp/test-workspace' });
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('Tool Registration', () => {
    it('should register mail tool', () => {
      expect(registry.has('mail')).toBe(true);
    });

    it('should have mail tool in registry list', () => {
      const tools = registry.listNames();
      expect(tools).toContain('mail');
    });

    it('should be able to get mail tool handler', () => {
      const handler = registry.get('mail');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });
  });

  describe('Tool Schema', () => {
    it('should have mail tool schema defined', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      expect(mailSchema).toBeDefined();
      expect(mailSchema?.type).toBe('function');
      expect(mailSchema?.function.name).toBe('mail');
    });

    it('should have required parameters in schema', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      const params = mailSchema?.function.parameters as any;
      expect(params).toBeDefined();
      expect(params.required).toContain('action');
    });

    it('should have action parameter defined', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      const params = mailSchema?.function.parameters as any;
      expect(params.properties.action).toBeDefined();
      expect(params.properties.action.type).toBe('string');
    });

    it('should have optional parameters defined', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      const params = mailSchema?.function.parameters as any;
      expect(params.properties.message_id).toBeDefined();
      expect(params.properties.sender).toBeDefined();
      expect(params.properties.subject).toBeDefined();
      expect(params.properties.recipient).toBeDefined();
      expect(params.properties.body).toBeDefined();
      expect(params.properties.pii_redact).toBeDefined();
    });
  });

  describe('Tool Validation', () => {
    it('should validate with required action parameter', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', { action: 'search' }, schemas);
      
      expect(result.valid).toBe(true);
    });

    it('should reject without action parameter', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {}, schemas);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('action');
      }
    });

    it('should accept optional parameters', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {
        action: 'search',
        sender: 'test@example.com',
        subject: 'Test Subject',
        limit: 10,
      }, schemas);
      
      expect(result.valid).toBe(true);
    });

    it('should accept all supported actions', () => {
      const schemas = loadToolSchemas();
      const actions = [
        'search', 'read', 'compose', 'send', 
        'create_draft', 'edit_draft', 'archive', 
        'move', 'analyze', 'redact_pii'
      ];
      
      for (const action of actions) {
        const result = validateToolArgs('mail', { action }, schemas);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Platform Compatibility', () => {
    it('should throw error on non-macOS platform', async () => {
      // Mock non-macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      const handler = registry.get('mail');
      expect(handler).toBeDefined();

      const signal = new AbortController().signal;
      
      await expect(
        handler!({ action: 'search' }, signal)
      ).rejects.toThrow('only supported on macOS');
    });

    it('should accept execution on macOS platform', async () => {
      // Mock macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const handler = registry.get('mail');
      expect(handler).toBeDefined();

      // Note: This will fail with AppleScript errors if Mail.app isn't available
      // but we're just testing that it doesn't reject based on platform
      const signal = new AbortController().signal;
      
      try {
        await handler!({ action: 'search' }, signal);
      } catch (error: any) {
        // Should fail for other reasons (Mail.app access), not platform
        expect(error.message).not.toContain('only supported on macOS');
      }
    });
  });

  describe('Tool Schema Description', () => {
    it('should have comprehensive description', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      expect(mailSchema?.function.description).toBeDefined();
      expect(mailSchema?.function.description).toContain('Mail.app');
      expect(mailSchema?.function.description).toContain('PII');
      expect(mailSchema?.function.description).toContain('maclocal-api');
    });

    it('should mention privacy features in description', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      const desc = mailSchema?.function.description || '';
      expect(desc.toLowerCase()).toContain('privacy');
    });
  });

  describe('Action Parameter Validation', () => {
    it('should validate search action parameters', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {
        action: 'search',
        sender: 'user@example.com',
        subject: 'meeting',
        mailbox: 'INBOX',
        limit: 5,
      }, schemas);
      
      expect(result.valid).toBe(true);
    });

    it('should validate read action parameters', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {
        action: 'read',
        message_id: 'msg-12345',
        pii_redact: true,
      }, schemas);
      
      expect(result.valid).toBe(true);
    });

    it('should validate compose action parameters', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {
        action: 'compose',
        recipient: 'recipient@example.com',
        subject: 'Test Email',
        body: 'Email body content',
      }, schemas);
      
      expect(result.valid).toBe(true);
    });

    it('should validate analyze action parameters', () => {
      const schemas = loadToolSchemas();
      const result = validateToolArgs('mail', {
        action: 'analyze',
        message_id: 'msg-67890',
        query: 'summary',
      }, schemas);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Schema Completeness', () => {
    it('should have all documented actions in schema', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      
      expect(mailSchema).toBeDefined();
      
      const description = mailSchema?.function.description || '';
      const params = mailSchema?.function.parameters as any;
      
      // Check that action parameter description mentions all actions
      expect(params.properties.action.description).toContain('search');
      expect(params.properties.action.description).toContain('read');
      expect(params.properties.action.description).toContain('compose');
      expect(params.properties.action.description).toContain('analyze');
    });

    it('should document PII-related parameters', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      const params = mailSchema?.function.parameters as any;
      
      expect(params.properties.pii_redact).toBeDefined();
      expect(params.properties.pii_redact.type).toBe('boolean');
      expect(params.properties.pii_redact.description).toContain('PII');
    });

    it('should document attachment support', () => {
      const schemas = loadToolSchemas();
      const mailSchema = schemas.find(s => s.function.name === 'mail');
      const params = mailSchema?.function.parameters as any;
      
      expect(params.properties.attachment_paths).toBeDefined();
      expect(params.properties.attachment_paths.type).toBe('array');
      expect(params.properties.attachment_paths.items?.type).toBe('string');
    });
  });
});
