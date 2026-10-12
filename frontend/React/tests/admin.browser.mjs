import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const states = ['Pendiente', 'En Progreso', 'Resuelto', 'Rechazado', 'Pendiente']
const priorities = ['Critical', 'High', 'Medium', 'Low', null]
const reports = states.map((estado, index) => ({ reporte: {
  id: index + 1, id_habitante: index + 1, titulo: ['Cable caído en el acceso', 'Fuga de agua', 'Luminaria reparada', 'Solicitud revisada', 'Reporte sin análisis'][index],
  descripcion: 'Incidencia reportada por un residente. Se solicita revisión y seguimiento.',
  locacion: 'Entrada principal, junto a la caseta', estado, prioridad: priorities[index],
  severidad: index === 4 ? null : 5 - index, categoria: index === 4 ? null : index === 1 ? 'Agua' : 'Mantenimiento',
  resumen_ia: index === 4 ? null : 'Se requiere revisar la zona afectada.',
  recomendacion_ia: index === 4 ? null : 'Coordinar la atención con mantenimiento.',
  fecha_creacion: index === 4 ? 'fecha-invalida' : `2026-10-0${index + 1}T12:00:00`,
}, imagenes: index === 0 ? ['/uploads/test.svg'] : [] }))
let failLoad = true
let failUpdate = false
let holdUpdate
let updateRequests = 0
await context.addInitScript(() => localStorage.setItem('reporta-user', JSON.stringify({ id_habitante: 1, Nombre: 'Administración', Rol: 'admin' })))
await context.route('**/uploads/test.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180"><rect width="400" height="180" fill="#eee8f2"/><text x="30" y="95" fill="#31004d">Evidencia de prueba</text></svg>' }))
await context.route('**/api/**', async (route) => {
  const request = route.request()
  const path = new URL(request.url()).pathname
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (request.method() === 'GET' && path === '/api/reportes') return failLoad ? json({ detail: 'Failure' }, 500) : json(reports)
  assert.equal(request.method(), 'PUT')
  const report = reports.find((item) => item.reporte.id === Number(path.split('/').at(-1)))
  updateRequests++
  if (holdUpdate) await holdUpdate
  if (failUpdate) return json({ detail: 'Failure' }, 500)
  report.reporte.estado = request.postDataJSON().estado
  return json({ reporte: report.reporte })
})
const rows = page.locator('.report-row')
const detail = page.locator('.report-detail')
const controls = page.locator('.status-controls')
async function loaded(count) { await page.waitForFunction((count) => document.querySelectorAll('.report-row').length === count && !document.querySelector('.admin-loading'), count) }
async function refresh() { await page.getByRole('button', { name: 'Actualizar reportes', exact: true }).click() }
async function stateIs(state) { await page.waitForFunction((state) => document.querySelector('.report-detail > header .status-badge')?.textContent === state && !document.querySelector('.status-controls [role="status"]'), state) }

try {
  await page.goto('http://127.0.0.1:5174')
  await page.getByRole('alert').filter({ hasText: 'No pudimos cargar' }).waitFor()
  assert.equal(await rows.count(), 0)
  failLoad = false
  await refresh()
  await loaded(5)
  assert.deepEqual(await page.locator('.metrics-grid strong').allTextContents(), ['5', '2', '1', '1', '1'])
  assert.deepEqual(await rows.locator('.folio').allTextContents(), ['#001', '#002', '#003', '#004', '#005'])
  await page.getByRole('combobox', { name: /^Estado/ }).selectOption('Resuelto')
  await loaded(1)
  assert.ok((await rows.textContent()).includes('Luminaria reparada'))
  await page.getByRole('combobox', { name: /^Prioridad/ }).selectOption('High')
  await loaded(0)
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await page.getByRole('combobox', { name: /^Categoría/ }).selectOption('Agua')
  await loaded(1)
  assert.ok((await rows.textContent()).includes('Fuga de agua'))
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await page.getByRole('combobox', { name: /^Ordenar por/ }).selectOption('newest')
  assert.deepEqual(await rows.locator('.folio').allTextContents(), ['#004', '#003', '#002', '#001', '#005'])
  await page.getByRole('combobox', { name: /^Ordenar por/ }).selectOption('oldest')
  assert.deepEqual(await rows.locator('.folio').allTextContents(), ['#005', '#001', '#002', '#003', '#004'])
  await page.getByRole('combobox', { name: /^Prioridad/ }).selectOption('unclassified')
  await loaded(1)
  await rows.click()
  assert.equal(await detail.getByText('Sin clasificar', { exact: true }).count(), 2)
  assert.ok((await detail.textContent()).includes('Fecha no disponible'))
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await rows.first().click()
  await detail.getByRole('heading', { name: 'Cable caído en el acceso' }).waitFor()
  assert.equal(await detail.locator('.evidence-grid img').count(), 1)
  let release
  holdUpdate = new Promise((resolve) => { release = resolve })
  await controls.getByRole('button', { name: 'En Progreso', exact: true }).evaluate((button) => { button.click(); button.click() })
  await controls.getByRole('status').waitFor()
  assert.equal(await controls.locator('button:disabled').count(), 4)
  assert.equal(await page.getByRole('button', { name: 'Actualizar reportes' }).isDisabled(), true)
  release()
  holdUpdate = null
  await stateIs('En Progreso')
  assert.equal(updateRequests, 1)
  assert.deepEqual(await page.locator('.metrics-grid strong').allTextContents(), ['5', '1', '2', '1', '1'])
  assert.equal(await detail.locator('.evidence-grid img').count(), 1)
  failUpdate = true
  await controls.getByRole('button', { name: 'Resuelto', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'No pudimos confirmar' }).waitFor()
  await stateIs('En Progreso')
  failUpdate = false
  for (const state of ['Resuelto', 'Rechazado', 'Pendiente']) {
    await controls.getByRole('button', { name: state, exact: true }).click()
    await stateIs(state)
  }
  reports[0].reporte.titulo = 'Título actualizado desde el servidor'
  await refresh()
  await detail.getByRole('heading', { name: 'Título actualizado desde el servidor' }).waitFor()
  await page.getByRole('combobox', { name: /^Estado/ }).selectOption('Pendiente')
  await controls.getByRole('button', { name: 'Resuelto', exact: true }).click()
  await page.getByRole('heading', { name: 'Selecciona un reporte' }).waitFor()
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await rows.first().click()
  const output = process.env.SCREENSHOT_DIR
  if (output) { await mkdir(output, { recursive: true }); await page.screenshot({ path: `${output}/admin-desktop.png`, fullPage: true, animations: 'disabled' }) }
  await page.setViewportSize({ width: 390, height: 844 })
  await rows.nth(1).click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.equal(await page.locator('.detail-panel').evaluate((element) => element === document.activeElement), true)
  await page.evaluate(() => window.scrollTo(0, 0))
  if (output) await page.screenshot({ path: `${output}/admin-mobile.png`, fullPage: true, animations: 'disabled' })
  reports[1].reporte.titulo = 'PalabraMuyLarga'.repeat(25)
  reports[1].reporte.descripcion = 'ReferenciaSinEspacios'.repeat(50)
  await refresh()
  await loaded(5)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  reports.splice(0)
  await refresh()
  await loaded(0)
  await page.getByText('Aún no hay reportes en la comunidad.').waitFor()
  assert.equal(await detail.count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS admin: load/retry, metrics, combined filters, sorting, null analysis, invalid dates, evidence, all status transitions, failed update/retry, double-click, refresh/detail consistency, filter/selection consistency, empty state, mobile, long text; no page errors.')
} finally { await browser.close(); await server.close() }
