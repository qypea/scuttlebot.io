var md = require('../../../markdown')
var page = require('../../page.part')
module.exports = () => page({
  title: 'Pull-Timeout',
  section: 'apis',
  tab: 'apis-pull-stream',
  path: '/apis/pull-stream/pull-timeout.html',
  content: md.doc(__dirname+'/pull-timeout.md')
})