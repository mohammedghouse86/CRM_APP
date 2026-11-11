'use strict';
// Helper that builds one endpoint entry: { meta, handler }.
// meta is also served to the UI API Explorer (GET /api/meta/endpoints).
//
// auth modes:
//   none       no check (token parsed if present)
//   api        signature + expiry checked, account must exist and be enabled
//   weak       signature checked, expiry ignored, alg "none" accepted
//   decode     token claims trusted without checking the signature
//   fail-open  invalid or missing token is treated as a guest
function endpoint(group, method, path, o, handler) {
  return {
    meta: {
      method,
      path,
      group,
      title: o.title,
      desc: o.desc || '',
      auth: o.auth || 'api',
      vulns: o.vulns || [],
      sample: o.sample || {},
    },
    handler,
  };
}

module.exports = { endpoint };
