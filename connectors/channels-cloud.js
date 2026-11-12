(function () {
  'use strict'
  /*
   * Cloud account adapters for the Channels plugin.
   *
   * The plugin itself knows no service: it fetches this file at runtime (and
   * keeps a copy), then calls `list` and `unlock` on each service the user has
   * a saved key for. `api` is supplied by the plugin:
   *   api.getJson(path, init)  -> parsed JSON or null
   *   api.request(path, init)  -> { data, failure }
   *   api.token                -> the saved key
   *   api.pause(ms), api.pauseMs
   *   api.isVideo(name), api.foldersOf(path, containerName)
   * `list` returns { files, failed, partial? } where each file is
   *   { file: { provider, fileRef, name, size }, containerKey, containerName, folders }.
   * `unlock` returns { r, url }: the raw request result and the playable address.
   */

  var FORM = { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }

  /** A response may carry a list or an object keyed by id. */
  function asList(value) {
    if (Array.isArray(value)) return value
    return value && typeof value === 'object' ? Object.values(value) : []
  }

  function flattenTree(nodes, parent) {
    var out = []
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i]
      var path = parent ? parent + '/' + node.n : node.n
      if (node.e && node.e.length) out.push.apply(out, flattenTree(node.e, path))
      else if (node.l) out.push({ path: path, bytes: node.s || 0, link: node.l })
    }
    return out
  }

  var realdebrid = {
    id: 'realdebrid',
    name: 'Real-Debrid',
    base: 'https://api.real-debrid.com/rest/1.0',
    legacyHeader: 'x-stream-provider-token',
    list: async function (api) {
      var torrents = await api.getJson('/torrents?limit=100')
      if (!Array.isArray(torrents)) return { files: [], failed: true }
      var files = []
      var partial = false
      for (var t = 0; t < torrents.length; t += 1) {
        var torrent = torrents[t]
        if (!torrent || torrent.status !== 'downloaded') continue
        // At most one call a second: the limit is shared with the user's own lookups.
        await api.pause(api.pauseMs)
        var info = await api.getJson('/torrents/info/' + encodeURIComponent(torrent.id))
        if (!info) {
          partial = true
          continue
        }
        var selected = (info.files || []).filter(function (file) { return file.selected === 1 })
        var links = info.links || []
        var containerName = String(torrent.filename || info.filename || info.original_filename || '')
        selected.forEach(function (file, index) {
          var path = String(file.path || '')
          var name = path.split('/').pop() || ''
          var link = links[index]
          if (!link || !api.isVideo(name)) return
          files.push({
            file: { provider: 'realdebrid', fileRef: torrent.id + '|' + link, name: name, size: Number(file.bytes) || 0 },
            containerKey: 'realdebrid:' + torrent.id,
            containerName: containerName,
            folders: api.foldersOf(path, containerName),
          })
        })
      }
      return { files: files, failed: false, partial: partial }
    },
    unlock: async function (api, fileRef) {
      var link = fileRef.split('|').slice(1).join('|')
      var r = await api.request('/unrestrict/link', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'link=' + encodeURIComponent(link),
      })
      return { r: r, url: r.data && r.data.download }
    },
  }

  var torbox = {
    id: 'torbox',
    name: 'TorBox',
    base: 'https://api.torbox.app/v1/api',
    legacyHeader: 'x-tb-token',
    list: async function (api) {
      var body = await api.getJson('/torrents/mylist?bypass_cache=true')
      if (!body) return { files: [], failed: true }
      var torrents = Array.isArray(body.data) ? body.data : []
      var files = []
      for (var t = 0; t < torrents.length; t += 1) {
        var torrent = torrents[t]
        var containerName = String((torrent && torrent.name) || '')
        var list = (torrent && torrent.files) || []
        for (var f = 0; f < list.length; f += 1) {
          var file = list[f]
          var name = String(file.short_name || file.name || '').split('/').pop() || ''
          if (!api.isVideo(name)) continue
          files.push({
            file: { provider: 'torbox', fileRef: torrent.id + '|' + file.id, name: name, size: Number(file.size) || 0 },
            containerKey: 'torbox:' + torrent.id,
            containerName: containerName,
            folders: api.foldersOf(String(file.name || name), containerName),
          })
        }
      }
      return { files: files, failed: false }
    },
    unlock: async function (api, fileRef) {
      var parts = fileRef.split('|')
      var r = await api.request(
        '/torrents/requestdl?token=' + encodeURIComponent(api.token) + '&torrent_id=' + encodeURIComponent(parts[0]) + '&file_id=' + encodeURIComponent(parts[1]) + '&redirect=false',
      )
      return { r: r, url: r.data && r.data.data }
    },
  }

  // POST /v4.1/magnet/status (statusCode 4 = ready), then POST /v4.1/magnet/files with a nested file tree.
  // The base address has no version segment, so the paths carry /v4 and /v4.1.
  var alldebrid = {
    id: 'alldebrid',
    name: 'AllDebrid',
    base: 'https://api.alldebrid.com',
    tokenParam: 'apikey',
    defaults: 'agent=lumio',
    legacyHeader: 'x-ad-token',
    list: async function (api) {
      var status = await api.getJson('/v4.1/magnet/status', { method: 'POST', headers: FORM, body: '' })
      if (!status || status.status !== 'success') return { files: [], failed: true }
      var ready = asList(status.data && status.data.magnets).filter(function (m) { return Number(m && m.statusCode) === 4 && m && m.id != null })
      if (ready.length === 0) return { files: [], failed: false }
      var form = new URLSearchParams()
      ready.forEach(function (magnet) { form.append('id[]', String(magnet.id)) })
      var filesBody = await api.getJson('/v4.1/magnet/files', { method: 'POST', headers: FORM, body: form.toString() })
      if (!filesBody || filesBody.status !== 'success') return { files: [], failed: true }
      var files = []
      var namesById = new Map(ready.map(function (m) { return [String(m.id), String(m.filename || '')] }))
      asList(filesBody.data && filesBody.data.magnets).forEach(function (magnet) {
        if (magnet && magnet.error) return
        var containerName = namesById.get(String(magnet && magnet.id)) || ''
        flattenTree((magnet && magnet.files) || [], '').forEach(function (file) {
          var name = file.path.split('/').pop() || ''
          if (!api.isVideo(name)) return
          files.push({
            file: { provider: 'alldebrid', fileRef: file.link, name: name, size: file.bytes },
            containerKey: 'alldebrid:' + (magnet && magnet.id),
            containerName: containerName,
            folders: api.foldersOf(file.path, containerName),
          })
        })
      })
      return { files: files, failed: false }
    },
    unlock: async function (api, fileRef) {
      var r = await api.request('/v4/link/unlock', {
        method: 'POST',
        headers: FORM,
        body: new URLSearchParams({ link: fileRef }).toString(),
      })
      return { r: r, url: r.data && r.data.data && r.data.data.link }
    },
  }

  return {
    version: 1,
    /** The id saved channels carry for the cloud source (older plugin versions read it). */
    sourceId: 'debrid',
    services: [realdebrid, torbox, alldebrid],
  }
})()
