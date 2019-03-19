import url from 'url';

export function getRefererHostFullUrl(req) {
  const referer = req.get('referer');
  const refererUrl = url.parse(referer);
  return `${refererUrl.protocol}//${refererUrl.host}`;
}

export function fullUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.host,
    pathname: req.originalUrl,
  });
}

export function hasRefererAnotherDomain(req) {
  const refererUrl = url.parse(req.get('referer'));
  console.warn('ANKU , referer', refererUrl.hostname, req.hostname);
  return refererUrl.hostname !== req.hostname;
}
