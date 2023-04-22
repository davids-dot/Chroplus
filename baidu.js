/**
 * 该插件目的：
 *   去除 百度 右侧栏的广告
 */
window.onload = function(){
    console.log('插件进入')

    if (window.location.href.indexOf('www.baidu.com')!= -1) {
        setInterval(setBaiduConfig,100);
    }
};

function setBaiduConfig() {
    clearBaiDuAdvertisement()
    setDefaultFoucusOnMyMenu()
}

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

function setDefaultFoucusOnMyMenu() {
    let mine = document.getElementById('s_menu_mine')
    if (mine) {
        let classNames = mine.getAttribute('class')
        if (classNames.indexOf('current') == -1) {
            mine.click()
        }
    }
}