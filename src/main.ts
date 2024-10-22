import { createApp, watch } from 'vue';
import { createI18n } from 'vue-i18n';
import './style.css';
import App from './App.vue';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

console.log(navigator.language);

let locale = localStorage.getItem('locale');

if (!locale) {
  locale = navigator.language === 'zh-CN' ? '中文（简体）' : 'English';
}


const i18n = createI18n({
  locale,
  fallbackLocale: 'English',
  messages: {
    '中文（简体）': zhCN,
    'English': en
  }
});

document.title = i18n.global.t('title');

watch(() => i18n.global.locale, () => {
  localStorage.setItem('locale', i18n.global.locale);
  location.reload();
});

const app = createApp(App);
app.use(i18n);

app.mount('#app');
