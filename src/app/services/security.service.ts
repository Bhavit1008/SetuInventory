import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private secretKey = 'my-very-secret-key-123';
  private time = 60*60*1000;

  private async getKey() {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(this.secretKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('some-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptPayload(payload: any): Promise<string> {
    const key = await this.getKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const encoded = enc.encode(JSON.stringify(payload));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encoded
    );

    return this.bufferToHex(iv) + ':' + this.bufferToHex(new Uint8Array(encryptedBuffer));
  }

  async decryptPayload(token: string): Promise<any> {
    const key = await this.getKey();
    const [ivHex, encryptedHex] = token.split(':');

    const iv = this.hexToBuffer(ivHex);
    const encryptedData = this.hexToBuffer(encryptedHex);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  }

  private bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBuffer(hexString: string): Uint8Array {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  public createEncPayload(): Promise<string> {
    return this.encryptPayload({ loggedIn: true, expiresAt: Date.now() + this.time });
  }

  public async isSessionValid(encPayload: string): Promise<boolean> {
    try {
      const json = await this.decryptPayload(encPayload);
      const currentTime = Date.now();
      return json?.loggedIn === true && json?.expiresAt > currentTime;
    } catch (e) {
      return false;
    }
  }

}
