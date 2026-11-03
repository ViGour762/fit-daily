#!/usr/bin/env node
/**
 * check-css.js — 静态检查：index.html / js 中使用的 class 是否都有样式
 * 用法：node scripts/check-css.js [--strict]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');

function readIfExists(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function uniq(list) {
  const set = new Set();
  list.forEach((x) => x && set.add(x));
  return Array.from(set).sort();
}

/* 1. 收集 class */
const html = readIfExists(path.join(ROOT, 'index.html'));
const htmlClasses = [];
html.replace(/class="([^"]*)"/g, (_, v) => {
  v.split(/\s+/).forEach((c) => htmlClasses.push(c));
  return '';
});

// JS 里动态注入的 class：字符串中的 class="..."、classList.add('x')、className = '...'
const jsDir = path.join(ROOT, 'js');
const jsClasses = [];
fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).forEach((f) => {
  const src = readIfExists(path.join(jsDir, f));
  src.replace(/class="([^"]*)"/g, (_, v) => {
    v.split(/\s+/).forEach((c) => jsClasses.push(c));
    return '';
  });
  src.replace(/classList\.(?:add|toggle|remove)\(\s*'([^']+)'/g, (_, v) => { jsClasses.push(v); return ''; });
  src.replace(/className\s*=\s*'([^']+)'/g, (_, v) => { v.split(/\s+/).forEach((c) => jsClasses.push(c)); return ''; });
});

/* 2. 收集 CSS 中出现的类选择器（支持多文件） */
const cssDir = path.join(ROOT, 'css');
const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
const css = cssFiles.map((f) => readIfExists(path.join(cssDir, f))).join('\n');
const cssClasses = new Set();
css.replace(/\.([A-Za-z_][\w-]*)/g, (_, v) => { cssClasses.add(v); return ''; });

/* 3. 比对（过滤 JS 字符串拼接产生的伪 token） */
const validToken = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const all = uniq(htmlClasses.concat(jsClasses)).filter((c) => validToken.test(c));
const missing = all.filter((c) => !cssClasses.has(c));

// 仅用于逻辑、不需要样式的类
const allowlist = new Set(['js-ready', 'show', 'active', 'hidden', 'cls']);

const realMissing = missing.filter((c) => !allowlist.has(c));

console.log('index.html + js 中出现的 class：' + all.length + ' 个');
console.log('css/*.css 中已定义的 class：' + cssClasses.size + ' 个');

if (realMissing.length === 0) {
  console.log('\n✓ 所有 class 都有样式覆盖');
  process.exit(0);
}

console.log('\n以下 ' + realMissing.length + ' 个 class 在 styles.css 中未找到：');
realMissing.forEach((c) => console.log('  - .' + c));
console.log('\n提示：JS 动态注入的结构请按 docs/api.md 的类名约定补齐样式。');
process.exit(strict ? 1 : 0);