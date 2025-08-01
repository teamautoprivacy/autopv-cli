import { describe, it, expect } from 'vitest';
import { PIIScrubber } from '../scrub.js';

describe('PIIScrubber', () => {
  const scrubber = new PIIScrubber();

  describe('email redaction', () => {
    it('should redact email addresses', () => {
      const data = { email: 'user@example.com', message: 'Contact me at john.doe@company.org' };
      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(scrubbed.email).toBe('[REDACTED]');
      expect(scrubbed.message).toBe('Contact me at [REDACTED]');
      expect(stats.emailsFound).toBe(2);
    });

    it('should handle multiple email formats', () => {
      const emails = [
        'simple@test.com',
        'user.name+tag@example.co.uk',
        'test123@sub.domain.org'
      ];
      
      emails.forEach(email => {
        const scrubbed = scrubber.scrubObject({ email });
        expect(scrubbed.email).toBe('[REDACTED]');
      });
    });
  });

  describe('phone number redaction', () => {
    it('should redact various phone formats', () => {
      const phones = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567'
      ];
      
      phones.forEach(phone => {
        const scrubbed = scrubber.scrubObject({ phone });
        expect(scrubbed.phone).toBe('[REDACTED]');
      });
    });
  });

  describe('SSN redaction', () => {
    it('should redact SSN formats', () => {
      const ssns = ['123-45-6789', '123456789'];
      
      ssns.forEach(ssn => {
        const scrubbed = scrubber.scrubObject({ ssn });
        expect(scrubbed.ssn).toBe('[REDACTED]');
      });
    });
  });

  describe('credit card redaction', () => {
    it('should redact credit card numbers', () => {
      const cards = [
        '4111-1111-1111-1111',
        '4111111111111111',
        '4111 1111 1111 1111'
      ];
      
      cards.forEach(card => {
        const scrubbed = scrubber.scrubObject({ card });
        expect(scrubbed.card).toBe('[REDACTED]');
      });
    });
  });

  describe('API key redaction', () => {
    it('should redact GitHub tokens', () => {
      const data = { token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123' };
      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(scrubbed.token).toBe('[REDACTED]');
      expect(stats.apiKeysFound).toBe(1);
    });

    it('should redact Stripe keys', () => {
      const data = { key: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz' };
      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(scrubbed.key).toBe('[REDACTED]');
      expect(stats.apiKeysFound).toBe(1);
    });
  });

  describe('nested object scrubbing', () => {
    it('should scrub nested objects recursively', () => {
      const data = {
        user: {
          email: 'test@example.com',
          profile: {
            phone: '555-123-4567',
            address: {
              email: 'contact@company.com'
            }
          }
        },
        contacts: [
          { email: 'friend@test.com' },
          { phone: '(555) 987-6543' }
        ]
      };

      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(scrubbed.user.email).toBe('[REDACTED]');
      expect(scrubbed.user.profile.phone).toBe('[REDACTED]');
      expect(scrubbed.user.profile.address.email).toBe('[REDACTED]');
      expect(scrubbed.contacts[0].email).toBe('[REDACTED]');
      expect(scrubbed.contacts[1].phone).toBe('[REDACTED]');
      expect(stats.emailsFound).toBe(3);
      expect(stats.phonesFound).toBe(2);
    });
  });

  describe('statistics tracking', () => {
    it('should track data size reduction', () => {
      const data = { email: 'verylongemailaddress@example.com' };
      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(originalString.length).toBeGreaterThan(scrubbedString.length);
      expect(stats.totalReductions).toBeGreaterThan(0);
    });

    it('should count all redaction types', () => {
      const data = {
        email: 'test@example.com',
        phone: '555-123-4567',
        ssn: '123-45-6789',
        card: '4111-1111-1111-1111',
        token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123'
      };

      const originalString = JSON.stringify(data);
      const scrubbed = scrubber.scrubObject(data);
      const scrubbedString = JSON.stringify(scrubbed);
      const stats = scrubber.getScrubStats(originalString, scrubbedString);
      
      expect(stats.emailsFound).toBe(1);
      expect(stats.phonesFound).toBe(1);
      expect(stats.ssnsFound).toBe(1);
      expect(stats.creditCardsFound).toBe(1);
      expect(stats.apiKeysFound).toBe(1);
    });
  });

  describe('IP address handling', () => {
    it('should preserve IP addresses when configured', () => {
      const scrubberWithIPs = new PIIScrubber({ maskIPAddresses: false });
      const data = { ip: '192.168.1.1', email: 'test@example.com' };
      const scrubbed = scrubberWithIPs.scrubObject(data);
      
      expect(scrubbed.ip).toBe('192.168.1.1');
      expect(scrubbed.email).toBe('[REDACTED]');
    });
  });
});
