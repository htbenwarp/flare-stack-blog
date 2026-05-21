const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode("valid")
  );
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const encHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `${saltHex}:${ivHex}:${encHex}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [saltHex, ivHex, encHex] = hash.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const encrypted = new Uint8Array(encHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted) === "valid";
  } catch {
    return false;
  }
}
