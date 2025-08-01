import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ArchiveCreator } from '../archive.js';

describe('ArchiveCreator', () => {
  const testDir = './test-archive';
  const testPassword = 'test-password-123';
  let archiveCreator: ArchiveCreator;
  let testFiles: string[] = [];

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    archiveCreator = new ArchiveCreator(testDir, testPassword);
    
    // Create test files
    const testFile1 = join(testDir, 'test1.txt');
    const testFile2 = join(testDir, 'test2.pdf');
    
    writeFileSync(testFile1, 'This is test content for file 1');
    writeFileSync(testFile2, 'This is test content for file 2 - PDF simulation');
    
    testFiles = [testFile1, testFile2];
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('archive creation', () => {
    it('should create archive successfully', async () => {
      const result = await archiveCreator.createEncryptedArchive(testFiles, 'test-archive.zip');
      
      expect(result.success).toBe(true);
      expect(result.archivePath).toContain('test-archive.zip');
      expect(result.filesArchived).toEqual(testFiles);
      expect(result.archiveSize).toBeGreaterThan(0);
      expect(existsSync(result.archivePath)).toBe(true);
    });

    it('should handle empty file list', async () => {
      const result = await archiveCreator.createEncryptedArchive([]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid files found');
    });

    it('should handle non-existent files', async () => {
      const nonExistentFiles = [join(testDir, 'nonexistent.txt')];
      const result = await archiveCreator.createEncryptedArchive(nonExistentFiles);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid files found');
    });

    it('should calculate compression ratio', async () => {
      const result = await archiveCreator.createEncryptedArchive(testFiles);
      
      expect(result.success).toBe(true);
      expect(typeof result.compressionRatio).toBe('number');
      expect(result.archiveSize).toBeGreaterThan(0);
      expect(result.archiveSize).toBeGreaterThan(0);
    });
  });

  describe('archive testing', () => {
    it('should test archive integrity', async () => {
      const result = await archiveCreator.createEncryptedArchive(testFiles);
      expect(result.success).toBe(true);
      
      const testResult = await archiveCreator.testArchive(result.archivePath);
      expect(testResult).toBe(true);
    });

    it('should fail test for non-existent archive', async () => {
      const testResult = await archiveCreator.testArchive('nonexistent.zip');
      expect(testResult).toBe(false);
    });
  });

  describe('file cleanup', () => {
    it('should clean up original files', async () => {
      // Verify files exist before cleanup
      testFiles.forEach(file => {
        expect(existsSync(file)).toBe(true);
      });

      archiveCreator.cleanupOriginalFiles(testFiles);

      // Verify files are deleted after cleanup
      testFiles.forEach(file => {
        expect(existsSync(file)).toBe(false);
      });
    });

    it('should handle cleanup of non-existent files gracefully', () => {
      const nonExistentFiles = [join(testDir, 'nonexistent.txt')];
      
      // Should not throw error
      expect(() => {
        archiveCreator.cleanupOriginalFiles(nonExistentFiles);
      }).not.toThrow();
    });
  });

  describe('archive reporting', () => {
    it('should generate comprehensive archive report', async () => {
      const result = await archiveCreator.createEncryptedArchive(testFiles);
      expect(result.success).toBe(true);
      
      const report = archiveCreator.generateArchiveReport(result);
      
      expect(report).toContain('ENCRYPTED ARCHIVE REPORT');
      expect(report).toContain('SUCCESS');
      expect(report).toContain(result.archivePath);
      expect(report).toContain('ZIP');
      expect(report).toContain('test1.txt');
      expect(report).toContain('test2.pdf');
    });

    it('should generate error report for failed archive', () => {
      const failedResult = {
        success: false,
        error: 'Test error message',
        archivePath: '',
        archiveSize: 0,
        originalSize: 0,
        compressionRatio: 0,
        filesArchived: []
      };
      
      const report = archiveCreator.generateArchiveReport(failedResult);
      
      expect(report).toContain('ENCRYPTED ARCHIVE REPORT');
      expect(report).toContain('FAILED');
      expect(report).toContain('Test error message');
    });
  });

  describe('edge cases', () => {
    it('should handle very large file names', async () => {
      const longFileName = 'a'.repeat(200) + '.txt';
      const longFilePath = join(testDir, longFileName);
      writeFileSync(longFilePath, 'content');
      
      const result = await archiveCreator.createEncryptedArchive([longFilePath]);
      expect(result.success).toBe(true);
      
      // Cleanup
      if (existsSync(longFilePath)) {
        unlinkSync(longFilePath);
      }
    });

    it('should handle special characters in file names', async () => {
      const specialFileName = 'test-file_with@special#chars$.txt';
      const specialFilePath = join(testDir, specialFileName);
      writeFileSync(specialFilePath, 'content with special chars');
      
      const result = await archiveCreator.createEncryptedArchive([specialFilePath]);
      expect(result.success).toBe(true);
      
      // Cleanup
      if (existsSync(specialFilePath)) {
        unlinkSync(specialFilePath);
      }
    });
  });
});
