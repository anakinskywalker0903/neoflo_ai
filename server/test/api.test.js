import assert from 'assert';
import http from 'http';
import { analyzeScreenshot } from '../src/services/visionService.js';
import { isDomainSensitive, sanitizeText } from '../src/services/privacyService.js';

console.log('Running VisionPulse AI Test Suite...');

// Test 1: Privacy Domain Blacklist Verification
console.log('Test 1: Testing Privacy Domain Blacklisting...');
assert.strictEqual(isDomainSensitive('https://www.chase.com/login'), true);
assert.strictEqual(isDomainSensitive('https://paypal.com/checkout'), true);
assert.strictEqual(isDomainSensitive('https://github.com/facebook/react'), false);
console.log('✓ Privacy Domain Blacklist test passed.');

// Test 2: Sanitization of Sensitive Text
console.log('Test 2: Testing Text Sanitization...');
const sensitiveText = 'My email is test@example.com and key is sk_live_123456789012345678901234';
const sanitized = sanitizeText(sensitiveText);
assert.ok(sanitized.includes('[REDACTED_EMAIL]'));
assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
console.log('✓ Text sanitization test passed.');

// Test 3: Heuristic Vision LLM Fallback Analyzer
console.log('Test 3: Testing Heuristic Vision LLM Analysis...');
const res = await analyzeScreenshot(null, {
  pageUrl: 'https://github.com/facebook/react',
  pageTitle: 'facebook/react: The library for web user interfaces'
});
assert.strictEqual(res.category, 'Coding');
assert.strictEqual(res.domain, 'github.com');
assert.strictEqual(res.productivity_score, 1);
console.log('✓ Vision LLM Heuristic analysis test passed.');

console.log('\n=============================================');
console.log('🎉 ALL AUTOMATED VERIFICATION TESTS PASSED!');
console.log('=============================================');
