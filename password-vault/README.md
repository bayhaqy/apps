# Password Vault

> A local, browser-only password manager with AES-256-GCM encryption and a strong password generator. No accounts, no sync, no uploads. Your master password never leaves your device.

**Live:** <https://bayhaqy.my.id/apps/password-vault/>

---

## What it does

Password Vault stores your login credentials in an encrypted blob that lives in this browser's `localStorage`. The vault is sealed with a master password using the Web Crypto API — the master password is never persisted, only used to derive an encryption key in-memory for the duration of a session.

It also ships a strong password generator with a real entropy meter, an auto-lock after inactivity, and encrypted export/import for portable backups.

> **⚠️ Security scope:** This is a convenience tool for **low-stakes** passwords (a forum account, a trial signup, a shared Netflix profile). It is **not** a replacement for dedicated password managers like Bitwarden or 1Password for critical accounts (email, banking, password recovery). `localStorage` can be wiped by browser cleanup, and a compromised browser extension could read the decrypted vault while it is unlocked. Use a real password manager for anything that matters.

## Features

- **Lock screen** with master password + optional hint
- **Create new vault** flow (password ×2 + optional hint)
- **AES-256-GCM** encryption with PBKDF2-SHA256 key derivation (100k iterations)
- **Vault entries**: title, username, password (masked, eye toggle), URL, notes, last-modified
- **Search** by title / username / URL / notes
- **Copy** username or password — clipboard auto-clears after 30 seconds
- **Encrypted export** as portable JSON backup (still requires master password to decrypt)
- **Encrypted import** from a backup file
- **Password generator** with length 8–64, character-set options, "exclude ambiguous" toggle
- **Entropy meter** in bits: `length × log2(charset_size)`
- **Auto-lock** after 1 / 5 / 15 minutes of inactivity, or off (configurable)
- **Demo vault** with 3 sample entries (master password `demo1234`) so you can try it instantly
- **Dark mode** with persistent preference

## How to use

1. **Create a vault** — Click "Create new vault" and pick a master password (≥6 characters). Add an optional hint if you want a reminder.
2. **Add entries** — Click "Add entry" and fill in title, username, password, URL, and notes. Use the generator panel for strong passwords.
3. **Day-to-day** — Search, copy username/password (clipboard auto-clears in 30s), reveal with the eye icon, edit or delete as needed.
4. **Backup** — Click "Export" to download the encrypted vault as `password-vault-YYYY-MM-DD.json`. Store it somewhere safe.
5. **Lock when done** — Click "Lock" or walk away; the vault auto-locks after 5 minutes of inactivity (configurable).

Want to try without creating a vault? Click **"Load demo vault"** on the lock screen — master password is `demo1234`, with three pre-filled entries (GitHub, Gmail, Netflix).

## Security model

### Cryptography

| Component | Spec |
|---|---|
| Key derivation | PBKDF2 with SHA-256, 100,000 iterations |
| Salt | 16 random bytes (`crypto.getRandomValues`), stored alongside ciphertext |
| Cipher | AES-256-GCM |
| IV | 96-bit (12 bytes), fresh random per encryption |
| Auth tag | 128-bit (default for AES-GCM) |
| Key lifetime | In-memory only — never persisted, never written to disk |
| Master password | Never stored. Only used briefly to derive the key. |

### Stored format

The vault blob in `localStorage["password-vault"]` looks like:

```json
{
  "v": 1,
  "salt": "<base64>",          // 16 bytes
  "iv": "<base64>",            // 12 bytes
  "ciphertext": "<base64>",    // AES-GCM ciphertext + auth tag
  "hint": "<string, optional, plaintext>",
  "updated": "<ISO timestamp>"
}
```

Wrong master password → AES-GCM auth-tag verification fails → decryption throws → app shows "Incorrect password". There is no rate-limit on attempts; an attacker with browser access could brute-force offline. **Use a strong, memorable master password.**

### Threat model — what this protects against and what it doesn't

**Protects against:**
- Casual shoulder-surfing (passwords are masked)
- Someone reading `localStorage` directly (data is ciphertext without the master password)
- Network interception (no network traffic at all)
- Cookie/session theft (no sessions exist)

**Does NOT protect against:**
- Malicious browser extensions that can read the DOM after you unlock
- A device compromise where the attacker captures keystrokes
- Forgetting your master password (no recovery — the vault is unrecoverable)
- Browser data being cleared (the encrypted blob is lost)
- Targeted brute-force by an attacker who exfiltrates the `localStorage` blob

For anything that matters, use Bitwarden, 1Password, or KeePassXC.

## Tech

- **HTML + CSS + vanilla JavaScript** in a single file. No build step, no framework.
- **Web Crypto API** (`window.crypto.subtle`) for all cryptographic primitives.
- **localStorage** for encrypted blob persistence.
- **Clipboard API** with auto-clear timer.
- System fonts only (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`; `ui-monospace` for code).

## Sample API call

The crypto core is plain async JavaScript — you can copy it into any page or worker:

```javascript
// Derive an AES-GCM key from a master password
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt any JSON-serializable object
async function encryptJSON(obj, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  return { v: 1, salt, iv, ciphertext };  // store as base64 strings
}

// Decrypt — throws if the password was wrong (auth tag check)
async function decryptJSON(payload, key) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.iv },
    key,
    payload.ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
```

A wrong master password causes `decrypt()` to throw `OperationError` — that is your auth-tag failure signal.

## Self-hosting

```bash
git clone https://github.com/bayhaqy/apps.git
cd apps
python3 -m http.server 8080
# open http://localhost:8080/password-vault/
```

Web Crypto requires a secure context — works on `localhost`, `127.0.0.1`, or any `https://` host. It will NOT work over plain `http://` on a non-localhost domain.

## Warning, again

This tool stores your encrypted passwords in your browser. If you clear browser data, you lose them. If you forget your master password, you lose them. If a malicious extension runs while your vault is unlocked, it can read your decrypted entries. **Export an encrypted backup regularly, and use a real password manager for your email and bank accounts.**

## Author

**Achmad Bayhaqy** — [bayhaqy.my.id](https://bayhaqy.my.id/) · [GitHub](https://github.com/bayhaqy)

## License

MIT — see [`LICENSE`](../LICENSE) in the repo root.
