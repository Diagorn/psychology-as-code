#!/usr/bin/env node
// Проверка вёрстки конспекта тем же стеком, что использует сайт
// (remark-parse + remark-gfm, как react-markdown на рендере).
//
// Использование: node check.mjs "<путь к файлу .md>"
// Код выхода: 0 — всё разобралось; 1 — найдены проблемы.

import { readFileSync } from 'node:fs'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const file = process.argv[2]
if (!file) {
  console.error('Использование: node check.mjs "<путь к .md>"')
  process.exit(1)
}

// Frontmatter сайт вырезает перед рендером — здесь делаем то же самое.
const src = readFileSync(file, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '')

const tree = unified().use(remarkParse).use(remarkGfm).parse(src)

let tables = 0
let tasks = 0
let lists = 0
const warnings = []

function paragraphText(node) {
  let out = ''
  ;(function walk(n) {
    if (!n || typeof n !== 'object') return
    if (n.type === 'text') out += n.value
    if (Array.isArray(n.children)) n.children.forEach(walk)
  })(node)
  return out
}

;(function walk(node) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'table') tables++
  if (node.type === 'list') lists++
  if (node.type === 'listItem' && typeof node.checked === 'boolean') tasks++
  if (node.type === 'paragraph') {
    const text = paragraphText(node)
    // Строка с | вне таблицы или [ ] вне чек-листа распарсилась как простой текст.
    if (/^\s*\|/m.test(text)) warnings.push('строка с «|» вне таблицы: ' + JSON.stringify(text.slice(0, 60)))
    if (/\[[ xX]?\]/.test(text)) warnings.push('чек-лист «[ ]» вне списка: ' + JSON.stringify(text.slice(0, 60)))
  }
  if (Array.isArray(node.children)) node.children.forEach(walk)
})(tree)

console.log(`Файл: ${file}`)
console.log(`Списков: ${lists} · таблиц: ${tables} · пунктов чек-листов: ${tasks}`)

if (warnings.length) {
  console.log('\nПроблемы:')
  for (const w of warnings) console.log('  ⚠ ' + w)
  process.exit(1)
}

console.log('Разметка корректна.')
