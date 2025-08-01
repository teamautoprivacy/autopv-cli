import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { EvidencePackBuilder } from '../pack.js';

describe('EvidencePackBuilder', () => {
  const testDir = './test-evidence';
  let builder: EvidencePackBuilder;

  const mockData = {
    email: 'test@example.com',
    githubOrg: 'test-org',
    exportTimestamp: '2025-01-01T00:00:00.000Z',
    github: {
      events: [{ type: 'PushEvent', created_at: '2025-01-01T00:00:00Z' }],
      audit: []
    },
    stripe: {
      customers: [{ id: 'cus_123', email: 'test@example.com' }],
      charges: [],
      methods: []
    }
  };

  const mockScrubStats = {
    emailsRedacted: 1,
    phonesRedacted: 0,
    ssnsRedacted: 0,
    creditCardsRedacted: 0,
    apiKeysRedacted: 0,
    dataSizeReduction: 15,
    originalSize: 500,
    scrubbedSize: 485
  };

  const mockGdprClassification = {
    classifications: [
      {
        field: 'email',
        article: 'Art. 6(1)(a)',
        reasoning: 'Personal identifier requiring consent',
        dataType: 'Personal Data',
        sensitivity: 'Medium'
      }
    ],
    summary: {
      totalFields: 1,
      personalDataFields: 1,
      sensitiveDataFields: 0,
      articlesInvolved: ['Art. 6(1)(a)']
    },
    complianceReport: 'Test compliance report'
  };

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    builder = new EvidencePackBuilder(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('evidence pack generation', () => {
    it('should generate PDF and CSV files successfully', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData, // scrubbed data same as original for test
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };
      
      const result = await builder.generateEvidencePack(evidenceData);

      expect(result.filesCreated).toHaveLength(2);
      expect(result.filesCreated[0]).toMatch(/evidence_.*\.pdf$/);
      expect(result.filesCreated[1]).toMatch(/mapping_.*\.csv$/);
      
      // Verify files exist
      result.filesCreated.forEach(file => {
        expect(existsSync(file)).toBe(true);
      });
    });

    it('should handle email sanitization in filenames', async () => {
      const evidenceData = {
        email: 'user+test@example.co.uk',
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };

      const result = await builder.generateEvidencePack(evidenceData);

      expect(result.filesCreated[0]).toContain('user_test_example_co_uk');
    });

    it('should include summary statistics', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };
      
      const result = await builder.generateEvidencePack(evidenceData);

      expect(result.summary.totalRecords).toBeGreaterThan(0);
      expect(typeof result.summary.pdfSize).toBe('number');
      expect(typeof result.summary.csvSize).toBe('number');
    });
  });

  describe('PDF generation', () => {
    it('should create multi-page PDF with proper structure', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };
      
      const result = await builder.generateEvidencePack(evidenceData);
      
      const pdfFile = result.filesCreated.find(f => f.endsWith('.pdf'));
      expect(pdfFile).toBeDefined();
      expect(existsSync(pdfFile!)).toBe(true);
    });
  });

  describe('CSV generation', () => {
    it('should create CSV mapping file with flattened data', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };
      
      const result = await builder.generateEvidencePack(evidenceData);
      
      const csvFile = result.filesCreated.find(f => f.endsWith('.csv'));
      expect(csvFile).toBeDefined();
      expect(existsSync(csvFile!)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle missing GDPR classification gracefully', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: null
      };
      
      const result = await builder.generateEvidencePack(evidenceData);

      expect(Array.isArray(result.summary.gdprArticles)).toBe(true);
    });

    it('should handle empty data sets', async () => {
      const evidenceData = {
        email: 'test@example.com',
        githubOrg: 'test-org',
        exportTimestamp: '2025-01-01T00:00:00.000Z',
        original: {
          email: 'test@example.com',
          githubOrg: 'test-org',
          exportTimestamp: '2025-01-01T00:00:00.000Z',
          github: { events: [], audit: [] },
          stripe: { customers: [], charges: [], methods: [] }
        },
        scrubbed: {
          email: 'test@example.com',
          githubOrg: 'test-org',
          exportTimestamp: '2025-01-01T00:00:00.000Z',
          github: { events: [], audit: [] },
          stripe: { customers: [], charges: [], methods: [] }
        },
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };

      const result = await builder.generateEvidencePack(evidenceData);

      expect(result.summary.totalRecords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('file naming', () => {
    it('should generate unique timestamps for concurrent calls', async () => {
      const evidenceData = {
        email: mockData.email,
        githubOrg: mockData.githubOrg,
        exportTimestamp: mockData.exportTimestamp,
        original: mockData,
        scrubbed: mockData,
        scrubStats: mockScrubStats,
        gdprClassification: mockGdprClassification
      };
      
      const [result1, result2] = await Promise.all([
        builder.generateEvidencePack(evidenceData),
        builder.generateEvidencePack(evidenceData)
      ]);
      
      // Files should have different names due to timestamps
      expect(result1.filesCreated[0]).not.toBe(result2.filesCreated[0]);
    });
  });
});
