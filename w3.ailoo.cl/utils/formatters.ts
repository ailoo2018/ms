import { JSDOM } from 'jsdom'

function formatDate(date) {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month}. ${year} ${hours}:${minutes}`;
}


export function stripInlineStyles(html: string): string {
  const dom = new JSDOM(html)
  dom.window.document.querySelectorAll('[style], [class]').forEach(el => {
    el.removeAttribute('style')
    el.removeAttribute('class')
  })
  return dom.window.document.body.innerHTML
}