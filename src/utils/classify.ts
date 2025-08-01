/**
 * GDPR Article Classification Utility
 * Uses GPT-4o to classify data fields according to GDPR articles
 */

import OpenAI from 'openai';

export interface GDPRClassification {
    field: string;
    article: string;
    reasoning: string;
    dataType: string;
    sensitivity: 'low' | 'medium' | 'high';
}

export interface ClassificationResult {
    classifications: GDPRClassification[];
    summary: {
        totalFields: number;
        articlesFound: string[];
        highSensitivityFields: number;
        processingTime: number;
    };
}

export class GDPRClassifier {
    private openai: OpenAI;

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }

    /**
     * System prompt for GDPR classification
     */
    private getSystemPrompt(): string {
        return `You are a GDPR compliance expert. Your task is to analyze data fields and classify them according to GDPR articles.

For each data field provided, return a JSON array with objects containing:
- field: the field name/path
- article: the relevant GDPR article (e.g., "Art. 15", "Art. 6", "Art. 9", etc.)
- reasoning: brief explanation of why this article applies
- dataType: type of personal data (e.g., "contact", "financial", "behavioral", "technical")
- sensitivity: "low", "medium", or "high" based on GDPR sensitivity levels

Key GDPR Articles to consider:
- Art. 6: Lawfulness of processing (general personal data)
- Art. 9: Processing of special categories (sensitive data)
- Art. 15: Right of access by the data subject
- Art. 17: Right to erasure (right to be forgotten)
- Art. 20: Right to data portability
- Art. 21: Right to object
- Art. 25: Data protection by design and by default

Focus on data subject rights (Art. 15-22) for DSAR evidence packs.
Return ONLY valid JSON, no additional text.`;
    }

    /**
     * Extract field paths from nested object for classification
     */
    private extractFieldPaths(obj: any, prefix: string = ''): string[] {
        const fields: string[] = [];
        
        if (obj === null || obj === undefined) {
            return fields;
        }

        if (typeof obj === 'object' && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
                const fieldPath = prefix ? `${prefix}.${key}` : key;
                fields.push(fieldPath);
                
                // Recursively extract nested fields (limit depth to avoid too many fields)
                if (typeof value === 'object' && value !== null && prefix.split('.').length < 3) {
                    fields.push(...this.extractFieldPaths(value, fieldPath));
                }
            }
        } else if (Array.isArray(obj) && obj.length > 0) {
            // For arrays, analyze the first element structure
            const fieldPath = `${prefix}[0]`;
            fields.push(fieldPath);
            if (typeof obj[0] === 'object' && obj[0] !== null) {
                fields.push(...this.extractFieldPaths(obj[0], fieldPath));
            }
        }

        return fields;
    }

    /**
     * Classify data fields using GPT-4o
     */
    async classifyData(scrubbedData: any): Promise<ClassificationResult> {
        const startTime = Date.now();
        
        try {
            // Extract field paths from the scrubbed data
            const fieldPaths = this.extractFieldPaths(scrubbedData);
            
            if (fieldPaths.length === 0) {
                return {
                    classifications: [],
                    summary: {
                        totalFields: 0,
                        articlesFound: [],
                        highSensitivityFields: 0,
                        processingTime: Date.now() - startTime
                    }
                };
            }

            // Create a sample of the data structure for context
            const dataStructure = {
                fields: fieldPaths,
                sampleData: this.createDataSample(scrubbedData)
            };

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: `Classify these data fields according to GDPR articles for a DSAR evidence pack:\n\n${JSON.stringify(dataStructure, null, 2)}`
                    }
                ],
                temperature: 0.1, // Low temperature for consistent classification
                max_tokens: 2000
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from GPT-4o');
            }

            // Parse the JSON response
            let classifications: GDPRClassification[];
            try {
                classifications = JSON.parse(content);
            } catch (parseError) {
                throw new Error(`Failed to parse GPT-4o response as JSON: ${parseError}`);
            }

            // Validate and process the classifications
            const validClassifications = classifications.filter(c => 
                c.field && c.article && c.reasoning && c.dataType && c.sensitivity
            );

            const articlesFound = [...new Set(validClassifications.map(c => c.article))];
            const highSensitivityFields = validClassifications.filter(c => c.sensitivity === 'high').length;

            return {
                classifications: validClassifications,
                summary: {
                    totalFields: fieldPaths.length,
                    articlesFound,
                    highSensitivityFields,
                    processingTime: Date.now() - startTime
                }
            };

        } catch (error: any) {
            throw new Error(`GDPR classification failed: ${error.message}`);
        }
    }

    /**
     * Create a representative sample of the data structure
     */
    private createDataSample(obj: any, maxDepth: number = 2, currentDepth: number = 0): any {
        if (currentDepth >= maxDepth || obj === null || obj === undefined) {
            return typeof obj;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return [];
            return [this.createDataSample(obj[0], maxDepth, currentDepth + 1)];
        }

        if (typeof obj === 'object') {
            const sample: any = {};
            let count = 0;
            for (const [key, value] of Object.entries(obj)) {
                if (count >= 5) break; // Limit sample size
                sample[key] = this.createDataSample(value, maxDepth, currentDepth + 1);
                count++;
            }
            return sample;
        }

        return typeof obj;
    }

    /**
     * Generate a GDPR compliance report
     */
    generateComplianceReport(result: ClassificationResult): string {
        const { classifications, summary } = result;
        
        let report = `GDPR COMPLIANCE CLASSIFICATION REPORT\n`;
        report += `=====================================\n\n`;
        report += `Summary:\n`;
        report += `- Total fields analyzed: ${summary.totalFields}\n`;
        report += `- GDPR articles identified: ${summary.articlesFound.join(', ')}\n`;
        report += `- High sensitivity fields: ${summary.highSensitivityFields}\n`;
        report += `- Processing time: ${summary.processingTime}ms\n\n`;
        
        report += `Field Classifications:\n`;
        report += `---------------------\n`;
        
        for (const classification of classifications) {
            report += `Field: ${classification.field}\n`;
            report += `Article: ${classification.article}\n`;
            report += `Data Type: ${classification.dataType}\n`;
            report += `Sensitivity: ${classification.sensitivity}\n`;
            report += `Reasoning: ${classification.reasoning}\n\n`;
        }
        
        return report;
    }
}

/**
 * Convenience function to classify data with default settings
 */
export async function classifyGDPRData(scrubbedData: any, apiKey: string): Promise<ClassificationResult> {
    const classifier = new GDPRClassifier(apiKey);
    return classifier.classifyData(scrubbedData);
}
