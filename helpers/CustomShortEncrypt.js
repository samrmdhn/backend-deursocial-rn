import crypto from 'crypto';

/** 
 * this encrypt have max 28 carachter
*/
    const toBase64Url = (bytes) => {
        return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  
    const fromBase64Url = (str) => {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    }
  
    export const encrypt = async (message, keyStr) => {
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(keyStr.padEnd(16));
        const key = await crypto.subtle.importKey(
        'raw', keyBytes, 'AES-CTR', false, ['encrypt']
        );
    
        const iv = crypto.getRandomValues(new Uint8Array(8)); // 64-bit IV
        const ivWithPadding = new Uint8Array(16); // counter size must be 16 bytes
        ivWithPadding.set(iv); // copy 8-byte IV into the first 8 bytes of 16-byte array
    
        const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CTR', counter: ivWithPadding, length: 64 },
        key,
        encoder.encode(message)
        );
    
        const ivEncoded = toBase64Url(iv);
        const dataEncoded = toBase64Url(new Uint8Array(encrypted));
        const full = ivEncoded + '.' + dataEncoded;
    
        return full.slice(0, 50); // Potong jika diperlukan
    }
    
    export const decrypt = async(encryptedShort, keyStr) => {
        const [ivPart, dataPart] = encryptedShort.split('.');
        if (!ivPart || !dataPart) throw new Error('Invalid format');
    
        const iv = fromBase64Url(ivPart);
        const encryptedBytes = fromBase64Url(dataPart);
    
        const keyBytes = new TextEncoder().encode(keyStr.padEnd(16));
        const key = await crypto.subtle.importKey(
        'raw', keyBytes, 'AES-CTR', false, ['decrypt']
        );
    
        const ivWithPadding = new Uint8Array(16); // counter size must be 16 bytes
        ivWithPadding.set(iv); // copy 8-byte IV into the first 8 bytes of 16-byte array
    
        const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: ivWithPadding, length: 64 },
        key,
        encryptedBytes
        );
    
        return new TextDecoder().decode(decrypted);
    }
//   (async () => {
//     const key = 'rahasia123';
//     const pesan = 'ini pesan';
  
//     const hasil = await encrypt(pesan, key);
//     console.log('Encrypted:', hasil, 'Length:', hasil.length);
  
//     const asli = await decrypt(hasil, key);
//     console.log('Decrypted:', asli);
//   })();