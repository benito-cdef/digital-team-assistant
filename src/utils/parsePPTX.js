import JSZip from 'jszip';

function extractTextFromXML(xmlStr) {
  const lines = [];
  // Extract table rows
  const tableRegex = /<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(xmlStr)) !== null) {
    const cellRegex = /<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(tableMatch[1])) !== null) {
      const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
      const texts = [];
      let textMatch;
      while ((textMatch = textRegex.exec(cellMatch[1])) !== null) {
        texts.push(textMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
      }
      cells.push(texts.join('').trim());
    }
    if (cells.some(c => c)) lines.push(cells.join('\t'));
  }

  // Extract plain paragraphs
  const paraRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(xmlStr)) !== null) {
    const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    const texts = [];
    let textMatch;
    while ((textMatch = textRegex.exec(paraMatch[1])) !== null) {
      texts.push(textMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
    }
    const line = texts.join('').trim();
    if (line) lines.push(line);
  }

  return lines;
}

function tryParseTable(lines) {
  // Check if we have tab-separated rows that look like a calendar
  const tabLines = lines.filter(l => l.includes('\t'));
  if (tabLines.length < 2) return null;

  const rows = tabLines.map(l => l.split('\t').map(c => c.trim()));
  const header = rows[0];
  if (!header || header.length < 2) return null;

  const columns = header;
  const dataRows = rows.slice(1).map(cells => {
    const obj = {};
    cells.forEach((val, i) => { if (columns[i]) obj[columns[i]] = val; });
    return obj;
  });

  return { rows: dataRows, columns };
}

export async function parsePPTX(file) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  let allLines = [];
  let numSlides = slideFiles.length;

  for (const slideName of slideFiles) {
    const xml = await zip.files[slideName].async('text');
    const lines = extractTextFromXML(xml);
    allLines = allLines.concat(lines);
  }

  const fullText = allLines.join('\n');
  const tableResult = tryParseTable(allLines);

  return { text: fullText, numSlides, tableResult, lines: allLines };
}
