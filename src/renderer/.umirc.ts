import { defineConfig } from 'umi';
import MonacoEditorWebpackPlugin from 'monaco-editor-webpack-plugin';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    { path: '/', component: '@/pages/index' },
  ],
  chainWebpack(memo) {
    memo.plugin('MonacoEditorWebpackPlugin').use(MonacoEditorWebpackPlugin, ['apex', 'azcli', 'bat', 'clojure', 'coffee', 'cpp', 'csharp', 'csp', 'css', 'dockerfile', 'fsharp', 'go', 'handlebars', 'html', 'ini', 'java', 'javascript', 'json', 'less', 'lua', 'markdown', 'msdax', 'mysql', 'objective', 'perl', 'pgsql', 'php', 'postiats', 'powerquery', 'powershell', 'pug', 'python', 'r', 'razor', 'redis', 'redshift', 'ruby', 'rust', 'sb', 'scheme', 'scss', 'shell',
      'solidity', 'sql', 'st', 'swift', 'typescript', 'vb', 'xml', 'yaml'])
  }
});
