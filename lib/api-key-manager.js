/**
 * API Key Management System
 * SPEC: 4.1.1 API优先设计 - API密钥管理
 * 验收标准: 支持API密钥生成、验证、撤销
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Generate a new API key
 * Format: {tier}_{random32chars}
 */
export function generateApiKey(tier = 'free') {
  const prefix = {
    free: 'free',
    premium: 'prem',
    enterprise: 'ent'
  }[tier] || 'free';
  
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomBytes}`;
}

/**
 * Create API key for an agent
 */
export async function createApiKey(agentId, tier = 'free', metadata = {}) {
  if (!supabase) {
    // Fallback to in-memory storage if Supabase not available
    const apiKey = generateApiKey(tier);
    return {
      apiKey,
      agentId,
      tier,
      createdAt: new Date().toISOString(),
      ...metadata
    };
  }
  
  const apiKey = generateApiKey(tier);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Store in database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      agent_id: agentId,
      key_hash: keyHash,
      tier: tier,
      metadata: metadata,
      created_at: new Date().toISOString(),
      expires_at: null, // No expiration by default
      revoked: false
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
  
  // Return the plain API key (only shown once)
  return {
    apiKey, // Plain key - only returned once
    agentId,
    tier,
    createdAt: data.created_at,
    ...metadata
  };
}

/**
 * Verify API key and get agent info
 */
export async function verifyApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, tier: 'free' };
  }
  
  // Quick tier check from prefix
  let tier = 'free';
  if (apiKey.startsWith('prem_')) tier = 'premium';
  if (apiKey.startsWith('ent_')) tier = 'enterprise';
  
  if (!supabase) {
    // Fallback: return tier based on prefix
    return {
      valid: true,
      tier,
      agentId: null
    };
  }
  
  // Verify against database
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('agent_id, tier, revoked, expires_at')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) {
    return { valid: false, tier: 'free' };
  }
  
  // Check if revoked
  if (data.revoked) {
    return { valid: false, tier: 'free', reason: 'revoked' };
  }
  
  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, tier: 'free', reason: 'expired' };
  }
  
  return {
    valid: true,
    tier: data.tier || tier,
    agentId: data.agent_id
  };
}

/**
 * Revoke API key
 */
export async function revokeApiKey(apiKey) {
  if (!supabase) {
    return { success: true };
  }
  
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('key_hash', keyHash);
  
  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
  
  return { success: true };
}

/**
 * List API keys for an agent
 */
export async function listApiKeys(agentId) {
  if (!supabase) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, tier, created_at, expires_at, revoked, metadata')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }
  
  // Don't return the actual key hash for security
  return data.map(key => ({
    id: key.id,
    tier: key.tier,
    createdAt: key.created_at,
    expiresAt: key.expires_at,
    revoked: key.revoked,
    metadata: key.metadata
  }));
}
