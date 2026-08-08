export function ok(res, data) {
  return res.json({ success: true, data });
}

export function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}
