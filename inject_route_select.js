const fs = require('fs');
let h = fs.readFileSync('frontend/public/grafo_3d_edificio.html', 'utf8');

// Add ROUTE_SELECT_MODE support to the existing bridge
// We inject right after the existing bridge's window.addEventListener block
const extra = `
/* ===== Route selection mode =====
   {type:'SET_ROUTE_MODE', enabled: true|false}
   In route mode: 1st click = origin, 2nd click = destination
   Emits: {type:'ROUTE_SELECTED', origin:{name,floor,category}, destination:{name,floor,category}}
          {type:'ORIGIN_SELECTED',      name,floor,category}   (after 1st click)
*/
var routeMode = false;
var routeOrigin = null;

window.addEventListener('message', function(ev2) {
  var d = ev2.data;
  if (!d || !d.type) return;
  if (d.type === 'SET_ROUTE_MODE') {
    routeMode = !!d.enabled;
    routeOrigin = null;
    if (!routeMode) {
      routePath = [];
      currentNode = -1;
    }
    draw();
  }
});

/* wrap the select function to handle route-mode clicks */
var _selOrig = select;
function select(i) {
  if (!routeMode) { _selOrig(i); return; }
  if (i < 0) return;
  var n = G.nodes[i];
  if (!routeOrigin) {
    // first click — origin
    routeOrigin = n;
    currentNode = i;
    routePath = [i];
    draw();
    try { parent.postMessage({ type: 'ORIGIN_SELECTED', name: n.l, floor: n.fi, category: n.c }, '*'); } catch(e) {}
  } else {
    // second click — destination, emit both
    try { parent.postMessage({ type: 'ROUTE_SELECTED', origin: { name: routeOrigin.l, floor: routeOrigin.fi, category: routeOrigin.c }, destination: { name: n.l, floor: n.fi, category: n.c } }, '*'); } catch(e) {}
    routeOrigin = null;
    currentNode = -1;
  }
}
`;

// Inject before closing </script>
if (h.includes('</script>')) {
  h = h.replace('</script>', extra + '\n</script>');
  fs.writeFileSync('frontend/public/grafo_3d_edificio.html', h);
  console.log('route-select bridge injected OK, len=' + h.length);
} else {
  console.error('</script> not found');
}
