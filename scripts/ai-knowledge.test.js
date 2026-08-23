import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_PAYLOAD, onRequestGet } from '../functions/api/knowledge.js';

const PUBLIC_KNOWLEDGE_FILES = [
  'public/agent.md',
  'public/llms.txt',
  'public/llms-full.txt'
];

const publicKnowledge = PUBLIC_KNOWLEDGE_FILES.map(path => ({
  path,
  content: readFileSync(path, 'utf8')
}));

describe('AI knowledge contract', () => {
  it('keeps the operational contract synchronized across public text sources', () => {
    for (const { content } of publicKnowledge) {
      expect(content).toContain('/agent.md');
      expect(content).toContain('ccc.nottingham.edu.cn');
      expect(content).toContain('/study/');
      expect(content).toContain('`id`');
      expect(content).toContain('`scheduleId`');
      expect(content).toContain('60_000');
      expect(content).toContain('HTTP 200');
      expect(content).toContain('image/png');
      expect(content).toContain('non-empty');
      expect(content).toMatch(/proxy attendance/i);
      expect(content).toMatch(/bulk generation/i);
      expect(content).toMatch(/credentials/i);
    }
  });

  it('removes unsafe shell interpolation and unsupported timing advice', () => {
    for (const { content } of publicKnowledge) {
      expect(content).not.toContain('$(date +%s)000');
      expect(content).not.toMatch(/final 10 minutes/i);
      expect(content).not.toMatch(/下课前\s*10\s*分钟/);
    }
  });

  it('exposes backward-compatible structured caller rules', async () => {
    const generate = KNOWLEDGE_PAYLOAD.api.generate;

    expect(typeof generate.method).toBe('string');
    expect(typeof generate.requestBody).toBe('object');
    expect(typeof generate.successResponse).toBe('string');
    expect(Array.isArray(generate.errors)).toBe(true);
    expect(KNOWLEDGE_PAYLOAD.operationalAuthority).toBe('https://ccc.byron.wang/agent.md');
    expect(generate.callerValidation).toEqual({
      protocols: ['http:', 'https:'],
      exactHostname: 'ccc.nottingham.edu.cn',
      pathPrefix: '/study/',
      scheduleIdParameters: ['id', 'scheduleId'],
      parameterPrecedence: ['id', 'scheduleId'],
      fetchSubmittedUrl: false,
      canonicalUrl: 'https://ccc.nottingham.edu.cn/study/home/details?id=<encoded-value>'
    });
    expect(generate.agentDefaults).toEqual({
      timestampOffsetMs: 60000,
      maxServerErrorRetries: 1
    });
    expect(generate.successCriteria).toEqual({
      status: 200,
      contentType: 'image/png',
      nonEmptyBody: true
    });
    expect(KNOWLEDGE_PAYLOAD.lastReviewed).toBe('2026-08-23');

    const response = onRequestGet();
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toMatchObject({
      operationalAuthority: 'https://ccc.byron.wang/agent.md',
      api: {
        generate: {
          successCriteria: {
            status: 200,
            contentType: 'image/png',
            nonEmptyBody: true
          }
        }
      }
    });
  });
});
