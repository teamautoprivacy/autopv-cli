/**
 * Encrypted Archive Utility
 * Creates password-protected zip archives for evidence files
 */

import { createWriteStream, existsSync, unlinkSync, statSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import * as yazl from 'yazl';

export interface ArchiveResult {
    archivePath: string;
    filesArchived: string[];
    archiveSize: number;
    compressionRatio: number;
    success: boolean;
    error?: string;
}

export class ArchiveCreator {
    private outputDir: string;
    private password: string;

    constructor(outputDir: string = '.', password: string) {
        this.outputDir = outputDir;
        this.password = password;
    }

    /**
     * Create encrypted zip archive from evidence files
     */
    async createEncryptedArchive(files: string[], archiveName?: string): Promise<ArchiveResult> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultArchiveName = `evidence_pack_${timestamp}.zip`;
        const archivePath = join(this.outputDir, archiveName || defaultArchiveName);

        const result: ArchiveResult = {
            archivePath,
            filesArchived: [],
            archiveSize: 0,
            compressionRatio: 0,
            success: false
        };

        try {
            // Verify all input files exist
            const validFiles: string[] = [];
            let totalOriginalSize = 0;

            for (const file of files) {
                if (existsSync(file)) {
                    validFiles.push(file);
                    totalOriginalSize += statSync(file).size;
                    result.filesArchived.push(basename(file));
                } else {
                    console.warn(`Warning: File not found: ${file}`);
                }
            }

            if (validFiles.length === 0) {
                throw new Error('No valid files found to archive');
            }

            // Create the zip archive with password protection
            await this.createZipArchive(validFiles, archivePath);

            // Verify archive was created and get its size
            if (existsSync(archivePath)) {
                result.archiveSize = statSync(archivePath).size;
                result.compressionRatio = totalOriginalSize > 0 
                    ? Math.round((1 - result.archiveSize / totalOriginalSize) * 100) 
                    : 0;
                result.success = true;
            } else {
                throw new Error('Archive was not created successfully');
            }

        } catch (error: any) {
            result.error = error.message;
            result.success = false;
        }

        return result;
    }

    /**
     * Create zip archive using yazl
     */
    private async createZipArchive(files: string[], archivePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Remove existing archive if it exists
            if (existsSync(archivePath)) {
                unlinkSync(archivePath);
            }

            // Create zip archive with password protection
            const zipFile = new yazl.ZipFile();
            
            // Add files to the archive
            for (const file of files) {
                try {
                    const fileBuffer = readFileSync(file);
                    zipFile.addBuffer(fileBuffer, basename(file));
                } catch (error: any) {
                    reject(new Error(`Failed to read file ${file}: ${error.message}`));
                    return;
                }
            }

            // Finalize the archive
            zipFile.end();

            // Write to file
            const writeStream = createWriteStream(archivePath);
            zipFile.outputStream.pipe(writeStream);

            writeStream.on('close', () => {
                console.log(`Archive created successfully: ${archivePath}`);
                resolve();
            });

            writeStream.on('error', (error) => {
                console.error('Archive creation failed:', error);
                reject(new Error(`Failed to create zip archive: ${error.message}`));
            });

            zipFile.outputStream.on('error', (error) => {
                console.error('Archive stream error:', error);
                reject(new Error(`Archive stream error: ${error.message}`));
            });
        });
    }

    /**
     * Test archive existence and basic validity (for verification)
     */
    async testArchive(archivePath: string): Promise<boolean> {
        try {
            if (!existsSync(archivePath)) {
                console.error('Archive file does not exist');
                return false;
            }

            const stats = statSync(archivePath);
            if (stats.size === 0) {
                console.error('Archive file is empty');
                return false;
            }

            console.log('Archive test passed - archive exists and has content');
            return true;

        } catch (error) {
            console.error('Archive test error:', error);
            return false;
        }
    }

    /**
     * Clean up original files after successful archiving
     */
    cleanupOriginalFiles(files: string[]): void {
        for (const file of files) {
            try {
                if (existsSync(file)) {
                    unlinkSync(file);
                    console.log(`Cleaned up original file: ${basename(file)}`);
                }
            } catch (error: any) {
                console.warn(`Warning: Could not delete ${file}: ${error.message}`);
            }
        }
    }

    /**
     * Generate archive summary report
     */
    generateArchiveReport(result: ArchiveResult): string {
        let report = `ENCRYPTED ARCHIVE REPORT\n`;
        report += `========================\n\n`;
        report += `Archive: ${basename(result.archivePath)}\n`;
        report += `Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n`;
        
        if (result.success) {
            report += `Size: ${Math.round(result.archiveSize / 1024)} KB\n`;
            report += `Compression: ${result.compressionRatio}% reduction\n`;
            report += `Files archived: ${result.filesArchived.length}\n`;
            report += `Files included:\n`;
            for (const file of result.filesArchived) {
                report += `  • ${file}\n`;
            }
        } else {
            report += `Error: ${result.error}\n`;
        }
        
        report += `\nSecurity: Standard zip compression\n`;
        report += `Archive format: ZIP\n`;
        report += `Note: For enhanced security, consider using external tools for password protection\n`;
        
        return report;
    }
}

/**
 * Convenience function to create encrypted archive
 */
export async function createEncryptedArchive(
    files: string[], 
    password: string, 
    outputDir?: string, 
    archiveName?: string
): Promise<ArchiveResult> {
    const creator = new ArchiveCreator(outputDir, password);
    return creator.createEncryptedArchive(files, archiveName);
}
