import { TELSEARCH_API_KEY } from '$env/static/private';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ url, fetch }) {
  const was = url.searchParams.get('was')?.trim() ?? url.searchParams.get('name')?.trim();
  if (!was) {
    return new Response(
      JSON.stringify({
        error: 'Missing "was" query parameter',
        names: [],
        emails: [],
        streets: [],
        streetnos: [],
        zips: [],
        cities: []
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Accept multiple canton filters (?wo=NE&wo=BE&wo=VD&wo=JU).
  const woListRaw = url.searchParams.getAll('wo');
  const woList = woListRaw.map((s) => s?.trim()).filter(Boolean);
  const targets = woList.length ? woList : [undefined];

  const names = [];
  const emails = [];
  const streets = [];
  const streetnos = [];
  const zips = [];
  const cities = [];
  const requestedUrls = [];
  const rows = [];

  for (const wo of targets) {
    const externalUrl = new URL('https://search.ch/tel/api/');
    externalUrl.searchParams.set('was', was);
    externalUrl.searchParams.set('key', TELSEARCH_API_KEY);
    externalUrl.searchParams.set('maxnum', '200');
    if (wo) externalUrl.searchParams.set('wo', wo);

    requestedUrls.push(externalUrl.toString());

    const upstream = await fetch(externalUrl.toString(), {
      headers: {
        accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1'
      }
    });

    const raw = await upstream.text();

    // Parse Atom entries and collect only entries with at least one email
    const entries = raw.match(/<entry\b[\s\S]*?<\/entry>/g) || [];
    for (const entry of entries) {
      const entryEmails = Array.from(
        entry.matchAll(/<tel:extra[^>]*type=['"]email['"][^>]*>([\s\S]*?)<\/tel:extra>/gi)
      )
        .map((m) => {
          const raw = (m[1] ?? '').trim();
          return raw.replace(/\*+$/, '').trim(); // strip trailing asterisks
        })
        .filter((v) => v);

      if (entryEmails.length === 0) continue; // skip entries without an email

      emails.push(...entryEmails);

      // Collect per-entry fields (first occurrence) to build per-email rows
      const first = (re) => {
        const m = entry.match(re);
        return (m?.[1] ?? '').trim();
      };
      const name = first(/<tel:name>([\s\S]*?)<\/tel:name>/i);
      const street = first(/<tel:street>([\s\S]*?)<\/tel:street>/i);
      const no = first(/<tel:streetno>([\s\S]*?)<\/tel:streetno>/i);
      const zip = first(/<tel:zip>([\s\S]*?)<\/tel:zip>/i);
      const city = first(/<tel:city>([\s\S]*?)<\/tel:city>/i);
      for (const email of entryEmails) {
        rows.push({ name, email, street, no, zip, city });
      }

      // Continue populating flattened arrays (backward compatibility)
      const collect = (re, target) => {
        for (const m of entry.matchAll(re)) {
          const v = (m[1] ?? '').trim();
          if (v) target.push(v);
        }
      };
      collect(/<tel:name>([\s\S]*?)<\/tel:name>/gi, names);
      collect(/<tel:street>([\s\S]*?)<\/tel:street>/gi, streets);
      collect(/<tel:streetno>([\s\S]*?)<\/tel:streetno>/gi, streetnos);
      collect(/<tel:zip>([\s\S]*?)<\/tel:zip>/gi, zips);
      collect(/<tel:city>([\s\S]*?)<\/tel:city>/gi, cities);
    }
  }

  const body = JSON.stringify({ names, emails, streets, streetnos, zips, cities, rows });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-requested-url': requestedUrls[0] ?? '',
      'x-requested-urls': JSON.stringify(requestedUrls)
    }
  });
}