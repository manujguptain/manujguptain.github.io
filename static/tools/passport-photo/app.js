const countryPresets = {
    us: { w: 50.8, h: 50.8, label: 'United States' },
    uk: { w: 35, h: 45, label: 'United Kingdom' },
    schengen: { w: 35, h: 45, label: 'Schengen / EU' },
    in_p: { w: 35, h: 45, label: 'India Passport' },
    in_v: { w: 50.8, h: 50.8, label: 'India Visa' },
    in_oci: { w: 35, h: 35, label: 'India OCI' },
    jp: { w: 35, h: 45, label: 'Japan' },
    cn: { w: 33, h: 48, label: 'China' },
    au: { w: 35, h: 45, label: 'Australia' },
    ca_p: { w: 50, h: 70, label: 'Canada Passport' }
};

const paperSizes = {
    single: { w_mm: null, h_mm: null, label: 'Single' },
    '4x6': { w_mm: 152.4, h_mm: 101.6, label: '4x6"' },
    '5x7': { w_mm: 177.8, h_mm: 127, label: '5x7"' },
    '8x10': { w_mm: 254, h_mm: 203.2, label: '8x10"' },
    a4: { w_mm: 210, h_mm: 297, label: 'A4' },
    letter: { w_mm: 215.9, h_mm: 279.4, label: 'Letter' }
};

const DPI = 300;
const MM_TO_PX = DPI / 25.4;

let currentImage = null;
let scale = 1;
let offset = { x: 0, y: 0 };
let isDragging = false;
let startPos = { x: 0, y: 0 };
let cropRect = { w: 0, h: 0 };
let orientation = 'landscape';
let originalMimeType = 'image/jpeg';

const fileInput = document.getElementById('file-input');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('crop-overlay');
const zoomControls = document.getElementById('zoom-controls');
const countrySelect = document.getElementById('country-select');
const paperSelect = document.getElementById('paper-select');
const photoCountSelect = document.getElementById('photo-count-select');
const downloadBtn = document.getElementById('download-btn');
const downloadSingleBtn = document.getElementById('download-single-btn');
const resetBtn = document.getElementById('reset-btn');
const zoomSlider = document.getElementById('zoom-slider');
const zoomIn = document.getElementById('zoom-in');
const zoomOut = document.getElementById('zoom-out');
const brightnessSlider = document.getElementById('brightness-slider');
const contrastSlider = document.getElementById('contrast-slider');
const previewCanvas = document.getElementById('preview-canvas');
const sheetMarginSlider = document.getElementById('sheet-margin');
const photoGapSlider = document.getElementById('photo-gap');
const downloadFormatSelect = document.getElementById('download-format');

// --- Initialization ---

fileInput.addEventListener('change', handleFileSelect);
uploadPlaceholder.addEventListener('click', () => fileInput.click());
['dragover', 'dragenter'].forEach(name => uploadPlaceholder.addEventListener(name, (e) => { e.preventDefault(); uploadPlaceholder.classList.add('drag-over'); }));
['dragleave', 'dragend', 'drop'].forEach(name => uploadPlaceholder.addEventListener(name, () => uploadPlaceholder.classList.remove('drag-over')));
uploadPlaceholder.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });

countrySelect.addEventListener('change', updateCropOverlay);
paperSelect.addEventListener('change', updatePreview);
photoCountSelect.addEventListener('change', updatePreview);
[zoomSlider, brightnessSlider, contrastSlider, sheetMarginSlider, photoGapSlider].forEach(el => el.addEventListener('input', () => {
    if (el.id === 'sheet-margin') document.getElementById('margin-val').textContent = el.value;
    if (el.id === 'photo-gap') document.getElementById('gap-val').textContent = el.value;
    if (el.id === 'zoom-slider') scale = parseFloat(el.value);
    draw();
}));

const customInputs = [document.getElementById('custom-width'), document.getElementById('custom-height')];
customInputs.forEach(el => el.addEventListener('input', updateCropOverlay));

// Segmented Control (Orientation)
document.querySelectorAll('.segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        orientation = e.target.dataset.orientation;
        updatePreview();
    });
});

// Zoom Buttons Polish (Less sensitive)
const ZOOM_STEP = 0.05;
zoomIn.addEventListener('click', () => {
    zoomSlider.value = Math.min(3, parseFloat(zoomSlider.value) + ZOOM_STEP);
    scale = parseFloat(zoomSlider.value);
    draw();
});
zoomOut.addEventListener('click', () => {
    zoomSlider.value = Math.max(0.1, parseFloat(zoomSlider.value) - ZOOM_STEP);
    scale = parseFloat(zoomSlider.value);
    draw();
});

downloadSingleBtn.addEventListener('click', () => generateOutput(true, true));
downloadBtn.addEventListener('click', () => generateOutput(true, false));

// --- Image Handling ---

function handleFileSelect(e) { if (e.target.files.length) handleFile(e.target.files[0]); }

function handleFile(file) {
    if (!file.type.startsWith('image/')) return;
    originalMimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => { 
            currentImage = img; 
            initEditor(); 
            updatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initEditor() {
    uploadPlaceholder.classList.add('hidden');
    canvas.classList.remove('hidden');
    overlay.classList.remove('hidden');
    zoomControls.classList.remove('hidden');
    
    // Set canvas size to container
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    updateCropOverlay();
    
    // Initial Scale: Center image in overlay
    const overlaySize = Math.max(cropRect.w, cropRect.h);
    const imgSize = Math.min(currentImage.width, currentImage.height);
    scale = (overlaySize * 1.5) / imgSize; 
    zoomSlider.value = scale;
    
    offset.x = canvas.width / 2;
    offset.y = canvas.height / 2;
    
    draw();
}

resetBtn.addEventListener('click', () => {
    currentImage = null;
    uploadPlaceholder.classList.remove('hidden');
    canvas.classList.add('hidden');
    overlay.classList.add('hidden');
    zoomControls.classList.add('hidden');
    fileInput.value = '';
    
    // Clear preview
    const pctx = previewCanvas.getContext('2d');
    pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
});

function updateCropOverlay() {
    const val = countrySelect.value;
    let w_mm, h_mm;
    
    if (val === 'custom') {
        document.getElementById('custom-size-inputs').classList.remove('hidden');
        w_mm = parseFloat(document.getElementById('custom-width').value) || 35;
        h_mm = parseFloat(document.getElementById('custom-height').value) || 45;
    } else {
        document.getElementById('custom-size-inputs').classList.add('hidden');
        w_mm = countryPresets[val].w;
        h_mm = countryPresets[val].h;
    }
    
    const ratio = w_mm / h_mm;
    let displayH = canvas.height * 0.7;
    let displayW = displayH * ratio;
    
    if (displayW > canvas.width * 0.8) {
        displayW = canvas.width * 0.8;
        displayH = displayW / ratio;
    }
    
    overlay.style.width = displayW + 'px';
    overlay.style.height = displayH + 'px';
    overlay.style.top = (canvas.height - displayH) / 2 + 'px';
    overlay.style.left = (canvas.width - displayW) / 2 + 'px';
    
    cropRect = { w: displayW, h: displayH };
    draw();
}

// --- Drawing & Interaction ---

function draw() {
    if (!currentImage) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.filter = `brightness(${brightnessSlider.value}%) contrast(${contrastSlider.value}%)`;
    
    const w = currentImage.width * scale;
    const h = currentImage.height * scale;
    
    ctx.drawImage(currentImage, offset.x - w/2, offset.y - h/2, w, h);
    ctx.restore();
    
    updatePreview();
}

canvas.addEventListener('mousedown', (e) => { isDragging = true; startPos = { x: e.clientX - offset.x, y: e.clientY - offset.y }; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mousemove', (e) => { if (isDragging) { offset.x = e.clientX - startPos.x; offset.y = e.clientY - startPos.y; draw(); } });
window.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });

// --- Preview & Output ---

function generateOutput(isFinal, forceSingle = false) {
    if (!currentImage) return null;

    const val = countrySelect.value;
    const targetW_mm = (val === 'custom' ? parseFloat(document.getElementById('custom-width').value) : countryPresets[val].w) || 35;
    const targetH_mm = (val === 'custom' ? parseFloat(document.getElementById('custom-height').value) : countryPresets[val].h) || 45;

    const outCanvas = document.createElement('canvas');
    const outW = targetW_mm * MM_TO_PX;
    const outH = targetH_mm * MM_TO_PX;
    outCanvas.width = outW;
    outCanvas.height = outH;
    const octx = outCanvas.getContext('2d');

    // Fill white background (essential for passport photos, handles transparency correctly)
    octx.fillStyle = 'white';
    octx.fillRect(0, 0, outW, outH);

    // Calculate crop
    const overlayX = (canvas.width - cropRect.w) / 2;
    const overlayY = (canvas.height - cropRect.h) / 2;
    const imgX = offset.x - (currentImage.width * scale) / 2;
    const imgY = offset.y - (currentImage.height * scale) / 2;
    
    const sourceX = (overlayX - imgX) / scale;
    const sourceY = (overlayY - imgY) / scale;
    const sourceW = cropRect.w / scale;
    const sourceH = cropRect.h / scale;

    octx.filter = `brightness(${brightnessSlider.value}%) contrast(${contrastSlider.value}%)`;
    octx.drawImage(currentImage, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);
    octx.filter = 'none';

    const paperVal = paperSelect.value;
    const format = downloadFormatSelect.value === 'original' ? originalMimeType : 'image/jpeg';
    const ext = format === 'image/png' ? 'png' : 'jpg';

    if (forceSingle || paperVal === 'single') {
        if (isFinal) downloadCanvas(outCanvas, `photo_${targetW_mm}x${targetH_mm}.${ext}`, format);
        return outCanvas;
    }

    const paper = paperSizes[paperVal];
    let sheetW_mm = paper.w_mm;
    let sheetH_mm = paper.h_mm;
    
    // Respect Orientation
    if (orientation === 'landscape' && sheetH_mm > sheetW_mm) [sheetW_mm, sheetH_mm] = [sheetH_mm, sheetW_mm];
    if (orientation === 'portrait' && sheetW_mm > sheetH_mm) [sheetW_mm, sheetH_mm] = [sheetH_mm, sheetW_mm];

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW_mm * MM_TO_PX;
    sheetCanvas.height = sheetH_mm * MM_TO_PX;
    const sctx = sheetCanvas.getContext('2d');

    sctx.fillStyle = 'white';
    sctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    const margin = parseFloat(sheetMarginSlider.value) * MM_TO_PX;
    const gap = parseFloat(photoGapSlider.value) * MM_TO_PX;
    
    // Fit optimization
    const cols = Math.floor((sheetCanvas.width - margin * 2 + gap) / (outW + gap));
    const rows = Math.floor((sheetCanvas.height - margin * 2 + gap) / (outH + gap));
    
    let count = photoCountSelect.value === 'auto' ? cols * rows : parseInt(photoCountSelect.value);
    
    // Center grid
    const actualCols = Math.min(count, cols);
    const actualRows = Math.ceil(count / cols);
    const gridW = actualCols * outW + (actualCols - 1) * gap;
    const gridH = Math.min(actualRows, rows) * outH + (Math.min(actualRows, rows) - 1) * gap;

    const startX = (sheetCanvas.width - gridW) / 2;
    const startY = (sheetCanvas.height - gridH) / 2;

    for (let i = 0; i < count; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        if (r >= rows) break;
        sctx.drawImage(outCanvas, startX + c * (outW + gap), startY + r * (outH + gap));
        
        sctx.strokeStyle = '#e2e8f0';
        sctx.lineWidth = 1;
        sctx.strokeRect(startX + c * (outW + gap), startY + r * (outH + gap), outW, outH);
    }

    if (isFinal) downloadCanvas(sheetCanvas, `photos_sheet_${paperVal}.${ext}`, format);
    return sheetCanvas;
}

function updatePreview() {
    if (!currentImage) return;
    const sheet = generateOutput(false);
    if (!sheet) return;

    previewCanvas.width = sheet.width;
    previewCanvas.height = sheet.height;
    const pctx = previewCanvas.getContext('2d');
    pctx.drawImage(sheet, 0, 0);
}

function downloadCanvas(cvs, filename, mimeType = 'image/jpeg') {
    const safeFilename = filename.replace(/[^a-z0-9._-]/gi, '_');
    cvs.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = safeFilename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, mimeType, 0.95);
}

window.addEventListener('resize', () => {
    if (currentImage) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        updateCropOverlay(); 
    }
});
