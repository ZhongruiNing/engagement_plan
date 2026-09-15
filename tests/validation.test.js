import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGuestName } from '../src/js/guest-validation.js';
test('拒绝空白、保留合法中文姓名并去除两端空白', () => {
  for (const name of ['', '  ', '\n\t', '　']) assert.throws(() => validateGuestName(name), /请输入/);
  assert.equal(validateGuestName('  张三  '), '张三');
  assert.equal(validateGuestName('欧阳 小明'), '欧阳 小明');
});
test('姓名长度按 Unicode 字符检查', () => {
  assert.equal(validateGuestName('宁'.repeat(80)).length, 80);
  assert.throws(() => validateGuestName('宁'.repeat(81)), /80字/);
});
