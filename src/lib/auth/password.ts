import crypto from "crypto";

/**
 * Hash a password using PBKDF2 with a cryptographically secure random salt.
 * Uses 100,000 iterations of SHA-512.
 * Output format: <salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify a plaintext password against a stored PBKDF2 salt:hash string.
 * Uses timing-safe comparison to prevent timing side-channel attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return resolve(false);

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const keyBuffer = Buffer.from(derivedKey.toString("hex"), "hex");
        const hashBuffer = Buffer.from(hash, "hex");
        if (keyBuffer.length !== hashBuffer.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, hashBuffer));
      } catch {
        resolve(false);
      }
    });
  });
}
