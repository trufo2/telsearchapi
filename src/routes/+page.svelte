<script>
  let ne = false;
  let fr = false;
  let vd = false;
  let ju = false;
  let category = 'Web design';

  let csvText = '';
  let rowCount = 0;
  let loading = false;
  let error = '';

  const headers = ['name', 'email', 'street', 'no', 'zip', 'city'];

  function toCsvField(value) {
    const s = (value ?? '').toString();
    if (s === '') return '';
    const needsQuotes = /[";\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  function buildCsv(rows) {
    const lines = [];
    lines.push(headers.join(';'));
    for (const r of rows) {
      lines.push(
        [
          toCsvField(r.name),
          toCsvField(r.email),
          toCsvField(r.street),
          toCsvField(r.no),
          toCsvField(r.zip),
          toCsvField(r.city)
        ].join(';')
      );
    }
    return lines.join('\n');
  }

  async function onSearch() {
    error = '';
    loading = true;
    csvText = '';
    rowCount = 0;

    const params = new URLSearchParams();
    params.set('was', category);
    if (ne) params.append('wo', 'NE');
    if (fr) params.append('wo', 'FR');
    if (vd) params.append('wo', 'VD');
    if (ju) params.append('wo', 'JU');

    const url = `/api/search?${params.toString()}`;
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });

      // Log exact upstream URL(s)
      const requestedUrl = res.headers.get('x-requested-url');
      if (requestedUrl) console.log(requestedUrl);
      const requestedUrls = res.headers.get('x-requested-urls');
      if (requestedUrls) console.log(requestedUrls);

      const data = await res.json();

      // Prefer structured rows from API; fallback to minimal rows if absent
      const rows = Array.isArray(data.rows)
        ? data.rows
        : (data.emails ?? []).map((email) => ({
            name: '',
            email,
            street: '',
            no: '',
            zip: '',
            city: ''
          }));

      rowCount = rows.length;
      csvText = buildCsv(rows);
    } catch (err) {
      console.log('fetch failed', err);
      error = 'Fetch failed';
    } finally {
      loading = false;
    }
  }

  async function copyCsv() {
    try {
      await navigator.clipboard.writeText(csvText);
    } catch (e) {
      const ta = document.getElementById('csv-textarea');
      if (ta) {
        ta.focus();
        ta.select();
        document.execCommand?.('copy');
      }
    }
  }
</script>

<select bind:value={category}>
  <option>Communications agency</option>
  <option>Web design</option>
  <option>Marketing</option>
</select>
<label><input type="checkbox" bind:checked={ne} /> NE</label>
<label><input type="checkbox" bind:checked={fr} /> FR</label>
<label><input type="checkbox" bind:checked={vd} /> VD</label>
<label><input type="checkbox" bind:checked={ju} /> JU</label>
<button on:click={onSearch} disabled={loading}>search</button>

{#if loading}
  <p>Loading…</p>
{/if}
{#if error}
  <p style="color: red">{error}</p>
{/if}

<p>Rows: {rowCount}</p>
<div style="margin: 0.5rem 0;">
  <button on:click={copyCsv} disabled={!csvText}>Copy CSV</button>
</div>

<textarea
  id="csv-textarea"
  bind:value={csvText}
  readonly
  rows="14"
  style="width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
></textarea>
