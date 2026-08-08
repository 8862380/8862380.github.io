'use strict';

const params = new URLSearchParams(location.search);
const THEME_KEYS = ['royal', 'light', 'calm', 'dark', 'apple', 'business', 'ocean', 'tech'];
const themeParam = params.get('theme');
if (THEME_KEYS.includes(themeParam)) {
  document.documentElement.dataset.theme = themeParam;
}

const $ = (id) => document.getElementById(id);

/* 滚动进度条 + 导航 + 视差 */
const bar = $('progressBar');
const nav = $('nav');
const heroBg = document.querySelector('.hero-bg');
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = p + '%';
    nav.classList.toggle('scrolled', window.scrollY > 10);
    if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.18}px)`;
    ticking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* 移动端菜单 */
const navToggle = $('navToggle');
const navLinks = $('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.textContent = open ? '✕' : '☰';
});
navLinks.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.textContent = '☰';
  });
});

/* 主题切换 */
const themeBtn = $('themeToggle');
const THEME_ORDER = [
  { key: 'royal', label: '??' },
  { key: 'light', label: '??' },
  { key: 'calm', label: '??' },
  { key: 'dark', label: '??' },
  { key: 'apple', label: '??' },
  { key: 'business', label: '??' },
  { key: 'ocean', label: '??' },
  { key: 'tech', label: '??' },
];
const THEME_SWATCH = {
  royal: ['#d4af37', '#dc2626'],
  light: ['#6366f1', '#ec4899'],
  calm: ['#0f766e', '#b45309'],
  dark: ['#6366f1', '#ec4899'],
  apple: ['#0071e3', '#ff2d55'],
  business: ['#1f4e8c', '#d4a017'],
  ocean: ['#0b3d91', '#00b4d8'],
  tech: ['#00d4ff', '#ff2d95']
};
function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
const savedTheme = lsGet('siteTheme');
let currentTheme = (THEME_KEYS.indexOf(savedTheme) > -1) ? savedTheme : (document.documentElement.dataset.theme || 'royal');
const applyTheme = () => {
  document.documentElement.dataset.theme = currentTheme;
  themeBtn.textContent = '??';
  var items = document.querySelectorAll('.theme-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('current', items[i].getAttribute('data-key') === currentTheme);
  }
};
const picker = $('themePicker');
THEME_ORDER.forEach((t) => {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'theme-item';
  item.setAttribute('data-key', t.key);
  const sw = THEME_SWATCH[t.key] || ['#6366f1', '#ec4899'];
  item.innerHTML = '<span class="swatch" style="background:linear-gradient(135deg,' + sw[0] + ',' + sw[1] + ')"></span><span>' + t.label + '</span>';
  item.addEventListener('click', function () {
    currentTheme = t.key;
    applyTheme();
    lsSet('siteTheme', t.key);
    picker.hidden = true;
  });
  picker.appendChild(item);
});
themeBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  applyTheme();
  picker.hidden = !picker.hidden;
});
document.addEventListener('click', function () { picker.hidden = true; });
picker.addEventListener('click', function (e) { e.stopPropagation(); });
applyTheme();
/* 滚动显现动画 */
const revealEls = document.querySelectorAll('.reveal');
if (params.get('preview') === '1') {
  revealEls.forEach((el) => el.classList.add('in'));
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* 滚动高亮导航 */
const spyLinks = Array.from(navLinks.querySelectorAll('a[href^="#"]'));
const sections = Array.from(document.querySelectorAll('main section[id]'));
if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        spyLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s) => spy.observe(s));
}

/* 项目筛选 */
const filterChips = document.querySelectorAll('#projectFilters .chip');
const projectCards = document.querySelectorAll('#projectGrid .card');
filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    filterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const filter = chip.dataset.filter;
    projectCards.forEach((card) => {
      card.style.display = filter === 'all' || card.dataset.tag === filter ? '' : 'none';
    });
  });
});

/* 复制 QQ */
const copyBtn = $('copyQq');
const tip = $('formTip');
if (copyBtn && tip) {
  copyBtn.addEventListener('click', async () => {
    const qq = $('qqNumber').textContent.trim();
    const mask = $('qqMask');
    if (mask) mask.style.display = 'none';
    const num = $('qqNumber');
    if (num) num.style.display = '';
    try {
      await navigator.clipboard.writeText(qq);
      copyBtn.textContent = '已获取，点击可再次复制';
      tip.textContent = 'QQ：' + qq + ' 已复制，去添加好友吧！';
    } catch (e) {
      copyBtn.textContent = '已获取，点击可再次复制';
      tip.textContent = 'QQ：' + qq + '（复制失败，请手动复制）';
    }
  });
}
