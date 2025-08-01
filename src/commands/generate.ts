import { Command, Flags } from '@oclif/core';
import { GitHubProvider } from '../providers/github.js';
import { StripeProvider } from '../providers/stripe.js';
import { scrubPII } from '../utils/scrub.js';
import { GDPRClassifier } from '../utils/classify.js';
import { EvidencePackBuilder } from '../utils/pack.js';
import { ArchiveCreator } from '../utils/archive.js';
import { FileCleanup } from '../utils/cleanup.js';
import { PerformanceMonitor } from '../utils/performance.js';
import Login from './login.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Load encrypted config as fallback
const encryptedConfig = Login.loadConfigAsEnv();
for (const [key, value] of Object.entries(encryptedConfig)) {
    if (!process.env[key]) {
        process.env[key] = value as string;
    }
}

export default class Generate extends Command {
    static description = 'Generate DSAR evidence pack';

    static flags = {
        email: Flags.string({ char: 'e', required: true, description: 'User email' }),
        githubOrg: Flags.string({ char: 'g', required: true, description: 'GitHub org' }),
    };

    async run() {
        const { flags } = await this.parse(Generate);

        // Initialize performance monitoring
        const perfMonitor = new PerformanceMonitor();
        perfMonitor.updateProgress('initialization', 0, 7);

        // Initialize cleanup system
        const cleanup = new FileCleanup();
        await cleanup.cleanupOldFiles();

        this.log(`👉  Starting export for ${flags.email}`);
        this.log(`🏢  GitHub organization: ${flags.githubOrg}`);
        this.log(`⏰  Export timestamp: ${new Date().toISOString()}`);
        this.log(`📊  Memory limit: 300MB (current: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB)\n`);

        // Step 1: GitHub Export
        perfMonitor.updateProgress('github-export', 1, 7);
        this.log('📁 Step 1: Exporting GitHub data...');
        const githubToken = process.env.GITHUB_TOKEN || encryptedConfig.GITHUB_TOKEN;
        if (!githubToken) {
            this.log('❌ GitHub token not found!');
            this.log('💡 Run: autopv login');
            this.log('   Or set GITHUB_TOKEN environment variable');
            throw new Error('GitHub token required for data export');
        }

        const githubProvider = new GitHubProvider(githubToken);
        const githubData = await githubProvider.exportUserData(flags.email, flags.githubOrg);
        this.log(`   ✅ GitHub: ${githubData.events.length} events, ${githubData.audit.length} audit entries`);
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        perfMonitor.forceGarbageCollection();

        // Step 2: Stripe Export
        perfMonitor.updateProgress('stripe-export', 2, 7);
        this.log('💳 Step 2: Exporting Stripe data...');
        let stripeData = { customers: [], charges: [], methods: [] };

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (stripeKey) {
            const stripeProvider = new StripeProvider(stripeKey);
            stripeData = await stripeProvider.exportCustomerData(flags.email);
            this.log(`   ✅ Stripe: ${stripeData.customers.length} customers, ${stripeData.charges.length} charges, ${stripeData.methods.length} methods`);
        } else {
            this.log('   ⏭️  Stripe: No API key provided, skipping Stripe export');
        }
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        perfMonitor.forceGarbageCollection();

        // Step 3: Merge data
        perfMonitor.updateProgress('data-merge', 3, 7);
        this.log('🔗 Step 3: Merging data sources...');
        const mergedData = {
            email: flags.email,
            githubOrg: flags.githubOrg,
            exportTimestamp: new Date().toISOString(),
            github: githubData,
            stripe: stripeData
        };

        const dataSize = JSON.stringify(mergedData).length;
        this.log(`   ✅ Merged data: ${dataSize} bytes total`);
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        // Step 4: PII Scrubbing
        perfMonitor.updateProgress('pii-scrubbing', 4, 7);
        this.log('🧹 Step 4: Scrubbing PII...');
        const scrubResult = scrubPII(mergedData);
        this.log(`   ✅ PII scrubbing: ${scrubResult.stats.itemsFound} items found, ${scrubResult.stats.bytesReduced} bytes reduced`);
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        perfMonitor.forceGarbageCollection();

        // Step 5: GDPR Classification
        perfMonitor.updateProgress('gdpr-classification', 5, 7);
        this.log('⚖️  Step 5: GDPR classification...');
        let gdprAnalysis = null;

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
            const classifier = new GDPRClassifier(openaiApiKey);
            gdprAnalysis = await classifier.classifyData(scrubResult.scrubbedData);
            this.log(`   ✅ GDPR analysis: ${gdprAnalysis.classifications.length} fields classified`);
        } else {
            this.log('   ⏭️  GDPR: No OpenAI API key provided, skipping GDPR classification');
        }
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        perfMonitor.forceGarbageCollection();

        // Step 6: Evidence Pack Generation
        perfMonitor.updateProgress('evidence-generation', 6, 7);
        this.log('📄 Step 6: Building evidence pack...');
        const packBuilder = new EvidencePackBuilder();
        const evidenceData = {
            email: flags.email,
            githubOrg: flags.githubOrg,
            exportTimestamp: new Date().toISOString(),
            original: {
                email: flags.email,
                githubOrg: flags.githubOrg,
                exportTimestamp: new Date().toISOString(),
                github: githubData,
                stripe: stripeData
            },
            scrubbed: scrubResult.scrubbedData,
            scrubStats: scrubResult.stats,
            gdprClassification: gdprAnalysis
        };
        const evidenceFiles = await packBuilder.generateEvidencePack(evidenceData);
        this.log(`   ✅ Evidence pack: ${evidenceFiles.pdfPath} (${evidenceFiles.summary.pdfSize} bytes)`);
        this.log(`   ✅ CSV mapping: ${evidenceFiles.csvPath} (${evidenceFiles.summary.csvSize} bytes)`);
        this.log(`   📊 Memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        perfMonitor.forceGarbageCollection();

        // Step 7: Encrypted Archive
        perfMonitor.updateProgress('archive-creation', 7, 7);
        this.log('🔐 Step 7: Creating encrypted archive...');
        const archivePassword = process.env.ARCHIVE_PW || encryptedConfig.ARCHIVE_PW;
        if (!archivePassword) {
            this.log('❌ Archive password not found!');
            this.log('💡 Run: autopv login');
            this.log('   Or set ARCHIVE_PW environment variable');
            throw new Error('Archive password required for secure delivery');
        }

        const archiveCreator = new ArchiveCreator('.', archivePassword);
        const archiveResult = await archiveCreator.createEncryptedArchive(
            evidenceFiles.filesCreated,
            `evidence_pack_${flags.email.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
        );

        if (archiveResult.success) {
            this.log(`   ✅ Archive created: ${archiveResult.archivePath}`);
            this.log(`   📦 Archive size: ${Math.round(archiveResult.archiveSize / 1024)} KB`);
            this.log(`   🧹 Cleanup: ${archiveResult.filesArchived.length} files archived`);
        } else {
            this.log(`   ❌ Archive creation failed: ${archiveResult.error}`);
        }
        this.log(`   📊 Final memory: ${perfMonitor.getCurrentMemoryMB().toFixed(1)}MB\n`);

        // Final performance summary
        perfMonitor.stop();

        this.log('🎉 DSAR evidence generation complete!');
        this.log(`📧 Deliverable ready for: ${flags.email}`);
        if (archiveResult.success) {
            this.log(`🔒 Archive: ${archiveResult.archivePath}`);
        }
    }
}
