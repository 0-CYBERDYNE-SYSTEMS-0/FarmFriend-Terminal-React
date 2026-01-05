/**
 * Profile System Test Suite
 * 
 * Tests verify that:
 * 1. Profiles are loaded correctly from storage
 * 2. Provider selection respects profile settings
 * 3. Environment variables are properly propagated
 * 4. Credentials are retrieved correctly
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { readConfig, getProfileByName, getCredential } from '../src/runtime/profiles/storage.js';
import { createProvider } from '../src/runtime/providers/factory.js';

describe('Profile System', () => {
  beforeAll(() => {
    process.env.FF_PROFILE_STORE_PATH = resolve('tests/fixtures/ff-terminal-profiles.json');
  });

  describe('Profile Storage', () => {
    it('should load profiles from storage', () => {
      const config = readConfig();
      expect(config.profiles).toBeDefined();
      expect(config.profiles.length).toBeGreaterThan(0);
    });

    it('should find profile by name', () => {
      const config = readConfig();
      const profileNames = config.profiles.map(p => p.name);
      
      // Test that we can find each profile
      for (const name of profileNames) {
        const profile = getProfileByName(config, name);
        expect(profile).not.toBeNull();
        expect(profile?.name).toBe(name);
      }
    });

    it('should return null for non-existent profile', () => {
      const config = readConfig();
      const profile = getProfileByName(config, 'NonExistentProfile12345');
      expect(profile).toBeNull();
    });
  });

  describe('Provider Selection with Profiles', () => {
    // Clean environment before each test
    beforeEach(() => {
      delete process.env.FF_PROVIDER;
      delete process.env.FF_MODEL;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.MINIMAX_API_KEY;
    });

    it('should select zai provider for GLM-4.7 profile', async () => {
      const profile = getProfileByName(readConfig(), 'GLM-4.7');
      expect(profile).not.toBeNull();
      
      process.env.FF_PROVIDER = profile!.provider;
      if (profile!.model) process.env.FF_MODEL = profile!.model;
      
      // Load credential if available
      const cred = await getCredential(profile!.name, 'ANTHROPIC_AUTH_TOKEN');
      if (cred) process.env.ANTHROPIC_AUTH_TOKEN = cred;
      if (profile!.baseUrl) process.env.ANTHROPIC_BASE_URL = profile!.baseUrl;

      const result = createProvider();
      expect(result.provider.name).toBe('zai');
      expect(result.model).toBe('GLM-4.7');
    });

    it('should select minimax provider for MiniMax-M2.1 profile', async () => {
      const profile = getProfileByName(readConfig(), 'MiniMax-M2.1');
      expect(profile).not.toBeNull();
      
      process.env.FF_PROVIDER = profile!.provider;
      if (profile!.model) process.env.FF_MODEL = profile!.model;
      
      // Load credential if available
      const cred = await getCredential(profile!.name, 'MINIMAX_API_KEY');
      if (cred) process.env.MINIMAX_API_KEY = cred;
      if (profile!.baseUrl) process.env.MINIMAX_BASE_URL = profile!.baseUrl;

      const result = createProvider();
      expect(result.provider.name).toBe('minimax');
      expect(result.model).toBe('MiniMax-M2.1');
    });

    it('should select openrouter provider for OR Grok profile when credential is available', async () => {
      const profile = getProfileByName(readConfig(), 'OR Grok');
      expect(profile).not.toBeNull();
      
      process.env.FF_PROVIDER = profile!.provider;
      if (profile!.model) process.env.FF_MODEL = profile!.model;
      
      // Load credential if available
      const cred = await getCredential(profile!.name, 'OPENROUTER_API_KEY');
      if (cred) {
        process.env.OPENROUTER_API_KEY = cred;
        const result = createProvider();
        expect(result.provider.name).toBe('openrouter');
        expect(result.model).toBe('x-ai/grok-4.1-fast');
      } else {
        // If no credential, provider creation should fail with expected error
        expect(() => createProvider()).toThrow('OPENROUTER_API_KEY');
      }
    });
  });

  describe('Environment Variable Propagation', () => {
    beforeEach(() => {
      delete process.env.FF_PROVIDER;
      delete process.env.FF_MODEL;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.MINIMAX_API_KEY;
    });

    it('should use FF_PROVIDER env var when set', () => {
      process.env.FF_PROVIDER = 'zai';
      process.env.FF_MODEL = 'test-model';
      process.env.ANTHROPIC_AUTH_TOKEN = 'test-token';

      const result = createProvider();
      expect(result.provider.name).toBe('zai');
      expect(result.model).toBe('test-model');
    });

    it('should fall back to config when FF_PROVIDER not set', () => {
      // This test verifies fallback behavior
      // The actual fallback depends on config file contents
      try {
        const result = createProvider();
        // If we get here, some provider is enabled in config
        expect(['openrouter', 'zai', 'minimax', 'anthropic', 'lmstudio']).toContain(result.provider.name);
      } catch (e) {
        // Expected if no provider is configured or credentials missing
        expect((e as Error).message).toMatch(/No provider enabled|api_key.*missing|not set/);
      }
    });
  });

  describe('Credential Retrieval', () => {
    it('should retrieve credentials for a profile', async () => {
      const config = readConfig();
      if (config.profiles.length === 0) {
        console.log('No profiles configured, skipping credential test');
        return;
      }

      // Test retrieving credential for first profile
      const profile = config.profiles[0];
      const credentialLabel = getCredentialLabelForProvider(profile.provider);
      
      if (credentialLabel) {
        const cred = await getCredential(profile.name, credentialLabel);
        // Credential may or may not exist depending on test environment
        // But we can verify the function doesn't throw
        expect(cred === null || typeof cred === 'string').toBe(true);
      }
    });

    it('should return null for non-existent credential', async () => {
      const cred = await getCredential('NonExistentProfile', 'SOME_API_KEY');
      expect(cred).toBeNull();
    });
  });

  describe('Profile Configuration', () => {
    it('should have valid provider values', () => {
      const config = readConfig();
      const validProviders = ['openrouter', 'zai', 'minimax', 'anthropic', 'lmstudio', 'openai-compatible', 'anthropic-compatible'];
      
      for (const profile of config.profiles) {
        expect(validProviders).toContain(profile.provider);
      }
    });

    it('should have at least one profile configured', () => {
      const config = readConfig();
      expect(config.profiles.length).toBeGreaterThan(0);
    });

    it('should have a default profile set', () => {
      const config = readConfig();
      if (config.profiles.length > 0) {
        expect(config.defaultProfile).toBeDefined();
        const defaultProfile = getProfileByName(config, config.defaultProfile!);
        expect(defaultProfile).not.toBeNull();
      }
    });
  });
});

// Helper function to get credential label for provider
function getCredentialLabelForProvider(provider: string): string | null {
  switch (provider) {
    case 'openrouter': return 'OPENROUTER_API_KEY';
    case 'anthropic': return 'ANTHROPIC_API_KEY';
    case 'zai': return 'ANTHROPIC_AUTH_TOKEN';
    case 'minimax': return 'MINIMAX_API_KEY';
    case 'openai-compatible': return 'API_KEY';
    case 'anthropic-compatible': return 'API_KEY';
    case 'lmstudio': return null; // lmstudio doesn't require credential
    default: return null;
  }
}
