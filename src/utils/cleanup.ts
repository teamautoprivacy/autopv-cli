/**
 * File Cleanup Utility
 * Manages automatic cleanup of old evidence files (>24h) on CLI startup
 */

import { readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export interface CleanupResult {
    filesScanned: number;
    filesDeleted: number;
    deletedFiles: string[];
    totalSizeFreed: number;
    errors: string[];
}

export class FileCleanup {
    private readonly targetDir: string;
    private readonly maxAgeHours: number;

    constructor(targetDir: string = '.', maxAgeHours: number = 24) {
        this.targetDir = targetDir;
        this.maxAgeHours = maxAgeHours;
    }

    /**
     * Clean up old evidence files based on age
     */
    cleanupOldFiles(): CleanupResult {
        const result: CleanupResult = {
            filesScanned: 0,
            filesDeleted: 0,
            deletedFiles: [],
            totalSizeFreed: 0,
            errors: []
        };

        try {
            if (!existsSync(this.targetDir)) {
                return result;
            }

            const files = readdirSync(this.targetDir);
            const evidenceFilePatterns = [
                /^evidence_.*\.pdf$/,
                /^mapping_.*\.csv$/,
                /^evidence_pack_.*\.zip$/
            ];

            const cutoffTime = Date.now() - (this.maxAgeHours * 60 * 60 * 1000);

            for (const file of files) {
                // Only process evidence files
                const isEvidenceFile = evidenceFilePatterns.some(pattern => pattern.test(file));
                if (!isEvidenceFile) {
                    continue;
                }

                result.filesScanned++;

                try {
                    const filePath = join(this.targetDir, file);
                    const stats = statSync(filePath);
                    
                    // Check if file is older than cutoff time
                    if (stats.mtime.getTime() < cutoffTime) {
                        const fileSize = stats.size;
                        unlinkSync(filePath);
                        
                        result.filesDeleted++;
                        result.deletedFiles.push(file);
                        result.totalSizeFreed += fileSize;
                    }
                    
                } catch (error: any) {
                    result.errors.push(`Failed to process ${file}: ${error.message}`);
                }
            }

        } catch (error: any) {
            result.errors.push(`Directory scan failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Generate cleanup report
     */
    generateCleanupReport(result: CleanupResult): string {
        let report = 'FILE CLEANUP REPORT\n';
        report += '==================\n\n';
        
        report += `Files scanned: ${result.filesScanned}\n`;
        report += `Files deleted: ${result.filesDeleted}\n`;
        report += `Space freed: ${this.formatBytes(result.totalSizeFreed)}\n`;
        report += `Max age threshold: ${this.maxAgeHours} hours\n\n`;

        if (result.deletedFiles.length > 0) {
            report += 'Deleted files:\n';
            for (const file of result.deletedFiles) {
                report += `  • ${file}\n`;
            }
            report += '\n';
        }

        if (result.errors.length > 0) {
            report += 'Errors encountered:\n';
            for (const error of result.errors) {
                report += `  ⚠️  ${error}\n`;
            }
            report += '\n';
        }

        if (result.filesDeleted === 0 && result.errors.length === 0) {
            report += 'No old files found to clean up.\n';
        }

        return report;
    }

    /**
     * Format bytes to human readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * List evidence files in directory with age information
     */
    listEvidenceFiles(): Array<{file: string, age: string, size: string}> {
        const files: Array<{file: string, age: string, size: string}> = [];
        
        try {
            if (!existsSync(this.targetDir)) {
                return files;
            }

            const dirFiles = readdirSync(this.targetDir);
            const evidenceFilePatterns = [
                /^evidence_.*\.pdf$/,
                /^mapping_.*\.csv$/,
                /^evidence_pack_.*\.zip$/
            ];

            for (const file of dirFiles) {
                const isEvidenceFile = evidenceFilePatterns.some(pattern => pattern.test(file));
                if (!isEvidenceFile) {
                    continue;
                }

                try {
                    const filePath = join(this.targetDir, file);
                    const stats = statSync(filePath);
                    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
                    
                    files.push({
                        file,
                        age: `${ageHours.toFixed(1)}h`,
                        size: this.formatBytes(stats.size)
                    });
                    
                } catch (error) {
                    // Skip files that can't be accessed
                }
            }

        } catch (error) {
            // Return empty array if directory can't be read
        }

        return files.sort((a, b) => a.file.localeCompare(b.file));
    }
}

/**
 * Convenience function for cleanup with default settings
 */
export function cleanupOldEvidenceFiles(targetDir: string = '.', maxAgeHours: number = 24): CleanupResult {
    const cleanup = new FileCleanup(targetDir, maxAgeHours);
    return cleanup.cleanupOldFiles();
}
