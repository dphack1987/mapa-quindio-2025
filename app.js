const viewer = document.getElementById('viewer')
const img = document.getElementById('mapImage')
const zoomInBtn = document.getElementById('zoomIn')
const zoomOutBtn = document.getElementById('zoomOut')
const resetBtn = document.getElementById('reset')

let imgNaturalW = 0
let imgNaturalH = 0
let scale = 1
let minScale = 0.2
let maxScale = 5
let tx = 0
let ty = 0
let isPanning = false
let lastX = 0
let lastY = 0
let pointers = new Map()
let pinchPrevDist = 0

function apply() {
  img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
}

function fitToViewer() {
  const vw = viewer.clientWidth
  const vh = viewer.clientHeight
  const s = Math.min(vw / imgNaturalW, vh / imgNaturalH)
  scale = Math.max(minScale, Math.min(maxScale, s))
  const cx = (vw - imgNaturalW * scale) / 2
  const cy = (vh - imgNaturalH * scale) / 2
  tx = cx
  ty = cy
  apply()
}

function clampPan() {
  const vw = viewer.clientWidth
  const vh = viewer.clientHeight
  const w = imgNaturalW * scale
  const h = imgNaturalH * scale
  const minX = Math.min(0, vw - w)
  const minY = Math.min(0, vh - h)
  const maxX = Math.max(0, vw - w)
  const maxY = Math.max(0, vh - h)
  tx = Math.max(minX, Math.min(maxX, tx))
  ty = Math.max(minY, Math.min(maxY, ty))
}

function zoomAt(factor, cx, cy) {
  const prev = scale
  scale = Math.max(minScale, Math.min(maxScale, scale * factor))
  const k = scale / prev
  tx = cx - (cx - tx) * k
  ty = cy - (cy - ty) * k
  clampPan()
  apply()
}

img.addEventListener('load', () => {
  imgNaturalW = img.naturalWidth
  imgNaturalH = img.naturalHeight
  fitToViewer()
})

window.addEventListener('resize', fitToViewer)

viewer.addEventListener('wheel', e => {
  e.preventDefault()
  const rect = viewer.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.1 : 0.9
  zoomAt(factor, cx, cy)
}, { passive: false })

viewer.addEventListener('dblclick', e => {
  const rect = viewer.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  zoomAt(1.35, cx, cy)
})

zoomInBtn.addEventListener('click', () => {
  const rect = viewer.getBoundingClientRect()
  zoomAt(1.1, rect.width / 2, rect.height / 2)
})

zoomOutBtn.addEventListener('click', () => {
  const rect = viewer.getBoundingClientRect()
  zoomAt(0.9, rect.width / 2, rect.height / 2)
})


resetBtn.addEventListener('click', fitToViewer)

viewer.addEventListener('pointerdown', e => {
  viewer.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) {
    isPanning = true
    lastX = e.clientX
    lastY = e.clientY
  } else if (pointers.size === 2) {
    const entries = [...pointers.values()]
    const d = Math.hypot(entries[0].x - entries[1].x, entries[0].y - entries[1].y)
    pinchPrevDist = d
  }
})

viewer.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1 && isPanning && prev) {
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    tx += dx
    ty += dy
    lastX = e.clientX
    lastY = e.clientY
    clampPan()
    apply()
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const rect = viewer.getBoundingClientRect()
    const cx = (a.x + b.x) / 2 - rect.left
    const cy = (a.y + b.y) / 2 - rect.top
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchPrevDist > 0 && d > 0) {
      const factor = d / pinchPrevDist
      zoomAt(factor, cx, cy)
    }
    pinchPrevDist = d
  }
})

viewer.addEventListener('pointerup', e => {
  viewer.releasePointerCapture(e.pointerId)
  pointers.delete(e.pointerId)
  if (pointers.size === 0) {
    isPanning = false
    pinchPrevDist = 0
  }
})

viewer.addEventListener('pointercancel', e => {
  viewer.releasePointerCapture(e.pointerId)
  pointers.delete(e.pointerId)
  isPanning = false
  pinchPrevDist = 0
})
