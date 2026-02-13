
// Compute Median Color of a region
export const computeMedianColor = (ctx, x, y, w, h) => {
    try {
        // Expand slighty to capture context, but ensure within bounds
        const canvas = ctx.canvas;
        const sx = Math.max(0, x - 2);
        const sy = Math.max(0, y - 2);
        const sw = Math.min(canvas.width - sx, w + 4);
        const sh = Math.min(canvas.height - sy, h + 4);

        if (sw <= 0 || sh <= 0) return 'rgb(255,255,255)';

        const frame = ctx.getImageData(sx, sy, sw, sh);
        const data = frame.data;
        const r = [], g = [], b = [];

        for (let i = 0; i < data.length; i += 4) {
            r.push(data[i]);
            g.push(data[i + 1]);
            b.push(data[i + 2]);
        }

        const median = (arr) => {
            const mid = Math.floor(arr.length / 2);
            const nums = [...arr].sort((a, b) => a - b);
            return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        };

        return `rgb(${median(r)},${median(g)},${median(b)})`;
    } catch (e) {
        console.error("Median color error", e);
        return 'rgb(255,255,255)';
    }
};

// Render text inside bbox with auto-fitting
export const renderTextInBox = (ctx, text, bbox, fontColor = 'black') => {
    const [x1, y1, x2, y2] = bbox;
    const w = x2 - x1;
    const h = y2 - y1;
    const x = x1;
    const y = y1;

    // Background Fill
    const bgColor = computeMedianColor(ctx, x1, y1, w, h);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // Text Configuration
    ctx.fillStyle = fontColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Font Fitting Strategy
    // Start large, decrease until it fits horizontally (with wrapping) and vertically
    let fontSize = 100; // Start arbitrary large
    const minFontSize = 8;
    const fontFamily = '"Noto Sans", "Inter", sans-serif';

    // Helper to wrap text
    const getLines = (ctx, text, maxWidth) => {
        const words = text.split(''); // Splitting by char for Indic scripts might break clusters?
        // Better: Split by space but shaping might be tricky.
        // For accurate wrapping of Indic scripts, we rely on canvas measureText.

        // Simple word wrap first
        const wordsArr = text.split(' ');
        let lines = [];
        let currentLine = wordsArr[0];

        for (let i = 1; i < wordsArr.length; i++) {
            const word = wordsArr[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    // Optimization: Binary search or just simple decrement? 
    // Decrement is safer for exact fit.

    // Heuristic start: Height of box?
    fontSize = Math.min(100, h * 0.8);

    while (fontSize >= minFontSize) {
        ctx.font = `${fontSize}px ${fontFamily}`;

        // Check wrapping
        const lines = getLines(ctx, text, w);
        const totalTextHeight = lines.length * (fontSize * 1.2); // 1.2 line height

        if (totalTextHeight <= h) {
            // Found it! Render.
            const offsetY = (h - totalTextHeight) / 2; // Vertically center

            lines.forEach((line, i) => {
                ctx.fillText(line.trim(), x, y + offsetY + (i * fontSize * 1.2));
            });
            return;
        }

        fontSize -= 2;
    }

    // Fallback: render at min font size
    ctx.font = `${minFontSize}px ${fontFamily}`;
    const lines = getLines(ctx, text, w);
    lines.forEach((line, i) => {
        if ((i * minFontSize * 1.2) < h) {
            ctx.fillText(line.trim(), x, y + (i * minFontSize * 1.2));
        }
    });

};
