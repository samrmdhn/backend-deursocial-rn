function toBase64Url(bytes) {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  function fromBase64Url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }
  
  async function encrypt(message, keyStr) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyStr.padEnd(16)), // 128-bit key
      'AES-GCM',
      false,
      ['encrypt']
    );
  
    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV: 96-bit
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(message)
    );
  
    const encryptedPart = toBase64Url(new Uint8Array(encrypted));
    const ivPart = toBase64Url(iv);
  
    const result = ivPart + '.' + encryptedPart;
    return result; // jaga maksimal 50 karakter
  }
  
  async function decrypt(encryptedShort, keyStr) {
    const [ivPart, encryptedPart] = encryptedShort.split('.');
    if (!ivPart || !encryptedPart) throw new Error('Invalid encrypted format');
  
    const iv = fromBase64Url(ivPart);
    const encryptedBytes = fromBase64Url(encryptedPart);
  
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyStr.padEnd(16)),
      'AES-GCM',
      false,
      ['decrypt']
    );
  
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBytes
    );
  
    return new TextDecoder().decode(decrypted);
  }
//   (async () => {
//     const key = 'rahasia123';
//     const pesan = 'ini data rahasia';
  
//     const hasil = await encrypt(pesan, key);
//     console.log('Encrypted:', hasil);
  
//     const asli = await decrypt(hasil, key);
//     console.log('Decrypted:', asli);
//   })();