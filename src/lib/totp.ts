import crypto from 'crypto';

// Base32 decoder
function base32Decode(base32: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    // Clean and uppercase
    const cleaned = base32.replace(/=+$/, '').toUpperCase();
    const length = cleaned.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));

    for (let i = 0; i < length; i++) {
        const val = alphabet.indexOf(cleaned.charAt(i));
        if (val === -1) {
            throw new Error('Invalid base32 character');
        }
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            buffer[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return buffer;
}

// Generate HOTP token
function generateHOTP(secretBuffer: Buffer, counter: number): string {
    // Counter needs to be an 8-byte buffer
    const counterBuffer = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
        counterBuffer[i] = tmp & 0xff;
        tmp = tmp >> 8;
    }

    // HMAC SHA-1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Truncate
    const offset = digest[digest.length - 1] & 0xf;
    const code =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    // Get 6 digits
    const token = code % 1000000;
    return token.toString().padStart(6, '0');
}

// Verify TOTP token
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
    try {
        const secretBuffer = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const currentCounter = Math.floor(epoch / 30);

        // Check current, previous, and next counters
        for (let i = -window; i <= window; i++) {
            const calculatedToken = generateHOTP(secretBuffer, currentCounter + i);
            if (calculatedToken === token) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}
