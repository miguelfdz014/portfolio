import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';

const doc = new JSDOM(fs.readFileSync('index.html', 'utf8')).window.document;

describe('header', () => {
  test('header has no brand name (the hero already shows it)', () => {
    expect(doc.querySelector('.nav .nav__brand')).toBeNull();
  });

  test('nav links have no numbers', () => {
    expect(doc.querySelectorAll('.nav__num')).toHaveLength(0);
    expect([...doc.querySelectorAll('.nav__links a')].map((a) => a.textContent.trim())).toEqual(['About', 'Projects', 'Contact']);
  });
});
