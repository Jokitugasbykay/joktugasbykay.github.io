const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync((fs.existsSync(path.join(__dirname, '../legacy/index.html')) ? path.join(__dirname, '../legacy/index.html') : path.join(__dirname, '../index.html')), 'utf8');

test('Dropzone upload file task is disabled but not hidden', () => {
    // 1. Dropzone is present in the HTML and NOT hidden
    assert.match(html, /id="checkoutFileDropzone"/);
    const dropzoneHtmlMatch = html.match(/<div[^>]*id="checkoutFileDropzone"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(dropzoneHtmlMatch, 'checkoutFileDropzone markup must be present');
    const dropzoneTag = dropzoneHtmlMatch[0].split('>')[0];
    assert.ok(!dropzoneTag.includes('hidden'), 'Dropzone must NOT have hidden attribute');
    assert.ok(!dropzoneTag.includes('display:none') && !dropzoneTag.includes('display: none'), 'Dropzone must NOT have inline display:none');
    assert.ok(dropzoneTag.includes('is-disabled'), 'Dropzone must have is-disabled class');
    assert.ok(dropzoneTag.includes('aria-disabled="true"'), 'Dropzone must have aria-disabled="true"');

    // 2. Input file is present and disabled
    assert.match(html, /<input id="chkTaskFiles"[^>]*disabled[^>]*>/, 'chkTaskFiles input must have disabled attribute');

    // 3. Visual indicator of "Dalam Perbaikan" is present
    assert.match(html, /Dalam Perbaikan/, 'Markup must contain "Dalam Perbaikan" label or badge');
    assert.match(html, /Fitur upload file langsung sedang dalam perbaikan/, 'Status text must explain feature is in repair');
});

test('bindCheckoutFileDropzone disables upload and shows repair toast on interaction', () => {
    let toastCalled = null;
    const listeners = {};
    const zoneClassList = new Set(['cf-upload', 'is-disabled']);
    const zoneAttrs = { 'aria-disabled': 'true' };

    const zone = {
        id: 'checkoutFileDropzone',
        dataset: {},
        classList: {
            add: c => zoneClassList.add(c),
            remove: c => zoneClassList.delete(c),
            contains: c => zoneClassList.has(c)
        },
        setAttribute: (k, v) => { zoneAttrs[k] = v; },
        getAttribute: k => zoneAttrs[k] ?? null,
        addEventListener: (event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
        }
    };

    let inputClickCalled = false;
    const inputAttrs = {};
    const input = {
        id: 'chkTaskFiles',
        disabled: false,
        value: '',
        setAttribute: (k, v) => { inputAttrs[k] = v; },
        click: () => { inputClickCalled = true; },
        addEventListener: (event, handler) => {
            listeners['input_' + event] = listeners['input_' + event] || [];
            listeners['input_' + event].push(handler);
        }
    };

    const list = { id: 'checkoutFileList', innerHTML: 'initial' };
    const status = { id: 'checkoutFileStatus', textContent: '', style: {} };

    const elements = {
        checkoutFileDropzone: zone,
        chkTaskFiles: input,
        checkoutFileList: list,
        checkoutFileStatus: status
    };

    const context = vm.createContext({
        document: {
            getElementById: id => elements[id] || null
        },
        window: {
            showToast: (msg, title, type) => {
                toastCalled = { msg, title, type };
            }
        },
        selectedTaskFiles: ['dummy-file']
    });

    const fnStart = html.indexOf('        function bindCheckoutFileDropzone()');
    const fnEnd = html.indexOf('\n        function sanitizeCart', fnStart);
    const fnCode = html.slice(fnStart, fnEnd);

    vm.runInContext(fnCode, context);
    context.bindCheckoutFileDropzone();

    // Verify initial setup by bindCheckoutFileDropzone
    assert.equal(input.disabled, true, 'Input should be disabled');
    assert.equal(inputAttrs['disabled'], 'disabled', 'Input should have disabled attribute set');
    assert.equal(zone.getAttribute('aria-disabled'), 'true', 'Dropzone aria-disabled should be true');
    assert.equal(context.selectedTaskFiles.length, 0, 'selectedTaskFiles should be emptied');
    assert.equal(list.innerHTML, '', 'List should be emptied');
    assert.match(status.textContent, /perbaikan/i, 'Status text should mention repair');

    // Simulate click on zone
    let defaultPrevented = false;
    let propagationStopped = false;
    const mockClickEvent = {
        preventDefault: () => { defaultPrevented = true; },
        stopPropagation: () => { propagationStopped = true; }
    };

    assert.ok(listeners['click'], 'Click listener should be registered on dropzone');
    listeners['click'][0](mockClickEvent);

    assert.equal(defaultPrevented, true, 'Click default should be prevented');
    assert.equal(propagationStopped, true, 'Click propagation should be stopped');
    assert.equal(inputClickCalled, false, 'File picker input.click() must NOT be called');
    assert.ok(toastCalled, 'Toast must be triggered on click');
    assert.match(toastCalled.title, /Perbaikan/i, 'Toast title should mention Perbaikan');
    assert.match(toastCalled.msg, /perbaikan/i, 'Toast message should mention perbaikan');
    assert.match(toastCalled.msg, /Google Drive/i, 'Toast message should guide to Google Drive');

    // Simulate keydown Enter
    toastCalled = null;
    let keyPrevented = false;
    listeners['keydown'][0]({
        key: 'Enter',
        preventDefault: () => { keyPrevented = true; },
        stopPropagation: () => {}
    });
    assert.equal(keyPrevented, true);
    assert.ok(toastCalled, 'Toast must be triggered on Enter key');

    // Simulate drop
    toastCalled = null;
    let dropPrevented = false;
    listeners['drop'][0]({
        preventDefault: () => { dropPrevented = true; },
        stopPropagation: () => {}
    });
    assert.equal(dropPrevented, true);
    assert.ok(toastCalled, 'Toast must be triggered on drop');
});
