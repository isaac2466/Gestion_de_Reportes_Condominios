// Uses an existing Playwright installation; no project dependency is required.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
const server = process.env.TEST_URL ? null : await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true } })
await server?.listen()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const conversations = []
const turns = new Map()
const requests = []
let messageId = 0
let failNext = null
let failRead = false
const timestamp = '2026-10-11T12:00:00'
const message = (conversation, type, content, metadata = null, role = 'assistant') => ({ id: ++messageId, id_conversacion: conversation.conversation_id, type, content, metadata, role, created_at: timestamp })
const summary = (conversation) => message(conversation, 'summary', 'Verifica la información antes de enviarlo.', { draft: { ...conversation.draft }, draft_version: conversation.draft.version, analysis_available: false, actions: [{ key: 'confirm', label: 'Enviar reporte' }, { key: 'edit', label: 'Corregir información' }, { key: 'cancel', label: 'Cancelar' }] })
const report = { id: 99, id_habitante: 1, titulo: 'Reporte existente', descripcion: 'Descripción anterior', locacion: 'Parque', estado: 'Pendiente', fecha_creacion: timestamp }

await context.addInitScript(() => {
  if (!localStorage.getItem('reporta-user')) localStorage.setItem('reporta-user', JSON.stringify({ id_habitante: 1, Nombre: 'Residente de prueba', Rol: 'residente' }))
})
await context.route('**/api/**', async (route) => {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname
  const method = request.method()
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  requests.push({ path, method, body: request.postDataJSON() })
  if (path === '/api/reportes') {
    assert.equal(method, 'GET')
    const confirmed = conversations.filter((item) => item.status === 'submitted').map((item) => ({ reporte: { ...report, id: item.report_id, titulo: item.draft.title || report.titulo, estado: 'Pendiente' }, imagenes: [] }))
    return json([{ reporte: report, imagenes: [] }, ...confirmed])
  }
  if (path === '/api/conversations' && method === 'GET') return json(conversations.map((c) => ({ conversation_id: c.conversation_id, status: c.status, title: c.draft.title, last_message: c.messages.at(-1).content, report_id: c.report_id, updated_at: timestamp })).reverse())
  if (path === '/api/conversations' && method === 'POST') {
    const c = { conversation_id: conversations.length + 1, resident_id: 1, report_id: null, status: 'collecting', draft: { version: 1 }, messages: [] }
    c.messages.push(message(c, 'text', 'Cuéntame qué problema deseas reportar.'))
    conversations.push(c)
    return json({ conversation_id: c.conversation_id, status: c.status, assistant_message: c.messages[0] }, 201)
  }
  const c = conversations.find((item) => item.conversation_id === Number(path.split('/')[3]))
  if (!c || failRead) return json({ detail: 'No existe' }, 404)
  if (method === 'GET') return json(c)
  if (path.endsWith('/cancel')) { c.status = 'cancelled'; return json({ conversation_id: c.conversation_id, status: c.status }) }
  if (path.endsWith('/confirm')) {
    c.status = 'submitted'
    c.report_id = 12
    const confirmation = message(c, 'confirmation', 'Reporte recibido correctamente con el folio #12.', { report_id: 12, draft_version: c.draft.version, report_status: 'Pendiente' })
    c.messages.push(confirmation)
    return json({ conversation_id: c.conversation_id, status: c.status, draft_version: c.draft.version, report: { id: 12, status: 'Pendiente' }, assistant_message: confirmation, already_submitted: false })
  }
  if (path.endsWith('/messages')) {
    const body = request.postDataJSON()
    const failure = failNext
    failNext = null
    if (failure === 409) { c.status = 'cancelled'; return json({ detail: 'Cerrada' }, 409) }
    if (failure === 422) return json({ detail: [{ loc: ['body', 'form_data', 'location'], msg: 'invalid' }] }, 422)
    if (failure === 500) return json({ detail: 'internal trace must never be displayed' }, 500)
    if (turns.has(body.client_message_id)) return json(turns.get(body.client_message_id))
    const user = message(c, 'text', body.content, body.form_data ? { form_data: body.form_data } : null, 'user')
    user.client_message_id = body.client_message_id
    let assistants
    if (body.content === 'Hola') assistants = [message(c, 'question', '¿Qué incidencia deseas reportar?')]
    else if (body.form_data || body.content.includes('Corrijo') || body.content.includes('cable')) {
      c.status = 'ready_for_confirmation'
      c.draft = { ...c.draft, version: c.draft.version + 1, title: 'Lámpara dañada', description: 'Hay una lámpara dañada.', location: body.content.includes('Corrijo') ? 'Parque central' : body.form_data?.location || 'Entrada principal', category: null, priority: null, severity: null }
      assistants = body.content.includes('cable') ? [message(c, 'warning', 'Mantente lejos del cable y evita tocarlo.'), summary(c)] : [summary(c)]
    } else {
      c.status = 'needs_information'
      c.draft = { version: c.draft.version + 1, title: 'Lámpara dañada', description: body.content }
      assistants = [message(c, 'form', 'Necesito un poco más de información.', { draft_version: c.draft.version, ai_extraction_available: false, fields: [{ key: 'location', type: 'text', label: '¿Dónde ocurre el problema?', placeholder: 'Ej. Entrada norte' }, { key: 'risk_active', type: 'choice', label: '¿El riesgo continúa?', options: ['Sí', 'No'] }, { key: 'additional_details', type: 'textarea', label: 'Detalles adicionales', placeholder: 'Cuéntanos más' }] })]
    }
    c.messages.push(user, ...assistants)
    const turn = { conversation_id: c.conversation_id, status: c.status, draft: { ...c.draft }, user_message: user, assistant_messages: assistants }
    turns.set(body.client_message_id, turn)
    if (failure === 'network-after-commit') return route.abort('failed')
    return json(turn, 201)
  }
  throw new Error(`Unexpected endpoint ${method} ${path}`)
})

const composer = page.getByRole('textbox', { name: 'Mensaje para el asistente' })
async function send(text) {
  await composer.fill(text)
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click()
}
async function settled() { await page.waitForFunction(() => !document.querySelector('.assistant-thinking') && !document.querySelector('.conversation-loading')) }
async function newConversation() {
  await page.waitForFunction(() => !document.querySelector('.new-report-button').disabled)
  await page.locator('.new-report-button').evaluate((button) => { button.click(); button.click() })
  await page.waitForFunction(() => document.querySelectorAll('.message-text').length === 1 && !document.querySelector('.chat-send').closest('form').querySelector('textarea').disabled)
  await composer.waitFor()
}
try {
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5174')
  await settled()
  await newConversation()
  assert.equal(conversations.length, 1, 'double-click creates only one conversation')
  await send('Hola')
  await page.locator('.message-question').waitFor()
  await send('Hay una lámpara dañada.')
  await page.getByLabel('¿Dónde ocurre el problema?').fill('Entrada norte')
  await page.getByLabel('¿El riesgo continúa?').selectOption('No')
  await page.getByLabel('Detalles adicionales').fill('Sin otros detalles')
  failNext = 422
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.locator('.inline-report-form .field-error').waitFor()
  assert.equal(await page.getByLabel('¿Dónde ocurre el problema?').inputValue(), 'Entrada norte')
  failNext = 'network-after-commit'
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Conservamos tus datos' }).waitFor()
  const failedId = requests.at(-1).body.client_message_id
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.locator('.message-summary').waitFor()
  const sentForms = requests.filter((r) => r.body?.form_data)
  assert.equal(sentForms.at(-1).body.client_message_id, failedId)
  assert.equal(await page.locator('.user-message').count(), 3)
  assert.equal(await page.getByRole('button', { name: 'Enviar reporte', exact: true }).isDisabled(), false)
  assert.equal(await page.getByLabel('¿Dónde ocurre el problema?').isDisabled(), true)
  await page.getByRole('button', { name: 'Corregir información' }).click()
  assert.equal(await composer.getAttribute('placeholder'), 'Escribe qué información quieres corregir…')
  await send('Corrijo la ubicación: está junto al parque central.')
  await page.waitForFunction(() => document.querySelectorAll('.message-summary').length === 2)
  assert.equal(await page.getByRole('button', { name: 'Corregir información' }).first().isDisabled(), true)
  await page.reload()
  await page.locator('.message-summary').last().waitFor()
  assert.equal(await page.locator('.message-summary').count(), 2)
  assert.equal(await composer.isDisabled(), false)
  await page.getByRole('button', { name: 'Reportes', exact: true }).click()
  assert.equal(await page.locator('.report-row').count(), 1)
  await page.locator('.report-row').click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Conversaciones', exact: true }).click()
  await send('Hay un cable eléctrico caído echando chispas en la entrada principal.')
  await page.locator('.message-warning').waitFor()
  assert.equal(await page.locator('.message-warning').evaluate((node) => node.nextElementSibling.classList.contains('message-summary')), true)
  await page.waitForFunction(() => {
    const node = document.querySelector('.conversation-scroll')
    return node.scrollHeight - node.scrollTop - node.clientHeight < 10
  })
  const output = process.env.SCREENSHOT_DIR
  if (output) { await mkdir(output, { recursive: true }); await page.screenshot({ path: `${output}/desktop.png` }) }
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Abrir historial' }).click()
  await page.getByRole('button', { name: 'Cerrar historial', exact: true }).last().waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.history-panel').isVisible(), false)
  if (output) await page.screenshot({ path: `${output}/mobile.png` })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.clock.install()
  await page.locator('.conversation-heading').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByText('Esta conversación fue cancelada.', { exact: true }).waitFor()
  assert.equal(await composer.isDisabled(), true)
  await page.clock.fastForward(29000)
  assert.equal(await page.locator('.conversation-row').count(), 1)
  await page.reload()
  await page.getByText('Esta conversación fue cancelada.', { exact: true }).waitFor()
  await page.clock.fastForward(1100)
  await page.waitForFunction(() => document.querySelectorAll('.conversation-row').length === 0)
  await page.getByRole('button', { name: 'Actualizar historial' }).click()
  assert.equal(await page.locator('.conversation-row').count(), 0)
  await page.reload()
  await settled()
  assert.equal(await page.locator('.conversation-row').count(), 0)
  await newConversation()
  failNext = 500
  await send('Mensaje que conservar')
  await page.getByRole('alert').filter({ hasText: 'Conservamos tus datos' }).waitFor()
  assert.equal(await composer.inputValue(), 'Mensaje que conservar')
  const firstRequest = requests.filter((r) => r.body?.content).at(-1)
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click()
  await page.locator('.message-form').waitFor()
  assert.equal(requests.filter((r) => r.body?.content).at(-1).body.client_message_id, firstRequest.body.client_message_id)
  failNext = 409
  await send('Otra información')
  await page.getByRole('alert').filter({ hasText: 'La conversación cambió' }).waitFor()
  assert.equal(await composer.isDisabled(), true)
  conversations.at(-1).status = 'collecting'
  failRead = true
  await page.reload()
  await page.getByRole('alert').filter({ hasText: 'No encontramos esta conversación' }).waitFor()
  assert.equal(await page.locator('.message-summary').count(), 0)
  assert.equal(requests.some((r) => r.path.endsWith('/confirm')), false)
  failRead = false
  const latest = conversations.at(-1)
  const address = 'Calle Prueba 123, Colonia Centro, CP 64000'
  latest.status = 'ready_for_confirmation'
  latest.draft = { ...latest.draft, location: address, context: { location_source: 'resident_address', location_label: 'Domicilio del residente' }, version: latest.draft.version + 1 }
  latest.messages.push(summary(latest))
  await page.reload()
  const homeSummary = page.locator('.message-summary').last()
  await homeSummary.getByText('Tu domicilio', { exact: false }).waitFor()
  assert.ok((await homeSummary.textContent()).includes(address))
  assert.ok(!(await page.locator('.history-panel').textContent()).includes(address))
  assert.ok(!(await homeSummary.textContent()).includes('location_source'))
  await send('Corrijo la ubicación: está junto al parque central.')
  // Simulate the corrected backend snapshot: metadata is removed by Python.
  await settled()
  latest.draft.context = {}
  latest.messages.at(-1).metadata.draft.context = {}
  await page.reload()
  await page.locator('.message-summary').last().waitFor()
  assert.ok(!(await page.locator('.message-summary').last().textContent()).includes('Tu domicilio'))
  assert.ok((await page.locator('.message-summary').last().textContent()).includes('Parque central'))
  assert.ok((await page.locator('.message-summary').first().textContent()).includes(address), 'historical summary keeps its snapshot')
  await page.locator('.message-summary').last().getByRole('button', { name: 'Enviar reporte', exact: true }).click()
  await page.locator('.message-confirmation').waitFor()
  assert.equal(await page.getByText('Folio #12', { exact: true }).count(), 1)
  assert.equal(await page.getByText('Estado: Pendiente', { exact: true }).count(), 1)
  assert.equal(await composer.isDisabled(), true)
  await page.getByRole('button', { name: 'Reportes', exact: true }).click()
  await page.locator('.report-row').nth(1).waitFor()
  assert.equal(await page.locator('.report-row').count(), 2)
  latest.messages.push(message(latest, 'error', 'No pudimos consultar una actualización.'))
  await page.reload()
  await page.locator('.message-confirmation').waitFor()
  assert.equal(await composer.isDisabled(), true)
  await page.locator('.message-confirmation').getByRole('button', { name: 'Ver seguimiento' }).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.message-error').count(), 1)
  await page.evaluate(() => localStorage.setItem('reporta-user', JSON.stringify({ id_habitante: 1, Nombre: 'Administrador de prueba', Rol: 'admin' })))
  await page.reload()
  await page.getByRole('heading', { name: 'Gestión de reportes' }).waitFor()
  assert.equal(await page.locator('.report-row').count(), 2)
  assert.equal(await page.locator('.conversation-panel').count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS: double-click, multi-turn, question, fields, 422, network retry, summary, edit, reload, reports, warning order, scroll, mobile, cancellation, 500, 409, 404, home address summary/privacy/correction, confirmation/error renderers, admin; no page errors.')
} finally { await browser.close(); await server?.close() }
