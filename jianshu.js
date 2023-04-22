/**
 * 该插件目的：
 *   去除 简书 右侧栏的广告
 */

window.onload = function(){
    console.log('插件进入')

    if (window.location.href.indexOf('https://www.jianshu.com/p') != -1) {
        console.log('current at 简书')
        console.log("url", window.location.href)
        setInterval(clearJianShuAdvertisement,100);
    }
};

function clearJianShuAdvertisement() {
    var h = document.getElementsByClassName('_3Z3nHf');
    if (h.length > 0) {
        for(let i =0; i< h.length; i++ ) {
            h[i]['style']['display'] = 'none';
        }
    }
}