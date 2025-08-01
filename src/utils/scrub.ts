/**
 * PII Scrubbing Utility
 * Removes or masks personally identifiable information from data before LLM processing
 */

export interface ScrubConfig {
    maskEmails?: boolean;
    maskPhones?: boolean;
    maskSSNs?: boolean;
    maskCreditCards?: boolean;
    maskIPAddresses?: boolean;
    maskCustomPatterns?: RegExp[];
    placeholder?: string;
}

export class PIIScrubber {
    private config: Required<ScrubConfig>;

    // Common PII patterns
    private static readonly PATTERNS = {
        // Email addresses (more comprehensive pattern)
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        
        // Phone numbers (various formats)
        phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        
        // Social Security Numbers
        ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        
        // Credit card numbers (basic pattern)
        creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        
        // IP addresses
        ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        
        // Common sensitive keywords patterns
        apiKey: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['\"]?([a-zA-Z0-9_-]+)['\"]?/gi,
        
        // GitHub tokens
        githubToken: /\bghp_[a-zA-Z0-9]{36}\b/g,
        
        // Stripe keys
        stripeKey: /\b(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{24,}\b/g,
    };

    constructor(config: ScrubConfig = {}) {
        this.config = {
            maskEmails: config.maskEmails ?? true,
            maskPhones: config.maskPhones ?? true,
            maskSSNs: config.maskSSNs ?? true,
            maskCreditCards: config.maskCreditCards ?? true,
            maskIPAddresses: config.maskIPAddresses ?? false, // Often needed for logs
            maskCustomPatterns: config.maskCustomPatterns ?? [],
            placeholder: config.placeholder ?? '[REDACTED]'
        };
    }

    /**
     * Scrub PII from a string
     */
    scrubString(text: string): string {
        let scrubbed = text;

        if (this.config.maskEmails) {
            scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.email, this.config.placeholder);
        }

        if (this.config.maskPhones) {
            scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.phone, this.config.placeholder);
        }

        if (this.config.maskSSNs) {
            scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.ssn, this.config.placeholder);
        }

        if (this.config.maskCreditCards) {
            scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.creditCard, this.config.placeholder);
        }

        if (this.config.maskIPAddresses) {
            scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.ipAddress, this.config.placeholder);
        }

        // Always mask API keys and tokens for security
        scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.apiKey, `$1: ${this.config.placeholder}`);
        scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.githubToken, this.config.placeholder);
        scrubbed = scrubbed.replace(PIIScrubber.PATTERNS.stripeKey, this.config.placeholder);

        // Apply custom patterns
        for (const pattern of this.config.maskCustomPatterns) {
            scrubbed = scrubbed.replace(pattern, this.config.placeholder);
        }

        return scrubbed;
    }

    /**
     * Recursively scrub PII from any object/array structure
     */
    scrubObject(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return this.scrubString(obj);
        }

        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.scrubObject(item));
        }

        if (typeof obj === 'object') {
            const scrubbed: any = {};
            for (const [key, value] of Object.entries(obj)) {
                // Also scrub keys that might contain PII
                const scrubbedKey = this.scrubString(key);
                scrubbed[scrubbedKey] = this.scrubObject(value);
            }
            return scrubbed;
        }

        return obj;
    }

    /**
     * Get statistics about what was scrubbed
     */
    getScrubStats(original: string, scrubbed: string): {
        emailsFound: number;
        phonesFound: number;
        ssnsFound: number;
        creditCardsFound: number;
        ipAddressesFound: number;
        apiKeysFound: number;
        totalReductions: number;
    } {
        return {
            emailsFound: (original.match(PIIScrubber.PATTERNS.email) || []).length,
            phonesFound: (original.match(PIIScrubber.PATTERNS.phone) || []).length,
            ssnsFound: (original.match(PIIScrubber.PATTERNS.ssn) || []).length,
            creditCardsFound: (original.match(PIIScrubber.PATTERNS.creditCard) || []).length,
            ipAddressesFound: (original.match(PIIScrubber.PATTERNS.ipAddress) || []).length,
            apiKeysFound: (original.match(PIIScrubber.PATTERNS.apiKey) || []).length + 
                         (original.match(PIIScrubber.PATTERNS.githubToken) || []).length +
                         (original.match(PIIScrubber.PATTERNS.stripeKey) || []).length,
            totalReductions: original.length - scrubbed.length
        };
    }
}

/**
 * Convenience function to scrub data with default settings
 */
export function scrubPII(data: any, config?: ScrubConfig): any {
    const scrubber = new PIIScrubber(config);
    return scrubber.scrubObject(data);
}

/**
 * Convenience function to scrub just strings
 */
export function scrubString(text: string, config?: ScrubConfig): string {
    const scrubber = new PIIScrubber(config);
    return scrubber.scrubString(text);
}
