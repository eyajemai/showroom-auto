// scrape.mjs : reads automobile.tn and prepares 12 cars for app.ts
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE = 'https://www.automobile.tn';

// [end of the page address, name shown on your site]
const BRANDS = [
  ['peugeot', 'Peugeot'],
  ['renault', 'Renault'],
  ['kia', 'KIA'],
  ['hyundai', 'Hyundai'],
  ['volkswagen', 'Volkswagen'],
  ['toyota', 'Toyota'],
];
const PER_BRAND = 2; // 6 brands x 2 cars = 12 cars
let nextId = 17; // your own cars use ids 1 to 16
const POWER = 5; // fiscal horsepower: you will fix it by hand
const STOCK = 3; // the site has no stock info, so we choose a value
const DELAY_MS = 2000; // pause between requests (be polite to the site)

// we only want cars, not vans or pick-ups
const EXCLUDE = ['van', 'fourgon', 'jumpy', 'jumper', 'combi', 'pick', 'cabine', 'utilitaire'];

const cars = [];

function pause() {
  return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

// downloads a page and returns its text (the HTML)
async function getPage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (student project, school TP)' },
  });
  if (!response.ok) throw new Error('status ' + response.status);
  return response.text();
}

// "Promo Citroën C4 X à partir de 83 900 DT" -> "Citroën C4 X"
function cleanTitle(text) {
  let title = text.split('à partir de')[0].trim();
  for (const badge of ['Promo', 'Disponible', 'Nouveau']) {
    if (title.startsWith(badge + ' ')) title = title.slice(badge.length).trim();
  }
  const words = title.split(' ');
  const half = words.length / 2;
  // sometimes the name is written twice: "C3 C3" -> "C3"
  if (words.length % 2 === 0 && words.slice(0, half).join(' ') === words.slice(half).join(' ')) {
    title = words.slice(0, half).join(' ');
  }
  return title;
}

// "à partir de 60 900 DT" -> 60900
function getPrice(text) {
  const match = text.match(/à partir de\s*([\d\s\u00a0.]+?)\s*DT/);
  if (!match) return 0;
  return Number(match[1].replace(/[^\d]/g, ''));
}

// finds the photo address (sites often hide it in data-src)
function getImageUrl($, card) {
  const img = $(card).find('img').first();
  for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
    const value = img.attr(attr);
    if (value && !value.startsWith('data:')) return new URL(value, BASE).href;
  }
  return null;
}

// downloads the photo into public/images and returns its file name
async function saveImage(url, name) {
  const extension = (url.split('?')[0].match(/\.(webp|jpg|jpeg|png|avif)$/i) || ['', '.jpg'])[0];
  const fileName = name + (extension.startsWith('.') ? extension : '.' + extension);
  const response = await fetch(url);
  if (!response.ok) throw new Error('status ' + response.status);
  fs.writeFileSync('../public/images/' + fileName, Buffer.from(await response.arrayBuffer()));
  return fileName;
}

for (const [brandSlug, brandName] of BRANDS) {
  console.log('--- ' + brandName);
  let html;
  try {
    html = await getPage(`${BASE}/fr/neuf/${brandSlug}`);
  } catch (error) {
    console.log('   page not available:', error.message);
    continue;
  }

  const $ = cheerio.load(html);
  const seen = new Set();
  let count = 0;

  for (const card of $('a[href]').toArray()) {
    if (count >= PER_BRAND) break;
    const href = $(card).attr('href');
    const text = $(card).text().replace(/\s+/g, ' ').trim();

    // a car = a link to /fr/neuf/<brand>/<model> that shows a price
    if (!href.includes(`/fr/neuf/${brandSlug}/`) || !text.includes('à partir de')) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const title = cleanTitle(text);
    if (EXCLUDE.some((word) => title.toLowerCase().split(' ').includes(word))) continue;

    const imageUrl = getImageUrl($, card);
    if (!imageUrl) {
      console.log('   no image found for ' + title + ' (skipped)');
      continue;
    }

    const price = getPrice(text);
    const model = title.replace(new RegExp('^' + brandName + '\\s*', 'i'), '');
    const fileBase = title
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    try {
      const photo = await saveImage(imageUrl, fileBase);
      cars.push({
        id: nextId++,
        brand: brandName,
        model: model,
        price: price,
        power: POWER,
        photo: photo,
        availability: STOCK,
        description: `${title}, starting from ${price} TND.`, // rewrite it yourself
      });
      count++;
      console.log(`   OK: ${title} | ${price} DT | ${new URL(href, BASE).href}`);
    } catch (error) {
      console.log('   image download failed for ' + title + ': ' + error.message);
    }
    await pause();
  }
  await pause();
}

// writes the cars, ready to paste inside the autoList array of app.ts
fs.writeFileSync('scraped_cars.txt', cars.map((car) => JSON.stringify(car, null, 4)).join(',\n'));
console.log(`\nDone: ${cars.length} cars written in scraped_cars.txt`);
