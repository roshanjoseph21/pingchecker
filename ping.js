function ping(callback) {
  //var ms = 100 + Math.round(Math.random() * 200)
  //setTimeout(callback, ms, ms); return

  var xhr = new XMLHttpRequest();
  var start

  xhr.open('GET', 'beacon.js?nc=' + Date.now(), true);
  xhr.timeout = 2000

  xhr.onload = function () {
    var ms

    var timing = window.performance && window.performance.getEntriesByName(xhr.responseURL)[0]
    if (timing) {
      ms = Math.round(timing.responseStart - timing.requestStart)
      window.performance.clearResourceTimings()
    } else {
      ms = Date.now() - start
    }

    callback(ms)

    callback = this.onerror = this.onload = null
  }

  xhr.onerror = function () {
    callback(-1)

    callback = this.onerror = this.onload = null
  }

  start = Date.now()

  xhr.send()
}


var measurements = []

function updateLog(ms) {
  measurements.push(ms)
}

var latestMax = 0
function getMax(count) {
  var m = Math.max.apply(null, measurements.slice(-count))
  latestMax = Math.max(m, latestMax * 0.9)

  return latestMax
}

var pause = false
function newProbe() {
  if (pause) return

  var div = prepareChart()

  ping(function(ms) {
    updateLog(ms)
    updateChart(div, ms)
    updateLatest(ms)
    adjustChartMax()
  })

  garbageCollectChart()
}

function prepareChart() {
  var div = document.createElement('div')
  div.className = 'probe'
  div.innerHTML = '<div class="bar-container"><div class="bar"></div></div><div class="ms">&nbsp;</div>'

  var container = document.querySelector('.probes')
  container.appendChild(div)

  return div
}

function updateChart(div, ms) {
  var text, height, color
  if (ms < 0) {
    text = '\xA0'
    height = '10px'
    color = '#aaa'
  } else {
    text = ms
    height = (100 * Math.min(ms, 500) / 500) + '%'

    // http://colorpalettes.net/tag/green-and-orange/
    if (ms < 100) {
      color = '#abcb42'
    } else if (ms < 200) {
      color = '#fee71a'
    } else if (ms < 400) {
      color = '#feaf17'
    } else {
      color = '#f35001'
    }
  }

  div.querySelector('.ms').innerText = text
  div.setAttribute('data-ms', ms)

  var bar = div.querySelector('.bar')
  bar.style.height = height
  bar.style.backgroundColor = color
}

function garbageCollectChart() {
  var container = document.querySelector('.probes')

  var style = window.getComputedStyle(container)
  var width = container.clientWidth - parseInt(style.paddingLeft) - parseInt(style.paddingRight)

  var probes = container.querySelectorAll('.probe:not(.removing)')
  for (var i = 0; i < probes.length; i++) {
    var probe = probes[i]

    if (probe.offsetWidth * (probes.length - i + 1) < width) {
      return
    }

    probe.classList.add('removing')

    setTimeout(function(probe) {
      container.removeChild(probe)
    }, 1500, probe)
  }
}

function updateLatest(ms) {
  var latest = document.querySelector('.latest-time')

  var number = document.querySelector('.number')
  number.innerText = ms < 0 ? '-' : ms

  if (ms >= 1000) {
    number.classList.add('four-digits')
  } else {
    number.classList.remove('four-digits')
  }
}

function adjustChartMax() {
  var container = document.querySelector('.probes')
  var max = getMax(20)

  var probes = container.querySelectorAll('.probe')
  for (var i = 0; i < probes.length; i++) {
    var div = probes[i]
    var bar = div.querySelector('.bar')
    var ms = parseInt(div.getAttribute('data-ms'))

    if (i != probes.length -1 && !bar.classList.contains('adjusting')) {
      bar.classList.add('adjusting')
    }

    if (ms >= 0) {
      bar.style.height = (100 * ms / max) + '%'
    }
  }
}

window.onload = newProbe
setInterval(newProbe, 1000)