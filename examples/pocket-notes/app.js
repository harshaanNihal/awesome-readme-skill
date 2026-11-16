// Pocket Notes: all state lives in memory, so a reload always starts from the same eight notes.
const TODAY = '2026-03-14' // new notes get this fixed date so captures look the same on every run
let notes = [
  { id: 1, tag: 'home', created: '2026-03-09', title: 'Book the bike service', body: 'Brakes squeak and the chain skips. Pick a date next week; the shop opens at nine.' },
  { id: 2, tag: 'work', created: '2026-03-06', title: 'Review the onboarding checklist', body: 'Cut the list to ten steps. Every step needs one owner and one link.' },
  { id: 3, tag: 'work', created: '2026-03-02', pinned: true, title: 'Draft the Q2 offsite agenda', body: 'Two half days, one outside session. Pick a date, ask Priya about the venue and send options to ana@example.com.' },
  { id: 4, tag: 'ideas', created: '2026-03-01', title: 'A pocket weather log', body: 'One line per day, saved as plain text. Maybe a tiny chart at the end of the month.' },
  { id: 5, tag: 'home', created: '2026-02-20', title: 'Plant herbs on the balcony', body: 'Basil, chives and mint. Mint gets its own pot so it stays polite.' },
  { id: 6, tag: 'ideas', created: '2026-02-11', title: 'Rename photos by date', body: 'Read the date from the file name, fall back to the modified time. Dry-run flag first.' },
  { id: 7, tag: 'reading', created: '2026-02-02', title: 'Notes from the typography book', body: 'Line length around 65 characters. Real italics, never slanted capitals.' },
  { id: 8, tag: 'reading', created: '2026-01-29', done: true, title: 'Finish the essay on quiet software', body: 'Chapter 3 is the one about defaults. Share the best paragraph with Jonas.' },
]
let nextId = 9
let query = ''
let tag = 'all'

const $ = (selector) => document.querySelector(selector)
const list = $('#note-list')
const search = $('#search')
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const el = (name, props, ...kids) => { const e = Object.assign(document.createElement(name), props); e.append(...kids); return e }

function visible() {
  const q = query.trim().toLowerCase()
  return notes
    .filter((n) => (tag === 'all' || n.tag === tag) && `${n.title} ${n.body}`.toLowerCase().includes(q))
    .sort((a, b) => Boolean(b.pinned) - Boolean(a.pinned)) // stable: pinned first, then the order notes were added
}

function card(n) {
  const button = (action, label, pressed) => {
    const b = el('button', { type: 'button', textContent: label })
    b.dataset.action = action
    b.setAttribute('aria-label', `${label}: ${n.title}`)
    if (pressed !== undefined) b.setAttribute('aria-pressed', Boolean(pressed))
    return b
  }
  const li = el('li', { className: ['note', n.pinned && 'pinned', n.done && 'done'].filter(Boolean).join(' ') })
  li.dataset.id = n.id
  li.dataset.tag = n.tag
  li.append(
    el('h3', { textContent: n.title }),
    el('p', { textContent: n.body }),
    el('p', { className: 'meta' }, el('span', { className: 'tag', textContent: n.tag }), el('time', { dateTime: n.created, textContent: day(n.created) }), n.pinned ? el('span', { className: 'badge', textContent: 'Pinned' }) : ''),
    el('div', { className: 'actions' }, button('pin', 'Pin', n.pinned), button('done', 'Done', n.done), button('delete', 'Delete')),
  )
  return li
}

function render() {
  const shown = visible()
  list.replaceChildren(...shown.map(card))
  $('#empty').hidden = shown.length > 0
  $('#empty-text').textContent = query.trim() ? `No notes match “${query.trim()}”.` : notes.length ? 'No notes with this tag.' : 'No notes yet. Add one with the form.'
  $('#clear-filters').hidden = !notes.length
  $('#count').textContent = `Showing ${shown.length} of ${notes.length} notes`
  for (const b of document.querySelectorAll('#tag-filters button')) b.setAttribute('aria-pressed', b.dataset.tag === tag)
  if (search.value !== query) search.value = query
}

search.addEventListener('input', () => { query = search.value; render() })

$('#tag-filters').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (b) { tag = b.dataset.tag; render() }
})

$('#clear-filters').addEventListener('click', () => { query = ''; tag = 'all'; render(); search.focus() })

list.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]')
  if (!b) return
  const { action } = b.dataset
  const id = Number(b.closest('.note').dataset.id)
  const field = { pin: 'pinned', done: 'done' }[action]
  if (action === 'delete') notes = notes.filter((n) => n.id !== id)
  else { const n = notes.find((x) => x.id === id); n[field] = !n[field] }
  render()
  ;(list.querySelector(`[data-id="${id}"] [data-action="${action}"]`) ?? list).focus() // keep keyboard focus after the list is rebuilt
})

$('#note-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const title = $('#note-title').value.trim()
  if (!title) return
  notes.unshift({ id: nextId++, title, body: $('#note-body').value.trim(), tag: $('#note-tag').value, created: TODAY })
  e.target.reset()
  query = ''
  tag = 'all' // show the new note even if a search or tag filter would hide it
  render()
  $('#note-title').focus()
})

render()
