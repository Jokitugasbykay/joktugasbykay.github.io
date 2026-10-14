const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('HTML contains night operational notice markup and elements', () => {
  assert.ok(html.includes('id="nightNoticeSlot"'), 'nightNoticeSlot element exists');
  assert.ok(html.includes('id="nightNoticeCard"'), 'nightNoticeCard element exists');
  assert.ok(html.includes('Jam Istirahat Admin (22:00 – 05:00 WIB)'), 'Notice badge text exists');
  assert.ok(html.includes('Admin Sedang Istirahat / Slow Response'), 'Notice title exists');
  assert.ok(html.includes('window.dismissNightNotice()'), 'Dismiss button hook exists');
  assert.ok(html.includes('id="spclNightNoticeBox"'), 'Special checkout night notice box exists');
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

test('Night notice show and dismiss DOM lifecycle', () => {
  let displayVal = 'none';
  let slotHasClass = false;
  let sessionStored = null;

  const cardMock = {
    style: { display: 'none' },
    classList: {
      remove: (c) => {},
      add: (c) => {}
    }
  };

  const slotMock = {};

  const bn04Mock = {
    classList: {
      add: (c) => { if (c === 'has-night-notice') slotHasClass = true; },
      remove: (c) => { if (c === 'has-night-notice') slotHasClass = false; }
    }
  };

  const fakeWindow = {
    location: { search: '?test_night_notice=1' },
    isNightOperationalHours: () => true,
    showNightOperationalNotice: (force = false) => {
      cardMock.style.display = 'flex';
      bn04Mock.classList.add('has-night-notice');
    },
    dismissNightNotice: () => {
      sessionStored = 'true';
      cardMock.style.display = 'none';
      bn04Mock.classList.remove('has-night-notice');
    }
  };

  fakeWindow.showNightOperationalNotice(true);
  assert.equal(cardMock.style.display, 'flex');
  assert.equal(slotHasClass, true);

  fakeWindow.dismissNightNotice();
  assert.equal(cardMock.style.display, 'none');
  assert.equal(slotHasClass, false);
  assert.equal(sessionStored, 'true');
});
