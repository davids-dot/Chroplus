/**
 * 该插件目的：
 *   去除 百度 右侧栏的广告
 */
window.onload = function(){
    console.log('插件进入')

    if (window.location.href.indexOf('www.baidu.com')!= -1) {
        setInterval(clearBaiDuAdvertisement,100);
    }
};

function clearBaiDuAdvertisement() {
    var h = document.getElementsByClassName('cr-content');
    if (h.length > 0) {
        if (h[0]['style']['display'] === 'none') {
          return;
        }
        console.log("loop begin")
        for(let i =0; i< h.length; i++ ) {
            h[i]['style']['display'] = 'none';
        }
    }
}