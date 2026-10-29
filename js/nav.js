/* ============================================================
   公共导航栏组件 — 所有页面引入
   用法：页面 head 中定义 <script>var CURRENT_PAGE = 'index';</script>
   ============================================================ */

(function() {
    var pages = [
        { id: 'index',     name: '首页',     href: 'index.html?skip=1' },
        { id: 'dashboard', name: '数据看板', href: 'dashboard.html' },
        { id: 'explorer',  name: '产品探索', href: 'explorer.html' },
        { id: 'ranking',   name: '排行榜',   href: 'ranking.html' },
        { id: 'brand',     name: '品牌详情', href: 'brand.html' },
        { id: 'health',    name: '健康指南', href: 'health.html' }
    ];

    var current = (typeof CURRENT_PAGE !== 'undefined') ? CURRENT_PAGE : 'index';

    var linksHTML = pages.map(function(p) {
        var cls = (p.id === current) ? ' class="active"' : '';
        return '<a href="' + p.href + '"' + cls + '>' + p.name + '</a>';
    }).join('');

    var navHTML =
        '<nav class="site-nav">' +
            '<a href="index.html?skip=1" class="logo"><span class="logo-icon"><img src="images/珍珠奶茶.svg" alt="奶茶图标" style="width:1em;height:1em;vertical-align:-0.15em"></span>奶茶品牌图鉴</a>' +
            '<div class="nav-links">' + linksHTML + '</div>' +
        '</nav>';

    document.addEventListener('DOMContentLoaded', function() {
        var body = document.body;
        var temp = document.createElement('div');
        temp.innerHTML = navHTML;
        body.insertBefore(temp.firstChild, body.firstChild);
    });
})();
