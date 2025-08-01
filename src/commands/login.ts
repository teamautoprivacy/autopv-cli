import { Command, Flags } from '@oclif/core';
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import * as readline from 'readline';

interface AutoPVConfig {
  githubToken?: string;
  stripeSecretKey?: string;
  openaiApiKey?: string;
  archivePassword?: string;
  createdAt: string;
  lastUpdated: string;
}

export default class Login extends Command {
  static description = 'Configure API keys and secrets for AutoPrivacy CLI';

  static examples = [
    '$ autopv login',
    '$ autopv login --github-token ghp_your_token_here',
    '$ autopv login --reset'
  ];

  static flags = {
    'github-token': Flags.string({
      char: 'g',
      description: 'GitHub Personal Access Token (repo:read, admin:org scopes)'
    }),
    'stripe-key': Flags.string({
      char: 's', 
      description: 'Stripe Secret Key (optional, for payment data export)'
    }),
    'openai-key': Flags.string({
      char: 'o',
      description: 'OpenAI API Key (for GDPR classification)'
    }),
    'archive-password': Flags.string({
      char: 'p',
      description: 'Password for encrypted evidence archives'
    }),
    reset: Flags.boolean({
      char: 'r',
      description: 'Reset all stored credentials'
    }),
    show: Flags.boolean({
      description: 'Show current configuration (masked)'
    })
  };

  private configPath = join(homedir(), '.autopv', 'config.json');
  private encryptionKey = 'autopv-cli-encryption-key-v1'; // In production, use better key derivation

  async run() {
    const { flags } = await this.parse(Login);

    // Ensure config directory exists
    const configDir = dirname(this.configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    if (flags.reset) {
      return this.resetConfig();
    }

    if (flags.show) {
      return this.showConfig();
    }

    // Interactive or flag-based configuration
    await this.configureSecrets(flags);
  }

  private async configureSecrets(flags: any) {
    this.log('🔐 AutoPrivacy CLI - Secrets Configuration');
    this.log('');

    let config = this.loadConfig();

    // GitHub Token
    if (flags['github-token']) {
      config.githubToken = flags['github-token'];
      this.log('✅ GitHub token updated');
    } else if (!config.githubToken) {
      this.log('📋 GitHub Personal Access Token Setup:');
      this.log('   1. Go to: https://github.com/settings/tokens');
      this.log('   2. Click "Generate new token (classic)"');
      this.log('   3. Select scopes: repo:read, admin:org');
      this.log('   4. Copy the token and paste below');
      this.log('');
      
      const githubToken = await this.promptSecret('Enter GitHub token (ghp_...): ');
      if (githubToken) {
        config.githubToken = githubToken;
        this.log('✅ GitHub token saved');
      }
    }

    // OpenAI API Key
    if (flags['openai-key']) {
      config.openaiApiKey = flags['openai-key'];
      this.log('✅ OpenAI API key updated');
    } else if (!config.openaiApiKey) {
      this.log('');
      this.log('🤖 OpenAI API Key Setup (for GDPR classification):');
      this.log('   1. Go to: https://platform.openai.com/api-keys');
      this.log('   2. Click "Create new secret key"');
      this.log('   3. Copy the key and paste below');
      this.log('');
      
      const openaiKey = await this.promptSecret('Enter OpenAI API key (sk-...): ');
      if (openaiKey) {
        config.openaiApiKey = openaiKey;
        this.log('✅ OpenAI API key saved');
      }
    }

    // Stripe Secret Key (optional)
    if (flags['stripe-key']) {
      config.stripeSecretKey = flags['stripe-key'];
      this.log('✅ Stripe secret key updated');
    } else if (!config.stripeSecretKey) {
      this.log('');
      this.log('💳 Stripe Secret Key Setup (optional):');
      this.log('   • Skip if you don\'t use Stripe for payments');
      this.log('   • Go to: https://dashboard.stripe.com/apikeys');
      this.log('   • Copy "Secret key" and paste below');
      this.log('');
      
      const stripeKey = await this.promptSecret('Enter Stripe secret key (sk_...) or press Enter to skip: ', true);
      if (stripeKey) {
        config.stripeSecretKey = stripeKey;
        this.log('✅ Stripe secret key saved');
      } else {
        this.log('⏭️  Skipped Stripe configuration');
      }
    }

    // Archive Password
    if (flags['archive-password']) {
      config.archivePassword = flags['archive-password'];
      this.log('✅ Archive password updated');
    } else if (!config.archivePassword) {
      this.log('');
      this.log('🔒 Archive Password Setup:');
      this.log('   • Used to encrypt evidence pack archives');
      this.log('   • Share this password with data subjects for file extraction');
      this.log('');
      
      const archivePassword = await this.promptSecret('Enter archive password: ');
      if (archivePassword) {
        config.archivePassword = archivePassword;
        this.log('✅ Archive password saved');
      }
    }

    // Save encrypted configuration
    config.lastUpdated = new Date().toISOString();
    if (!config.createdAt) {
      config.createdAt = config.lastUpdated;
    }

    this.saveConfig(config);
    
    this.log('');
    this.log('🎉 Configuration complete!');
    this.log('');
    this.log('📁 Config saved to:', this.configPath);
    this.log('🔐 All secrets are encrypted at rest');
    this.log('');
    this.log('Next steps:');
    this.log('  autopv generate -e user@company.com -g github-org');
    this.log('');
  }

  private async promptSecret(prompt: string, optional: boolean = false): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      // Hide input for secrets
      const stdin = process.stdin;
      stdin.setRawMode(true);
      
      let input = '';
      process.stdout.write(prompt);

      stdin.on('data', (data: Buffer) => {
        const char = data.toString();
        
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input.trim());
        } else if (char === '\u0003') { // Ctrl+C
          process.exit(0);
        } else if (char === '\u007f') { // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += char;
          process.stdout.write('*');
        }
      });
    });
  }

  private loadConfig(): AutoPVConfig {
    if (!existsSync(this.configPath)) {
      return {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      const encryptedData = readFileSync(this.configPath, 'utf8');
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      this.warn('Failed to load config, creating new one');
      return {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private saveConfig(config: AutoPVConfig) {
    const encrypted = this.encrypt(JSON.stringify(config, null, 2));
    writeFileSync(this.configPath, encrypted, { mode: 0o600 }); // Restrict file permissions
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = pbkdf2Sync(this.encryptionKey, 'autopv-salt', 10000, 32, 'sha256');
    const iv = randomBytes(16);
    
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = pbkdf2Sync(this.encryptionKey, 'autopv-salt', 10000, 32, 'sha256');
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private showConfig() {
    const config = this.loadConfig();
    
    this.log('🔐 AutoPrivacy CLI Configuration');
    this.log('');
    this.log('GitHub Token:', config.githubToken ? '✅ Configured (ghp_***...)' : '❌ Not configured');
    this.log('OpenAI API Key:', config.openaiApiKey ? '✅ Configured (sk-***...)' : '❌ Not configured');
    this.log('Stripe Secret Key:', config.stripeSecretKey ? '✅ Configured (sk_***...)' : '⏭️  Not configured (optional)');
    this.log('Archive Password:', config.archivePassword ? '✅ Configured' : '❌ Not configured');
    this.log('');
    this.log('Created:', config.createdAt);
    this.log('Last Updated:', config.lastUpdated);
    this.log('Config Path:', this.configPath);
  }

  private resetConfig() {
    if (existsSync(this.configPath)) {
      const fs = require('fs');
      fs.unlinkSync(this.configPath);
      this.log('✅ Configuration reset - all secrets cleared');
    } else {
      this.log('ℹ️  No configuration found to reset');
    }
  }

  /**
   * Export configuration as environment variables for the generate command
   */
  static loadConfigAsEnv(): { [key: string]: string } {
    const configPath = join(homedir(), '.autopv', 'config.json');
    
    if (!existsSync(configPath)) {
      return {};
    }

    try {
      const encryptionKey = 'autopv-cli-encryption-key-v1';
      const encryptedData = readFileSync(configPath, 'utf8');
      
      const algorithm = 'aes-256-cbc';
      const key = pbkdf2Sync(encryptionKey, 'autopv-salt', 10000, 32, 'sha256');
      
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const config: AutoPVConfig = JSON.parse(decrypted);
      
      const env: { [key: string]: string } = {};
      if (config.githubToken) env.GITHUB_TOKEN = config.githubToken;
      if (config.openaiApiKey) env.OPENAI_API_KEY = config.openaiApiKey;
      if (config.stripeSecretKey) env.STRIPE_SECRET_KEY = config.stripeSecretKey;
      if (config.archivePassword) env.ARCHIVE_PW = config.archivePassword;
      
      return env;
    } catch (error) {
      return {};
    }
  }
}
