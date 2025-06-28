/**
 * Escape karakter berbahaya agar tidak bisa menyisipkan HTML (mencegah XSS).
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')   
        .replace(/</g, '&lt;')    
        .replace(/>/g, '&gt;')    
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Ubah plain caption menjadi rich HTML:
 * - Ganti newline (\n) menjadi <br>
 * - Konversi #hashtag dan @mention menjadi link HTML
 * - Tetap aman dari XSS karena caption di-escape terlebih dahulu
 */
export function parseToRichText(caption) {
    if (!caption || typeof caption !== 'string') return '';
    let html = escapeHtml(caption);
    html = html.replace(/#([a-zA-Z0-9_]{1,30})/g, '<a href="/d/$1" class="text-blue-500 font-semibold ">#$1</a>');
    html = html.replace(/@([a-zA-Z0-9_]{1,30})/g, '<a href="/profile/$1" class="text-blue-500 font-semibold">@$1</a>');
    html = html.replace(/\n/g, '<br>');

    return html;
}
