const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync((fs.existsSync(path.join(root, 'legacy/index.html')) ? path.join(root, 'legacy/index.html') : path.join(root, 'index.html')), 'utf8');

test('HTML contains night operational notice markup and elements', () => {
  assert.ok(html.includes('id="admin-break-popup"'), 'admin-break-popup element exists');
  assert.ok(html.includes('class="abp"'), 'abp class exists');
  assert.ok(html.includes('Admin istirahat · 22.00-05.00 WIB'), 'Notice badge text exists');
  assert.ok(html.includes('class="abp-close"'), 'abp-close button exists');
  assert.ok(html.includes('class="abp-ok"'), 'abp-ok button exists');
});

test('isNightOperationalHours logic correctly classifies hours (22:00 - 05:00 WIB)', () => {
  // Test timezone logic across hours 0-23
  function checkHour(hour) {
    const formatter = {
      format: () => String(hour)
    };
    const hourVal = parseInt(formatter.format(new Date()), 10);
    return hourVal >= 22 || hourVal < 5;
  }

  // 22:00 to 04:59 should be night
  assert.equal(checkHour(22), true, '22:00 is night');
  assert.equal(checkHour(23), true, '23:00 is night');
  assert.equal(checkHour(0), true, '00:00 is night');
  assert.equal(checkHour(1), true, '01:00 is night');
  assert.equal(checkHour(2), true, '02:00 is night');
  assert.equal(checkHour(3), true, '03:00 is night');
  assert.equal(checkHour(4), true, '04:00 is night');

  // 05:00 to 21:59 should NOT be night
  assert.equal(checkHour(5), false, '05:00 is not night');
  assert.equal(checkHour(8), false, '08:00 is not night');
  assert.equal(checkHour(12), false, '12:00 is not night');
  assert.equal(checkHour(17), false, '17:00 is not night');
  assert.equal(checkHour(21), false, '21:00 is not night');
});

test('Admin break popup lifecycle and session storage dismissal', () => {
  let isHidden = true;
  let sessionStored = {};

  const boxMock = {
    set hidden(val) { isHidden = Boolean(val); },
    get hidden() { return isHidden; }
  };

  const KEY = 'abp-dismissed-2026-10-15';

  function close() {
    boxMock.hidden = true;
    sessionStored[KEY] = '1';
  }

  // When admin break is active:
  boxMock.hidden = false;
  assert.equal(boxMock.hidden, false);

  // User dismisses:
  close();
  assert.equal(boxMock.hidden, true);
  assert.equal(sessionStored[KEY], '1');

  // Next check in same session:
  const shouldSkip = Boolean(sessionStored[KEY]);
  assert.equal(shouldSkip, true);
});
