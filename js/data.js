/* ============================================================
   公共数据层 — 所有页面引入
   提供全局对象 MT（MilkTea）：
     MT.init()           — 返回 Promise，resolve 后 MT.data 可用
     MT.ready(callback)  — 兼容旧回调方式（内部调用 init）
     MT.data             — 原始数据数组
     MT.loaded           — 是否已加载
     MT.getBrands()      — 品牌名数组
     MT.getBrandTotals() — {品牌: 产品数}
     MT.brandPalette     — 品牌配色
     MT.teaColorMap      — 茶底配色
     MT.KPI()            — 汇总统计
     MT.colorForBrand(b) — 获取品牌色
     MT.filterValid()    — 过滤有效数据
     MT.costPerformance(item) — 性价比计算
   ============================================================ */

window.MT = (function() {
    var _data = null;
    var _loaded = false;
    var _loading = false;
    var _initPromise = null;
    var _callbacks = [];

    // 品牌配色（与 change2 一致）
    var brandPalette = [
        '#D2B48C', '#C4A77D', '#B8956A', '#A67C52',
        '#8B6B3D', '#D4C4A8', '#C19A6B', '#B8860B',
        '#9C7C38', '#E8D5B8', '#CDB79E', '#AF9B60',
        '#DAB89A', '#BFA07A'
    ];

    // 茶底配色
    var teaColorMap = {
        '红茶': '#C97B7B', '乌龙茶': '#A68B6B', '绿茶': '#A8BFA8',
        '花茶': '#D4B5C7', '抹茶': '#B5CDB5', '黑茶': '#6B5B4A',
        '其他': '#B8B8A8', '无茶底': '#D4C4A8',
        '花茶,抹茶': '#C9BDB5', '红茶,乌龙茶': '#B8A08B',
        '绿茶,乌龙茶': '#A8B0A0', '乌龙茶,红茶': '#B8A08B'
    };

    // 异步加载数据
    // 策略：http(s) 环境走 fetch（GitHub Pages 等线上部署）；
    //       file:// 本地直开时 fetch 会被 CORS 拦截，自动降级加载内嵌数据 data/milkyTea.data.js
    function loadEmbedded() {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = 'data/milkyTea.data.js';
            s.onload = function() {
                if (window.MILK_TEA_DATA && window.MILK_TEA_DATA.length) {
                    resolve(window.MILK_TEA_DATA);
                } else {
                    reject(new Error('内嵌数据为空或未定义'));
                }
            };
            s.onerror = function() {
                reject(new Error('内嵌数据加载失败：data/milkyTea.data.js'));
            };
            document.head.appendChild(s);
        });
    }

    function loadAsync() {
        if (_loaded) return Promise.resolve(_data);

        if (_initPromise) return _initPromise;

        _loading = true;

        var isFile = location.protocol === 'file:';

        _initPromise = (isFile ? loadEmbedded() : fetch('data/milkyTea.json')
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
                return res.json();
            }))
            .then(function(data) {
                _data = data;
                _loaded = true;
                _loading = false;
                // 触发所有等待的回调
                _callbacks.forEach(function(cb) { cb(data); });
                _callbacks = [];
                return data;
            })
            .catch(function(err) {
                _loading = false;
                _initPromise = null;
                console.error('[MT] 数据加载失败，请检查 data/milkyTea.json', err);
                throw err;
            });

        return _initPromise;
    }

    // 暴露接口
    var api = {
        // 新版：返回 Promise，支持 async/await
        init: function() {
            return loadAsync();
        },

        // 旧版兼容：回调方式
        ready: function(cb) {
            if (_loaded) {
                cb(_data);
                return;
            }
            _callbacks.push(cb);
            if (!_loading && !_initPromise) loadAsync();
        },

        get data() { return _data; },
        get loaded() { return _loaded; },

        // 品牌列表（每次实时计算）
        getBrands: function() {
            if (!_data) return [];
            var map = {};
            _data.forEach(function(d) { map[d['品牌']] = (map[d['品牌']] || 0) + 1; });
            return Object.keys(map).sort(function(a, b) { return map[b] - map[a]; });
        },

        // 品牌总数映射
        getBrandTotals: function() {
            var map = {};
            if (!_data) return map;
            _data.forEach(function(d) { map[d['品牌']] = (map[d['品牌']] || 0) + 1; });
            return map;
        },

        // 颜色工具
        brandPalette: brandPalette,
        teaColorMap: teaColorMap,

        colorForBrand: function(brand) {
            var brands = this.getBrands();
            var idx = brands.indexOf(brand);
            return idx >= 0 ? brandPalette[idx % brandPalette.length] : '#BFA07A';
        },

        // KPI 汇总统计
        KPI: function() {
            if (!_data) return null;
            var brands = this.getBrands();
            var total = _data.length;
            var validPrice = _data.filter(function(d) {
                return d['单位价格 元/100ml'] !== '#DIV/0!' && typeof d['单位价格 元/100ml'] === 'number';
            });
            var validHeat = _data.filter(function(d) {
                return d['单位热量 kcal/100ml'] !== '#DIV/0!'
                    && typeof d['单位热量 kcal/100ml'] === 'number'
                    && d['单位热量 kcal/100ml'] > 0;
            });

            var avgPrice = validPrice.length > 0
                ? (validPrice.reduce(function(s, d) { return s + d['单位价格 元/100ml']; }, 0) / validPrice.length).toFixed(2)
                : '-';
            var avgHeat = validHeat.length > 0
                ? (validHeat.reduce(function(s, d) { return s + d['单位热量 kcal/100ml']; }, 0) / validHeat.length).toFixed(1)
                : '-';

            // 最贵和最便宜产品
            var sortedPrice = validPrice.slice().sort(function(a, b) {
                return b['单位价格 元/100ml'] - a['单位价格 元/100ml'];
            });
            var sortedHeat = validHeat.slice().sort(function(a, b) {
                return a['单位热量 kcal/100ml'] - b['单位热量 kcal/100ml'];
            });

            return {
                totalProducts: total,
                brandCount: brands.length,
                avgUnitPrice: avgPrice,
                avgUnitHeat: avgHeat,
                mostExpensive: sortedPrice.length > 0 ? sortedPrice[0]['饮品名称'] + '（' + sortedPrice[0]['品牌'] + '）' + sortedPrice[0]['总价/元'] + '元' : '-',
                lowestCal: sortedHeat.length > 0 ? sortedHeat[0]['饮品名称'] + '（' + sortedHeat[0]['品牌'] + '）' + sortedHeat[0]['单位热量 kcal/100ml'] + ' kcal' : '-'
            };
        },

        // 有效数据过滤（排除 #DIV/0! 和非数值）
        filterValid: function() {
            if (!_data) return [];
            return _data.filter(function(d) {
                if (d['单位价格 元/100ml'] === '#DIV/0!' || d['单位热量 kcal/100ml'] === '#DIV/0!') return false;
                if (typeof d['单位价格 元/100ml'] !== 'number' || typeof d['单位热量 kcal/100ml'] !== 'number') return false;
                return d['单位热量 kcal/100ml'] > 0;
            });
        },

        // 性价比计算：容量/总价
        costPerformance: function(item) {
            if (!item['总价/元'] || item['总价/元'] <= 0) return 0;
            return parseFloat((item['容量/ml'] / item['总价/元']).toFixed(1));
        }
    };

    return api;
})();
